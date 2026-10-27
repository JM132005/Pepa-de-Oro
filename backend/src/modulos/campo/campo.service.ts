// campo.service.ts → haciendas propias: parcelas, labores, sanidad, clima y cosechas.
// Responde tres preguntas: cuánto produce cada parcela, cuánto cuesta y qué labor toca hoy.

import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Model } from 'mongoose';
import { Hacienda } from './esquemas/hacienda.esquema.js';
import { Parcela } from './esquemas/parcela.esquema.js';
import { Trabajador } from './esquemas/trabajador.esquema.js';
import { Labor } from './esquemas/labor.esquema.js';
import { MonitoreoSanidad } from './esquemas/monitoreo-sanidad.esquema.js';
import { Clima } from './esquemas/clima.esquema.js';
import { Cosecha } from './esquemas/cosecha.esquema.js';
import { LoteGrano } from '../poscosecha/esquemas/lote-grano.esquema.js';
import { Producto } from '../productos/esquemas/producto.esquema.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { PoscosechaService } from '../poscosecha/poscosecha.service.js';
import { costoPorKg, etapaProductiva, incidencia, laboresAtrasadas, rendimientoKgHa, verificarCarencia } from './campo.reglas.js';
import { LIMITES } from '../../comun/constantes.js';
import { redondear, sumarDias } from '../../comun/utilidades.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { CrearClimaDto, CrearCosechaDto, CrearLaborDto, CrearMonitoreoDto } from './dto/campo.dto.js';

@Injectable()
export class CampoService implements OnModuleInit {
  private readonly logger = new Logger(CampoService.name);

  constructor(
    @InjectConnection() private readonly conexion: Connection,
    @InjectModel(Hacienda.name) readonly haciendas: Model<Hacienda>,
    @InjectModel(Parcela.name) readonly parcelas: Model<Parcela>,
    @InjectModel(Trabajador.name) readonly trabajadores: Model<Trabajador>,
    @InjectModel(Labor.name) private readonly labores: Model<Labor>,
    @InjectModel(MonitoreoSanidad.name) private readonly monitoreos: Model<MonitoreoSanidad>,
    @InjectModel(Clima.name) private readonly clima: Model<Clima>,
    @InjectModel(Cosecha.name) private readonly cosechas: Model<Cosecha>,
    @InjectModel(LoteGrano.name) private readonly lotesGrano: Model<LoteGrano>,
    @InjectModel(Producto.name) private readonly productos: Model<Producto>,
    private readonly inventario: InventarioService,
    private readonly poscosecha: PoscosechaService,
  ) {}

  // onModuleInit(): se ejecuta al arrancar. Crea "clima" como colección time series si no existe.
  async onModuleInit() {
    await this.prepararColecciones();
  }

  async prepararColecciones() {
    try {
      const existe = await this.conexion.db!.listCollections({ name: 'clima' }).toArray();
      if (!existe.length) {
        await this.conexion.db!.createCollection('clima', { timeseries: { timeField: 'fecha', metaField: 'hacienda', granularity: 'hours' } });
      }
    } catch {
      // Si el servidor no soporta time series (Mongo < 5 o un emulador), se usa una colección normal.
      this.logger.warn('La base no soporta time series; "clima" será una colección normal');
    }
  }

  // ─────────── Parcelas ───────────

  // aplicaciones(): fumigaciones con período de carencia de una parcela (para RN-01).
  private async aplicaciones(parcelaId: string) {
    const labores = await this.labores.find({ parcela: parcelaId, 'agroquimico.diasCarencia': { $gt: 0 } }).sort({ fecha: -1 }).limit(20).lean().exec();
    return labores.map((l) => ({ fecha: l.fecha, producto: l.agroquimico!.producto, diasCarencia: l.agroquimico!.diasCarencia }));
  }

  // fichaParcela(): datos + etapa productiva + carencia + labores atrasadas + KPIs del último año.
  async fichaParcela(id: string) {
    const parcela = await this.parcelas.findById(id).populate('hacienda', 'nombre codigo').lean().exec();
    if (!parcela) throw new NotFoundException('Parcela no encontrada');
    const hace365 = sumarDias(new Date(), -365);
    const [labores, cosechas, monitoreos, aplicaciones] = await Promise.all([
      this.labores.find({ parcela: id }).sort({ fecha: -1 }).limit(50).lean().exec(),
      this.cosechas.find({ parcela: id }).sort({ fecha: -1 }).limit(50).lean().exec(),
      this.monitoreos.find({ parcela: id }).sort({ fecha: -1 }).limit(30).lean().exec(),
      this.aplicaciones(id),
    ]);
    const kpis = await this.kpisParcela(id, hace365, new Date());
    return {
      ...parcela,
      etapa: etapaProductiva(parcela.anioSiembra, parcela.cultivo as 'CACAO' | 'CAFE'),
      bloqueoCarencia: verificarCarencia(aplicaciones, new Date()),
      laboresAtrasadas: laboresAtrasadas(parcela.planLabores),
      labores,
      cosechas,
      monitoreos,
      kpis,
    };
  }

  // kpisParcela(): kg secos, rendimiento por ha y costo por kg en un período.
  async kpisParcela(parcelaId: string, desde: Date, hasta: Date) {
    const parcela = await this.parcelas.findById(parcelaId).lean().exec();
    const labores = await this.labores.find({ parcela: parcelaId, fecha: { $gte: desde, $lte: hasta } }).lean().exec();
    const cosechas = await this.cosechas.find({ parcela: parcelaId, fecha: { $gte: desde, $lte: hasta } }).lean().exec();
    const lotes = await this.lotesGrano.find({ 'parcela.id': parcelaId, fechaRecepcion: { $gte: desde, $lte: hasta } }).lean().exec();
    // kg secos: los reales de los lotes ya secos; para los que aún no, se estima con el rendimiento típico.
    const kgSecos = redondear(
      lotes.reduce((s, l) => s + (l.kgSeco || l.kgEntrada * LIMITES.rendimientoSecado[l.estadoEntrega as keyof typeof LIMITES.rendimientoSecado]), 0),
    );
    const jornales = redondear(labores.reduce((s, l) => s + l.costoManoObra, 0) + cosechas.reduce((s, c) => s + c.costoManoObra, 0));
    const insumos = redondear(labores.reduce((s, l) => s + l.costoInsumos, 0));
    return {
      kgCosechados: redondear(cosechas.reduce((s, c) => s + c.kg, 0)),
      kgSecos,
      rendimientoKgHa: rendimientoKgHa(kgSecos, parcela?.hectareas ?? 0),
      costoJornales: jornales,
      costoInsumos: insumos,
      costoPorKg: costoPorKg(jornales, insumos, kgSecos),
    };
  }

  // agenda(): lo que toca hoy en todas las parcelas: labores atrasadas y parcelas bloqueadas por carencia.
  async agenda() {
    const parcelas = await this.parcelas.find({ estado: { $ne: 'DESCANSO' } }).populate('hacienda', 'nombre').lean().exec();
    const resultado = [];
    for (const p of parcelas) {
      const atrasadas = laboresAtrasadas(p.planLabores);
      const bloqueo = verificarCarencia(await this.aplicaciones(String(p._id)), new Date());
      if (atrasadas.length || bloqueo) resultado.push({ parcela: { _id: p._id, codigo: p.codigo, hacienda: (p.hacienda as unknown as Hacienda)?.nombre }, atrasadas, bloqueo });
    }
    return resultado;
  }

  // ─────────── Labores ───────────
  async registrarLabor(dto: CrearLaborDto, usuario: UsuarioToken) {
    const parcela = await this.parcelas.findById(dto.parcela).lean().exec();
    if (!parcela) throw new NotFoundException('Parcela no encontrada');
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();
    const cuadrilla = await this.armarCuadrilla(dto.cuadrilla ?? []);
    // Insumos: salen de la bodega de insumos de campo (kardex) a su costo real.
    const insumos = [];
    if (dto.insumos?.length) {
      const bodega = await this.inventario.bodegaPorTipo('INSUMOS_CAMPO');
      for (const i of dto.insumos) {
        const producto = await this.productos.findById(i.producto).lean().exec();
        if (!producto) throw new NotFoundException('Insumo no encontrado');
        const salida = await this.inventario.salida({ productoId: i.producto, cantidad: i.cantidad, tipo: 'SALIDA_CAMPO', bodegaId: String(bodega._id), documento: { tipo: 'LABOR', numero: `${parcela.codigo} ${dto.tipo}` }, usuario: usuario.nombre });
        const costo = redondear(salida.reduce((s, x) => s + x.cantidad * x.costoUnitario, 0));
        insumos.push({ producto: i.producto, nombre: producto.nombre, cantidad: i.cantidad, unidad: producto.unidad, costo });
      }
    }
    const costoManoObra = redondear(cuadrilla.reduce((s, c) => s + c.costo, 0));
    const costoInsumos = redondear(insumos.reduce((s, i) => s + i.costo, 0));
    const labor = await this.labores.create({
      parcela: dto.parcela,
      hacienda: parcela.hacienda,
      tipo: dto.tipo,
      fecha,
      responsable: usuario.nombre,
      cuadrilla,
      insumos,
      agroquimico: dto.agroquimico,
      costoManoObra,
      costoInsumos,
      costoTotal: redondear(costoManoObra + costoInsumos),
      observaciones: dto.observaciones,
    });
    await this.actualizarPlan(dto.parcela, dto.tipo, fecha);
    return labor;
  }

  // actualizarPlan(): la próxima labor de este tipo se cuenta desde la fecha de hoy.
  // Se lee el plan, se cambia en JavaScript y se guarda completo (funciona en cualquier versión de MongoDB).
  private async actualizarPlan(parcelaId: string, tipo: string, fecha: Date) {
    const parcela = await this.parcelas.findById(parcelaId).lean().exec();
    if (!parcela?.planLabores.some((t) => t.tipo === tipo)) return;
    const plan = parcela.planLabores.map((t) => (t.tipo === tipo && (!t.ultimaFecha || t.ultimaFecha < fecha) ? { ...t, ultimaFecha: fecha } : t));
    await this.parcelas.updateOne({ _id: parcelaId }, { $set: { planLabores: plan } }).exec();
  }

  private async armarCuadrilla(lista: { trabajador: string; jornales: number }[]) {
    const resultado = [];
    for (const c of lista) {
      const t = await this.trabajadores.findById(c.trabajador).lean().exec();
      if (!t) throw new NotFoundException('Trabajador no encontrado');
      resultado.push({ trabajador: c.trabajador, nombre: t.nombre, jornales: c.jornales, costo: redondear(c.jornales * t.jornalDiario) });
    }
    return resultado;
  }

  listarLabores(f: { parcela?: string; hacienda?: string; tipo?: string }) {
    const q: Record<string, unknown> = {};
    if (f.parcela) q.parcela = f.parcela;
    if (f.hacienda) q.hacienda = f.hacienda;
    if (f.tipo) q.tipo = f.tipo;
    return this.labores.find(q).populate('parcela', 'codigo').sort({ fecha: -1 }).limit(300).lean().exec();
  }

  // ─────────── Sanidad y clima ───────────
  async registrarMonitoreo(dto: CrearMonitoreoDto, usuario: UsuarioToken) {
    if (dto.afectadas > dto.evaluadas) throw new BadRequestException('Las afectadas no pueden ser más que las evaluadas');
    return this.monitoreos.create({ ...dto, fecha: dto.fecha ? new Date(dto.fecha) : new Date(), incidencia: incidencia(dto.afectadas, dto.evaluadas), usuario: usuario.nombre });
  }

  listarMonitoreos(parcela?: string) {
    return this.monitoreos.find(parcela ? { parcela } : {}).populate('parcela', 'codigo').sort({ fecha: -1 }).limit(300).lean().exec();
  }

  registrarClima(dto: CrearClimaDto) {
    return this.clima.create({ ...dto, fecha: new Date(dto.fecha) });
  }

  listarClima(hacienda?: string, dias = 90) {
    const q: Record<string, unknown> = { fecha: { $gte: sumarDias(new Date(), -dias) } };
    if (hacienda) q.hacienda = hacienda;
    return this.clima.find(q).sort({ fecha: 1 }).lean().exec();
  }

  // ─────────── Cosechas (RN-01) ───────────
  async registrarCosecha(dto: CrearCosechaDto, usuario: UsuarioToken) {
    const parcela = await this.parcelas.findById(dto.parcela).populate('hacienda').lean().exec();
    if (!parcela) throw new NotFoundException('Parcela no encontrada');
    if (parcela.estado !== 'PRODUCCION') throw new BadRequestException(`La parcela ${parcela.codigo} está en ${parcela.estado.toLowerCase()} y no se cosecha`);
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();
    const bloqueo = verificarCarencia(await this.aplicaciones(dto.parcela), fecha); // RN-01
    if (bloqueo) throw new BadRequestException(bloqueo);

    const hacienda = parcela.hacienda as unknown as Hacienda & { _id: string };
    const cuadrilla = await this.armarCuadrilla(dto.cuadrilla ?? []);
    const costoManoObra = redondear(cuadrilla.reduce((s, c) => s + c.costo, 0));
    // Costo asignado: labores de la parcela desde la cosecha anterior (lo que costó mantenerla hasta hoy).
    const anterior = await this.cosechas.findOne({ parcela: dto.parcela, fecha: { $lt: fecha } }).sort({ fecha: -1 }).lean().exec();
    const desde = anterior?.fecha ?? sumarDias(fecha, -30);
    const laboresPeriodo = await this.labores.find({ parcela: dto.parcela, fecha: { $gt: desde, $lte: fecha } }).lean().exec();
    const costoAsignado = redondear(costoManoObra + laboresPeriodo.reduce((s, l) => s + l.costoTotal, 0));
    const estado = parcela.cultivo === 'CACAO' ? 'BABA' : 'CEREZA';

    const cosecha = await this.cosechas.create({ parcela: dto.parcela, hacienda: hacienda._id, fecha, mazorcas: dto.mazorcas ?? 0, kg: dto.kg, estado, cuadrilla, costoManoObra, costoAsignado, observaciones: dto.observaciones, usuario: usuario.nombre });
    // El lote propio entra al MISMO flujo que el comprado (fermentación, secado, calidad).
    const lote = await this.poscosecha.crearLote({
      origen: 'PROPIO',
      cultivo: parcela.cultivo,
      variedad: parcela.variedad,
      estadoEntrega: estado,
      kgEntrada: dto.kg,
      costoTotal: costoAsignado,
      hacienda: { id: String(hacienda._id), nombre: hacienda.nombre },
      parcela: { id: String(parcela._id), codigo: parcela.codigo },
      cosecha: String(cosecha._id),
      usuario: usuario.nombre,
      fecha,
    });
    await this.cosechas.updateOne({ _id: cosecha._id }, { $set: { loteGrano: lote._id, codigoLote: lote.codigo } }).exec();
    await this.actualizarPlan(dto.parcela, 'COSECHA', fecha);
    return { cosecha: { ...cosecha.toObject(), codigoLote: lote.codigo }, lote: lote.toObject() };
  }

  listarCosechas(f: { parcela?: string; hacienda?: string }) {
    const q: Record<string, unknown> = {};
    if (f.parcela) q.parcela = f.parcela;
    if (f.hacienda) q.hacienda = f.hacienda;
    return this.cosechas.find(q).populate('parcela', 'codigo variedad').populate('hacienda', 'nombre').sort({ fecha: -1 }).limit(300).lean().exec();
  }

  // resumenHaciendas(): por hacienda → parcelas, ha en producción, kg del año, costo por kg.
  async resumenHaciendas() {
    const haciendas = await this.haciendas.find().sort({ codigo: 1 }).lean().exec();
    const inicioAnio = new Date(new Date().getFullYear(), 0, 1);
    const resultado = [];
    for (const h of haciendas) {
      const parcelas = await this.parcelas.find({ hacienda: String(h._id) }).lean().exec();
      let kgSecos = 0;
      let jornales = 0;
      let insumos = 0;
      for (const p of parcelas) {
        const k = await this.kpisParcela(String(p._id), inicioAnio, new Date());
        kgSecos += k.kgSecos;
        jornales += k.costoJornales;
        insumos += k.costoInsumos;
      }
      const haProduccion = parcelas.filter((p) => p.estado === 'PRODUCCION').reduce((s, p) => s + p.hectareas, 0);
      resultado.push({
        ...h,
        parcelas: parcelas.length,
        hectareasProduccion: redondear(haProduccion, 1),
        kgSecosAnio: redondear(kgSecos),
        rendimientoKgHa: rendimientoKgHa(kgSecos, haProduccion),
        costoPorKg: costoPorKg(jornales, insumos, kgSecos),
      });
    }
    return resultado;
  }
}
