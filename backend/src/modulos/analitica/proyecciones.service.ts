// proyecciones.service.ts → pronósticos con datos reales de la base y las fórmulas de proyecciones.reglas.ts.

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Factura } from '../facturacion/esquemas/factura.esquema.js';
import { Movimiento } from '../inventario/esquemas/movimiento.esquema.js';
import { Producto } from '../productos/esquemas/producto.esquema.js';
import { Receta } from '../produccion/esquemas/receta.esquema.js';
import { Cosecha } from '../campo/esquemas/cosecha.esquema.js';
import { Parcela } from '../campo/esquemas/parcela.esquema.js';
import { Liquidacion } from '../acopio/esquemas/liquidacion.esquema.js';
import { LoteGrano } from '../poscosecha/esquemas/lote-grano.esquema.js';
import { OrdenMantenimiento } from '../mantenimiento/esquemas/orden-mantenimiento.esquema.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { MantenimientoService } from '../mantenimiento/mantenimiento.service.js';
import { cantidadSugerida, diasHastaAgotarse, flujoCaja, pronosticar, puntoReorden, siguienteMes, temporada, ventaBajoPronostico } from './proyecciones.reglas.js';
import { bajaTresSeguidas } from '../acopio/acopio.reglas.js';
import { explotarReceta, type Receta as RecetaRegla } from '../produccion/produccion.reglas.js';
import { etapaProductiva } from '../campo/campo.reglas.js';
import { claveMes, promedio, redondear, sumarDias } from '../../comun/utilidades.js';
import { LIMITES } from '../../comun/constantes.js';

// Rendimiento por defecto (kg en baba por ha y por mes) cuando una parcela no tiene historial.
const RENDIMIENTO_DEFECTO = { ALTA: 160, MEDIA: 90, BAJA: 45 };

@Injectable()
export class ProyeccionesService {
  constructor(
    @InjectModel(Factura.name) private readonly facturas: Model<Factura>,
    @InjectModel(Movimiento.name) private readonly movimientos: Model<Movimiento>,
    @InjectModel(Producto.name) private readonly productos: Model<Producto>,
    @InjectModel(Receta.name) private readonly recetas: Model<Receta>,
    @InjectModel(Cosecha.name) private readonly cosechas: Model<Cosecha>,
    @InjectModel(Parcela.name) private readonly parcelas: Model<Parcela>,
    @InjectModel(Liquidacion.name) private readonly liquidaciones: Model<Liquidacion>,
    @InjectModel(LoteGrano.name) private readonly lotesGrano: Model<LoteGrano>,
    @InjectModel(OrdenMantenimiento.name) private readonly ordenes: Model<OrdenMantenimiento>,
    private readonly inventario: InventarioService,
    private readonly mantenimiento: MantenimientoService,
  ) {}

  // mesesHastaHoy(): últimos n meses COMPLETOS (el mes en curso no se usa porque está a medias).
  private mesesCompletos(n: number) {
    const hoy = new Date();
    return Array.from({ length: n }, (_, i) => claveMes(new Date(hoy.getFullYear(), hoy.getMonth() - n + i, 15)));
  }

  // ─── Ventas ───
  async serieVentas(meses = 24) {
    const lista = this.mesesCompletos(meses);
    const desde = new Date(`${lista[0]}-01T00:00:00`);
    const facturas = await this.facturas.find({ tipoComprobante: '01', estado: { $ne: 'ANULADA' }, fechaEmision: { $gte: desde } }).select('fechaEmision subtotalSinImpuestos').lean().exec();
    return lista.map((mes) => ({ mes, valor: redondear(facturas.filter((f) => claveMes(f.fechaEmision) === mes).reduce((s, f) => s + f.subtotalSinImpuestos, 0)) }));
  }

  async pronosticoVentasTotales(meses = 3) {
    return pronosticar(await this.serieVentas(24), meses);
  }

  // unidadesPorMes(): unidades vendidas de cada producto por mes (desde el kardex).
  private async unidadesPorMes(meses = 24) {
    const lista = this.mesesCompletos(meses);
    const salidas = await this.movimientos.find({ tipo: 'SALIDA_VENTA', fecha: { $gte: new Date(`${lista[0]}-01T00:00:00`) } }).select('producto fecha cantidad').lean().exec();
    const porProducto = new Map<string, Record<string, number>>();
    for (const s of salidas) {
      const m = porProducto.get(String(s.producto)) ?? {};
      const k = claveMes(s.fecha!);
      m[k] = (m[k] ?? 0) + s.cantidad;
      porProducto.set(String(s.producto), m);
    }
    return { lista, porProducto };
  }

  // pronosticoProductos(): los productos más vendidos con su pronóstico de unidades a 3 meses.
  async pronosticoProductos(top = 8, meses = 3) {
    const { lista, porProducto } = await this.unidadesPorMes(24);
    const totales = [...porProducto.entries()].map(([id, m]) => ({ id, total: Object.values(m).reduce((s, v) => s + v, 0) })).sort((a, b) => b.total - a.total).slice(0, top);
    const productos = await this.productos.find({ _id: { $in: totales.map((t) => t.id) } }).select('nombre sku unidad').lean().exec();
    return totales.map((t) => {
      const serie = lista.map((mes) => ({ mes, valor: redondear(porProducto.get(t.id)![mes] ?? 0, 2) }));
      const p = productos.find((x) => String(x._id) === t.id);
      return { productoId: t.id, nombre: p?.nombre ?? t.id, unidad: p?.unidad, historia: serie.slice(-12), pronostico: pronosticar(serie, meses) };
    });
  }

  // ─── Inventario: punto de reorden y días hasta agotarse ───
  async reorden() {
    const stock = await this.inventario.resumenStock();
    const salidas = await this.movimientos.find({ tipo: 'SALIDA_VENTA', fecha: { $gte: sumarDias(new Date(), -30) } }).select('producto cantidad').lean().exec();
    const vendido: Record<string, number> = {};
    for (const s of salidas) vendido[String(s.producto)] = (vendido[String(s.producto)] ?? 0) + s.cantidad;
    const productos = await this.productos.find({ tipo: { $in: ['TERMINADO', 'GRANO', 'SEMIELABORADO'] }, activo: true }).select('diasReposicion').lean().exec();
    const recetas = await this.recetas.find({ activa: true }).select('producto').lean().exec();
    const conReceta = new Set(recetas.map((r) => String(r.producto)));
    return stock
      .filter((s) => productos.some((p) => String(p._id) === s.productoId))
      .map((s) => {
        const ventaDiaria = redondear((vendido[s.productoId] ?? 0) / 30, 3);
        const dias = productos.find((p) => String(p._id) === s.productoId)?.diasReposicion ?? 7;
        const reorden = puntoReorden(ventaDiaria, dias);
        return {
          ...s,
          ventaDiaria,
          diasReposicion: dias,
          puntoReorden: reorden,
          diasHastaAgotarse: diasHastaAgotarse(s.disponible, ventaDiaria),
          reponer: ventaDiaria > 0 && s.disponible <= reorden,
          cantidadSugerida: cantidadSugerida(s.disponible, ventaDiaria),
          sugerencia: conReceta.has(s.productoId) ? 'ORDEN_PRODUCCION' : s.tipo === 'GRANO' ? 'COMPRA_ACOPIO' : 'COMPRA',
        };
      })
      .sort((a, b) => (a.diasHastaAgotarse ?? 9999) - (b.diasHastaAgotarse ?? 9999));
  }

  // ─── Cosecha proyectada de los próximos 12 meses ───
  async cosechaProyectada(meses = 12) {
    const parcelas = await this.parcelas.find().populate('hacienda', 'nombre').lean().exec();
    const historial = await this.cosechas.find({ fecha: { $gte: sumarDias(new Date(), -730) } }).select('parcela fecha kg').lean().exec();
    const lotes = await this.lotesGrano.find({ origen: 'PROPIO', factorConversion: { $gt: 0 } }).select('factorConversion cultivo').lean().exec();
    const factorCacao = lotes.filter((l) => l.cultivo === 'CACAO').length ? promedio(lotes.filter((l) => l.cultivo === 'CACAO').map((l) => l.factorConversion)) : LIMITES.rendimientoSecado.BABA;
    const hoy = claveMes(new Date());
    const futuros = Array.from({ length: meses }, (_, i) => siguienteMes(hoy, i + 1));
    const filas = parcelas.map((p) => {
      const etapa = etapaProductiva(p.anioSiembra, p.cultivo as 'CACAO' | 'CAFE');
      const propias = historial.filter((c) => String(c.parcela) === String(p._id));
      const porMes = futuros.map((mes) => {
        if (p.estado !== 'PRODUCCION') return 0; // las parcelas en renovación salen de la proyección
        const mesNum = Number(mes.slice(5, 7));
        const historicos = propias.filter((c) => new Date(c.fecha).getMonth() + 1 === mesNum);
        const kgHa = historicos.length ? historicos.reduce((s, c) => s + c.kg, 0) / (new Set(historicos.map((c) => new Date(c.fecha).getFullYear())).size * p.hectareas) : RENDIMIENTO_DEFECTO[temporada(mesNum)] * (p.cultivo === 'CAFE' ? 0.6 : 1);
        return redondear(kgHa * p.hectareas * (etapa.factorProduccion || 0));
      });
      return { parcela: p.codigo, hacienda: (p.hacienda as unknown as { nombre: string })?.nombre, cultivo: p.cultivo, estado: p.estado, etapa: etapa.etapa, kgFrescos: porMes };
    });
    const totalFresco = futuros.map((_, i) => redondear(filas.reduce((s, f) => s + f.kgFrescos[i], 0)));
    return { meses: futuros, temporadas: futuros.map((m) => temporada(Number(m.slice(5, 7)))), factorCacao: redondear(factorCacao, 3), parcelas: filas, totalFresco, totalSecoEstimado: totalFresco.map((k) => redondear(k * factorCacao)) };
  }

  // ─── Plan de materia prima: lo que hará falta para cumplir el pronóstico ───
  async planMateriaPrima(meses = 3) {
    const pronosticos = await this.pronosticoProductos(15, meses);
    const recetas = await this.recetas.find({ activa: true }).lean().exec();
    const mapa: Record<string, RecetaRegla> = Object.fromEntries(
      recetas.map((r) => [String(r.producto), { productoId: String(r.producto), cantidadBase: r.cantidadBase, componentes: r.componentes.map((c) => ({ productoId: String(c.producto), nombre: c.nombre, cantidad: c.cantidad, unidad: c.unidad })), horasMaquina: r.horasMaquina, manoObraHoras: r.manoObraHoras }]),
    );
    const necesidad: Record<string, number> = {};
    for (const p of pronosticos.filter((x) => mapa[x.productoId])) {
      const unidades = p.pronostico.reduce((s, x) => s + x.valor, 0);
      const { materiales } = explotarReceta(p.productoId, unidades, mapa);
      for (const [id, kg] of Object.entries(materiales)) necesidad[id] = redondear((necesidad[id] ?? 0) + kg, 3);
    }
    const ids = Object.keys(necesidad);
    const productos = await this.productos.find({ _id: { $in: ids } }).select('nombre unidad tipo').lean().exec();
    const stock = await this.inventario.resumenStock({ productoIds: ids });
    const cosecha = await this.cosechaProyectada(meses);
    const granoProyectado = redondear(cosecha.totalSecoEstimado.reduce((s, v) => s + v, 0));
    return {
      meses,
      granoPropioProyectadoKg: granoProyectado,
      materiales: ids
        .map((id) => {
          const p = productos.find((x) => String(x._id) === id);
          const disponible = stock.find((s) => s.productoId === id)?.disponible ?? 0;
          return { productoId: id, nombre: p?.nombre ?? id, unidad: p?.unidad, tipo: p?.tipo, necesita: necesidad[id], disponible, faltaComprar: redondear(Math.max(0, necesidad[id] - disponible - (p?.tipo === 'GRANO' ? granoProyectado : 0)), 2) };
        })
        .sort((a, b) => b.faltaComprar - a.faltaComprar),
    };
  }

  // ─── Flujo de caja proyectado (4 semanas) ───
  async flujoCaja(semanas = 4) {
    const porCobrar = await this.facturas.find({ tipoComprobante: '01', estado: { $ne: 'ANULADA' }, saldo: { $gt: 0.005 } }).select('saldo vence fechaEmision').lean().exec();
    const porPagar = await this.liquidaciones.find({ saldo: { $gt: 0.005 } }).select('saldo fecha').lean().exec();
    const plan = await this.mantenimiento.planPreventivo();
    const costoPromedioOrden = promedio((await this.ordenes.find({ estado: 'TERMINADA', tipo: 'PREVENTIVO' }).select('costos').lean().exec()).map((o) => o.costos?.costoTotal ?? 0)) || 60;
    const cobros = porCobrar.map((f) => ({ fecha: f.vence ?? f.fechaEmision, monto: f.saldo }));
    // A los productores se les paga hasta 7 días después de la entrega.
    const pagos = [
      ...porPagar.map((l) => ({ fecha: sumarDias(l.fecha, 7), monto: l.saldo })),
      ...plan.filter((x) => x.vencida || (x.diasRestantes !== null && x.diasRestantes <= semanas * 7)).map((x) => ({ fecha: sumarDias(new Date(), Math.max(0, x.diasRestantes ?? 0)), monto: redondear(costoPromedioOrden) })),
    ];
    return flujoCaja(cobros, pagos, semanas);
  }

  // ─── Alertas de tendencia ───
  async alertasTendencia() {
    const alertas: { tipo: string; mensaje: string }[] = [];
    // 1) Productores cuya fermentación bajó en sus últimas tres entregas.
    const evaluados = await this.lotesGrano.find({ origen: 'COMPRA', 'calidad.bienFermentados': { $exists: true } }).select('productor calidad fechaRecepcion').sort({ fechaRecepcion: 1 }).lean().exec();
    const porProductor = new Map<string, { nombre: string; valores: number[] }>();
    for (const l of evaluados) {
      if (!l.productor) continue;
      const r = porProductor.get(l.productor.id) ?? { nombre: l.productor.nombre, valores: [] };
      r.valores.push(l.calidad!.bienFermentados ?? 0);
      porProductor.set(l.productor.id, r);
    }
    for (const r of porProductor.values()) if (bajaTresSeguidas(r.valores)) alertas.push({ tipo: 'CALIDAD_PRODUCTOR', mensaje: `La fermentación de ${r.nombre} bajó en sus tres últimas entregas (${r.valores.slice(-4).join(' → ')} %)` });

    // 2) Productos que este mes venden 30 % menos que su pronóstico (prorrateado a los días que van).
    const hoy = new Date();
    const fraccion = hoy.getDate() / new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    if (fraccion >= 0.3) {
      const { porProducto } = await this.unidadesPorMes(24);
      const actual = claveMes(hoy);
      const salidasMes = await this.movimientos.find({ tipo: 'SALIDA_VENTA', fecha: { $gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1) } }).select('producto cantidad').lean().exec();
      const lista = this.mesesCompletos(24);
      for (const [id, m] of porProducto) {
        const serie = lista.map((mes) => ({ mes, valor: m[mes] ?? 0 }));
        if (serie.filter((x) => x.valor > 0).length < 6) continue;
        const [pron] = pronosticar(serie, 1);
        if (!pron || pron.mes !== actual) continue;
        const real = salidasMes.filter((s) => String(s.producto) === id).reduce((s, x) => s + x.cantidad, 0);
        if (ventaBajoPronostico(real, pron.valor * fraccion)) {
          const p = await this.productos.findById(id).select('nombre').lean().exec();
          alertas.push({ tipo: 'VENTA_BAJO_PRONOSTICO', mensaje: `${p?.nombre ?? id} vende ${redondear(real, 0)} y se esperaban ${redondear(pron.valor * fraccion, 0)} a esta fecha (−30 % o más)` });
        }
      }
    }
    return alertas;
  }
}
