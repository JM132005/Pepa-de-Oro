// equipos.service.ts → activos (ficha única), disponibilidad, alquileres con calendario y contrato.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activo } from './esquemas/activo.esquema.js';
import { Alquiler } from './esquemas/alquiler.esquema.js';
import { OrdenMantenimiento } from '../mantenimiento/esquemas/orden-mantenimiento.esquema.js';
import { Cliente } from '../ventas/esquemas/cliente.esquema.js';
import { CrudBase } from '../../comun/crud-base.service.js';
import { ContadoresService } from '../../comun/servicios/contadores.service.js';
import { PdfService } from '../../comun/servicios/pdf.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { calcularAlquiler, documentosPorVencer, verificarActivoUsable, verificarDisponibilidad, type Rango } from './equipos.reglas.js';
import { sumarDias } from '../../comun/utilidades.js';
import { pdfContrato } from './pdf-contrato.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { CrearAlquilerDto, DevolucionDto, EntregaDto } from './dto/equipos.dto.js';

@Injectable()
export class EquiposService extends CrudBase<Activo> {
  constructor(
    @InjectModel(Activo.name) modelo: Model<Activo>,
    @InjectModel(Alquiler.name) private readonly alquileres: Model<Alquiler>,
    @InjectModel(OrdenMantenimiento.name) private readonly ordenes: Model<OrdenMantenimiento>,
    @InjectModel(Cliente.name) private readonly clientes: Model<Cliente>,
    private readonly contadores: ContadoresService,
    private readonly pdf: PdfService,
    private readonly configuracion: ConfiguracionService,
    private readonly auditoria: AuditoriaService,
  ) {
    super(modelo, 'Activo', [], { codigo: 1 });
  }

  buscar(f: { tipo?: string; uso?: string; estado?: string }) {
    const q: Record<string, unknown> = {};
    if (f.tipo) q.tipo = { $in: f.tipo.split(',') };
    if (f.uso) q.usos = f.uso;
    if (f.estado) q.estado = { $in: f.estado.split(',') };
    return this.listar(q);
  }

  // ocupacion(): rangos ocupados por alquileres vigentes y mantenimientos programados (para RN-23).
  async ocupacion(activoId: string, excluirAlquiler?: string): Promise<Rango[]> {
    const alquileres = await this.alquileres.find({ activo: activoId, estado: { $in: ['RESERVADO', 'ACTIVO'] }, ...(excluirAlquiler ? { _id: { $ne: excluirAlquiler } } : {}) }).lean().exec();
    const mantenimientos = await this.ordenes.find({ activo: activoId, estado: { $in: ['ABIERTA', 'EN_PROCESO', 'ESPERANDO_REPUESTO'] } }).lean().exec();
    return [
      ...alquileres.map((a) => ({ desde: a.desde, hasta: a.hasta, etiqueta: `el alquiler ${a.codigo}` })),
      ...mantenimientos.map((m) => {
        const desde = m.programada ?? m.inicio ?? (m as { createdAt?: Date }).createdAt ?? new Date();
        return { desde, hasta: m.fin ?? sumarDias(desde, 2), etiqueta: `el mantenimiento ${m.codigo}` };
      }),
    ];
  }

  // ficha(): activo + calendario + historial de mantenimiento + documentos por vencer.
  async ficha(id: string) {
    const activo = await this.obtener(id);
    const [alquileres, ordenes, ocupado] = await Promise.all([
      this.alquileres.find({ activo: id }).populate('cliente', 'nombre').sort({ desde: -1 }).limit(30).lean().exec(),
      this.ordenes.find({ activo: id }).sort({ createdAt: -1 }).limit(30).lean().exec(),
      this.ocupacion(id),
    ]);
    const costoMantenimiento = ordenes.reduce((s, o) => s + (o.costos?.costoTotal ?? 0), 0);
    return { ...activo, alquileres, ordenes, ocupado, costoMantenimiento, documentosPorVencer: documentosPorVencer(activo.documentos), usable: verificarActivoUsable(activo) };
  }

  // darDeBaja(): acción sensible (solo gerente) que queda en la auditoría.
  async darDeBaja(id: string, motivo: string, usuario: UsuarioToken) {
    const antes = await this.obtener(id);
    await this.modelo.updateOne({ _id: id }, { $set: { estado: 'BAJA', publicado: false } }).exec();
    await this.auditoria.registrar({ usuario, accion: 'BAJA_ACTIVO', entidad: 'activos', entidadId: id, antes: { estado: antes.estado }, despues: { estado: 'BAJA', motivo }, sensible: true });
    return this.obtener(id);
  }

  // alertasDocumentos(): matrícula, SOAT o revisión técnica por vencer o vencidos.
  async alertasDocumentos() {
    const activos = await this.modelo.find({ estado: { $nin: ['VENDIDO', 'BAJA'] }, 'documentos.0': { $exists: true } }).lean().exec();
    const hoy = new Date();
    return activos.flatMap((a) =>
      a.documentos
        .filter((d) => new Date(d.vence) < sumarDias(hoy, 30))
        .map((d) => ({ activo: a.codigo, tipo: d.tipo, vence: d.vence, vencido: new Date(d.vence) < hoy })),
    );
  }

  // ─────────── Alquileres ───────────
  listarAlquileres(f: { estado?: string; activo?: string }) {
    const q: Record<string, unknown> = {};
    if (f.estado) q.estado = { $in: f.estado.split(',') };
    if (f.activo) q.activo = f.activo;
    return this.alquileres.find(q).populate('activo', 'codigo nombre tipo').populate('cliente', 'nombre identificacion').sort({ desde: -1 }).lean().exec();
  }

  async alquiler(id: string) {
    const a = await this.alquileres.findById(id).populate('activo').populate('cliente').populate('factura', 'numero total').lean().exec();
    if (!a) throw new NotFoundException('Alquiler no encontrado');
    return a;
  }

  async crearAlquiler(dto: CrearAlquilerDto, usuario: UsuarioToken) {
    const activo = await this.obtener(dto.activo);
    if (!activo.usos.includes('ALQUILER')) throw new BadRequestException(`${activo.codigo} no está disponible para alquiler`);
    const usable = verificarActivoUsable(activo); // RN-24
    if (usable) throw new BadRequestException(usable);
    const desde = new Date(dto.desde);
    const hasta = new Date(dto.hasta);
    const choque = verificarDisponibilidad(desde, hasta, await this.ocupacion(dto.activo)); // RN-23
    if (choque) throw new BadRequestException(choque);
    if (!(await this.clientes.exists({ _id: dto.cliente }))) throw new NotFoundException('Cliente no encontrado');
    return this.alquileres.create({
      codigo: await this.contadores.codigoAnual('AL'),
      activo: dto.activo,
      cliente: dto.cliente,
      desde,
      hasta,
      tarifaDia: dto.tarifaDia ?? activo.tarifas?.dia ?? 0,
      conOperador: dto.conOperador ?? false,
      tarifaOperadorDia: dto.conOperador ? activo.tarifaOperadorDia : 0,
      garantia: activo.garantia,
      lugarTrabajo: dto.lugarTrabajo,
      condiciones: dto.condiciones,
      solicitud: dto.solicitud,
      creadoPor: usuario.nombre,
    });
  }

  // entregar(): el equipo sale al cliente → ALQUILADO.
  async entregar(id: string, dto: EntregaDto) {
    const al = await this.alquileres.findById(id).lean().exec();
    if (!al || al.estado !== 'RESERVADO') throw new BadRequestException('Solo se entregan alquileres reservados');
    const activo = await this.obtener(String(al.activo));
    const usable = verificarActivoUsable(activo);
    if (usable) throw new BadRequestException(usable);
    await this.modelo.updateOne({ _id: al.activo }, { $set: { estado: 'ALQUILADO' } }).exec();
    return this.alquileres.findByIdAndUpdate(id, { $set: { estado: 'ACTIVO', entrega: { fecha: new Date(), horometro: dto.horometro ?? activo.horometro, estadoEquipo: dto.estadoEquipo, observaciones: dto.observaciones } } }, { returnDocument: 'after' }).lean().exec();
  }

  // devolver(): calcula días extra y daños; el equipo vuelve a DISPONIBLE y suma horas de uso.
  async devolver(id: string, dto: DevolucionDto) {
    const al = await this.alquileres.findById(id).lean().exec();
    if (!al || al.estado !== 'ACTIVO') throw new BadRequestException('Solo se devuelven alquileres activos');
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();
    const calculo = calcularAlquiler({ desde: al.desde, hasta: al.hasta, devolucion: fecha, tarifaDia: al.tarifaDia, conOperador: al.conOperador, tarifaOperadorDia: al.tarifaOperadorDia, garantia: al.garantia, danos: dto.danos });
    const activo = await this.obtener(String(al.activo));
    if (dto.horometro < (al.entrega?.horometro ?? 0)) throw new BadRequestException('El horómetro de devolución no puede ser menor al de entrega');
    await this.modelo.updateOne({ _id: al.activo }, { $set: { estado: 'DISPONIBLE', horometro: Math.max(activo.horometro, dto.horometro) } }).exec();
    return this.alquileres.findByIdAndUpdate(id, { $set: { estado: 'DEVUELTO', devolucion: { fecha, horometro: dto.horometro, danos: dto.danos ?? 0, observaciones: dto.observaciones }, calculo } }, { returnDocument: 'after' }).lean().exec();
  }

  async cancelar(id: string) {
    const r = await this.alquileres.findOneAndUpdate({ _id: id, estado: 'RESERVADO' }, { $set: { estado: 'CANCELADO' } }, { returnDocument: 'after' }).lean().exec();
    if (!r) throw new BadRequestException('Solo se cancelan alquileres reservados');
    return r;
  }

  async contrato(id: string) {
    const al = await this.alquileres.findById(id).lean().exec();
    if (!al) throw new NotFoundException('Alquiler no encontrado');
    const activo = await this.modelo.findById(al.activo).lean().exec();
    const cliente = await this.clientes.findById(al.cliente).lean().exec();
    return { alquiler: al, buffer: await pdfContrato(this.pdf, await this.configuracion.empresa(), al, activo!, cliente!) };
  }
}
