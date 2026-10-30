// informes.service.ts → INFORMES descargables en PDF (para imprimir o enviar) y Excel (para analizar).
//
// Todos los informes devuelven la misma forma { titulo, columnas, filas, resumen }, así el mismo código
// sirve para verlos en pantalla, exportarlos a PDF (PdfService.informe) y a Excel (librería ExcelJS).

import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
// ExcelJS: crea archivos .xlsx con hojas, estilos y formatos de número.
import ExcelJS from 'exceljs';
import { Factura } from '../facturacion/esquemas/factura.esquema.js';
import { TurnoCaja } from '../ventas/esquemas/turno-caja.esquema.js';
import { Cotizacion } from '../ventas/esquemas/cotizacion.esquema.js';
import { Liquidacion } from '../acopio/esquemas/liquidacion.esquema.js';
import { LoteGrano } from '../poscosecha/esquemas/lote-grano.esquema.js';
import { OrdenProduccion } from '../produccion/esquemas/orden-produccion.esquema.js';
import { Cosecha } from '../campo/esquemas/cosecha.esquema.js';
import { Labor } from '../campo/esquemas/labor.esquema.js';
import { Alquiler } from '../equipos/esquemas/alquiler.esquema.js';
import { Viaje } from '../logistica/esquemas/viaje.esquema.js';
import { OrdenMantenimiento } from '../mantenimiento/esquemas/orden-mantenimiento.esquema.js';
import { Usuario } from '../usuarios/esquemas/usuario.esquema.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { ClientesService } from '../ventas/clientes.service.js';
import { RastreoService } from '../rastreo/rastreo.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { PdfService, type ColumnaPdf } from '../../comun/servicios/pdf.service.js';
import { CorreoService } from '../../comun/servicios/correo.service.js';
import { KpisService, type Tarjeta } from './kpis.service.js';
import { dinero, fechaCorta, redondear, sumarDias } from '../../comun/utilidades.js';
import { tramoAntiguedad, tasaCierre } from '../ventas/ventas.reglas.js';
import { margen } from '../productos/productos.reglas.js';
import { tieneRol, type UsuarioToken } from '../../comun/usuario-token.js';
import type { Rol } from '../../comun/constantes.js';

export interface Informe {
  titulo: string;
  subtitulo: string;
  columnas: ColumnaPdf[];
  filas: (string | number)[][];
  resumen: [string, string][];
}

export interface FiltrosInforme {
  desde?: string;
  hasta?: string;
  producto?: string;
  cliente?: string;
  codigo?: string;
}

// Catálogo de informes: id, título, área, quién lo ve y qué filtros pide.
export const CATALOGO_INFORMES: { id: string; titulo: string; area: string; roles: Rol[]; filtros: string[]; descripcion: string }[] = [
  { id: 'gerencial', titulo: 'Informe gerencial mensual', area: 'Gerencia', roles: [], filtros: ['fechas'], descripcion: 'KPIs principales, comparación con el período anterior y alertas.' },
  { id: 'ventas', titulo: 'Ventas por período', area: 'Ventas', roles: ['VENTAS'], filtros: ['fechas'], descripcion: 'Facturas, totales, IVA, canal y vendedor.' },
  { id: 'iva', titulo: 'Resumen de IVA en ventas', area: 'Ventas', roles: ['VENTAS'], filtros: ['fechas'], descripcion: 'Bases 15 % y 0 %, IVA cobrado y notas de crédito (apoyo para la declaración).' },
  { id: 'caja', titulo: 'Cierres de caja', area: 'Ventas', roles: ['VENTAS'], filtros: ['fechas'], descripcion: 'Turnos, ventas por forma de pago, efectivo contado y diferencia.' },
  { id: 'cuentas-cobrar', titulo: 'Cuentas por cobrar', area: 'Ventas', roles: ['VENTAS'], filtros: [], descripcion: 'Saldo por cliente y por antigüedad.' },
  { id: 'estado-cuenta', titulo: 'Estado de cuenta de un cliente', area: 'Ventas', roles: ['VENTAS'], filtros: ['cliente'], descripcion: 'Facturas, abonos y saldo.' },
  { id: 'cotizaciones', titulo: 'Cotizaciones', area: 'Ventas', roles: ['VENTAS'], filtros: ['fechas'], descripcion: 'Enviadas, aceptadas, vencidas y tasa de cierre.' },
  { id: 'rentabilidad', titulo: 'Rentabilidad por producto', area: 'Ventas', roles: ['VENTAS'], filtros: ['fechas'], descripcion: 'Unidades, ventas, costo y margen de cada producto.' },
  { id: 'kardex', titulo: 'Kardex de un producto', area: 'Inventario', roles: ['BODEGA'], filtros: ['producto', 'fechas'], descripcion: 'Entradas, salidas y saldo con costo.' },
  { id: 'inventario', titulo: 'Inventario valorizado', area: 'Inventario', roles: ['BODEGA'], filtros: [], descripcion: 'Stock y valor por producto y bodega.' },
  { id: 'vencimientos', titulo: 'Vencimientos', area: 'Inventario', roles: ['BODEGA', 'CALIDAD'], filtros: [], descripcion: 'Lotes por vencer y vencidos.' },
  { id: 'compras', titulo: 'Compras a productores', area: 'Acopio', roles: ['ACOPIO'], filtros: ['fechas'], descripcion: 'Kg, precio, descuentos y pagos por productor.' },
  { id: 'liquidaciones-pendientes', titulo: 'Liquidaciones pendientes', area: 'Acopio', roles: ['ACOPIO'], filtros: [], descripcion: 'Lo que se debe a cada productor.' },
  { id: 'calidad', titulo: 'Calidad por lote y productor', area: 'Calidad', roles: ['CALIDAD'], filtros: ['fechas'], descripcion: 'Mediciones, grado y ranking.' },
  { id: 'produccion', titulo: 'Producción y mermas', area: 'Producción', roles: ['PRODUCCION'], filtros: ['fechas'], descripcion: 'Órdenes, unidades, merma y costo unitario.' },
  { id: 'cosechas', titulo: 'Cosechas por hacienda', area: 'Campo', roles: ['AGRONOMO'], filtros: ['fechas'], descripcion: 'Kg por parcela, lote generado y costo.' },
  { id: 'labores', titulo: 'Labores y aplicaciones', area: 'Campo', roles: ['AGRONOMO'], filtros: ['fechas'], descripcion: 'Labores, jornales, insumos, agroquímicos y carencias.' },
  { id: 'alquileres', titulo: 'Alquileres', area: 'Equipos', roles: ['VENTAS', 'LOGISTICA'], filtros: ['fechas'], descripcion: 'Contratos, días, ingresos y estado.' },
  { id: 'viajes', titulo: 'Viajes y fletes', area: 'Logística', roles: ['LOGISTICA'], filtros: ['fechas'], descripcion: 'Viajes, km, costos e ingresos.' },
  { id: 'mantenimientos', titulo: 'Mantenimientos', area: 'Mantenimiento', roles: ['MANTENIMIENTO'], filtros: ['fechas'], descripcion: 'Órdenes, repuestos, horas y costo por activo.' },
  { id: 'trazabilidad', titulo: 'Trazabilidad de un lote', area: 'Calidad', roles: ['CALIDAD', 'VENTAS', 'PRODUCCION'], filtros: ['codigo'], descripcion: 'Historia completa de un lote, hacia atrás hasta su origen.' },
];

// col(): atajo para declarar columnas.
const col = (titulo: string, ancho: number, alinear: ColumnaPdf['alinear'] = 'left'): ColumnaPdf => ({ titulo, ancho, alinear });

@Injectable()
export class InformesService {
  private readonly logger = new Logger(InformesService.name);

  constructor(
    @InjectModel(Factura.name) private readonly facturas: Model<Factura>,
    @InjectModel(TurnoCaja.name) private readonly turnos: Model<TurnoCaja>,
    @InjectModel(Cotizacion.name) private readonly cotizaciones: Model<Cotizacion>,
    @InjectModel(Liquidacion.name) private readonly liquidaciones: Model<Liquidacion>,
    @InjectModel(LoteGrano.name) private readonly lotesGrano: Model<LoteGrano>,
    @InjectModel(OrdenProduccion.name) private readonly ordenes: Model<OrdenProduccion>,
    @InjectModel(Cosecha.name) private readonly cosechas: Model<Cosecha>,
    @InjectModel(Labor.name) private readonly labores: Model<Labor>,
    @InjectModel(Alquiler.name) private readonly alquileres: Model<Alquiler>,
    @InjectModel(Viaje.name) private readonly viajes: Model<Viaje>,
    @InjectModel(OrdenMantenimiento.name) private readonly mantenimientos: Model<OrdenMantenimiento>,
    @InjectModel(Usuario.name) private readonly usuarios: Model<Usuario>,
    private readonly inventario: InventarioService,
    private readonly clientes: ClientesService,
    private readonly rastreo: RastreoService,
    private readonly configuracion: ConfiguracionService,
    private readonly pdf: PdfService,
    private readonly correo: CorreoService,
    private readonly kpis: KpisService,
  ) {}

  catalogo(usuario: UsuarioToken) {
    return CATALOGO_INFORMES.filter((i) => tieneRol(usuario, ...(i.roles.length ? i.roles : (['GERENTE'] as Rol[]))));
  }

  // rango(): fechas del filtro; por defecto, el mes en curso.
  private rango(f: FiltrosInforme) {
    const hoy = new Date();
    const desde = f.desde ? new Date(`${f.desde}T00:00:00`) : new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const hasta = f.hasta ? new Date(`${f.hasta}T23:59:59`) : hoy;
    return { desde, hasta, texto: `Del ${fechaCorta(desde)} al ${fechaCorta(hasta)}` };
  }

  // generar(): arma el informe pedido (revisa que el usuario tenga permiso).
  async generar(id: string, f: FiltrosInforme, usuario: UsuarioToken): Promise<Informe> {
    const def = CATALOGO_INFORMES.find((i) => i.id === id);
    if (!def) throw new BadRequestException(`El informe "${id}" no existe`);
    if (!tieneRol(usuario, ...(def.roles.length ? def.roles : (['GERENTE'] as Rol[])))) throw new ForbiddenException('No tienes acceso a este informe');
    const r = this.rango(f);
    switch (id) {
      case 'gerencial': {
        const panel = await this.kpis.panel('gerencial', f.desde, f.hasta, usuario);
        const formato = (t: Tarjeta, v: number | null | undefined) => (v === null || v === undefined ? '—' : t.formato === 'dinero' ? dinero(v) : t.formato === 'porcentaje' ? `${v} %` : `${v}${t.formato === 'kg' ? ' kg' : ''}`);
        const alertas = panel.listas.find((l) => l.id === 'alertas')?.filas ?? [];
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Indicador', 210), col('Valor', 100, 'right'), col('Período anterior', 100, 'right'), col('Variación', 105, 'right')],
          filas: [
            ...panel.tarjetas.map((t) => [t.titulo, formato(t, t.valor), formato(t, t.anterior), t.variacion === null || t.variacion === undefined ? '—' : `${t.variacion > 0 ? '▲' : '▼'} ${Math.abs(t.variacion)} %`.replace('▲', '+').replace('▼', '−')]),
            ['', '', '', ''],
            ...alertas.map((a) => [`Alerta · ${a[0]}`, String(a[1]), '', '']),
          ],
          resumen: [['Alertas activas', String(alertas.length)]],
        };
      }
      case 'ventas': {
        const lista = await this.facturas.find({ fechaEmision: { $gte: r.desde, $lte: r.hasta } }).sort({ fechaEmision: 1 }).lean().exec();
        const signo = (x: Factura) => (x.tipoComprobante === '04' ? -1 : 1);
        const validas = lista.filter((x) => x.estado !== 'ANULADA' || x.tipoComprobante === '04');
        const total = redondear(validas.reduce((s, x) => s + signo(x) * x.subtotalSinImpuestos, 0));
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Fecha', 55), col('Comprobante', 90), col('Cliente', 150), col('Canal', 65), col('Vendedor', 85), col('Subtotal', 65, 'right'), col('IVA', 50, 'right'), col('Total', 65, 'right'), col('Estado', 60)],
          filas: lista.map((x) => [fechaCorta(x.fechaEmision), `${x.tipoComprobante === '04' ? 'NC ' : ''}${x.numero}`, x.cliente.nombre, x.canal, x.vendedor?.nombre ?? '', signo(x) * x.subtotalSinImpuestos, signo(x) * x.iva, signo(x) * x.total, x.estado]),
          resumen: [
            ['Comprobantes', String(lista.length)],
            ['Ventas netas sin IVA', dinero(total)],
            ['IVA', dinero(validas.reduce((s, x) => s + signo(x) * x.iva, 0))],
            ['Ticket promedio', dinero(validas.filter((x) => x.tipoComprobante === '01').length ? total / validas.filter((x) => x.tipoComprobante === '01').length : 0)],
          ],
        };
      }
      case 'iva': {
        const lista = await this.facturas.find({ fechaEmision: { $gte: r.desde, $lte: r.hasta } }).lean().exec();
        const fact = lista.filter((x) => x.tipoComprobante === '01' && x.estado !== 'ANULADA');
        const nc = lista.filter((x) => x.tipoComprobante === '04');
        const s = (l: Factura[], c: keyof Factura) => redondear(l.reduce((t, x) => t + (x[c] as number), 0));
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Concepto', 260), col('Base 15 %', 85, 'right'), col('Base 0 %', 85, 'right'), col('IVA', 85, 'right')],
          filas: [
            ['Facturas emitidas', s(fact, 'subtotalIva'), s(fact, 'subtotal0'), s(fact, 'iva')],
            ['(−) Notas de crédito', -s(nc, 'subtotalIva'), -s(nc, 'subtotal0'), -s(nc, 'iva')],
            ['= Ventas netas', s(fact, 'subtotalIva') - s(nc, 'subtotalIva'), s(fact, 'subtotal0') - s(nc, 'subtotal0'), redondear(s(fact, 'iva') - s(nc, 'iva'))],
          ],
          resumen: [
            ['Tarifa vigente', `${(await this.configuracion.obtener()).iva.tarifaGeneral} %`],
            ['Nota', 'Apoyo interno. Las facturas son simuladas; confirmar la declaración con un contador.'],
          ],
        };
      }
      case 'caja': {
        const lista = await this.turnos.find({ apertura: { $gte: r.desde, $lte: r.hasta } }).sort({ apertura: 1 }).lean().exec();
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Apertura', 85), col('Cajero', 110), col('Inicial', 55, 'right'), col('Efectivo', 60, 'right'), col('Tarjetas', 60, 'right'), col('Transf.', 55, 'right'), col('Contado', 60, 'right'), col('Diferencia', 60, 'right'), col('Estado', 50)],
          filas: lista.map((t) => [new Date(t.apertura).toLocaleString('es-EC'), t.cajeroNombre, t.montoInicial, t.ventasPorFormaPago?.['01'] ?? 0, redondear((t.ventasPorFormaPago?.['16'] ?? 0) + (t.ventasPorFormaPago?.['19'] ?? 0)), t.ventasPorFormaPago?.['20'] ?? 0, t.contado ?? '', t.diferencia ?? '', t.estado]),
          resumen: [['Turnos', String(lista.length)], ['Diferencia acumulada', dinero(lista.reduce((s, t) => s + (t.diferencia ?? 0), 0))]],
        };
      }
      case 'cuentas-cobrar': {
        const lista = await this.facturas.find({ tipoComprobante: '01', estado: { $ne: 'ANULADA' }, saldo: { $gt: 0.005 } }).sort({ 'cliente.nombre': 1 }).lean().exec();
        const tramos: Record<string, number> = { '0-30': 0, '31-60': 0, '+60': 0 };
        for (const x of lista) tramos[tramoAntiguedad(x.fechaEmision)] += x.saldo;
        return {
          titulo: def.titulo,
          subtitulo: `Al ${fechaCorta(new Date())}`,
          columnas: [col('Cliente', 160), col('Factura', 95), col('Emisión', 60), col('Vence', 60), col('Total', 60, 'right'), col('Saldo', 60, 'right'), col('Antigüedad', 60, 'center')],
          filas: lista.map((x) => [x.cliente.nombre, x.numero, fechaCorta(x.fechaEmision), fechaCorta(x.vence), x.total, x.saldo, tramoAntiguedad(x.fechaEmision)]),
          resumen: [['Total por cobrar', dinero(lista.reduce((s, x) => s + x.saldo, 0))], ['0 a 30 días', dinero(tramos['0-30'])], ['31 a 60 días', dinero(tramos['31-60'])], ['Más de 60 días', dinero(tramos['+60'])]],
        };
      }
      case 'estado-cuenta': {
        if (!f.cliente) throw new BadRequestException('Elige un cliente');
        const ec = await this.clientes.estadoCuenta(f.cliente);
        const filas: (string | number)[][] = [];
        for (const x of ec.facturas.slice().reverse()) {
          filas.push([fechaCorta(x.fechaEmision), `${x.tipoComprobante === '04' ? 'Nota de crédito' : 'Factura'} ${x.numero}`, x.tipoComprobante === '04' ? '' : x.total, x.tipoComprobante === '04' ? x.total : '', x.saldo]);
          for (const ab of x.abonos) filas.push([fechaCorta(ab.fecha), `  Abono (${ab.formaPago}) ${ab.referencia ?? ''}`, '', ab.monto, '']);
        }
        return {
          titulo: `${def.titulo}: ${ec.cliente.nombre}`,
          subtitulo: `${ec.cliente.identificacion} · Al ${fechaCorta(new Date())}`,
          columnas: [col('Fecha', 70), col('Documento', 220), col('Cargo', 75, 'right'), col('Abono', 75, 'right'), col('Saldo doc.', 75, 'right')],
          filas,
          resumen: [['Saldo pendiente', dinero(ec.credito.saldoPendiente)], ['Cupo', dinero(ec.credito.cupo)], ['Disponible', dinero(ec.credito.disponible)], ['Facturas vencidas', String(ec.credito.facturasVencidas)]],
        };
      }
      case 'cotizaciones': {
        const lista = await this.cotizaciones.find({ fecha: { $gte: r.desde, $lte: r.hasta } }).populate('cliente', 'nombre').sort({ fecha: 1 }).lean().exec();
        const enviadas = lista.filter((x) => x.estado !== 'BORRADOR').length;
        const aceptadas = lista.filter((x) => x.estado === 'ACEPTADA').length;
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Número', 85), col('Fecha', 60), col('Cliente', 170), col('Vendedor', 90), col('Total', 60, 'right'), col('Vence', 60), col('Estado', 70)],
          filas: lista.map((x) => [x.numero, fechaCorta(x.fecha), (x.cliente as unknown as { nombre: string })?.nombre ?? '', x.vendedor?.nombre ?? '', x.totales.total, fechaCorta(x.vence), x.estado]),
          resumen: [['Cotizaciones', String(lista.length)], ['Enviadas', String(enviadas)], ['Aceptadas', String(aceptadas)], ['Tasa de cierre', `${tasaCierre(aceptadas, enviadas)} %`]],
        };
      }
      case 'rentabilidad': {
        const lista = await this.facturas.find({ tipoComprobante: '01', estado: { $ne: 'ANULADA' }, fechaEmision: { $gte: r.desde, $lte: r.hasta } }).lean().exec();
        const porProducto: Record<string, { nombre: string; unidades: number; ventas: number; costo: number }> = {};
        for (const x of lista) for (const i of x.items.filter((y) => y.tipo === 'PRODUCTO')) {
          const p = (porProducto[i.codigo] ??= { nombre: i.descripcion, unidades: 0, ventas: 0, costo: 0 });
          p.unidades += i.cantidad;
          p.ventas += i.subtotal;
          p.costo += i.cantidad * (i.costoUnitario ?? 0);
        }
        const filas = Object.entries(porProducto).sort((a, b) => b[1].ventas - a[1].ventas);
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('SKU', 75), col('Producto', 190), col('Unidades', 55, 'right'), col('Ventas', 65, 'right'), col('Costo', 65, 'right'), col('Margen', 65, 'right')],
          filas: filas.map(([sku, p]) => [sku, p.nombre, redondear(p.unidades, 2), redondear(p.ventas), redondear(p.costo), `${margen(p.ventas, p.costo)} %`]),
          resumen: [['Ventas', dinero(filas.reduce((s, [, p]) => s + p.ventas, 0))], ['Margen total', `${margen(filas.reduce((s, [, p]) => s + p.ventas, 0), filas.reduce((s, [, p]) => s + p.costo, 0))} %`]],
        };
      }
      case 'kardex': {
        if (!f.producto) throw new BadRequestException('Elige un producto');
        const movs = await this.inventario.kardex(f.producto, f.desde ? r.desde : undefined, f.hasta ? r.hasta : undefined);
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Fecha', 80), col('Tipo', 100), col('Documento', 95), col('Lote', 85), col('Entrada', 50, 'right'), col('Salida', 50, 'right'), col('Saldo', 55, 'right'), col('Costo u.', 50, 'right')],
          filas: movs.map((m) => [new Date(m.fecha as unknown as Date).toLocaleString('es-EC'), m.tipo.replace(/_/g, ' ').toLowerCase(), `${m.documento?.tipo ?? ''} ${m.documento?.numero ?? ''}`, m.codigoLote ?? '', m.signo > 0 ? m.cantidad : '', m.signo < 0 ? m.cantidad : '', m.saldoProducto ?? '', m.costoUnitario]),
          resumen: [['Movimientos', String(movs.length)], ['Saldo final', String(movs.at(-1)?.saldoProducto ?? 0)]],
        };
      }
      case 'inventario': {
        const lotes = await this.inventario.listarLotes({});
        const filas = lotes.map((l) => {
          const p = l.producto as unknown as { sku: string; nombre: string; unidad: string };
          const b = l.bodega as unknown as { codigo: string };
          return [b.codigo, p.sku, p.nombre, l.codigo, redondear(l.cantidad, 2), l.reservado, l.costoUnitario, redondear(l.cantidad * l.costoUnitario), l.liberado ? (l.bloqueado ? 'Bloqueado' : 'Liberado') : 'Pendiente'];
        });
        const total = redondear(filas.reduce((s, x) => s + (x[7] as number), 0));
        return {
          titulo: def.titulo,
          subtitulo: `Al ${fechaCorta(new Date())}`,
          columnas: [col('Bodega', 55), col('SKU', 70), col('Producto', 160), col('Lote', 85), col('Cantidad', 55, 'right'), col('Reserv.', 45, 'right'), col('Costo u.', 50, 'right'), col('Valor', 60, 'right'), col('Estado', 55)],
          filas,
          resumen: [['Lotes', String(filas.length)], ['Valor total', dinero(total)]],
        };
      }
      case 'vencimientos': {
        const lotes = await this.inventario.porVencer();
        return {
          titulo: def.titulo,
          subtitulo: `Al ${fechaCorta(new Date())}`,
          columnas: [col('Producto', 200), col('Lote', 90), col('Bodega', 60), col('Cantidad', 60, 'right'), col('Vence', 65), col('Tramo', 60)],
          filas: lotes.map((l) => [(l.producto as unknown as { nombre: string }).nombre, l.codigo, (l.bodega as unknown as { codigo: string }).codigo, l.cantidad, fechaCorta(l.vencimiento), l.tramo === 'VENCIDO' ? 'VENCIDO' : `≤ ${l.tramo} días`]),
          resumen: [['Lotes', String(lotes.length)], ['Vencidos', String(lotes.filter((l) => l.tramo === 'VENCIDO').length)]],
        };
      }
      case 'compras': {
        const lista = await this.liquidaciones.find({ fecha: { $gte: r.desde, $lte: r.hasta } }).sort({ fecha: 1 }).lean().exec();
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Fecha', 55), col('Liquidación', 105), col('Productor', 125), col('Producto', 80), col('Kg netos', 50, 'right'), col('Desc. kg', 45, 'right'), col('Kg pagos', 50, 'right'), col('$/qq', 40, 'right'), col('Total', 55, 'right'), col('Saldo', 50, 'right')],
          filas: lista.map((l) => [fechaCorta(l.fecha), l.numero, l.productor.nombre, `${l.variedad} ${l.estadoEntrega.toLowerCase()}`, l.kgNetos, redondear(l.descuentoHumedadKg + l.descuentoImpurezasKg), l.kgPagables, l.precioQq, l.totalPagar, l.saldo]),
          resumen: [['Entregas', String(lista.length)], ['Kg pagables', `${redondear(lista.reduce((s, l) => s + l.kgPagables, 0))} kg`], ['Total liquidado', dinero(lista.reduce((s, l) => s + l.totalPagar, 0))], ['Pendiente de pago', dinero(lista.reduce((s, l) => s + l.saldo, 0))]],
        };
      }
      case 'liquidaciones-pendientes': {
        const lista = await this.liquidaciones.find({ saldo: { $gt: 0.005 } }).sort({ 'productor.nombre': 1, fecha: 1 }).lean().exec();
        return {
          titulo: def.titulo,
          subtitulo: `Al ${fechaCorta(new Date())}`,
          columnas: [col('Productor', 170), col('Cédula', 80), col('Liquidación', 110), col('Fecha', 60), col('Total', 50, 'right'), col('Saldo', 50, 'right')],
          filas: lista.map((l) => [l.productor.nombre, l.productor.cedula, l.numero, fechaCorta(l.fecha), l.totalPagar, l.saldo]),
          resumen: [['Total por pagar', dinero(lista.reduce((s, l) => s + l.saldo, 0))]],
        };
      }
      case 'calidad': {
        const lista = await this.lotesGrano.find({ 'calidad.fecha': { $gte: r.desde, $lte: r.hasta } }).sort({ 'calidad.fecha': 1 }).lean().exec();
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Lote', 70), col('Origen', 140), col('Variedad', 60), col('Ferm. %', 45, 'right'), col('Pizar. %', 45, 'right'), col('Moho %', 40, 'right'), col('Humedad', 45, 'right'), col('Grado', 70)],
          filas: lista.map((l) => [l.codigo, l.origen === 'PROPIO' ? `Hda. ${l.hacienda?.nombre} ${l.parcela?.codigo ?? ''}` : (l.productor?.nombre ?? ''), l.variedad, l.calidad?.bienFermentados ?? '—', l.calidad?.pizarrosos ?? '—', l.calidad?.mohosos ?? '—', l.calidad?.humedad ?? '—', l.calidad?.grado ?? '']),
          resumen: [['Lotes evaluados', String(lista.length)], ['Exportables', String(lista.filter((l) => ['PREMIUM', 'EXPORTACION'].includes(l.calidad!.grado)).length)], ['Rechazados', String(lista.filter((l) => l.calidad!.grado === 'RECHAZO').length)]],
        };
      }
      case 'produccion': {
        const lista = await this.ordenes.find({ fechaProgramada: { $gte: r.desde, $lte: r.hasta } }).populate('producto', 'nombre').sort({ fechaProgramada: 1 }).lean().exec();
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Orden', 80), col('Producto', 170), col('Fecha', 60), col('Planif.', 50, 'right'), col('Buenas', 50, 'right'), col('Merma %', 50, 'right'), col('Costo u.', 55, 'right'), col('Estado', 60)],
          filas: lista.map((o) => [o.codigo, (o.producto as unknown as { nombre: string }).nombre, fechaCorta(o.fechaProgramada), o.cantidadPlanificada, o.cantidadBuena, o.mermaPct, o.costos?.unitario ?? '', o.estado]),
          resumen: [['Órdenes', String(lista.length)], ['Terminadas', String(lista.filter((o) => o.estado === 'TERMINADA').length)], ['Costo total', dinero(lista.reduce((s, o) => s + (o.costos?.total ?? 0), 0))]],
        };
      }
      case 'cosechas': {
        const lista = await this.cosechas.find({ fecha: { $gte: r.desde, $lte: r.hasta } }).populate('parcela', 'codigo variedad').populate('hacienda', 'nombre').sort({ fecha: 1 }).lean().exec();
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Fecha', 60), col('Hacienda', 110), col('Parcela', 60), col('Variedad', 65), col('Mazorcas', 55, 'right'), col('Kg', 55, 'right'), col('Lote', 70), col('Costo', 60, 'right')],
          filas: lista.map((c) => [fechaCorta(c.fecha), (c.hacienda as unknown as { nombre: string }).nombre, (c.parcela as unknown as { codigo: string }).codigo, (c.parcela as unknown as { variedad: string }).variedad, c.mazorcas, c.kg, c.codigoLote ?? '', c.costoAsignado]),
          resumen: [['Cosechas', String(lista.length)], ['Kg recolectados', `${redondear(lista.reduce((s, c) => s + c.kg, 0))} kg`], ['Costo asignado', dinero(lista.reduce((s, c) => s + c.costoAsignado, 0))]],
        };
      }
      case 'labores': {
        const lista = await this.labores.find({ fecha: { $gte: r.desde, $lte: r.hasta } }).populate('parcela', 'codigo').sort({ fecha: 1 }).lean().exec();
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Fecha', 60), col('Parcela', 60), col('Labor', 85), col('Jornales', 50, 'right'), col('Insumos', 140), col('Carencia', 70), col('Costo', 50, 'right')],
          filas: lista.map((l) => [fechaCorta(l.fecha), (l.parcela as unknown as { codigo: string }).codigo, l.tipo.replace('_', ' ').toLowerCase(), l.cuadrilla.reduce((s, c) => s + c.jornales, 0), l.insumos.map((i) => `${i.cantidad} ${i.unidad.toLowerCase()} ${i.nombre}`).join(', '), l.agroquimico ? `${l.agroquimico.diasCarencia} días (hasta ${fechaCorta(sumarDias(l.fecha, l.agroquimico.diasCarencia))})` : '', l.costoTotal]),
          resumen: [['Labores', String(lista.length)], ['Costo total', dinero(lista.reduce((s, l) => s + l.costoTotal, 0))]],
        };
      }
      case 'alquileres': {
        const lista = await this.alquileres.find({ desde: { $lte: r.hasta }, hasta: { $gte: r.desde } }).populate('activo', 'codigo nombre').populate('cliente', 'nombre').sort({ desde: 1 }).lean().exec();
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Contrato', 80), col('Equipo', 130), col('Cliente', 130), col('Desde', 55), col('Hasta', 55), col('Días', 35, 'right'), col('Valor', 55, 'right'), col('Estado', 60)],
          filas: lista.map((a) => [a.codigo, `${(a.activo as unknown as { codigo: string }).codigo} ${(a.activo as unknown as { nombre: string }).nombre}`, (a.cliente as unknown as { nombre: string }).nombre, fechaCorta(a.desde), fechaCorta(a.devolucion?.fecha ?? a.hasta), a.calculo?.diasReales ?? '', a.calculo?.subtotal ?? '', a.estado]),
          resumen: [['Contratos', String(lista.length)], ['Valor devuelto', dinero(lista.reduce((s, a) => s + (a.calculo?.subtotal ?? 0), 0))]],
        };
      }
      case 'viajes': {
        const lista = await this.viajes.find({ salida: { $gte: r.desde, $lte: r.hasta } }).populate('camion', 'codigo').populate('chofer', 'nombre').sort({ salida: 1 }).lean().exec();
        const km = (v: Viaje) => (v.kmLlegada ?? 0) - (v.kmSalida ?? 0);
        const costo = (v: Viaje) => (v.costos?.combustible ?? 0) + (v.costos?.peajes ?? 0) + (v.costos?.viaticos ?? 0);
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Viaje', 70), col('Fecha', 55), col('Camión', 50), col('Chofer', 90), col('Ruta', 140), col('Kg', 45, 'right'), col('Km', 40, 'right'), col('Costo', 45, 'right'), col('Flete', 45, 'right')],
          filas: lista.map((v) => [v.codigo, fechaCorta(v.salida), (v.camion as unknown as { codigo: string }).codigo, (v.chofer as unknown as { nombre: string }).nombre, `${v.origen} → ${v.destino}`, v.carga.pesoKg, km(v) > 0 ? km(v) : '', costo(v), v.tarifa?.total ?? '']),
          resumen: [['Viajes', String(lista.length)], ['Km', String(lista.reduce((s, v) => s + Math.max(0, km(v)), 0))], ['Costos', dinero(lista.reduce((s, v) => s + costo(v), 0))], ['Ingresos por flete', dinero(lista.reduce((s, v) => s + (v.tarifa?.total ?? 0), 0))]],
        };
      }
      case 'mantenimientos': {
        const lista = await this.mantenimientos.find({ createdAt: { $gte: r.desde, $lte: r.hasta } }).populate('activo', 'codigo nombre').populate('cliente', 'nombre').sort({ createdAt: 1 }).lean().exec();
        return {
          titulo: def.titulo,
          subtitulo: r.texto,
          columnas: [col('Orden', 75), col('Tipo', 70), col('Equipo', 150), col('Detalle', 120), col('Horas', 40, 'right'), col('Costo', 50, 'right'), col('Estado', 60)],
          filas: lista.map((o) => [o.codigo, o.tipo.replace('_', ' ').toLowerCase(), o.activo ? `${(o.activo as unknown as { codigo: string }).codigo} ${(o.activo as unknown as { nombre: string }).nombre}` : `${o.equipoCliente?.descripcion ?? ''} (${(o.cliente as unknown as { nombre: string })?.nombre ?? ''})`, o.tarea ?? o.falla?.descripcion ?? '', o.horasManoObra, o.costos?.costoTotal ?? 0, o.estado]),
          resumen: [['Órdenes', String(lista.length)], ['Costo total', dinero(lista.reduce((s, o) => s + (o.costos?.costoTotal ?? 0), 0))]],
        };
      }
      case 'trazabilidad': {
        if (!f.codigo) throw new BadRequestException('Escribe el código del lote');
        const t = await this.rastreo.rastrear(f.codigo);
        return {
          titulo: `${def.titulo} ${t.codigo}`,
          subtitulo: t.producto?.nombre ?? '',
          columnas: [col('Fecha', 90), col('Lote', 90), col('Etapa', 110), col('Detalle', 225)],
          filas: t.etapas.map((e) => [new Date(e.fecha).toLocaleString('es-EC'), e.lote, e.titulo, e.detalle]),
          resumen: [
            ['Origen', t.origenes.map((o) => `${o.nombre} (${o.variedad})`).join('; ')],
            ['Calidad', t.calidad.map((c) => `${c.lote}: ${c.grado}`).join('; ')],
            ['Elaboración', fechaCorta(t.fechas.elaboracion)],
            ['Vencimiento', fechaCorta(t.fechas.vencimiento)],
          ],
        };
      }
    }
    throw new BadRequestException('Informe no implementado');
  }

  // ─── Exportación ───
  async exportarPdf(informe: Informe) {
    return this.pdf.informe(await this.configuracion.empresa(), informe.titulo, informe.subtitulo, informe.columnas, informe.filas.map((f) => f.map((c) => (typeof c === 'number' ? redondear(c).toLocaleString('es-EC') : c))), informe.resumen);
  }

  // excel(): una hoja con encabezado de marca, la tabla con filtros y el resumen al final.
  async exportarExcel(informe: Informe): Promise<Buffer> {
    const libro = new ExcelJS.Workbook();
    libro.creator = 'Pepa de Oro';
    const hoja = libro.addWorksheet(informe.titulo.slice(0, 31)); // Excel limita el nombre de la hoja a 31 caracteres
    hoja.addRow([informe.titulo]).font = { bold: true, size: 14, color: { argb: 'FF3B2314' } };
    hoja.addRow([informe.subtitulo]).font = { italic: true, color: { argb: 'FF6B5A48' } };
    hoja.addRow([]);
    const encabezado = hoja.addRow(informe.columnas.map((c) => c.titulo));
    encabezado.eachCell((celda) => {
      celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B2314' } };
    });
    for (const f of informe.filas) hoja.addRow(f);
    // autoFilter: agrega los botones de filtro de Excel en el encabezado.
    hoja.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + informe.filas.length, column: informe.columnas.length } };
    informe.columnas.forEach((c, i) => (hoja.getColumn(i + 1).width = Math.max(10, Math.round(c.ancho / 5.5))));
    hoja.addRow([]);
    for (const [k, v] of informe.resumen) hoja.addRow([k, v]).getCell(1).font = { bold: true };
    // writeBuffer(): genera el .xlsx en memoria.
    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  // ─── Informe gerencial automático: el día 1 de cada mes a las 08:00 llega al correo del gerente ───
  @Cron('0 8 1 * *')
  async enviarGerencialMensual() {
    const gerentes = await this.usuarios.find({ roles: 'GERENTE', activo: true }).lean().exec();
    if (!gerentes.length) return { enviados: 0 };
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const usuario: UsuarioToken = { sub: String(gerentes[0]._id), correo: gerentes[0].correo, nombre: gerentes[0].nombre, roles: ['GERENTE'] };
    const informe = await this.generar('gerencial', { desde: iso(desde), hasta: iso(hasta) }, usuario);
    const buffer = await this.exportarPdf(informe);
    for (const g of gerentes) {
      await this.correo.enviar({
        para: g.correo,
        asunto: `Informe gerencial ${desde.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })} – Pepa de Oro`,
        html: this.correo.plantilla('Informe gerencial mensual', `<p>Hola ${g.nombre}, adjuntamos el informe con los KPIs del mes anterior y las alertas activas.</p>`),
        adjuntos: [{ filename: 'Informe-gerencial.pdf', content: buffer, contentType: 'application/pdf' }],
      });
    }
    this.logger.log(`📊 Informe gerencial enviado a ${gerentes.length} gerente(s)`);
    return { enviados: gerentes.length };
  }
}
