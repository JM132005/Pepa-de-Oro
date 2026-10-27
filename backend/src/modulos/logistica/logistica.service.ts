// logistica.service.ts → viajes: asignación de camión y chofer, guía de remisión, costos y fletes.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Viaje } from './esquemas/viaje.esquema.js';
import { Activo } from '../equipos/esquemas/activo.esquema.js';
import { Trabajador } from '../campo/esquemas/trabajador.esquema.js';
import { Cliente } from '../ventas/esquemas/cliente.esquema.js';
import { ContadoresService } from '../../comun/servicios/contadores.service.js';
import { PdfService } from '../../comun/servicios/pdf.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { costoPorKm, kmRecorridos, tarifaFlete, verificarCarga, verificarChofer } from './logistica.reglas.js';
import { verificarActivoUsable } from '../equipos/equipos.reglas.js';
import { relleno } from '../../comun/utilidades.js';
import { pdfGuia } from './pdf-guia.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { CompletarViajeDto, CrearViajeDto } from './dto/logistica.dto.js';

@Injectable()
export class LogisticaService {
  constructor(
    @InjectModel(Viaje.name) private readonly viajes: Model<Viaje>,
    @InjectModel(Activo.name) private readonly activos: Model<Activo>,
    @InjectModel(Trabajador.name) private readonly trabajadores: Model<Trabajador>,
    @InjectModel(Cliente.name) private readonly clientes: Model<Cliente>,
    private readonly contadores: ContadoresService,
    private readonly pdf: PdfService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  listar(f: { estado?: string; camion?: string }) {
    const q: Record<string, unknown> = {};
    if (f.estado) q.estado = { $in: f.estado.split(',') };
    if (f.camion) q.camion = f.camion;
    return this.viajes.find(q).populate('camion', 'codigo nombre placa capacidadKg').populate('chofer', 'nombre').populate('cliente', 'nombre').sort({ salida: -1 }).limit(300).lean().exec();
  }

  async obtener(id: string) {
    const v = await this.viajes.findById(id).populate('camion').populate('chofer').populate('cliente').populate('pedido', 'numero').lean().exec();
    if (!v) throw new NotFoundException('Viaje no encontrado');
    return v;
  }

  // crear(): RN-24 (camión usable), RN-25 (capacidad) y chofer con licencia y sin otro viaje a la vez.
  async crear(dto: CrearViajeDto, usuario: UsuarioToken) {
    const camion = await this.activos.findById(dto.camion).lean().exec();
    if (!camion || !['CAMION', 'FURGON'].includes(camion.tipo)) throw new BadRequestException('Elige un camión o furgón válido');
    const usable = verificarActivoUsable(camion);
    if (usable) throw new BadRequestException(usable);
    const carga = verificarCarga(dto.carga.pesoKg, camion.capacidadKg, camion.codigo);
    if (carga) throw new BadRequestException(carga);
    const chofer = await this.trabajadores.findById(dto.chofer).lean().exec();
    if (!chofer || chofer.cargo !== 'CHOFER') throw new BadRequestException('Elige un chofer válido');
    const salida = new Date(dto.salida);
    const llegada = new Date(dto.llegadaEstimada);
    if (llegada <= salida) throw new BadRequestException('La llegada estimada debe ser después de la salida');
    const otros = await this.viajes.find({ chofer: dto.chofer, estado: { $in: ['PROGRAMADO', 'EN_RUTA'] } }).lean().exec();
    const errorChofer = verificarChofer(chofer, salida, llegada, otros);
    if (errorChofer) throw new BadRequestException(errorChofer);
    const camionOcupado = await this.viajes.findOne({ camion: dto.camion, estado: { $in: ['PROGRAMADO', 'EN_RUTA'] }, salida: { $lt: llegada }, llegadaEstimada: { $gt: salida } }).lean().exec();
    if (camionOcupado) throw new BadRequestException(`${camion.codigo} ya tiene el viaje ${camionOcupado.codigo} en ese horario`);
    const tarifa = dto.tarifa ? { ...dto.tarifa, total: tarifaFlete(dto.tarifa.modo as 'POR_KM', dto.tarifa.valor, dto.kmEstimados ?? 0, dto.carga.pesoKg) } : undefined;
    const n = await this.contadores.siguiente('GUIA-001-001');
    return this.viajes.create({
      ...dto,
      codigo: await this.contadores.codigoAnual('V'),
      salida,
      llegadaEstimada: llegada,
      kmEstimados: dto.kmEstimados ?? 0,
      tarifa,
      guiaRemision: `001-001-${relleno(n, 9)}`,
      solicitadoPor: usuario.nombre,
    });
  }

  // iniciar(): el camión sale → EN_VIAJE.
  async iniciar(id: string, kmSalida: number) {
    const v = await this.viajes.findById(id).lean().exec();
    if (!v || v.estado !== 'PROGRAMADO') throw new BadRequestException('Solo se inician viajes programados');
    const camion = await this.activos.findById(v.camion).lean().exec();
    const usable = verificarActivoUsable(camion!);
    if (usable) throw new BadRequestException(usable);
    await this.activos.updateOne({ _id: v.camion }, { $set: { estado: 'EN_VIAJE' } }).exec();
    return this.viajes.findByIdAndUpdate(id, { $set: { estado: 'EN_RUTA', kmSalida, salida: new Date() } }, { returnDocument: 'after' }).lean().exec();
  }

  // completar(): llega el camión: km recorridos, costos y el odómetro del activo (alimenta el preventivo por km).
  async completar(id: string, dto: CompletarViajeDto) {
    const v = await this.viajes.findById(id).lean().exec();
    if (!v || v.estado !== 'EN_RUTA') throw new BadRequestException('Solo se completan viajes en ruta');
    const km = kmRecorridos(v.kmSalida ?? 0, dto.kmLlegada);
    await this.activos.updateOne({ _id: v.camion }, { $set: { estado: 'DISPONIBLE', odometro: dto.kmLlegada } }).exec();
    const costos = { combustible: dto.combustible ?? 0, peajes: dto.peajes ?? 0, viaticos: dto.viaticos ?? 0 };
    const tarifa = v.tarifa ? { ...v.tarifa, total: tarifaFlete(v.tarifa.modo as 'POR_KM', v.tarifa.valor, km, v.carga.pesoKg) } : undefined;
    return this.viajes.findByIdAndUpdate(id, { $set: { estado: 'ENTREGADO', llegada: new Date(), kmLlegada: dto.kmLlegada, costos, tarifa, observaciones: dto.observaciones ?? v.observaciones } }, { returnDocument: 'after' }).lean().exec();
  }

  async cancelar(id: string) {
    const r = await this.viajes.findOneAndUpdate({ _id: id, estado: 'PROGRAMADO' }, { $set: { estado: 'CANCELADO' } }, { returnDocument: 'after' }).lean().exec();
    if (!r) throw new BadRequestException('Solo se cancelan viajes programados');
    return r;
  }

  // costosPorCamion(): km, costo total y costo por km de cada camión (KPI de logística).
  async costosPorCamion() {
    const viajes = await this.viajes.find({ estado: 'ENTREGADO' }).populate('camion', 'codigo nombre').lean().exec();
    const mapa = new Map<string, { camion: string; viajes: number; km: number; combustible: number; peajes: number; viaticos: number; ingresos: number }>();
    for (const v of viajes) {
      const c = v.camion as unknown as Activo;
      const r = mapa.get(c.codigo) ?? { camion: c.codigo, viajes: 0, km: 0, combustible: 0, peajes: 0, viaticos: 0, ingresos: 0 };
      r.viajes++;
      r.km += (v.kmLlegada ?? 0) - (v.kmSalida ?? 0);
      r.combustible += v.costos?.combustible ?? 0;
      r.peajes += v.costos?.peajes ?? 0;
      r.viaticos += v.costos?.viaticos ?? 0;
      r.ingresos += v.tarifa?.total ?? 0;
      mapa.set(c.codigo, r);
    }
    return [...mapa.values()].map((r) => ({ ...r, costoPorKm: costoPorKm(r, r.km) }));
  }

  async guia(id: string) {
    const v = await this.viajes.findById(id).lean().exec();
    if (!v) throw new NotFoundException('Viaje no encontrado');
    const camion = await this.activos.findById(v.camion).lean().exec();
    const chofer = await this.trabajadores.findById(v.chofer).lean().exec();
    const cliente = v.cliente ? await this.clientes.findById(v.cliente).lean().exec() : null;
    return { viaje: v, buffer: await pdfGuia(this.pdf, await this.configuracion.empresa(), v, camion!, chofer!, cliente ?? undefined) };
  }
}
