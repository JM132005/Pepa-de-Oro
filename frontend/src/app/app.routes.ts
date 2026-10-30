// app.routes.ts → MAPA de todas las pantallas de la aplicación.
//
// Hay dos "caras" dentro del mismo proyecto Angular:
//   1. La WEB PÚBLICA (sin login): /, /nosotros, /productos, /equipos, /servicios, /rastreo, /contacto.
//   2. El SISTEMA INTERNO (con login y roles): todo lo que empieza con /admin.
//
// loadComponent: () => import(...) → "carga perezosa" (lazy loading). El código de cada página se descarga
// solo cuando alguien entra a ella, así la web pública abre rápido aunque el sistema interno sea grande.
// title: el texto de la pestaña del navegador (y lo que Google muestra como título).
// data.descripcion: la descripción de la página para Google (la pone LayoutPublico en <meta name="description">).
// canActivate: los "guards" que deciden si se puede entrar (ver compartido/Controlador/auth.guard.ts).

import { Routes } from '@angular/router';
import { conectadoGuard, invitadoGuard, rolGuard } from './compartido/Controlador/auth.guard';

export const routes: Routes = [
  // ═════════════════════════════ WEB PÚBLICA ═════════════════════════════
  {
    path: '',
    loadComponent: () => import('./publico/layout-publico/layout-publico').then((m) => m.LayoutPublico),
    children: [
      {
        path: '',
        title: 'Pepa de Oro — Cacao & Café de El Oro',
        data: { descripcion: 'Cacao fino de aroma, chocolate de origen y café de altura de El Oro, Ecuador. Precios y stock en línea.' },
        loadComponent: () => import('./publico/Paginas/inicio/inicio').then((m) => m.Inicio),
      },
      {
        path: 'nosotros',
        title: 'Quiénes somos · Pepa de Oro',
        data: { descripcion: 'Historia, misión, visión, valores y haciendas de Pepa de Oro en El Guabo, El Oro.' },
        loadComponent: () => import('./publico/Paginas/nosotros/nosotros').then((m) => m.Nosotros),
      },
      {
        path: 'productos',
        title: 'Catálogo · Pepa de Oro',
        data: { descripcion: 'Chocolates, bombones, cacao en grano, café y derivados con precio por menor y por mayor y stock en vivo.' },
        loadComponent: () => import('./publico/Paginas/productos/productos').then((m) => m.Productos),
      },
      {
        // :slug → parte variable de la URL (ej: /productos/chocolate-70). Llega a la página como input() gracias a withComponentInputBinding.
        path: 'productos/:slug',
        title: 'Producto · Pepa de Oro',
        loadComponent: () => import('./publico/Paginas/producto-detalle/producto-detalle').then((m) => m.ProductoDetalle),
      },
      {
        path: 'equipos',
        title: 'Maquinaria y vehículos · Pepa de Oro',
        data: { descripcion: 'Venta y alquiler de tractores, secadoras y camiones en El Oro, con disponibilidad en línea.' },
        loadComponent: () => import('./publico/Paginas/equipos/equipos').then((m) => m.Equipos),
      },
      {
        path: 'servicios',
        title: 'Servicios · Pepa de Oro',
        data: { descripcion: 'Transporte de carga, taller de mantenimiento y compra de cacao y café con el precio del día.' },
        loadComponent: () => import('./publico/Paginas/servicios/servicios').then((m) => m.Servicios),
      },
      {
        path: 'rastreo',
        title: 'Rastrea tu cacao · Pepa de Oro',
        data: { descripcion: 'Escribe o escanea el código de tu producto y conoce la hacienda o el productor de donde salió tu cacao.' },
        loadComponent: () => import('./publico/Paginas/rastreo/rastreo').then((m) => m.Rastreo),
      },
      {
        path: 'contacto',
        title: 'Contacto · Pepa de Oro',
        data: { descripcion: 'Escríbenos, llámanos o visítanos en El Guabo y Machala.' },
        loadComponent: () => import('./publico/Paginas/contacto/contacto').then((m) => m.Contacto),
      },
    ],
  },

  // ═════════════════════════════ LOGIN ═════════════════════════════
  {
    path: 'login',
    title: 'Ingresar · Pepa de Oro',
    canActivate: [invitadoGuard], // si ya inició sesión, lo manda directo a /admin
    loadComponent: () => import('./admin/Paginas/login/login').then((m) => m.Login),
  },

  // ═════════════════════════════ SISTEMA INTERNO ═════════════════════════════
  // Cada ruta repite los roles del backend (rolGuard). OJO: esto solo ESCONDE pantallas;
  // la seguridad real está en la API, que vuelve a revisar el rol en cada petición.
  {
    path: 'admin',
    canActivate: [conectadoGuard],
    loadComponent: () => import('./admin/layout-admin/layout-admin').then((m) => m.LayoutAdmin),
    children: [
      { path: '', title: 'Inicio · Sistema', loadComponent: () => import('./admin/Paginas/inicio-admin/inicio-admin').then((m) => m.InicioAdmin) },
      { path: 'paneles/:area', title: 'Panel · Sistema', loadComponent: () => import('./admin/Paginas/paneles/paneles').then((m) => m.Paneles) },

      // ─── Ventas ───
      { path: 'caja', title: 'Caja · Sistema', canActivate: [rolGuard('VENTAS')], loadComponent: () => import('./admin/Paginas/caja/caja').then((m) => m.Caja) },
      { path: 'facturas', title: 'Facturas · Sistema', canActivate: [rolGuard('VENTAS')], loadComponent: () => import('./admin/Paginas/facturas/facturas').then((m) => m.Facturas) },
      { path: 'cotizaciones', title: 'Cotizaciones · Sistema', canActivate: [rolGuard('VENTAS')], loadComponent: () => import('./admin/Paginas/cotizaciones/cotizaciones').then((m) => m.Cotizaciones) },
      { path: 'pedidos', title: 'Pedidos · Sistema', canActivate: [rolGuard('VENTAS', 'BODEGA', 'LOGISTICA')], loadComponent: () => import('./admin/Paginas/pedidos/pedidos').then((m) => m.Pedidos) },
      { path: 'clientes', title: 'Clientes · Sistema', canActivate: [rolGuard('VENTAS', 'LOGISTICA', 'MANTENIMIENTO')], loadComponent: () => import('./admin/Paginas/clientes/clientes').then((m) => m.Clientes) },
      { path: 'solicitudes', title: 'Solicitudes web · Sistema', canActivate: [rolGuard('VENTAS')], loadComponent: () => import('./admin/Paginas/solicitudes/solicitudes').then((m) => m.Solicitudes) },

      // ─── Catálogo e inventario ───
      { path: 'catalogo', title: 'Catálogo y precios · Sistema', canActivate: [rolGuard('BODEGA', 'VENTAS')], loadComponent: () => import('./admin/Paginas/catalogo/catalogo').then((m) => m.Catalogo) },
      { path: 'inventario', title: 'Inventario · Sistema', loadComponent: () => import('./admin/Paginas/inventario/inventario').then((m) => m.Inventario) },

      // ─── Campo, acopio, poscosecha, calidad y producción ───
      { path: 'campo', title: 'Campo · Sistema', canActivate: [rolGuard('AGRONOMO', 'ACOPIO', 'CALIDAD')], loadComponent: () => import('./admin/Paginas/campo/campo').then((m) => m.Campo) },
      { path: 'campo/parcelas/:id', title: 'Parcela · Sistema', canActivate: [rolGuard('AGRONOMO', 'ACOPIO', 'CALIDAD')], loadComponent: () => import('./admin/Paginas/parcela-detalle/parcela-detalle').then((m) => m.ParcelaDetalle) },
      { path: 'acopio', title: 'Acopio · Sistema', canActivate: [rolGuard('ACOPIO', 'CALIDAD')], loadComponent: () => import('./admin/Paginas/acopio/acopio').then((m) => m.Acopio) },
      { path: 'poscosecha', title: 'Poscosecha · Sistema', canActivate: [rolGuard('ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA', 'AGRONOMO')], loadComponent: () => import('./admin/Paginas/poscosecha/poscosecha').then((m) => m.Poscosecha) },
      { path: 'poscosecha/:id', title: 'Lote de grano · Sistema', canActivate: [rolGuard('ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA', 'AGRONOMO')], loadComponent: () => import('./admin/Paginas/lote-grano/lote-grano').then((m) => m.LoteGranoDetalle) },
      { path: 'calidad', title: 'Calidad · Sistema', canActivate: [rolGuard('CALIDAD', 'ACOPIO', 'PRODUCCION', 'BODEGA')], loadComponent: () => import('./admin/Paginas/calidad/calidad').then((m) => m.Calidad) },
      { path: 'produccion', title: 'Producción · Sistema', canActivate: [rolGuard('PRODUCCION', 'CALIDAD', 'BODEGA')], loadComponent: () => import('./admin/Paginas/produccion/produccion').then((m) => m.Produccion) },

      // ─── Equipos, logística y mantenimiento ───
      { path: 'equipos', title: 'Equipos y alquileres · Sistema', canActivate: [rolGuard('VENTAS', 'LOGISTICA', 'MANTENIMIENTO')], loadComponent: () => import('./admin/Paginas/equipos/equipos').then((m) => m.EquiposAdmin) },
      { path: 'logistica', title: 'Logística · Sistema', canActivate: [rolGuard('LOGISTICA', 'VENTAS', 'AGRONOMO', 'ACOPIO', 'MANTENIMIENTO')], loadComponent: () => import('./admin/Paginas/logistica/logistica').then((m) => m.Logistica) },
      { path: 'mantenimiento', title: 'Mantenimiento · Sistema', canActivate: [rolGuard('MANTENIMIENTO', 'LOGISTICA', 'PRODUCCION', 'AGRONOMO', 'ACOPIO')], loadComponent: () => import('./admin/Paginas/mantenimiento/mantenimiento').then((m) => m.Mantenimiento) },

      // ─── Análisis ───
      { path: 'informes', title: 'Informes · Sistema', loadComponent: () => import('./admin/Paginas/informes/informes').then((m) => m.Informes) },
      { path: 'proyecciones', title: 'Proyecciones · Sistema', canActivate: [rolGuard('VENTAS', 'PRODUCCION', 'AGRONOMO', 'ACOPIO', 'BODEGA', 'CALIDAD')], loadComponent: () => import('./admin/Paginas/proyecciones/proyecciones').then((m) => m.Proyecciones) },

      // ─── Administración (solo gerente: rolGuard() sin roles = solo GERENTE) ───
      { path: 'contenido-web', title: 'Contenido web · Sistema', canActivate: [rolGuard()], loadComponent: () => import('./admin/Paginas/contenido-web/contenido-web').then((m) => m.ContenidoWeb) },
      { path: 'usuarios', title: 'Usuarios · Sistema', canActivate: [rolGuard()], loadComponent: () => import('./admin/Paginas/usuarios/usuarios').then((m) => m.Usuarios) },
      { path: 'configuracion', title: 'Configuración · Sistema', canActivate: [rolGuard()], loadComponent: () => import('./admin/Paginas/configuracion/configuracion').then((m) => m.Configuracion) },
      { path: 'auditoria', title: 'Auditoría · Sistema', canActivate: [rolGuard()], loadComponent: () => import('./admin/Paginas/auditoria/auditoria').then((m) => m.Auditoria) },
    ],
  },

  // Cualquier otra dirección → página "no encontrada".
  { path: '**', title: 'Página no encontrada · Pepa de Oro', loadComponent: () => import('./publico/Paginas/no-encontrada/no-encontrada').then((m) => m.NoEncontrada) },
];
