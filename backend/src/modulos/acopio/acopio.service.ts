// acopio.service.ts → compra a productores: recepción en báscula, liquidación, pagos y anticipos.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Productor } from './esquemas/productor.esquema.js';
import { PrecioDia } from './esquemas/precio-dia.esquema.js';
import { Liquidacion } from './esquemas/liquidacion.esquema.js';
import { CrudBase } from '../../comun/crud-base.service.js';
import { validarCedula } from '../../comun/identificacion.reglas.js';
import { calcularLiquidacion, estadoPago, verificarProductorActivo } from './acopio.reglas.js';
import { PoscosechaService } from '../poscosecha/poscosecha.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { ContadoresService } from '../../comun/servicios/contadores.service.js';
import { PdfService } from '../../comun/servicios/pdf.service.js';
import { claveAcceso, numeroComprobante } from '../facturacion/facturacion.reglas.js';
import { escaparRegex, redondear } from '../../comun/utilidades.js';
import { LIMITES, VARIEDADES_POR_CULTIVO, type Cultivo, type Variedad } from '../../comun/constantes.js';
import { pdfLiquidacion } from './pdf-liquidacion.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { ActualizarProductorDto, CrearProductorDto, PagoProductorDto, PrecioDiaDto, RecepcionDto } from './dto/acopio.dto.js';

@Injectable()
export class AcopioService extends CrudBase<Productor> {
  constructor(
    @InjectModel(Productor.name) modelo: Model<Productor>,
    @InjectModel(PrecioDia.name) private readonly precios: Model<PrecioDia>,
    @InjectModel(Liquidacion.name) private readonly liquidaciones: Model<Liquidacion>,
    private readonly poscosecha: PoscosechaService,
    private readonly configuracion: ConfiguracionService,
    private readonly contadores: ContadoresService,
    private readonly pdf: PdfService,
  ) {
    super(modelo, 'Productor', [], { nombre: 1 });
  }

  // ─────────── Productores ───────────
  async crearProductor(dto: CrearProductorDto) {
    if (!validarCedula(dto.cedula)) throw new BadRequestException(`RN-02: la cédula ${dto.cedula} no es válida`);
    if (await this.modelo.exists({ cedula: dto.cedula })) throw new BadRequestException('Ya existe un productor con esa cédula');
    return this.crear(dto);
  }

  async actualizarProductor(id: string, dto: ActualizarProductorDto) {
    if (dto.cedula && !validarCedula(dto.cedula)) throw new BadRequestException(`RN-02: la cédula ${dto.cedula} no es válida`);
    return this.actualizar(id, dto);
  }

  buscar(q?: string, soloActivos?: boolean) {
    const f: Record<string, unknown> = {};
    if (soloActivos) f.activo = true;
    if (q) {
      const r = { $regex: escaparRegex(q), $options: 'i' };
      f.$or = [{ nombre: r }, { cedula: r }, { canton: r }];
    }
    return this.listar(f);
  }

  // detalleProductor(): ficha + sus entregas + saldo que se le debe.
  async detalleProductor(id: string) {
    const productor = await this.obtener(id);
    const liquidaciones = await this.liquidaciones.find({ 'productor.id': id }).sort({ fecha: -1 }).lean().exec();
    const porPagar = redondear(liquidaciones.reduce((s, l) => s + l.saldo, 0));
    const kg = redondear(liquidaciones.reduce((s, l) => s + (l.kgPagables ?? 0), 0));
    return { ...productor, liquidaciones, porPagar, kgEntregados: kg };
  }

  async anticipo(id: string, monto: number, motivo: string | undefined, usuario: UsuarioToken) {
    const p = await this.obtener(id);
    const err = verificarProductorActivo(p);
    if (err) throw new BadRequestException(err);
    // $inc suma al saldo y $push agrega al historial en una sola operación.
    await this.modelo.updateOne({ _id: id }, { $inc: { saldoAnticipo: monto }, $push: { anticipos: { fecha: new Date(), monto, motivo, usuario: usuario.nombre } } }).exec();
    return this.obtener(id);
  }

  // ─────────── Precio del día ───────────
  async registrarPrecio(dto: PrecioDiaDto, usuario: UsuarioToken) {
    if (!VARIEDADES_POR_CULTIVO[dto.cultivo as Cultivo].includes(dto.variedad as Variedad)) throw new BadRequestException(`${dto.variedad} no es una variedad de ${dto.cultivo}`);
    return this.precios.create({ ...dto, usuario: usuario.nombre });
  }

  // preciosVigentes(): el último precio de cada combinación cultivo + variedad + estado.
  async preciosVigentes() {
    const todos = await this.precios.find().sort({ fecha: -1 }).limit(500).lean().exec();
    const vistos = new Set<string>();
    return todos.filter((p) => {
      const clave = `${p.cultivo}-${p.variedad}-${p.estado}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    });
  }

  historialPrecios(cultivo?: string) {
    return this.precios.find(cultivo ? { cultivo } : {}).sort({ fecha: 1 }).limit(1000).lean().exec();
  }

  private async precioActual(cultivo: string, variedad: string, estado: string) {
    const p = await this.precios.findOne({ cultivo, variedad, estado }).sort({ fecha: -1 }).lean().exec();
    if (!p) throw new BadRequestException(`No hay precio del día para ${cultivo} ${variedad} ${estado}; regístralo primero`);
    return p.precioQq;
  }

  // ─────────── Recepción + liquidación ───────────
  async recibir(dto: RecepcionDto, usuario: UsuarioToken) {
    const productor = await this.obtener(dto.productorId);
    const errorActivo = verificarProductorActivo(productor); // RN-03
    if (errorActivo) throw new BadRequestException(errorActivo);
    if (!VARIEDADES_POR_CULTIVO[dto.cultivo as Cultivo].includes(dto.variedad as Variedad)) throw new BadRequestException(`${dto.variedad} no es una variedad de ${dto.cultivo}`);
    const config = await this.configuracion.obtener();
    const precioQq = dto.precioQq ?? (await this.precioActual(dto.cultivo, dto.variedad, dto.estadoEntrega));
    const organico = productor.certificaciones.some((c) => c.tipo === 'ORGANICO' && new Date(c.vence) >= new Date());
    const calculo = calcularLiquidacion({
      kgBrutos: dto.kgBrutos,
      taraKg: dto.taraKg ?? 0,
      humedad: dto.humedad,
      impurezasPct: dto.impurezasPct ?? 0,
      estado: dto.estadoEntrega,
      precioQq,
      organico,
      bonoOrganicoQq: config.acopio.bonoOrganicoQq,
      retencionPct: config.acopio.retencionRentaPct,
      saldoAnticipo: dto.descontarAnticipo === false ? 0 : productor.saldoAnticipo,
      humedadReferencia: config.acopio.humedadReferencia,
    });

    // Número y clave de acceso de la liquidación de compra (tipo 03 del SRI).
    const empresa = config.empresa;
    const secuencial = await this.contadores.siguiente(`LC-${empresa.establecimiento}-${empresa.puntoEmision}`);
    const fecha = new Date();
    const numero = `LC-${numeroComprobante(empresa.establecimiento, empresa.puntoEmision, secuencial)}`;
    const clave = claveAcceso({ fecha, tipoComprobante: '03', ruc: empresa.ruc, ambiente: empresa.ambiente, establecimiento: empresa.establecimiento, puntoEmision: empresa.puntoEmision, secuencial, codigoNumerico: String(30_000_000 + secuencial) });

    // El lote de grano entra al flujo de poscosecha con su costo (lo que se paga + anticipo usado).
    const costoLote = redondear(calculo.totalPagar + calculo.anticipoDescontado + calculo.retencion);
    const lote = await this.poscosecha.crearLote({
      origen: 'COMPRA',
      cultivo: dto.cultivo,
      variedad: dto.variedad,
      estadoEntrega: dto.estadoEntrega,
      kgEntrada: calculo.kgPagables,
      humedadEntrada: dto.humedad,
      costoTotal: costoLote,
      productor: { id: String(productor._id), nombre: productor.nombre, canton: productor.canton },
      usuario: usuario.nombre,
      fecha,
    });

    const liquidacion = await this.liquidaciones.create({
      numero,
      secuencial,
      claveAcceso: clave,
      fecha,
      productor: { id: String(productor._id), cedula: productor.cedula, nombre: productor.nombre, canton: productor.canton },
      loteGrano: String(lote._id),
      codigoLote: lote.codigo,
      cultivo: dto.cultivo,
      variedad: dto.variedad,
      estadoEntrega: dto.estadoEntrega,
      kgBrutos: dto.kgBrutos,
      taraKg: dto.taraKg ?? 0,
      humedad: dto.humedad,
      impurezasPct: dto.impurezasPct ?? 0,
      ...calculo,
      precioQq,
      bonos: calculo.bonoOrganico ? [{ concepto: 'Bono orgánico certificado', monto: calculo.bonoOrganico }] : [],
      pagado: 0,
      saldo: calculo.totalPagar,
      estadoPago: calculo.totalPagar > 0 ? 'PENDIENTE' : 'PAGADA',
      usuario: usuario.nombre,
      observaciones: dto.observaciones,
    });
    await this.poscosecha.vincular(String(lote._id), { liquidacion: String(liquidacion._id) });
    if (calculo.anticipoDescontado > 0) await this.modelo.updateOne({ _id: productor._id }, { $inc: { saldoAnticipo: -calculo.anticipoDescontado } }).exec();
    return { liquidacion: liquidacion.toObject(), lote: lote.toObject(), kgSecosEstimados: calculo.kgSecosEstimados };
  }

  // ─────────── Liquidaciones y pagos ───────────
  listarLiquidaciones(f: { estadoPago?: string; productor?: string }) {
    const q: Record<string, unknown> = {};
    if (f.estadoPago) q.estadoPago = { $in: f.estadoPago.split(',') };
    if (f.productor) q['productor.id'] = f.productor;
    return this.liquidaciones.find(q).sort({ fecha: -1 }).limit(500).lean().exec();
  }

  async liquidacion(id: string) {
    const l = await this.liquidaciones.findById(id).lean().exec();
    if (!l) throw new NotFoundException('Liquidación no encontrada');
    return l;
  }

  async pagar(id: string, dto: PagoProductorDto, usuario: UsuarioToken) {
    const l = await this.liquidacion(id);
    if (dto.monto > l.saldo + 0.005) throw new BadRequestException(`El pago supera el saldo (${l.saldo})`);
    const pagado = redondear(l.pagado + dto.monto);
    await this.liquidaciones
      .updateOne({ _id: id }, { $push: { pagos: { fecha: new Date(), monto: dto.monto, forma: dto.forma, referencia: dto.referencia, usuario: usuario.nombre } }, $set: { pagado, saldo: redondear(l.totalPagar - pagado), estadoPago: estadoPago(l.totalPagar, pagado) } })
      .exec();
    return this.liquidacion(id);
  }

  // bonoPremium(): Calidad lo llama cuando un lote comprado sale PREMIUM → se suma el bono al productor.
  async bonoPremium(liquidacionId: string) {
    const l = await this.liquidaciones.findById(liquidacionId).lean().exec();
    if (!l || l.bonos.some((b) => b.concepto.includes('premium'))) return;
    const config = await this.configuracion.obtener();
    const monto = redondear((l.kgPagables / LIMITES.kgPorQuintal) * config.acopio.bonoPremiumQq);
    await this.liquidaciones.updateOne({ _id: l._id }, { $push: { bonos: { concepto: 'Bono calidad premium', monto } }, $inc: { totalPagar: monto, saldo: monto }, $set: { estadoPago: 'PARCIAL' } }).exec();
    const actual = await this.liquidaciones.findById(l._id).lean().exec();
    await this.liquidaciones.updateOne({ _id: l._id }, { $set: { estadoPago: estadoPago(actual!.totalPagar, actual!.pagado) } }).exec();
  }

  // actualizarCalificacion(): promedio de fermentación de las entregas (para el ranking de productores).
  async actualizarCalificacion(productorId: string, fermentacion: number) {
    const p = await this.modelo.findById(productorId).lean().exec();
    if (!p) return;
    const nueva = p.calificacion ? redondear((p.calificacion * 3 + fermentacion) / 4, 1) : fermentacion; // promedio móvil
    await this.modelo.updateOne({ _id: productorId }, { $set: { calificacion: nueva } }).exec();
  }

  async pdfLiquidacion(id: string) {
    const l = await this.liquidacion(id);
    return { liquidacion: l, buffer: await pdfLiquidacion(this.pdf, await this.configuracion.empresa(), l) };
  }
}
