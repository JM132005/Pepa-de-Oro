// base-datos.module.ts → registra TODAS las colecciones de MongoDB en un solo lugar.
//
// Cada colección tiene su "esquema" (la forma de sus documentos) dentro de la carpeta de su módulo.
// Aquí se registran todas juntas y se exportan, así cualquier servicio puede inyectar cualquier modelo
// con @InjectModel(Nombre.name) sin crear dependencias circulares entre módulos.
// @Global(): basta importarlo una vez en app.module.ts.
//
// Esta lista es también el "mapa" de la base de datos: si el ingeniero pregunta qué colecciones hay, es esta.
// Son 32 colecciones agrupadas por área (el número entre paréntesis).

import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
// ── Base ──
import { Usuario, UsuarioEsquema } from './modulos/usuarios/esquemas/usuario.esquema.js';
import { Configuracion, ConfiguracionEsquema } from './modulos/configuracion/configuracion.esquema.js';
import { Contador, ContadorEsquema } from './comun/esquemas/contador.esquema.js';
import { Auditoria, AuditoriaEsquema } from './modulos/auditoria/auditoria.esquema.js';
// ── Campo ──
import { Hacienda, HaciendaEsquema } from './modulos/campo/esquemas/hacienda.esquema.js';
import { Parcela, ParcelaEsquema } from './modulos/campo/esquemas/parcela.esquema.js';
import { Trabajador, TrabajadorEsquema } from './modulos/campo/esquemas/trabajador.esquema.js';
import { Labor, LaborEsquema } from './modulos/campo/esquemas/labor.esquema.js';
import { MonitoreoSanidad, MonitoreoSanidadEsquema } from './modulos/campo/esquemas/monitoreo-sanidad.esquema.js';
import { Clima, ClimaEsquema } from './modulos/campo/esquemas/clima.esquema.js';
import { Cosecha, CosechaEsquema } from './modulos/campo/esquemas/cosecha.esquema.js';
// ── Acopio, poscosecha y calidad ──
import { Productor, ProductorEsquema } from './modulos/acopio/esquemas/productor.esquema.js';
import { PrecioDia, PrecioDiaEsquema } from './modulos/acopio/esquemas/precio-dia.esquema.js';
import { Liquidacion, LiquidacionEsquema } from './modulos/acopio/esquemas/liquidacion.esquema.js';
import { LoteGrano, LoteGranoEsquema } from './modulos/poscosecha/esquemas/lote-grano.esquema.js';
// ── Producción ──
import { Receta, RecetaEsquema } from './modulos/produccion/esquemas/receta.esquema.js';
import { OrdenProduccion, OrdenProduccionEsquema } from './modulos/produccion/esquemas/orden-produccion.esquema.js';
// ── Catálogo e inventario ──
import { Producto, ProductoEsquema } from './modulos/productos/esquemas/producto.esquema.js';
import { Bodega, BodegaEsquema } from './modulos/inventario/esquemas/bodega.esquema.js';
import { LoteProducto, LoteProductoEsquema } from './modulos/inventario/esquemas/lote-producto.esquema.js';
import { Movimiento, MovimientoEsquema } from './modulos/inventario/esquemas/movimiento.esquema.js';
// ── Ventas y facturación ──
import { Cliente, ClienteEsquema } from './modulos/ventas/esquemas/cliente.esquema.js';
import { Cotizacion, CotizacionEsquema } from './modulos/ventas/esquemas/cotizacion.esquema.js';
import { Pedido, PedidoEsquema } from './modulos/ventas/esquemas/pedido.esquema.js';
import { TurnoCaja, TurnoCajaEsquema } from './modulos/ventas/esquemas/turno-caja.esquema.js';
import { Factura, FacturaEsquema } from './modulos/facturacion/esquemas/factura.esquema.js';
// ── Equipos, logística y mantenimiento ──
import { Activo, ActivoEsquema } from './modulos/equipos/esquemas/activo.esquema.js';
import { Alquiler, AlquilerEsquema } from './modulos/equipos/esquemas/alquiler.esquema.js';
import { Viaje, ViajeEsquema } from './modulos/logistica/esquemas/viaje.esquema.js';
import { OrdenMantenimiento, OrdenMantenimientoEsquema } from './modulos/mantenimiento/esquemas/orden-mantenimiento.esquema.js';
// ── Sitio web ──
import { ContenidoWeb, ContenidoWebEsquema } from './modulos/web/esquemas/contenido-web.esquema.js';
import { SolicitudWeb, SolicitudWebEsquema } from './modulos/web/esquemas/solicitud-web.esquema.js';

// forFeature([{ name, schema }]): crea el "modelo" (el objeto que consulta la colección).
const MODELOS = MongooseModule.forFeature([
  // Base (4)
  { name: Usuario.name, schema: UsuarioEsquema }, // usuarios
  { name: Configuracion.name, schema: ConfiguracionEsquema }, // configuracion
  { name: Contador.name, schema: ContadorEsquema }, // contadores
  { name: Auditoria.name, schema: AuditoriaEsquema }, // auditoria
  // Campo (7)
  { name: Hacienda.name, schema: HaciendaEsquema }, // haciendas
  { name: Parcela.name, schema: ParcelaEsquema }, // parcelas
  { name: Trabajador.name, schema: TrabajadorEsquema }, // trabajadores
  { name: Labor.name, schema: LaborEsquema }, // labores
  { name: MonitoreoSanidad.name, schema: MonitoreoSanidadEsquema }, // monitoreos_sanidad
  { name: Clima.name, schema: ClimaEsquema }, // clima (time series)
  { name: Cosecha.name, schema: CosechaEsquema }, // cosechas
  // Acopio y poscosecha (4)
  { name: Productor.name, schema: ProductorEsquema }, // productores
  { name: PrecioDia.name, schema: PrecioDiaEsquema }, // precios_dia
  { name: Liquidacion.name, schema: LiquidacionEsquema }, // liquidaciones
  { name: LoteGrano.name, schema: LoteGranoEsquema }, // lotes_grano
  // Producción (2)
  { name: Receta.name, schema: RecetaEsquema }, // recetas
  { name: OrdenProduccion.name, schema: OrdenProduccionEsquema }, // ordenes_produccion
  // Catálogo e inventario (4)
  { name: Producto.name, schema: ProductoEsquema }, // productos
  { name: Bodega.name, schema: BodegaEsquema }, // bodegas
  { name: LoteProducto.name, schema: LoteProductoEsquema }, // lotes_producto
  { name: Movimiento.name, schema: MovimientoEsquema }, // movimientos_inventario
  // Ventas y facturación (5)
  { name: Cliente.name, schema: ClienteEsquema }, // clientes
  { name: Cotizacion.name, schema: CotizacionEsquema }, // cotizaciones
  { name: Pedido.name, schema: PedidoEsquema }, // pedidos
  { name: TurnoCaja.name, schema: TurnoCajaEsquema }, // turnos_caja
  { name: Factura.name, schema: FacturaEsquema }, // facturas (y notas de crédito)
  // Equipos, logística y mantenimiento (4)
  { name: Activo.name, schema: ActivoEsquema }, // activos
  { name: Alquiler.name, schema: AlquilerEsquema }, // alquileres
  { name: Viaje.name, schema: ViajeEsquema }, // viajes
  { name: OrdenMantenimiento.name, schema: OrdenMantenimientoEsquema }, // ordenes_mantenimiento
  // Sitio web (2)
  { name: ContenidoWeb.name, schema: ContenidoWebEsquema }, // contenido_web
  { name: SolicitudWeb.name, schema: SolicitudWebEsquema }, // solicitudes_web
]);

@Global()
@Module({ imports: [MODELOS], exports: [MODELOS] })
export class BaseDatosModule {}
