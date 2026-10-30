// kpis.service.ts → PANELES DE CONTROL (dashboards) con KPIs por área y el panel gerencial.
//
// KPI = Key Performance Indicator (indicador clave de desempeño): un número que dice si el negocio
// va bien. Ejemplo: "ventas del mes $18 240 ▲ 12 % frente al mes anterior".
//
// Cada panel devuelve SIEMPRE la misma forma (tarjetas + gráficos + listas), así el frontend tiene
// UN solo componente que dibuja cualquier panel. Los cálculos se hacen aquí en el backend, con datos
// de MongoDB, y las fórmulas delicadas viven en archivos de reglas con sus pruebas.

import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Factura } from '../facturacion/esquemas/factura.esquema.js';
import { Cotizacion } from '../ventas/esquemas/cotizacion.esquema.js';
import { Pedido } from '../ventas/esquemas/pedido.esquema.js';
import { SolicitudWeb } from '../web/esquemas/solicitud-web.esquema.js';
import { LoteGrano } from '../poscosecha/esquemas/lote-grano.esquema.js';
import { Liquidacion } from '../acopio/esquemas/liquidacion.esquema.js';
import { PrecioDia } from '../acopio/esquemas/precio-dia.esquema.js';
import { Cosecha } from '../campo/esquemas/cosecha.esquema.js';
import { Parcela } from '../campo/esquemas/parcela.esquema.js';
import { Hacienda } from '../campo/esquemas/hacienda.esquema.js';
import { Labor } from '../campo/esquemas/labor.esquema.js';
import { MonitoreoSanidad } from '../campo/esquemas/monitoreo-sanidad.esquema.js';
import { OrdenProduccion } from '../produccion/esquemas/orden-produccion.esquema.js';
import { Movimiento } from '../inventario/esquemas/movimiento.esquema.js';
import { Activo } from '../equipos/esquemas/activo.esquema.js';
import { Alquiler } from '../equipos/esquemas/alquiler.esquema.js';
import { Viaje } from '../logistica/esquemas/viaje.esquema.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { MantenimientoService } from '../mantenimiento/mantenimiento.service.js';
import { LogisticaService } from '../logistica/logistica.service.js';
import { CampoService } from '../campo/campo.service.js';
import { ProyeccionesService } from './proyecciones.service.js';
import { AlertasService } from './alertas.service.js';
import { claveMes, diasEntre, porcentaje, promedio, redondear, sumarDias } from '../../comun/utilidades.js';
import { tramoAntiguedad, tasaCierre } from '../ventas/ventas.reglas.js';
import { margen } from '../productos/productos.reglas.js';
import { cumplimiento, rendimientoConversion } from '../produccion/produccion.reglas.js';
import { utilizacion } from '../equipos/equipos.reglas.js';
import { LIMITES } from '../../comun/constantes.js';
import { tieneRol, type UsuarioToken } from '../../comun/usuario-token.js';
import type { Rol } from '../../comun/constantes.js';

// ─── Forma común de un panel ───
export interface Tarjeta {
  id: string;
  titulo: string;
  valor: number | null;
  formato: 'dinero' | 'numero' | 'porcentaje' | 'kg' | 'dias' | 'horas';
  anterior?: number | null; // mismo indicador en el período anterior
  variacion?: number | null; // % de cambio (▲ / ▼)
  mejorSiBaja?: boolean; // para costos y rechazos: bajar es bueno (flecha verde)
  ayuda: string; // cómo se calcula (se muestra al pasar el mouse)
}
export interface Grafico {
  id: string;
  titulo: string;
  tipo: 'barras' | 'linea' | 'barras_apiladas' | 'apiladas_100' | 'circular' | 'dispersion' | 'calor' | 'embudo' | 'medidor' | 'horizontal';
  categorias?: string[];
  series: { nombre: string; datos: (number | [number, number] | [number, number, number])[] }[];
  ejeY?: string[]; // mapa de calor: filas
  formato?: 'dinero' | 'numero' | 'porcentaje' | 'kg';
}
export interface Lista {
  id: string;
  titulo: string;
  columnas: string[];
  filas: (string | number)[][];
  semaforo?: ('rojo' | 'amarillo' | 'verde')[];
}
export interface Panel {
  area: string;
  titulo: string;
  desde: Date;
  hasta: Date;
  tarjetas: Tarjeta[];
  graficos: Grafico[];
  listas: Lista[];
}

// Qué roles ven cada panel (además del GERENTE, que ve todos).
export const ROLES_PANEL: Record<string, Rol[]> = {
  gerencial: [],
  ventas: ['VENTAS'],
  inventario: ['BODEGA', 'VENTAS'],
  campo: ['AGRONOMO'],
  acopio: ['ACOPIO'],
  calidad: ['CALIDAD'],
  produccion: ['PRODUCCION', 'CALIDAD'],
  equipos: ['VENTAS', 'LOGISTICA', 'MANTENIMIENTO'],
  logistica: ['LOGISTICA'],
  mantenimiento: ['MANTENIMIENTO'],
};

// variacion(): % de cambio entre dos valores; null si no hay base para comparar.
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return redondear(((actual - anterior) / Math.abs(anterior)) * 100, 1);
}

// tarjeta(): arma una tarjeta con su comparación.
function tarjeta(id: string, titulo: string, valor: number | null, formato: Tarjeta['formato'], ayuda: string, anterior?: number | null, mejorSiBaja = false): Tarjeta {
  return { id, titulo, valor, formato, ayuda, anterior: anterior ?? null, variacion: valor !== null && anterior ? variacion(valor, anterior) : null, mejorSiBaja };
}

// ultimosMeses(): ["2025-11", ..., "2026-10"].
function ultimosMeses(n: number, hasta = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => claveMes(new Date(hasta.getFullYear(), hasta.getMonth() - (n - 1 - i), 15)));
}

const NOMBRE_MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const etiquetaMes = (m: string) => `${NOMBRE_MES[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;

@Injectable()
export class KpisService {
  constructor(
    @InjectModel(Factura.name) private readonly facturas: Model<Factura>,
    @InjectModel(Cotizacion.name) private readonly cotizaciones: Model<Cotizacion>,
    @InjectModel(Pedido.name) private readonly pedidos: Model<Pedido>,
    @InjectModel(SolicitudWeb.name) private readonly solicitudes: Model<SolicitudWeb>,
    @InjectModel(LoteGrano.name) private readonly lotesGrano: Model<LoteGrano>,
    @InjectModel(Liquidacion.name) private readonly liquidaciones: Model<Liquidacion>,
    @InjectModel(PrecioDia.name) private readonly precios: Model<PrecioDia>,
    @InjectModel(Cosecha.name) private readonly cosechas: Model<Cosecha>,
    @InjectModel(Parcela.name) private readonly parcelas: Model<Parcela>,
    @InjectModel(Hacienda.name) private readonly haciendas: Model<Hacienda>,
    @InjectModel(Labor.name) private readonly labores: Model<Labor>,
    @InjectModel(MonitoreoSanidad.name) private readonly monitoreos: Model<MonitoreoSanidad>,
    @InjectModel(OrdenProduccion.name) private readonly ordenes: Model<OrdenProduccion>,
    @InjectModel(Movimiento.name) private readonly movimientos: Model<Movimiento>,
    @InjectModel(Activo.name) private readonly activos: Model<Activo>,
    @InjectModel(Alquiler.name) private readonly alquileres: Model<Alquiler>,
    @InjectModel(Viaje.name) private readonly viajes: Model<Viaje>,
    private readonly inventario: InventarioService,
    private readonly mantenimiento: MantenimientoService,
    private readonly logistica: LogisticaService,
    private readonly campo: CampoService,
    private readonly proyecciones: ProyeccionesService,
    private readonly alertas: AlertasService,
  ) {}

  // panel(): punto de entrada. Revisa permisos y llama al cálculo del área.
  async panel(area: string, desdeTexto: string | undefined, hastaTexto: string | undefined, usuario: UsuarioToken): Promise<Panel> {
    const roles = ROLES_PANEL[area];
    if (!roles) throw new ForbiddenException(`El panel "${area}" no existe`);
    if (!tieneRol(usuario, ...(roles.length ? roles : (['GERENTE'] as Rol[])))) throw new ForbiddenException('No tienes acceso a este panel');
    // Período: por defecto el mes en curso. El anterior tiene la misma duración y termina donde empieza este.
    const hoy = new Date();
    const desde = desdeTexto ? new Date(`${desdeTexto}T00:00:00`) : new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const hasta = hastaTexto ? new Date(`${hastaTexto}T23:59:59`) : hoy;
    const dias = Math.max(1, diasEntre(desde, hasta) + 1);
    const p = { desde, hasta, antDesde: sumarDias(desde, -dias), antHasta: sumarDias(desde, -0.0001) };
    const calculos: Record<string, () => Promise<Omit<Panel, 'area' | 'desde' | 'hasta'>>> = {
      gerencial: () => this.gerencial(p, usuario),
      ventas: () => this.ventas(p),
      inventario: () => this.inventarioPanel(),
      campo: () => this.campoPanel(p),
      acopio: () => this.acopio(p),
      calidad: () => this.calidad(p),
      produccion: () => this.produccion(p),
      equipos: () => this.equipos(p),
      logistica: () => this.logisticaPanel(p),
      mantenimiento: () => this.mantenimientoPanel(),
    };
    return { area, desde, hasta, ...(await calculos[area]()) };
  }

  // ─────────────────────────── VENTAS ───────────────────────────
  private async facturasEntre(desde: Date, hasta: Date) {
    return this.facturas.find({ tipoComprobante: '01', estado: { $ne: 'ANULADA' }, fechaEmision: { $gte: desde, $lte: hasta } }).lean().exec();
  }

  // resumenVentas(): total sin IVA, número, ticket promedio, costo y margen de un conjunto de facturas.
  private resumenVentas(lista: Factura[]) {
    const total = redondear(lista.reduce((s, f) => s + f.subtotalSinImpuestos, 0));
    const costo = redondear(lista.reduce((s, f) => s + f.items.reduce((t, i) => t + i.cantidad * (i.costoUnitario ?? 0), 0), 0));
    return { total, numero: lista.length, ticket: lista.length ? redondear(total / lista.length) : 0, costo, margen: margen(total, costo) };
  }

  private async ventas(p: { desde: Date; hasta: Date; antDesde: Date; antHasta: Date }) {
    const actuales = await this.facturasEntre(p.desde, p.hasta);
    const anteriores = await this.facturasEntre(p.antDesde, p.antHasta);
    const a = this.resumenVentas(actuales);
    const b = this.resumenVentas(anteriores);
    const [cotEnviadas, cotAceptadas, solicitudes, pedidos] = await Promise.all([
      this.cotizaciones.countDocuments({ fecha: { $gte: p.desde, $lte: p.hasta }, estado: { $ne: 'BORRADOR' } }).exec(),
      this.cotizaciones.countDocuments({ fecha: { $gte: p.desde, $lte: p.hasta }, estado: 'ACEPTADA' }).exec(),
      this.solicitudes.countDocuments({ createdAt: { $gte: p.desde, $lte: p.hasta }, tipo: 'COTIZACION' }).exec(),
      this.pedidos.countDocuments({ fecha: { $gte: p.desde, $lte: p.hasta } }).exec(),
    ]);
    const porCobrar = await this.facturas.find({ tipoComprobante: '01', estado: { $ne: 'ANULADA' }, saldo: { $gt: 0.005 } }).lean().exec();
    const cxc = redondear(porCobrar.reduce((s, f) => s + f.saldo, 0));

    // Ventas por día: período actual contra el anterior (desplazado).
    const dias = Math.max(1, diasEntre(p.desde, p.hasta) + 1);
    const categoriasDia = Array.from({ length: dias }, (_, i) => sumarDias(p.desde, i).toISOString().slice(5, 10).split('-').reverse().join('/'));
    const porDia = (lista: Factura[], inicio: Date) => {
      const datos = Array(dias).fill(0);
      for (const f of lista) {
        const i = diasEntre(inicio, f.fechaEmision);
        if (i >= 0 && i < dias) datos[i] = redondear(datos[i] + f.subtotalSinImpuestos);
      }
      return datos;
    };
    // Mezcla de canales y líneas (equipos y servicios se separan aunque vengan por mayorista).
    const linea = (f: Factura, i: Factura['items'][number]) => (i.tipo === 'EQUIPO' ? 'Equipos' : i.tipo === 'ALQUILER' ? 'Alquiler' : i.tipo === 'SERVICIO' ? 'Servicios' : { MOSTRADOR: 'Menor', MAYORISTA: 'Mayor', EXPORTACION: 'Exportación', WEB: 'Mayor' }[f.canal] ?? f.canal);
    const mezcla: Record<string, number> = {};
    const porProducto: Record<string, { nombre: string; monto: number; costo: number }> = {};
    const porCliente: Record<string, number> = {};
    for (const f of actuales) {
      porCliente[f.cliente.nombre] = redondear((porCliente[f.cliente.nombre] ?? 0) + f.subtotalSinImpuestos);
      for (const i of f.items) {
        const l = linea(f, i);
        mezcla[l] = redondear((mezcla[l] ?? 0) + i.subtotal);
        if (i.tipo === 'PRODUCTO') {
          const r = (porProducto[i.codigo] ??= { nombre: i.descripcion, monto: 0, costo: 0 });
          r.monto = redondear(r.monto + i.subtotal);
          r.costo = redondear(r.costo + i.cantidad * (i.costoUnitario ?? 0));
        }
      }
    }
    const topProductos = Object.values(porProducto).sort((x, y) => y.monto - x.monto).slice(0, 10);
    const topClientes = Object.entries(porCliente).filter(([n]) => n !== 'CONSUMIDOR FINAL').sort((x, y) => y[1] - x[1]).slice(0, 10);
    const tramos = { '0-30': 0, '31-60': 0, '+60': 0 };
    for (const f of porCobrar) tramos[tramoAntiguedad(f.fechaEmision)] = redondear(tramos[tramoAntiguedad(f.fechaEmision)] + f.saldo);

    return {
      titulo: 'Panel de ventas',
      tarjetas: [
        tarjeta('ventas', 'Ventas sin IVA', a.total, 'dinero', 'Suma del subtotal sin impuestos de las facturas del período (sin anuladas).', b.total),
        tarjeta('ticket', 'Ticket promedio', a.ticket, 'dinero', 'Ventas ÷ número de facturas.', b.ticket),
        tarjeta('facturas', 'Facturas emitidas', a.numero, 'numero', 'Facturas del período.', b.numero),
        tarjeta('margen', 'Margen bruto', a.margen, 'porcentaje', '(Ventas − costo de lo vendido) ÷ ventas. El costo sale de los lotes que salieron (FEFO).', b.margen),
        tarjeta('cierre', 'Tasa de cierre', tasaCierre(cotAceptadas, cotEnviadas), 'porcentaje', 'Cotizaciones aceptadas ÷ enviadas.'),
        tarjeta('cxc', 'Cuentas por cobrar', cxc, 'dinero', 'Saldo pendiente de todas las facturas a crédito.', null, true),
      ],
      graficos: [
        { id: 'ventas-dia', titulo: 'Ventas por día vs. período anterior', tipo: 'linea', categorias: categoriasDia, series: [{ nombre: 'Período actual', datos: porDia(actuales, p.desde) }, { nombre: 'Período anterior', datos: porDia(anteriores, p.antDesde) }], formato: 'dinero' },
        { id: 'mezcla', titulo: 'Mezcla de canales y líneas', tipo: 'circular', categorias: Object.keys(mezcla), series: [{ nombre: 'Ventas', datos: Object.values(mezcla) }], formato: 'dinero' },
        { id: 'top-productos', titulo: 'Top 10 productos por monto', tipo: 'horizontal', categorias: topProductos.map((t) => t.nombre), series: [{ nombre: 'Ventas', datos: topProductos.map((t) => t.monto) }], formato: 'dinero' },
        { id: 'top-clientes', titulo: 'Top 10 clientes', tipo: 'horizontal', categorias: topClientes.map((t) => t[0]), series: [{ nombre: 'Ventas', datos: topClientes.map((t) => t[1]) }], formato: 'dinero' },
        { id: 'margen-producto', titulo: 'Margen por producto (%)', tipo: 'barras', categorias: topProductos.map((t) => t.nombre), series: [{ nombre: 'Margen', datos: topProductos.map((t) => margen(t.monto, t.costo)) }], formato: 'porcentaje' },
        { id: 'embudo', titulo: 'Embudo: solicitud → cotización → pedido → factura', tipo: 'embudo', categorias: ['Solicitudes web', 'Cotizaciones', 'Pedidos', 'Facturas mayoristas'], series: [{ nombre: 'Cantidad', datos: [solicitudes, cotEnviadas, pedidos, actuales.filter((f) => f.canal !== 'MOSTRADOR').length] }] },
        { id: 'cxc', titulo: 'Cuentas por cobrar por antigüedad', tipo: 'barras', categorias: ['0 a 30 días', '31 a 60 días', 'Más de 60 días'], series: [{ nombre: 'Saldo', datos: Object.values(tramos) }], formato: 'dinero' },
      ] as Grafico[],
      listas: [],
    };
  }

  // ─────────────────────────── INVENTARIO ───────────────────────────
  private async inventarioPanel() {
    const [resumen, valorizado, porVencer] = await Promise.all([this.inventario.resumenStock(), this.inventario.valorizado(), this.inventario.porVencer()]);
    // Venta diaria promedio de los últimos 30 días (para "días de inventario").
    const salidas = await this.movimientos.find({ tipo: 'SALIDA_VENTA', fecha: { $gte: sumarDias(new Date(), -30) } }).lean().exec();
    const ventaDiaria: Record<string, number> = {};
    for (const m of salidas) ventaDiaria[String(m.producto)] = (ventaDiaria[String(m.producto)] ?? 0) + m.cantidad / 30;
    const vendibles = resumen.filter((r) => ['TERMINADO', 'GRANO', 'SEMIELABORADO'].includes(r.tipo));
    const diasInventario = vendibles
      .filter((r) => ventaDiaria[r.productoId] > 0)
      .map((r) => ({ nombre: r.nombre, dias: Math.floor(r.disponible / ventaDiaria[r.productoId]) }))
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 12);
    const bajo = resumen.filter((r) => r.stockMinimo > 0 && r.disponible <= r.stockMinimo);
    const tramos = { 30: 0, 60: 0, 90: 0, VENCIDO: 0 } as Record<string, number>;
    for (const l of porVencer) tramos[String(l.tramo)] = redondear(tramos[String(l.tramo)] + l.cantidad, 1);
    const diasPromedio = diasInventario.length ? Math.round(promedio(diasInventario.map((d) => d.dias))) : null;
    return {
      titulo: 'Panel de inventario',
      tarjetas: [
        tarjeta('valor', 'Valor del inventario', valorizado.total, 'dinero', 'Stock × costo de cada lote, en todas las bodegas.'),
        tarjeta('bajo', 'Productos bajo mínimo', bajo.length, 'numero', 'Variantes con stock disponible igual o menor a su mínimo.', null, true),
        tarjeta('vencer30', 'Unidades que vencen en 30 días', tramos['30'], 'numero', 'Suma de lotes con vencimiento dentro de 30 días.', null, true),
        tarjeta('vencidos', 'Unidades vencidas', tramos.VENCIDO, 'numero', 'Lotes vencidos aún en bodega: deben darse de baja (RN-14).', null, true),
        tarjeta('dias', 'Días de inventario (promedio)', diasPromedio, 'dias', 'Stock disponible ÷ venta diaria de los últimos 30 días.'),
      ],
      graficos: [
        { id: 'valor-bodega', titulo: 'Valor por bodega', tipo: 'barras', categorias: Object.keys(valorizado.porBodega), series: [{ nombre: 'Valor', datos: Object.values(valorizado.porBodega) }], formato: 'dinero' },
        { id: 'valor-familia', titulo: 'Valor por familia', tipo: 'circular', categorias: Object.keys(valorizado.porFamilia), series: [{ nombre: 'Valor', datos: Object.values(valorizado.porFamilia) }], formato: 'dinero' },
        { id: 'por-vencer', titulo: 'Unidades por vencer', tipo: 'barras', categorias: ['30 días', '60 días', '90 días', 'Vencidas'], series: [{ nombre: 'Unidades', datos: [tramos['30'], tramos['60'], tramos['90'], tramos.VENCIDO] }] },
        { id: 'dias-inventario', titulo: 'Días hasta agotarse (los más urgentes)', tipo: 'horizontal', categorias: diasInventario.map((d) => d.nombre), series: [{ nombre: 'Días', datos: diasInventario.map((d) => d.dias) }] },
      ] as Grafico[],
      listas: [
        {
          id: 'bajo-minimo',
          titulo: 'Bajo el stock mínimo',
          columnas: ['SKU', 'Producto', 'Disponible', 'Mínimo'],
          filas: bajo.map((b) => [b.sku, b.nombre, b.disponible, b.stockMinimo]),
          semaforo: bajo.map((b) => (b.disponible <= 0 ? 'rojo' : 'amarillo')),
        },
      ],
    };
  }

  // ─────────────────────────── CAMPO ───────────────────────────
  private async campoPanel(p: { desde: Date; hasta: Date; antDesde: Date; antHasta: Date }) {
    const parcelas = await this.parcelas.find().populate('hacienda', 'nombre').lean().exec();
    const filas = [];
    for (const parcela of parcelas) {
      const k = await this.campo.kpisParcela(String(parcela._id), p.desde, p.hasta);
      filas.push({ parcela, ...k });
    }
    const kgSecos = redondear(filas.reduce((s, f) => s + f.kgSecos, 0));
    const ha = parcelas.filter((x) => x.estado === 'PRODUCCION').reduce((s, x) => s + x.hectareas, 0);
    const jornales = filas.reduce((s, f) => s + f.costoJornales, 0);
    const insumos = filas.reduce((s, f) => s + f.costoInsumos, 0);
    const cosechasAnt = await this.cosechas.find({ fecha: { $gte: p.antDesde, $lte: p.antHasta } }).lean().exec();
    const kgAnt = redondear(cosechasAnt.reduce((s, c) => s + c.kg * (LIMITES.rendimientoSecado[c.estado as 'BABA'] ?? 1), 0));
    const agenda = await this.campo.agenda();
    const atrasadas = agenda.reduce((s, a) => s + a.atrasadas.length, 0);

    // Costo por kg por hacienda
    const porHacienda: Record<string, { kg: number; costo: number }> = {};
    for (const f of filas) {
      const h = (f.parcela.hacienda as unknown as Hacienda)?.nombre ?? '—';
      const r = (porHacienda[h] ??= { kg: 0, costo: 0 });
      r.kg += f.kgSecos;
      r.costo += f.costoJornales + f.costoInsumos;
    }
    // Mapa de calor de incidencia sanitaria: parcelas × últimos 6 meses.
    const meses = ultimosMeses(6);
    const monitoreos = await this.monitoreos.find({ fecha: { $gte: new Date(`${meses[0]}-01T00:00:00`) } }).lean().exec();
    const codigos = parcelas.map((x) => x.codigo);
    const calor: [number, number, number][] = [];
    codigos.forEach((codigo, fila) => {
      const id = String(parcelas[fila]._id);
      meses.forEach((mes, col) => {
        const del = monitoreos.filter((m) => String(m.parcela) === id && claveMes(m.fecha) === mes && m.plaga !== 'NINGUNA');
        calor.push([col, fila, del.length ? redondear(promedio(del.map((m) => m.incidencia)), 1) : 0]);
      });
    });
    // Cosecha por mes (12 meses)
    const meses12 = ultimosMeses(12);
    const cosechas12 = await this.cosechas.find({ fecha: { $gte: new Date(`${meses12[0]}-01T00:00:00`) } }).lean().exec();
    const kgMes = meses12.map((m) => redondear(cosechas12.filter((c) => claveMes(c.fecha) === m).reduce((s, c) => s + c.kg, 0)));

    return {
      titulo: 'Panel de campo',
      tarjetas: [
        tarjeta('kg', 'Kg secos producidos', kgSecos, 'kg', 'Kg secos de los lotes propios del período (real si ya secaron, estimado si no).', kgAnt),
        tarjeta('rendimiento', 'Rendimiento', ha ? redondear(kgSecos / ha, 1) : 0, 'numero', 'Kg secos ÷ hectáreas en producción.'),
        tarjeta('costo-kg', 'Costo por kg', kgSecos ? redondear((jornales + insumos) / kgSecos, 2) : null, 'dinero', '(Jornales + insumos) ÷ kg secos.', null, true),
        tarjeta('atrasadas', 'Labores atrasadas', atrasadas, 'numero', 'Labores del plan cuya fecha ya pasó sin registrarse.', null, true),
        tarjeta('ha', 'Hectáreas en producción', redondear(ha, 1), 'numero', 'Parcelas en estado PRODUCCIÓN.'),
      ],
      graficos: [
        { id: 'rend-parcela', titulo: 'Rendimiento por parcela (kg secos/ha)', tipo: 'barras', categorias: filas.map((f) => f.parcela.codigo), series: [{ nombre: 'kg/ha', datos: filas.map((f) => f.rendimientoKgHa) }] },
        { id: 'costo-hacienda', titulo: 'Costo por kg por hacienda', tipo: 'barras', categorias: Object.keys(porHacienda), series: [{ nombre: 'USD/kg', datos: Object.values(porHacienda).map((r) => (r.kg ? redondear(r.costo / r.kg, 2) : 0)) }], formato: 'dinero' },
        { id: 'sanidad', titulo: 'Incidencia sanitaria (% mazorcas afectadas)', tipo: 'calor', categorias: meses.map(etiquetaMes), ejeY: codigos, series: [{ nombre: 'Incidencia', datos: calor }] },
        { id: 'cosecha-mes', titulo: 'Kg cosechados por mes (en baba/cereza)', tipo: 'barras', categorias: meses12.map(etiquetaMes), series: [{ nombre: 'kg', datos: kgMes }], formato: 'kg' },
      ] as Grafico[],
      listas: [
        {
          id: 'agenda',
          titulo: 'Lo que toca hoy',
          columnas: ['Parcela', 'Hacienda', 'Pendiente'],
          filas: agenda.map((a) => [a.parcela.codigo, a.parcela.hacienda ?? '', [...a.atrasadas.map((t) => `${t.tipo.toLowerCase()} (${t.diasAtraso} días de atraso)`), a.bloqueo ? 'Bloqueada por carencia' : ''].filter(Boolean).join(' · ')]),
          semaforo: agenda.map((a) => (a.bloqueo ? 'rojo' : 'amarillo')),
        },
      ],
    };
  }

  // ─────────────────────────── ACOPIO ───────────────────────────
  private async acopio(p: { desde: Date; hasta: Date; antDesde: Date; antHasta: Date }) {
    const liqs = await this.liquidaciones.find({ fecha: { $gte: p.desde, $lte: p.hasta } }).lean().exec();
    const liqsAnt = await this.liquidaciones.find({ fecha: { $gte: p.antDesde, $lte: p.antHasta } }).lean().exec();
    const kg = redondear(liqs.reduce((s, l) => s + l.kgPagables, 0));
    const kgAnt = redondear(liqsAnt.reduce((s, l) => s + l.kgPagables, 0));
    const pagado = liqs.reduce((s, l) => s + l.totalPagar + l.anticipoDescontado + l.retencion, 0);
    const precioKg = kg ? redondear(pagado / kg, 3) : 0;
    const pendientes = await this.liquidaciones.find({ saldo: { $gt: 0.005 } }).lean().exec();
    const deuda = redondear(pendientes.reduce((s, l) => s + l.saldo, 0));
    const lotes = await this.lotesGrano.find({ fechaRecepcion: { $gte: p.desde, $lte: p.hasta }, estado: { $ne: 'COMBINADO' } }).lean().exec();
    const kgPropio = lotes.filter((l) => l.origen === 'PROPIO').reduce((s, l) => s + (l.kgSeco || l.kgEntrada * (LIMITES.rendimientoSecado[l.estadoEntrega as 'BABA'] ?? 1)), 0);
    const kgCompra = lotes.filter((l) => l.origen === 'COMPRA').reduce((s, l) => s + (l.kgSeco || l.kgEntrada * (LIMITES.rendimientoSecado[l.estadoEntrega as 'BABA'] ?? 1)), 0);

    const meses = ultimosMeses(12);
    const liqs12 = await this.liquidaciones.find({ fecha: { $gte: new Date(`${meses[0]}-01T00:00:00`) } }).lean().exec();
    const lotes12 = await this.lotesGrano.find({ fechaRecepcion: { $gte: new Date(`${meses[0]}-01T00:00:00`) }, estado: { $ne: 'COMBINADO' } }).lean().exec();
    const precios12 = await this.precios.find({ fecha: { $gte: new Date(`${meses[0]}-01T00:00:00`) }, estado: 'SECO', variedad: 'CCN51' }).lean().exec();
    const kgMes = meses.map((m) => redondear(liqs12.filter((l) => claveMes(l.fecha) === m).reduce((s, l) => s + l.kgPagables, 0)));
    const precioMes = meses.map((m) => {
      const del = liqs12.filter((l) => claveMes(l.fecha) === m && l.estadoEntrega === 'SECO');
      const k = del.reduce((s, l) => s + l.kgPagables, 0);
      return k ? redondear((del.reduce((s, l) => s + l.subtotal + l.bonos.reduce((t, b) => t + b.monto, 0), 0) / k) * LIMITES.kgPorQuintal, 2) : 0;
    });
    const referenciaMes = meses.map((m) => {
      const del = precios12.filter((x) => claveMes(x.fecha) === m);
      return del.length ? redondear(promedio(del.map((x) => x.precioQq)), 2) : 0;
    });
    const seco = (l: LoteGrano) => l.kgSeco || l.kgEntrada * (LIMITES.rendimientoSecado[l.estadoEntrega as 'BABA'] ?? 1);
    const propioMes = meses.map((m) => redondear(lotes12.filter((l) => l.origen === 'PROPIO' && claveMes(l.fechaRecepcion) === m).reduce((s, l) => s + seco(l), 0)));
    const compraMes = meses.map((m) => redondear(lotes12.filter((l) => l.origen === 'COMPRA' && claveMes(l.fechaRecepcion) === m).reduce((s, l) => s + seco(l), 0)));
    const porProductor: Record<string, number> = {};
    for (const l of liqs) porProductor[l.productor.nombre] = redondear((porProductor[l.productor.nombre] ?? 0) + l.kgPagables);
    const top = Object.entries(porProductor).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return {
      titulo: 'Panel de acopio',
      tarjetas: [
        tarjeta('kg', 'Kg comprados', kg, 'kg', 'Kg pagables de las liquidaciones del período.', kgAnt),
        tarjeta('precio', 'Precio promedio pagado por kg', precioKg, 'dinero', 'Total pagado (incluye bonos, anticipos y retenciones) ÷ kg.'),
        tarjeta('deuda', 'Deuda con productores', deuda, 'dinero', 'Saldo de liquidaciones por pagar.', null, true),
        tarjeta('propio', 'Grano propio del total', porcentaje(kgPropio, kgPropio + kgCompra), 'porcentaje', 'Kg secos propios ÷ kg secos totales (propio + comprado).'),
        tarjeta('entregas', 'Entregas recibidas', liqs.length, 'numero', 'Número de recepciones en báscula.', liqsAnt.length),
      ],
      graficos: [
        { id: 'kg-mes', titulo: 'Kg comprados por mes', tipo: 'linea', categorias: meses.map(etiquetaMes), series: [{ nombre: 'kg', datos: kgMes }], formato: 'kg' },
        { id: 'propio-compra', titulo: 'Propio vs. comprado (kg secos)', tipo: 'apiladas_100', categorias: meses.map(etiquetaMes), series: [{ nombre: 'Propio', datos: propioMes }, { nombre: 'Comprado', datos: compraMes }] },
        { id: 'precio-ref', titulo: 'Precio pagado vs. precio del día (USD/qq, CCN-51 seco)', tipo: 'linea', categorias: meses.map(etiquetaMes), series: [{ nombre: 'Pagado', datos: precioMes }, { nombre: 'Precio del día', datos: referenciaMes }], formato: 'dinero' },
        { id: 'top-productores', titulo: 'Productores con más kg entregados', tipo: 'horizontal', categorias: top.map((t) => t[0]), series: [{ nombre: 'kg', datos: top.map((t) => t[1]) }], formato: 'kg' },
      ] as Grafico[],
      listas: [
        {
          id: 'por-pagar',
          titulo: 'Liquidaciones por pagar',
          columnas: ['Número', 'Productor', 'Fecha', 'Saldo'],
          filas: pendientes.slice(0, 15).map((l) => [l.numero, l.productor.nombre, new Date(l.fecha).toLocaleDateString('es-EC'), redondear(l.saldo)]),
        },
      ],
    };
  }

  // ─────────────────────────── CALIDAD ───────────────────────────
  private async calidad(p: { desde: Date; hasta: Date; antDesde: Date; antHasta: Date }) {
    const evaluados = (desde: Date, hasta: Date) => this.lotesGrano.find({ 'calidad.fecha': { $gte: desde, $lte: hasta } }).lean().exec();
    const [a, b] = await Promise.all([evaluados(p.desde, p.hasta), evaluados(p.antDesde, p.antHasta)]);
    const exportable = (l: LoteGrano[]) => porcentaje(l.filter((x) => ['PREMIUM', 'EXPORTACION'].includes(x.calidad!.grado)).length, l.length);
    const rechazo = (l: LoteGrano[]) => porcentaje(l.filter((x) => x.calidad!.grado === 'RECHAZO').length, l.length);
    const cacao = a.filter((l) => l.cultivo === 'CACAO');
    const abiertas = await this.lotesGrano.countDocuments({ 'noConformidad.cerrada': false }).exec();
    const meses = ultimosMeses(12);
    const todos12 = await this.lotesGrano.find({ 'calidad.fecha': { $gte: new Date(`${meses[0]}-01T00:00:00`) } }).lean().exec();
    const expMes = meses.map((m) => exportable(todos12.filter((l) => claveMes(l.calidad!.fecha) === m)));
    const rechMes = meses.map((m) => rechazo(todos12.filter((l) => claveMes(l.calidad!.fecha) === m)));
    // Dispersión: cada punto = un productor u hacienda (humedad promedio, fermentación promedio).
    const grupos: Record<string, { h: number[]; f: number[] }> = {};
    for (const l of todos12.filter((x) => x.cultivo === 'CACAO')) {
      const nombre = l.origen === 'PROPIO' ? `Hda. ${l.hacienda?.nombre}` : (l.productor?.nombre ?? '—');
      const g = (grupos[nombre] ??= { h: [], f: [] });
      g.h.push(l.calidad!.humedad);
      g.f.push(l.calidad!.bienFermentados ?? 0);
    }
    const nombres = Object.keys(grupos);
    const grados = ['PREMIUM', 'EXPORTACION', 'NACIONAL', 'RECHAZO'];
    return {
      titulo: 'Panel de calidad',
      tarjetas: [
        tarjeta('exportable', '% exportable', exportable(a), 'porcentaje', 'Lotes grado Exportación o Premium ÷ lotes evaluados.', exportable(b)),
        tarjeta('rechazo', 'Tasa de rechazo', rechazo(a), 'porcentaje', 'Lotes rechazados ÷ evaluados.', rechazo(b), true),
        tarjeta('humedad', 'Humedad promedio', cacao.length ? redondear(promedio(cacao.map((l) => l.calidad!.humedad)), 1) : null, 'porcentaje', 'Promedio de humedad del cacao evaluado (máximo 7 %).', null, true),
        tarjeta('fermentacion', 'Fermentación promedio', cacao.length ? redondear(promedio(cacao.map((l) => l.calidad!.bienFermentados ?? 0)), 1) : null, 'porcentaje', 'Promedio de granos bien fermentados (prueba de corte).'),
        tarjeta('nc', 'No conformidades abiertas', abiertas, 'numero', 'Lotes rechazados sin destino decidido.', null, true),
        tarjeta('evaluados', 'Lotes evaluados', a.length, 'numero', 'Análisis de calidad del período.', b.length),
      ],
      graficos: [
        { id: 'exportable-mes', titulo: '% exportable y tasa de rechazo por mes', tipo: 'linea', categorias: meses.map(etiquetaMes), series: [{ nombre: '% exportable', datos: expMes }, { nombre: '% rechazo', datos: rechMes }], formato: 'porcentaje' },
        { id: 'dispersion', titulo: 'Humedad vs. fermentación por productor u hacienda', tipo: 'dispersion', categorias: nombres, series: nombres.map((n) => ({ nombre: n, datos: [[redondear(promedio(grupos[n].h), 1), redondear(promedio(grupos[n].f), 1)] as [number, number]] })) },
        { id: 'grados', titulo: 'Lotes por grado', tipo: 'circular', categorias: grados, series: [{ nombre: 'Lotes', datos: grados.map((g) => a.filter((l) => l.calidad!.grado === g).length) }] },
      ] as Grafico[],
      listas: [],
    };
  }

  // ─────────────────────────── PRODUCCIÓN ───────────────────────────
  private async produccion(p: { desde: Date; hasta: Date; antDesde: Date; antHasta: Date }) {
    const ordenes = await this.ordenes.find({ fechaProgramada: { $gte: p.desde, $lte: p.hasta } }).populate('producto', 'nombre unidad pesoNetoG').lean().exec();
    const ant = await this.ordenes.find({ fechaProgramada: { $gte: p.antDesde, $lte: p.antHasta } }).lean().exec();
    const terminadas = ordenes.filter((o) => o.estado === 'TERMINADA');
    const unidades = terminadas.reduce((s, o) => s + o.cantidadBuena, 0);
    const unidadesAnt = ant.filter((o) => o.estado === 'TERMINADA').reduce((s, o) => s + o.cantidadBuena, 0);
    // Rendimiento de conversión: kg de producto ÷ kg de grano consumido (solo órdenes que consumen grano directo).
    const conGrano = terminadas.filter((o) => o.consumos.some((c) => c.codigo.startsWith('L-')));
    const kgProducto = conGrano.reduce((s, o) => s + o.cantidadBuena * (((o.producto as unknown as { unidad: string; pesoNetoG: number }).unidad === 'KG' ? 1000 : (o.producto as unknown as { pesoNetoG: number }).pesoNetoG) / 1000), 0);
    const kgGrano = conGrano.reduce((s, o) => s + o.consumos.filter((c) => c.codigo.startsWith('L-')).reduce((t, c) => t + c.cantidad, 0), 0);
    const lotesSecos = await this.lotesGrano.find({ 'secado.fin': { $gte: p.desde, $lte: p.hasta } }).lean().exec();
    const mermaOrigen = ['PROPIO', 'COMPRA'].map((o) => {
      const del = lotesSecos.filter((l) => l.origen === o && l.estadoEntrega === 'BABA');
      return del.length ? redondear(promedio(del.map((l) => l.mermaPct)), 1) : 0;
    });
    // Unidades empacadas por día y producto (barras apiladas).
    const dias = Math.max(1, diasEntre(p.desde, p.hasta) + 1);
    const cats = Array.from({ length: dias }, (_, i) => sumarDias(p.desde, i).toISOString().slice(5, 10).split('-').reverse().join('/'));
    const nombres = [...new Set(terminadas.map((o) => (o.producto as unknown as { nombre: string }).nombre))];
    const seriesDia = nombres.map((n) => {
      const datos = Array(dias).fill(0);
      for (const o of terminadas.filter((x) => (x.producto as unknown as { nombre: string }).nombre === n)) {
        const i = diasEntre(p.desde, o.fechaCierre ?? o.fechaProgramada);
        if (i >= 0 && i < dias) datos[i] += o.cantidadBuena;
      }
      return { nombre: n, datos };
    });
    const mermaPorProducto = nombres.map((n) => redondear(promedio(terminadas.filter((o) => (o.producto as unknown as { nombre: string }).nombre === n).map((o) => o.mermaPct)), 1));
    return {
      titulo: 'Panel de producción',
      tarjetas: [
        tarjeta('cumplimiento', 'Cumplimiento del plan', cumplimiento(ordenes), 'porcentaje', 'Órdenes cerradas a tiempo ÷ programadas.'),
        tarjeta('unidades', 'Unidades buenas producidas', unidades, 'numero', 'Suma de unidades buenas de las órdenes terminadas.', unidadesAnt),
        tarjeta('conversion', 'Rendimiento de conversión', rendimientoConversion(kgProducto, kgGrano), 'numero', 'Kg de producto ÷ kg de grano consumido (ej. 0,8 kg de nibs por kg de grano).'),
        tarjeta('merma', 'Merma de proceso promedio', terminadas.length ? redondear(promedio(terminadas.map((o) => o.mermaPct)), 1) : null, 'porcentaje', '(Planificado − bueno) ÷ planificado.', null, true),
        tarjeta('merma-secado', 'Merma de secado (baba → seco)', lotesSecos.length ? redondear(promedio(lotesSecos.filter((l) => l.estadoEntrega === 'BABA').map((l) => l.mermaPct)), 1) : null, 'porcentaje', '(Kg entrada − kg seco) ÷ kg entrada, en lotes que llegaron en baba.'),
      ],
      graficos: [
        { id: 'cumplimiento', titulo: 'Cumplimiento', tipo: 'medidor', series: [{ nombre: 'Cumplimiento', datos: [cumplimiento(ordenes)] }], formato: 'porcentaje' },
        { id: 'unidades-dia', titulo: 'Unidades empacadas por día y producto', tipo: 'barras_apiladas', categorias: cats, series: seriesDia },
        { id: 'merma-producto', titulo: 'Merma de proceso por producto (%)', tipo: 'barras', categorias: nombres, series: [{ nombre: 'Merma', datos: mermaPorProducto }], formato: 'porcentaje' },
        { id: 'merma-origen', titulo: 'Merma de secado por origen (%)', tipo: 'barras', categorias: ['Propio', 'Comprado'], series: [{ nombre: 'Merma', datos: mermaOrigen }], formato: 'porcentaje' },
      ] as Grafico[],
      listas: [
        {
          id: 'ordenes',
          titulo: 'Órdenes del período',
          columnas: ['Orden', 'Producto', 'Planificado', 'Bueno', 'Estado', 'Costo unit.'],
          filas: ordenes.map((o) => [o.codigo, (o.producto as unknown as { nombre: string }).nombre, o.cantidadPlanificada, o.cantidadBuena, o.estado, o.costos?.unitario ?? '']),
        },
      ],
    };
  }

  // ─────────────────────────── EQUIPOS ───────────────────────────
  private async equipos(p: { desde: Date; hasta: Date; antDesde: Date; antHasta: Date }) {
    const activos = await this.activos.find({ usos: 'ALQUILER', estado: { $nin: ['VENDIDO', 'BAJA'] } }).lean().exec();
    const alquileres = await this.alquileres.find({ estado: { $in: ['ACTIVO', 'DEVUELTO'] }, desde: { $lte: p.hasta }, hasta: { $gte: p.desde } }).lean().exec();
    const dias = Math.max(1, diasEntre(p.desde, p.hasta) + 1);
    const util = activos.map((a) => {
      const ocupado = alquileres
        .filter((x) => String(x.activo) === String(a._id))
        .reduce((s, x) => s + Math.max(0, diasEntre(new Date(Math.max(+new Date(x.desde), +p.desde)), new Date(Math.min(+new Date(x.devolucion?.fecha ?? x.hasta), +p.hasta))) + 1), 0);
      return { codigo: a.codigo, pct: utilizacion(ocupado, dias) };
    });
    const meses = ultimosMeses(12);
    const facturas12 = await this.facturas.find({ tipoComprobante: '01', estado: { $ne: 'ANULADA' }, fechaEmision: { $gte: new Date(`${meses[0]}-01T00:00:00`) } }).lean().exec();
    const viajes12 = await this.viajes.find({ estado: 'ENTREGADO', tipo: 'FLETE_CLIENTE', llegada: { $gte: new Date(`${meses[0]}-01T00:00:00`) } }).lean().exec();
    const ingresoAlquiler = meses.map((m) => redondear(facturas12.filter((f) => claveMes(f.fechaEmision) === m).reduce((s, f) => s + f.items.filter((i) => i.tipo === 'ALQUILER').reduce((t, i) => t + i.subtotal, 0), 0)));
    const ingresoFlete = meses.map((m) => redondear(viajes12.filter((v) => claveMes(v.llegada!) === m).reduce((s, v) => s + (v.tarifa?.total ?? 0), 0)));
    const ventasEquipos = facturas12.filter((f) => f.fechaEmision >= p.desde && f.fechaEmision <= p.hasta).reduce((s, f) => s + f.items.filter((i) => i.tipo === 'EQUIPO').reduce((t, i) => t + i.subtotal, 0), 0);
    const todos = await this.activos.find({ estado: { $nin: ['VENDIDO', 'BAJA'] } }).lean().exec();
    const estados = ['DISPONIBLE', 'EN_USO', 'ALQUILADO', 'EN_VIAJE', 'EN_MANTENIMIENTO'];
    return {
      titulo: 'Panel de equipos y alquileres',
      tarjetas: [
        tarjeta('utilizacion', 'Utilización de la flota de alquiler', util.length ? redondear(promedio(util.map((u) => u.pct)), 1) : 0, 'porcentaje', 'Días alquilados ÷ días del período, promedio de los equipos de alquiler.'),
        tarjeta('alquiler', 'Ingresos por alquiler (12 meses)', redondear(ingresoAlquiler.reduce((s, v) => s + v, 0)), 'dinero', 'Líneas de alquiler facturadas.'),
        tarjeta('flete', 'Ingresos por fletes (12 meses)', redondear(ingresoFlete.reduce((s, v) => s + v, 0)), 'dinero', 'Viajes de flete a terceros entregados.'),
        tarjeta('venta-equipos', 'Venta de equipos (período)', redondear(ventasEquipos), 'dinero', 'Líneas de tipo EQUIPO facturadas en el período.'),
        tarjeta('alquilados', 'Equipos alquilados ahora', todos.filter((a) => a.estado === 'ALQUILADO').length, 'numero', 'Activos en estado ALQUILADO.'),
      ],
      graficos: [
        { id: 'utilizacion', titulo: 'Utilización por activo (%)', tipo: 'barras', categorias: util.map((u) => u.codigo), series: [{ nombre: 'Utilización', datos: util.map((u) => u.pct) }], formato: 'porcentaje' },
        { id: 'ingresos', titulo: 'Ingresos por alquiler y flete', tipo: 'linea', categorias: meses.map(etiquetaMes), series: [{ nombre: 'Alquiler', datos: ingresoAlquiler }, { nombre: 'Flete', datos: ingresoFlete }], formato: 'dinero' },
        { id: 'estados', titulo: 'Activos por estado', tipo: 'circular', categorias: estados, series: [{ nombre: 'Activos', datos: estados.map((e) => todos.filter((a) => a.estado === e).length) }] },
      ] as Grafico[],
      listas: [],
    };
  }

  // ─────────────────────────── LOGÍSTICA ───────────────────────────
  private async logisticaPanel(p: { desde: Date; hasta: Date; antDesde: Date; antHasta: Date }) {
    const viajes = await this.viajes.find({ salida: { $gte: p.desde, $lte: p.hasta } }).lean().exec();
    const ant = await this.viajes.find({ salida: { $gte: p.antDesde, $lte: p.antHasta } }).lean().exec();
    const entregados = viajes.filter((v) => v.estado === 'ENTREGADO');
    const km = entregados.reduce((s, v) => s + ((v.kmLlegada ?? 0) - (v.kmSalida ?? 0)), 0);
    const costo = entregados.reduce((s, v) => s + (v.costos?.combustible ?? 0) + (v.costos?.peajes ?? 0) + (v.costos?.viaticos ?? 0), 0);
    const aTiempo = entregados.filter((v) => v.llegada && new Date(v.llegada) <= new Date(new Date(v.llegadaEstimada).getTime() + 2 * 3_600_000)).length;
    const porCamion = await this.logistica.costosPorCamion();
    const tipos = ['RECOLECCION_ACOPIO', 'ENTREGA_VENTA', 'EXPORTACION', 'FLETE_CLIENTE', 'TRASLADO_INTERNO'];
    return {
      titulo: 'Panel de logística',
      tarjetas: [
        tarjeta('viajes', 'Viajes', viajes.length, 'numero', 'Viajes con salida en el período.', ant.length),
        tarjeta('km', 'Km recorridos', km, 'numero', 'Odómetro de llegada − salida de los viajes entregados.'),
        tarjeta('costo-km', 'Costo por km', km ? redondear(costo / km, 3) : null, 'dinero', '(Combustible + peajes + viáticos) ÷ km.', null, true),
        tarjeta('a-tiempo', 'Entregas a tiempo', porcentaje(aTiempo, entregados.length), 'porcentaje', 'Viajes que llegaron hasta 2 h después de lo estimado.'),
        tarjeta('kg', 'Toneladas transportadas', redondear(entregados.reduce((s, v) => s + v.carga.pesoKg, 0) / 1000, 1), 'numero', 'Suma de la carga de los viajes entregados.'),
      ],
      graficos: [
        { id: 'costo-camion', titulo: 'Costo por km por camión', tipo: 'barras', categorias: porCamion.map((c) => c.camion), series: [{ nombre: 'USD/km', datos: porCamion.map((c) => c.costoPorKm) }], formato: 'dinero' },
        { id: 'tipos', titulo: 'Viajes por tipo', tipo: 'circular', categorias: tipos.map((t) => t.replace(/_/g, ' ').toLowerCase()), series: [{ nombre: 'Viajes', datos: tipos.map((t) => viajes.filter((v) => v.tipo === t).length) }] },
      ] as Grafico[],
      listas: [],
    };
  }

  // ─────────────────────────── MANTENIMIENTO ───────────────────────────
  private async mantenimientoPanel() {
    const ind = await this.mantenimiento.indicadores(90);
    const plan = await this.mantenimiento.planPreventivo();
    const vencidos = plan.filter((x) => x.vencida);
    const proximos = plan.filter((x) => x.proxima);
    const conFallas = ind.filter((i) => i.fallas > 0);
    return {
      titulo: 'Panel de mantenimiento (últimos 90 días)',
      tarjetas: [
        tarjeta('disponibilidad', 'Disponibilidad promedio', ind.length ? redondear(promedio(ind.map((i) => i.disponibilidad)), 1) : null, 'porcentaje', 'Horas operativas ÷ horas del período, promedio de todos los activos.'),
        tarjeta('mtbf', 'MTBF promedio', conFallas.length ? redondear(promedio(conFallas.map((i) => i.mtbf)), 0) : null, 'horas', 'Tiempo medio entre fallas: horas operando ÷ número de fallas (más alto es mejor).'),
        tarjeta('mttr', 'MTTR promedio', conFallas.length ? redondear(promedio(conFallas.map((i) => i.mttr)), 1) : null, 'horas', 'Tiempo medio de reparación (más bajo es mejor).', null, true),
        tarjeta('vencidos', 'Preventivos vencidos', vencidos.length, 'numero', 'Tareas del plan que ya cumplieron tiempo o uso (RN-26).', null, true),
        tarjeta('costo', 'Costo de mantenimiento', redondear(ind.reduce((s, i) => s + i.costoMantenimiento, 0)), 'dinero', 'Repuestos + mano de obra de las órdenes de los últimos 90 días.', null, true),
      ],
      graficos: [
        { id: 'disponibilidad', titulo: 'Disponibilidad por activo (%)', tipo: 'barras', categorias: ind.map((i) => i.codigo), series: [{ nombre: 'Disponibilidad', datos: ind.map((i) => i.disponibilidad) }], formato: 'porcentaje' },
        { id: 'mtbf-mttr', titulo: 'MTBF y MTTR (horas) de activos con fallas', tipo: 'barras', categorias: conFallas.map((i) => i.codigo), series: [{ nombre: 'MTBF', datos: conFallas.map((i) => i.mtbf) }, { nombre: 'MTTR', datos: conFallas.map((i) => i.mttr) }] },
        { id: 'costo-valor', titulo: 'Costo de mantenimiento vs. valor del activo', tipo: 'barras', categorias: ind.filter((i) => i.costoMantenimiento > 0).map((i) => i.codigo), series: [{ nombre: 'Costo 90 días', datos: ind.filter((i) => i.costoMantenimiento > 0).map((i) => i.costoMantenimiento) }, { nombre: 'Valor actual', datos: ind.filter((i) => i.costoMantenimiento > 0).map((i) => i.valorActual) }], formato: 'dinero' },
      ] as Grafico[],
      listas: [
        {
          id: 'preventivos',
          titulo: 'Preventivos vencidos y próximos',
          columnas: ['Activo', 'Tarea', 'Estado', 'Días restantes', 'Uso restante'],
          filas: [...vencidos, ...proximos].map((x) => [x.activo, x.tarea, x.vencida ? 'VENCIDO' : 'PRÓXIMO', x.diasRestantes ?? '—', x.usoRestante ?? '—']),
          semaforo: [...vencidos.map(() => 'rojo' as const), ...proximos.map(() => 'amarillo' as const)],
        },
      ],
    };
  }

  // ─────────────────────────── GERENCIAL ───────────────────────────
  // Una pantalla con lo esencial de TODAS las áreas + alertas + pronóstico del próximo mes.
  private async gerencial(p: { desde: Date; hasta: Date; antDesde: Date; antHasta: Date }, usuario: UsuarioToken) {
    const ventas = await this.ventas(p);
    const [inv, calidad, acopio] = await Promise.all([this.inventarioPanel(), this.calidad(p), this.acopio(p)]);
    const cosechas = await this.cosechas.find({ fecha: { $gte: p.desde, $lte: p.hasta } }).lean().exec();
    const cosechasAnt = await this.cosechas.find({ fecha: { $gte: p.antDesde, $lte: p.antHasta } }).lean().exec();
    const pronostico = await this.proyecciones.pronosticoVentasTotales(1);
    const alertas = await this.alertas.paraUsuario(usuario);
    const t = (panel: { tarjetas: Tarjeta[] }, id: string) => panel.tarjetas.find((x) => x.id === id)!;
    // Ventas de 12 meses, actual vs. año anterior.
    const meses = ultimosMeses(12);
    const hace24 = new Date(`${ultimosMeses(24)[0]}-01T00:00:00`);
    const fact24 = await this.facturas.find({ tipoComprobante: '01', estado: { $ne: 'ANULADA' }, fechaEmision: { $gte: hace24 } }).select('fechaEmision subtotalSinImpuestos').lean().exec();
    const suma = (mes: string) => redondear(fact24.filter((f) => claveMes(f.fechaEmision) === mes).reduce((s, f) => s + f.subtotalSinImpuestos, 0));
    const anioAnterior = (m: string) => `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`;
    return {
      titulo: 'Panel gerencial',
      tarjetas: [
        t(ventas, 'ventas'),
        t(ventas, 'margen'),
        tarjeta('cosechado', 'Kg cosechados (baba/cereza)', redondear(cosechas.reduce((s, c) => s + c.kg, 0)), 'kg', 'Kg recolectados en las haciendas propias.', redondear(cosechasAnt.reduce((s, c) => s + c.kg, 0))),
        t(acopio, 'kg'),
        t(calidad, 'exportable'),
        t(inv, 'valor'),
        t(ventas, 'cxc'),
        { ...t(acopio, 'deuda'), titulo: 'Cuentas por pagar a productores' },
        tarjeta('alertas', 'Alertas activas', alertas.length, 'numero', 'Stock, vencimientos, mantenimiento, labores, cobranza...', null, true),
        tarjeta('pronostico', 'Pronóstico de ventas próximo mes', pronostico[0]?.valor ?? null, 'dinero', 'Tendencia lineal × índice estacional del mes (ver Proyecciones).'),
      ],
      graficos: [
        { id: 'ventas-12', titulo: 'Ventas de los últimos 12 meses vs. año anterior', tipo: 'barras', categorias: meses.map(etiquetaMes), series: [{ nombre: 'Este año', datos: meses.map(suma) }, { nombre: 'Año anterior', datos: meses.map((m) => suma(anioAnterior(m))) }], formato: 'dinero' },
        ventas.graficos.find((g) => g.id === 'mezcla')!,
        acopio.graficos.find((g) => g.id === 'propio-compra')!,
        calidad.graficos.find((g) => g.id === 'exportable-mes')!,
      ] as Grafico[],
      listas: [
        {
          id: 'alertas',
          titulo: 'Alertas activas',
          columnas: ['Área', 'Alerta'],
          filas: alertas.slice(0, 20).map((a) => [a.area, a.mensaje]),
          semaforo: alertas.slice(0, 20).map((a) => (a.nivel === 'ALTA' ? 'rojo' : 'amarillo')),
        },
      ],
    };
  }
}
