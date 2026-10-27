// alertas.service.ts → la CAMPANA de la barra superior: junta las alertas de todos los módulos
// y muestra a cada usuario solo las de sus roles.

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Factura } from '../facturacion/esquemas/factura.esquema.js';
import { SolicitudWeb } from '../web/esquemas/solicitud-web.esquema.js';
import { Cotizacion } from '../ventas/esquemas/cotizacion.esquema.js';
import { LoteGrano } from '../poscosecha/esquemas/lote-grano.esquema.js';
import { Liquidacion } from '../acopio/esquemas/liquidacion.esquema.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { PoscosechaService } from '../poscosecha/poscosecha.service.js';
import { MantenimientoService } from '../mantenimiento/mantenimiento.service.js';
import { EquiposService } from '../equipos/equipos.service.js';
import { CampoService } from '../campo/campo.service.js';
import { ProyeccionesService } from './proyecciones.service.js';
import { estaVencida } from '../ventas/ventas.reglas.js';
import { sumarDias } from '../../comun/utilidades.js';
import { tieneRol, type UsuarioToken } from '../../comun/usuario-token.js';
import type { Rol } from '../../comun/constantes.js';

export interface Alerta {
  area: string;
  tipo: string;
  nivel: 'ALTA' | 'MEDIA';
  mensaje: string;
  ruta?: string; // pantalla del sistema donde se resuelve
  roles: Rol[];
}

@Injectable()
export class AlertasService {
  constructor(
    @InjectModel(Factura.name) private readonly facturas: Model<Factura>,
    @InjectModel(SolicitudWeb.name) private readonly solicitudes: Model<SolicitudWeb>,
    @InjectModel(Cotizacion.name) private readonly cotizaciones: Model<Cotizacion>,
    @InjectModel(LoteGrano.name) private readonly lotesGrano: Model<LoteGrano>,
    @InjectModel(Liquidacion.name) private readonly liquidaciones: Model<Liquidacion>,
    private readonly inventario: InventarioService,
    private readonly poscosecha: PoscosechaService,
    private readonly mantenimiento: MantenimientoService,
    private readonly equipos: EquiposService,
    private readonly campo: CampoService,
    private readonly proyecciones: ProyeccionesService,
  ) {}

  // todas(): calcula todas las alertas del sistema en este momento.
  async todas(): Promise<Alerta[]> {
    const a: Alerta[] = [];
    const hoy = new Date();
    const [bajo, porVencer, poscosecha, plan, documentos, agenda, pendientesCalidad, tendencias] = await Promise.all([
      this.inventario.bajoMinimo(),
      this.inventario.porVencer(),
      this.poscosecha.alertas(),
      this.mantenimiento.planPreventivo(),
      this.equipos.alertasDocumentos(),
      this.campo.agenda(),
      this.lotesGrano.countDocuments({ estado: 'SECO' }).exec(),
      this.proyecciones.alertasTendencia(),
    ]);
    for (const b of bajo) a.push({ area: 'Inventario', tipo: 'STOCK_BAJO', nivel: b.disponible <= 0 ? 'ALTA' : 'MEDIA', mensaje: `${b.nombre}: quedan ${b.disponible} (mínimo ${b.stockMinimo})`, ruta: '/admin/inventario', roles: ['BODEGA', 'VENTAS', 'PRODUCCION'] });
    for (const l of porVencer.filter((x) => x.tramo === 'VENCIDO' || x.tramo === 30)) {
      const p = l.producto as unknown as { nombre: string };
      a.push({ area: 'Inventario', tipo: l.tramo === 'VENCIDO' ? 'VENCIDO' : 'POR_VENCER', nivel: l.tramo === 'VENCIDO' ? 'ALTA' : 'MEDIA', mensaje: `${p.nombre} lote ${l.codigo}: ${l.tramo === 'VENCIDO' ? 'VENCIDO, dar de baja' : 'vence en menos de 30 días'} (${l.cantidad})`, ruta: '/admin/inventario', roles: ['BODEGA', 'VENTAS', 'CALIDAD'] });
    }
    for (const x of poscosecha) a.push({ area: 'Poscosecha', tipo: x.tipo, nivel: 'MEDIA', mensaje: x.mensaje, ruta: `/admin/poscosecha/${x.ref}`, roles: ['ACOPIO', 'CALIDAD', 'PRODUCCION'] });
    if (pendientesCalidad) a.push({ area: 'Calidad', tipo: 'PENDIENTE_CALIDAD', nivel: 'MEDIA', mensaje: `${pendientesCalidad} lote(s) de grano seco esperan análisis de calidad`, ruta: '/admin/calidad', roles: ['CALIDAD'] });
    const ptPendientes = await this.inventario.listarLotes({ pendientesCalidad: true });
    if (ptPendientes.length) a.push({ area: 'Calidad', tipo: 'PT_SIN_LIBERAR', nivel: 'MEDIA', mensaje: `${ptPendientes.length} lote(s) de producto terminado esperan liberación (RN-11)`, ruta: '/admin/calidad', roles: ['CALIDAD', 'PRODUCCION'] });
    for (const p of plan.filter((x) => x.vencida || x.proxima)) a.push({ area: 'Mantenimiento', tipo: p.vencida ? 'PREVENTIVO_VENCIDO' : 'PREVENTIVO_PROXIMO', nivel: p.vencida ? 'ALTA' : 'MEDIA', mensaje: `${p.activo}: ${p.tarea} ${p.vencida ? `vencido (${p.motivo})` : 'en los próximos días'}`, ruta: '/admin/mantenimiento', roles: ['MANTENIMIENTO', 'LOGISTICA'] });
    for (const d of documentos) a.push({ area: 'Equipos', tipo: 'DOCUMENTO', nivel: d.vencido ? 'ALTA' : 'MEDIA', mensaje: `${d.activo}: ${d.tipo.replace('_', ' ').toLowerCase()} ${d.vencido ? 'VENCIDO' : 'vence pronto'} (${new Date(d.vence).toLocaleDateString('es-EC')})`, ruta: '/admin/equipos', roles: ['LOGISTICA', 'MANTENIMIENTO'] });
    for (const g of agenda) {
      for (const t of g.atrasadas) a.push({ area: 'Campo', tipo: 'LABOR_ATRASADA', nivel: t.diasAtraso > 15 ? 'ALTA' : 'MEDIA', mensaje: `${g.parcela.codigo}: ${t.tipo.toLowerCase()} con ${t.diasAtraso} días de atraso`, ruta: `/admin/campo/parcelas/${g.parcela._id}`, roles: ['AGRONOMO'] });
      if (g.bloqueo) a.push({ area: 'Campo', tipo: 'CARENCIA', nivel: 'MEDIA', mensaje: `${g.parcela.codigo}: ${g.bloqueo.replace('RN-01: ', '')}`, ruta: `/admin/campo/parcelas/${g.parcela._id}`, roles: ['AGRONOMO'] });
    }
    const credito = await this.facturas.find({ tipoComprobante: '01', estado: { $ne: 'ANULADA' }, saldo: { $gt: 0.005 } }).select('numero cliente saldo vence').lean().exec();
    for (const f of credito.filter((x) => estaVencida(x))) a.push({ area: 'Ventas', tipo: 'FACTURA_VENCIDA', nivel: 'ALTA', mensaje: `Factura ${f.numero} de ${f.cliente.nombre} vencida (saldo $${f.saldo.toFixed(2)})`, ruta: '/admin/facturas', roles: ['VENTAS'] });
    const errores = await this.facturas.find({ estado: 'ERROR_ENVIO' }).select('numero cliente').lean().exec();
    for (const f of errores) a.push({ area: 'Ventas', tipo: 'ERROR_CORREO', nivel: 'MEDIA', mensaje: `No se pudo enviar la factura ${f.numero} a ${f.cliente.nombre}; reintenta`, ruta: '/admin/facturas', roles: ['VENTAS'] });
    const nuevas = await this.solicitudes.countDocuments({ estado: 'NUEVA' }).exec();
    if (nuevas) a.push({ area: 'Web', tipo: 'SOLICITUDES', nivel: 'MEDIA', mensaje: `${nuevas} solicitud(es) nueva(s) desde la web`, ruta: '/admin/solicitudes', roles: ['VENTAS'] });
    const porVencerCot = await this.cotizaciones.find({ estado: 'ENVIADA', vence: { $gte: hoy, $lte: sumarDias(hoy, 3) } }).select('numero').lean().exec();
    for (const c of porVencerCot) a.push({ area: 'Ventas', tipo: 'COTIZACION', nivel: 'MEDIA', mensaje: `La cotización ${c.numero} vence en menos de 3 días`, ruta: '/admin/cotizaciones', roles: ['VENTAS'] });
    const atrasadas = await this.liquidaciones.find({ saldo: { $gt: 0.005 }, fecha: { $lt: sumarDias(hoy, -7) } }).select('numero productor saldo').lean().exec();
    for (const l of atrasadas) a.push({ area: 'Acopio', tipo: 'PAGO_PRODUCTOR', nivel: 'ALTA', mensaje: `Pago pendiente de más de 7 días a ${l.productor.nombre} (${l.numero}, $${l.saldo.toFixed(2)})`, ruta: '/admin/acopio', roles: ['ACOPIO'] });
    for (const t of tendencias) a.push({ area: t.tipo === 'CALIDAD_PRODUCTOR' ? 'Calidad' : 'Ventas', tipo: t.tipo, nivel: 'MEDIA', mensaje: t.mensaje, roles: t.tipo === 'CALIDAD_PRODUCTOR' ? ['ACOPIO', 'CALIDAD'] : ['VENTAS', 'PRODUCCION'] });
    // Las de nivel ALTA primero.
    return a.sort((x, y) => (x.nivel === y.nivel ? 0 : x.nivel === 'ALTA' ? -1 : 1));
  }

  async paraUsuario(usuario: UsuarioToken) {
    return (await this.todas()).filter((a) => tieneRol(usuario, ...a.roles));
  }
}
