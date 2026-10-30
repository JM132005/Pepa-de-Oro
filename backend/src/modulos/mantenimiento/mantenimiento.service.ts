// mantenimiento.service.ts → taller: preventivos automáticos (RN-26), correctivos, servicios a clientes,
// repuestos de bodega e indicadores MTBF / MTTR.

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
// Cron: decorador de @nestjs/schedule para ejecutar un método a una hora fija (como una alarma).
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { OrdenMantenimiento } from './esquemas/orden-mantenimiento.esquema.js';
import { Activo } from '../equipos/esquemas/activo.esquema.js';
import { Cliente } from '../ventas/esquemas/cliente.esquema.js';
import { Producto } from '../productos/esquemas/producto.esquema.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { ContadoresService } from '../../comun/servicios/contadores.service.js';
import { PdfService } from '../../comun/servicios/pdf.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { costoOrden, estadoPreventivo, indicadoresTaller } from './mantenimiento.reglas.js';
import { horasEntre, redondear, sumarDias } from '../../comun/utilidades.js';
import { pdfOrdenMantenimiento } from './pdf-orden.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { AsignarDto, PresupuestoDto, ReportarFallaDto, ServicioClienteDto, TerminarOrdenDto } from './dto/mantenimiento.dto.js';

const ABIERTAS = ['ABIERTA', 'EN_PROCESO', 'ESPERANDO_REPUESTO'];

@Injectable()
export class MantenimientoService {
  private readonly logger = new Logger(MantenimientoService.name);

  constructor(
    @InjectModel(OrdenMantenimiento.name) private readonly ordenes: Model<OrdenMantenimiento>,
    @InjectModel(Activo.name) private readonly activos: Model<Activo>,
    @InjectModel(Cliente.name) private readonly clientes: Model<Cliente>,
    @InjectModel(Producto.name) private readonly productos: Model<Producto>,
    private readonly inventario: InventarioService,
    private readonly contadores: ContadoresService,
    private readonly pdf: PdfService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  listar(f: { estado?: string; tipo?: string; activo?: string }) {
    const q: Record<string, unknown> = {};
    if (f.estado) q.estado = { $in: f.estado.split(',') };
    if (f.tipo) q.tipo = f.tipo;
    if (f.activo) q.activo = f.activo;
    return this.ordenes.find(q).populate('activo', 'codigo nombre tipo').populate('cliente', 'nombre').sort({ createdAt: -1 }).limit(300).lean().exec();
  }

  async obtener(id: string) {
    const o = await this.ordenes.findById(id).populate('activo').populate('cliente').populate('factura', 'numero total').lean().exec();
    if (!o) throw new NotFoundException('Orden no encontrada');
    return o;
  }

  // usoActual(): horas para máquinas, km para vehículos.
  private usoActual(a: Activo) {
    return ['CAMION', 'FURGON'].includes(a.tipo) ? a.odometro : a.horometro;
  }

  // planPreventivo(): estado de cada tarea de cada activo (vencida, próxima o al día).
  async planPreventivo() {
    const config = await this.configuracion.obtener();
    const activos = await this.activos.find({ estado: { $nin: ['VENDIDO', 'BAJA'] }, 'planMantenimiento.0': { $exists: true } }).sort({ codigo: 1 }).lean().exec();
    return activos.flatMap((a) =>
      a.planMantenimiento.map((t) => ({ activoId: a._id, activo: a.codigo, nombre: a.nombre, tarea: t.tarea, cadaDias: t.cadaDias, cadaUso: t.cadaUso, usoActual: this.usoActual(a), ...estadoPreventivo(t, this.usoActual(a), new Date(), config.alertas.diasAvisoMantenimiento) })),
    );
  }

  // generarPreventivos(): RN-26 — crea la orden de cada tarea vencida (si no hay ya una abierta).
  // @Cron('0 6 * * *') → todos los días a las 06:00 (formato: minuto hora día mes día-semana).
  @Cron('0 6 * * *')
  async generarPreventivos() {
    const plan = await this.planPreventivo();
    let creadas = 0;
    for (const p of plan.filter((x) => x.vencida)) {
      const existe = await this.ordenes.exists({ activo: String(p.activoId), tarea: p.tarea, estado: { $in: ABIERTAS } });
      if (existe) continue;
      await this.ordenes.create({ codigo: await this.contadores.codigoAnual('OM'), tipo: 'PREVENTIVO', activo: String(p.activoId), tarea: p.tarea, prioridad: 'MEDIA', programada: new Date(), checklist: [{ tarea: p.tarea, hecha: false }], observaciones: `Generada automáticamente: ${p.motivo}` });
      creadas++;
    }
    if (creadas) this.logger.log(`🔧 ${creadas} orden(es) preventiva(s) generada(s)`);
    return { creadas };
  }

  // reportarFalla(): correctivo urgente; el activo queda bloqueado (EN_MANTENIMIENTO) para uso, alquiler y viajes.
  async reportarFalla(dto: ReportarFallaDto, usuario: UsuarioToken) {
    const activo = await this.activos.findById(dto.activo).lean().exec();
    if (!activo) throw new NotFoundException('Activo no encontrado');
    if (['VENDIDO', 'BAJA'].includes(activo.estado)) throw new BadRequestException('El activo ya no está en la flota');
    const orden = await this.ordenes.create({
      codigo: await this.contadores.codigoAnual('OM'),
      tipo: 'CORRECTIVO',
      activo: dto.activo,
      falla: { descripcion: dto.descripcion, reportadoPor: usuario.nombre, fecha: new Date() },
      prioridad: dto.prioridad ?? 'ALTA',
      inicio: new Date(),
    });
    await this.activos.updateOne({ _id: dto.activo }, { $set: { estado: 'EN_MANTENIMIENTO' } }).exec();
    return orden;
  }

  // servicioCliente(): se registra el equipo del cliente, se presupuesta, se ejecuta y se factura.
  async servicioCliente(dto: ServicioClienteDto, usuario: UsuarioToken) {
    if (!(await this.clientes.exists({ _id: dto.cliente }))) throw new NotFoundException('Cliente no encontrado');
    return this.ordenes.create({
      codigo: await this.contadores.codigoAnual('OM'),
      tipo: 'SERVICIO_CLIENTE',
      cliente: dto.cliente,
      equipoCliente: dto.equipoCliente,
      falla: { descripcion: dto.falla, reportadoPor: usuario.nombre, fecha: new Date() },
      programada: dto.programada ? new Date(dto.programada) : new Date(),
      prioridad: 'MEDIA',
    });
  }

  async presupuestar(id: string, dto: PresupuestoDto) {
    return this.ordenes.findByIdAndUpdate(id, { $set: { presupuesto: { total: dto.total, aprobado: dto.aprobado ?? false, fecha: new Date() } } }, { returnDocument: 'after' }).lean().exec();
  }

  async asignar(id: string, dto: AsignarDto) {
    const set: Record<string, unknown> = {};
    if (dto.tecnicoNombre) set.tecnico = { id: dto.tecnicoId ?? '', nombre: dto.tecnicoNombre };
    if (dto.programada) set.programada = new Date(dto.programada);
    return this.ordenes.findByIdAndUpdate(id, { $set: set }, { returnDocument: 'after' }).lean().exec();
  }

  // iniciar(): el activo entra al taller.
  async iniciar(id: string) {
    const o = await this.ordenes.findById(id).lean().exec();
    if (!o || !['ABIERTA', 'ESPERANDO_REPUESTO'].includes(o.estado)) throw new BadRequestException('Solo se inician órdenes abiertas o esperando repuesto');
    if (o.tipo === 'SERVICIO_CLIENTE' && o.presupuesto && !o.presupuesto.aprobado) throw new BadRequestException('El cliente aún no aprueba el presupuesto');
    if (o.activo) await this.activos.updateOne({ _id: o.activo }, { $set: { estado: 'EN_MANTENIMIENTO' } }).exec();
    return this.ordenes.findByIdAndUpdate(id, { $set: { estado: 'EN_PROCESO', inicio: o.inicio ?? new Date() } }, { returnDocument: 'after' }).lean().exec();
  }

  async esperarRepuesto(id: string) {
    return this.ordenes.findOneAndUpdate({ _id: id, estado: 'EN_PROCESO' }, { $set: { estado: 'ESPERANDO_REPUESTO' } }, { returnDocument: 'after' }).lean().exec();
  }

  // agregarRepuesto(): sale de la bodega de repuestos (kardex) y se suma al costo de la orden.
  async agregarRepuesto(id: string, productoId: string, cantidad: number, usuario: UsuarioToken) {
    const o = await this.ordenes.findById(id).lean().exec();
    if (!o || !['ABIERTA', 'EN_PROCESO', 'ESPERANDO_REPUESTO'].includes(o.estado)) throw new BadRequestException('La orden no está abierta');
    const producto = await this.productos.findById(productoId).lean().exec();
    if (!producto) throw new NotFoundException('Repuesto no encontrado');
    const bodega = await this.inventario.bodegaPorTipo('REPUESTOS');
    const salida = await this.inventario.salida({ productoId, cantidad, tipo: 'SALIDA_MANTENIMIENTO', bodegaId: String(bodega._id), documento: { tipo: 'ORDEN_MANTENIMIENTO', numero: o.codigo, id }, usuario: usuario.nombre });
    const costo = redondear(salida.reduce((s, x) => s + x.cantidad * x.costoUnitario, 0) / cantidad, 4);
    const repuestos = [...o.repuestos, { producto: productoId, nombre: producto.nombre, cantidad, costoUnitario: costo }];
    const costos = costoOrden(repuestos, o.horasManoObra, o.costoHora);
    return this.ordenes.findByIdAndUpdate(id, { $set: { repuestos, costos } }, { returnDocument: 'after' }).lean().exec();
  }

  // terminar(): el activo vuelve a DISPONIBLE y el plan preventivo se reinicia desde hoy y el uso actual.
  async terminar(id: string, dto: TerminarOrdenDto) {
    const o = await this.ordenes.findById(id).lean().exec();
    if (!o || !['EN_PROCESO', 'ABIERTA'].includes(o.estado)) throw new BadRequestException('Solo se terminan órdenes en proceso');
    const costos = costoOrden(o.repuestos, dto.horasManoObra, o.costoHora);
    const fin = new Date();
    if (o.activo) {
      const activo = await this.activos.findById(o.activo).lean().exec();
      const uso = dto.usoAlCerrar ?? (activo ? this.usoActual(activo) : 0);
      const set: Record<string, unknown> = { estado: 'DISPONIBLE' };
      if (activo && dto.usoAlCerrar !== undefined) set[['CAMION', 'FURGON'].includes(activo.tipo) ? 'odometro' : 'horometro'] = dto.usoAlCerrar;
      if (activo && o.tarea) set.planMantenimiento = activo.planMantenimiento.map((t) => (t.tarea === o.tarea ? { ...t, ultimaFecha: fin, ultimoUso: uso } : t));
      await this.activos.updateOne({ _id: o.activo }, { $set: set }).exec();
    }
    return this.ordenes
      .findByIdAndUpdate(id, { $set: { estado: 'TERMINADA', fin, horasManoObra: dto.horasManoObra, costos, usoAlCerrar: dto.usoAlCerrar, checklist: dto.checklist ?? o.checklist, observaciones: dto.observaciones ?? o.observaciones } }, { returnDocument: 'after' })
      .lean()
      .exec();
  }

  async cancelar(id: string) {
    const o = await this.ordenes.findOneAndUpdate({ _id: id, estado: { $in: ['ABIERTA', 'ESPERANDO_REPUESTO'] } }, { $set: { estado: 'CANCELADA' } }, { returnDocument: 'after' }).lean().exec();
    if (!o) throw new BadRequestException('Solo se cancelan órdenes abiertas');
    if (o.activo && !(await this.ordenes.exists({ activo: o.activo, estado: { $in: ['EN_PROCESO'] } }))) await this.activos.updateOne({ _id: o.activo, estado: 'EN_MANTENIMIENTO' }, { $set: { estado: 'DISPONIBLE' } }).exec();
    return o;
  }

  // indicadores(): MTBF, MTTR y disponibilidad por activo en los últimos N días.
  async indicadores(dias = 90) {
    const desde = sumarDias(new Date(), -dias);
    const horasPeriodo = dias * 24;
    const activos = await this.activos.find({ estado: { $nin: ['VENDIDO', 'BAJA'] }, tipo: { $nin: ['TENDAL', 'FERMENTADOR'] } }).sort({ codigo: 1 }).lean().exec();
    const correctivos = await this.ordenes.find({ tipo: 'CORRECTIVO', inicio: { $gte: desde } }).lean().exec();
    const todas = await this.ordenes.find({ createdAt: { $gte: desde }, activo: { $exists: true } }).lean().exec();
    return activos.map((a) => {
      const propias = correctivos.filter((o) => String(o.activo) === String(a._id));
      const reparaciones = propias.map((o) => ({ horas: horasEntre(o.inicio ?? new Date(), o.fin ?? new Date()) }));
      const costo = todas.filter((o) => String(o.activo) === String(a._id)).reduce((s, o) => s + (o.costos?.costoTotal ?? 0), 0);
      return { activoId: a._id, codigo: a.codigo, nombre: a.nombre, tipo: a.tipo, ...indicadoresTaller(horasPeriodo, reparaciones), costoMantenimiento: redondear(costo), valorActual: a.valorActual };
    });
  }

  async pdfOrden(id: string) {
    const o = await this.ordenes.findById(id).lean().exec();
    if (!o) throw new NotFoundException('Orden no encontrada');
    const activo = o.activo ? await this.activos.findById(o.activo).lean().exec() : null;
    const cliente = o.cliente ? await this.clientes.findById(o.cliente).lean().exec() : null;
    const equipo = activo ? `${activo.codigo} · ${activo.nombre} ${activo.marca ?? ''}` : `${o.equipoCliente?.descripcion ?? ''} ${o.equipoCliente?.marca ?? ''} ${o.equipoCliente?.serie ?? ''}`;
    return { orden: o, buffer: await pdfOrdenMantenimiento(this.pdf, await this.configuracion.empresa(), o, equipo, cliente?.nombre) };
  }
}
