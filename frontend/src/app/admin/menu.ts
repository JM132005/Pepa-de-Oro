// menu.ts → MENÚ del sistema interno: qué opciones hay, su ícono y qué roles las ven.
// El menú lateral muestra solo lo que los roles del usuario permiten (la tabla de permisos del diseño).
// roles: [] significa "solo el Gerente" (el gerente siempre ve todo, ver AuthService.tieneRol()).

import { Rol } from '../compartido/Entidades/usuario';

export interface OpcionMenu {
  ruta: string;
  texto: string;
  icono: string;
  roles: Rol[];
}

export interface SeccionMenu {
  titulo: string;
  opciones: OpcionMenu[];
}

export const MENU_ADMIN: SeccionMenu[] = [
  {
    titulo: 'General',
    opciones: [
      { ruta: '/admin', texto: 'Inicio', icono: 'inicio', roles: ['AGRONOMO', 'ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA', 'VENTAS', 'LOGISTICA', 'MANTENIMIENTO'] },
      { ruta: '/admin/paneles/gerencial', texto: 'Paneles (KPIs)', icono: 'panel', roles: ['AGRONOMO', 'ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA', 'VENTAS', 'LOGISTICA', 'MANTENIMIENTO'] },
    ],
  },
  {
    titulo: 'Ventas',
    opciones: [
      { ruta: '/admin/caja', texto: 'Caja', icono: 'caja', roles: ['VENTAS'] },
      { ruta: '/admin/facturas', texto: 'Facturas y cobros', icono: 'factura', roles: ['VENTAS'] },
      { ruta: '/admin/cotizaciones', texto: 'Cotizaciones', icono: 'cotizacion', roles: ['VENTAS'] },
      { ruta: '/admin/pedidos', texto: 'Pedidos', icono: 'pedido', roles: ['VENTAS', 'BODEGA', 'LOGISTICA'] },
      { ruta: '/admin/clientes', texto: 'Clientes', icono: 'clientes', roles: ['VENTAS', 'LOGISTICA', 'MANTENIMIENTO'] },
      { ruta: '/admin/solicitudes', texto: 'Solicitudes web', icono: 'solicitud', roles: ['VENTAS'] },
    ],
  },
  {
    titulo: 'Productos',
    opciones: [
      { ruta: '/admin/catalogo', texto: 'Catálogo y precios', icono: 'catalogo', roles: ['BODEGA', 'VENTAS'] },
      { ruta: '/admin/inventario', texto: 'Inventario', icono: 'inventario', roles: ['AGRONOMO', 'ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA', 'VENTAS', 'LOGISTICA', 'MANTENIMIENTO'] },
    ],
  },
  {
    titulo: 'Del campo a la planta',
    opciones: [
      { ruta: '/admin/campo', texto: 'Haciendas y cosechas', icono: 'campo', roles: ['AGRONOMO', 'ACOPIO', 'CALIDAD'] },
      { ruta: '/admin/acopio', texto: 'Acopio y productores', icono: 'acopio', roles: ['ACOPIO', 'CALIDAD'] },
      { ruta: '/admin/poscosecha', texto: 'Poscosecha', icono: 'poscosecha', roles: ['ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA', 'AGRONOMO'] },
      { ruta: '/admin/calidad', texto: 'Calidad', icono: 'calidad', roles: ['CALIDAD', 'ACOPIO', 'PRODUCCION', 'BODEGA'] },
      { ruta: '/admin/produccion', texto: 'Producción', icono: 'produccion', roles: ['PRODUCCION', 'CALIDAD', 'BODEGA'] },
    ],
  },
  {
    titulo: 'Equipos y servicios',
    opciones: [
      { ruta: '/admin/equipos', texto: 'Equipos y alquileres', icono: 'equipos', roles: ['VENTAS', 'LOGISTICA', 'MANTENIMIENTO'] },
      { ruta: '/admin/logistica', texto: 'Flota y viajes', icono: 'logistica', roles: ['LOGISTICA', 'VENTAS', 'AGRONOMO', 'ACOPIO', 'MANTENIMIENTO'] },
      { ruta: '/admin/mantenimiento', texto: 'Mantenimiento', icono: 'mantenimiento', roles: ['MANTENIMIENTO', 'LOGISTICA', 'PRODUCCION', 'AGRONOMO', 'ACOPIO'] },
    ],
  },
  {
    titulo: 'Análisis',
    opciones: [
      { ruta: '/admin/informes', texto: 'Informes', icono: 'informe', roles: ['AGRONOMO', 'ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA', 'VENTAS', 'LOGISTICA', 'MANTENIMIENTO'] },
      { ruta: '/admin/proyecciones', texto: 'Proyecciones', icono: 'proyeccion', roles: ['VENTAS', 'PRODUCCION', 'AGRONOMO', 'ACOPIO', 'BODEGA', 'CALIDAD'] },
    ],
  },
  {
    titulo: 'Administración',
    opciones: [
      { ruta: '/admin/contenido-web', texto: 'Contenido web', icono: 'web', roles: [] },
      { ruta: '/admin/usuarios', texto: 'Usuarios', icono: 'usuarios', roles: [] },
      { ruta: '/admin/configuracion', texto: 'Configuración', icono: 'configuracion', roles: [] },
      { ruta: '/admin/auditoria', texto: 'Auditoría', icono: 'auditoria', roles: [] },
    ],
  },
];

// PANELES: área de KPIs → título y roles (los mismos que ROLES_PANEL del backend, en kpis.service.ts).
export const PANELES: { area: string; titulo: string; roles: Rol[] }[] = [
  { area: 'gerencial', titulo: 'Gerencial', roles: [] },
  { area: 'ventas', titulo: 'Ventas', roles: ['VENTAS'] },
  { area: 'inventario', titulo: 'Inventario', roles: ['BODEGA', 'VENTAS'] },
  { area: 'campo', titulo: 'Campo', roles: ['AGRONOMO'] },
  { area: 'acopio', titulo: 'Acopio', roles: ['ACOPIO'] },
  { area: 'calidad', titulo: 'Calidad', roles: ['CALIDAD'] },
  { area: 'produccion', titulo: 'Producción', roles: ['PRODUCCION', 'CALIDAD'] },
  { area: 'equipos', titulo: 'Equipos', roles: ['VENTAS', 'LOGISTICA', 'MANTENIMIENTO'] },
  { area: 'logistica', titulo: 'Logística', roles: ['LOGISTICA'] },
  { area: 'mantenimiento', titulo: 'Mantenimiento', roles: ['MANTENIMIENTO'] },
];

// PANEL_DE_ROL: el panel con el que arranca cada rol en su página de inicio ("inicio por rol").
export const PANEL_DE_ROL: Record<Rol, string> = {
  GERENTE: 'gerencial',
  AGRONOMO: 'campo',
  ACOPIO: 'acopio',
  CALIDAD: 'calidad',
  PRODUCCION: 'produccion',
  BODEGA: 'inventario',
  VENTAS: 'ventas',
  LOGISTICA: 'logistica',
  MANTENIMIENTO: 'mantenimiento',
};
