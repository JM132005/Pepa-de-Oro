// etiquetas.ts → convierte los códigos del backend ("EN_MANTENIMIENTO") en textos para personas ("En mantenimiento")
// y decide el COLOR de cada estado en las insignias.

const TEXTOS: Record<string, string> = {
  // roles
  GERENTE: 'Gerente', AGRONOMO: 'Agrónomo', ACOPIO: 'Acopio', CALIDAD: 'Calidad', PRODUCCION: 'Producción', BODEGA: 'Bodega', VENTAS: 'Ventas / Caja', LOGISTICA: 'Logística', MANTENIMIENTO: 'Mantenimiento',
  // stock web
  DISPONIBLE: 'Disponible', ULTIMAS_UNIDADES: 'Últimas unidades', AGOTADO: 'Agotado', PROXIMAMENTE: 'Próximamente',
  // lotes de grano
  RECIBIDO: 'Recibido', FERMENTANDO: 'Fermentando', SECANDO: 'Secando', SECO: 'Seco (espera calidad)', ALMACENADO: 'Almacenado', RECHAZADO: 'Rechazado', COMBINADO: 'Combinado',
  PROPIO: 'Propio', COMPRA: 'Comprado', BABA: 'En baba', CEREZA: 'Cereza', PERGAMINO: 'Pergamino', ORO: 'Oro (verde)',
  NACIONAL: 'Nacional', CCN51: 'CCN-51', ARABICA: 'Arábica', ROBUSTA: 'Robusta', CACAO: 'Cacao', CAFE: 'Café',
  PREMIUM: 'Premium', EXPORTACION: 'Exportación', RECHAZO: 'Rechazo',
  // documentos
  EMITIDA: 'Emitida', ENVIADA: 'Enviada', ERROR_ENVIO: 'Error de envío', ANULADA: 'Anulada', PENDIENTE: 'Pendiente', PARCIAL: 'Abono parcial', PAGADA: 'Pagada',
  BORRADOR: 'Borrador', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada', VENCIDA: 'Vencida',
  CONFIRMADO: 'Confirmado', PREPARANDO: 'Preparando', DESPACHADO: 'Despachado', FACTURADO: 'Facturado', ANULADO: 'Anulado',
  MOSTRADOR: 'Mostrador', MAYORISTA: 'Mayorista', WEB: 'Web', CONSUMIDOR: 'Consumidor', DISTRIBUIDOR: 'Distribuidor', EXPORTADOR: 'Exportador',
  // producción
  PLANIFICADA: 'Planificada', EN_PROCESO: 'En proceso', TERMINADA: 'Terminada', ANULADA_OP: 'Anulada',
  // equipos y viajes
  EN_USO: 'En uso', ALQUILADO: 'Alquilado', EN_VIAJE: 'En viaje', EN_MANTENIMIENTO: 'En mantenimiento', VENDIDO: 'Vendido', BAJA: 'De baja',
  RESERVADO: 'Reservado', ACTIVO: 'Activo', DEVUELTO: 'Devuelto', CANCELADO: 'Cancelado',
  PROGRAMADO: 'Programado', EN_RUTA: 'En ruta', ENTREGADO: 'Entregado',
  ABIERTA: 'Abierta', ESPERANDO_REPUESTO: 'Esperando repuesto', CANCELADA: 'Cancelada', PREVENTIVO: 'Preventivo', CORRECTIVO: 'Correctivo', SERVICIO_CLIENTE: 'Servicio a cliente',
  // web
  NUEVA: 'Nueva', EN_GESTION: 'En gestión', ATENDIDA: 'Atendida', DESCARTADA: 'Descartada', COTIZACION: 'Cotización', ALQUILER: 'Alquiler', SERVICIO: 'Servicio', CONTACTO: 'Contacto', AVISO_STOCK: 'Aviso de stock',
  // campo
  PRODUCCION_P: 'En producción', DESARROLLO: 'En desarrollo', RENOVACION: 'En renovación', DESCANSO: 'En descanso',
  PODA: 'Poda', FERTILIZACION: 'Fertilización', FUMIGACION: 'Fumigación', DESHIERBE: 'Deshierbe', RIEGO: 'Riego', CONTROL_SANITARIO: 'Control sanitario', SIEMBRA: 'Siembra', INJERTO: 'Injerto', COSECHA: 'Cosecha',
  MONILIA: 'Monilia', ESCOBA_DE_BRUJA: 'Escoba de bruja', MAZORCA_NEGRA: 'Mazorca negra', BROCA: 'Broca', ROYA: 'Roya', NINGUNA: 'Ninguna',
  // tipos de equipo (con tildes)
  CAMION: 'Camión', FURGON: 'Furgón', MONTACARGAS: 'Montacargas', FERMENTADOR: 'Fermentador', TENDAL: 'Tendal', DESCASCARILLADORA: 'Descascarilladora', CONCHADORA: 'Conchadora',
  TEMPLADORA: 'Templadora', EMPACADORA: 'Empacadora', TRACTOR: 'Tractor', SECADORA: 'Secadora', DESPULPADORA: 'Despulpadora', TOSTADORA: 'Tostadora', MOLINO: 'Molino',
  PRENSA: 'Prensa', BALANZA: 'Balanza', MOTOCULTOR: 'Motocultor', FUMIGADORA: 'Fumigadora', GENERADOR: 'Generador', VENTA: 'Venta', USO_INTERNO: 'Uso interno',
  // viajes
  ENTREGA_VENTA: 'Entrega de venta', RECOLECCION_ACOPIO: 'Recolección en fincas', FLETE_CLIENTE: 'Flete a cliente', TRASLADO_INTERNO: 'Traslado interno',
  // movimientos de inventario
  ENTRADA_COMPRA: 'Entrada por compra', ENTRADA_PRODUCCION: 'Entrada de producción', ENTRADA_ACOPIO: 'Entrada de acopio', ENTRADA_AJUSTE: 'Ajuste (entrada)', ENTRADA_DEVOLUCION: 'Devolución',
  SALIDA_VENTA: 'Venta', SALIDA_PRODUCCION: 'Consumo de producción', SALIDA_MANTENIMIENTO: 'Repuesto usado', SALIDA_CAMPO: 'Insumo de campo', SALIDA_AJUSTE: 'Ajuste (salida)', TRANSFERENCIA: 'Transferencia',
  // bodegas y cargos
  MATERIA_PRIMA: 'Materia prima', PRODUCTO_TERMINADO: 'Producto terminado', TIENDA: 'Tienda', INSUMOS_CAMPO: 'Insumos de campo', INSUMOS_PLANTA: 'Insumos de planta', REPUESTOS: 'Repuestos',
  CAPATAZ: 'Capataz', JORNALERO: 'Jornalero', CHOFER: 'Chofer', TECNICO: 'Técnico', OPERARIO_PLANTA: 'Operario de planta',
  // tipos de producto y familias
  GRANO: 'Grano', TERMINADO: 'Terminado', SEMIELABORADO: 'Semielaborado', INSUMO: 'Insumo', REPUESTO: 'Repuesto',
  CACAO_GRANO: 'Cacao en grano', SEMIELABORADOS: 'Semielaborados', CHOCOLATES: 'Chocolates', BOMBONES: 'Bombones y coberturas', CAFE_CACAO: 'Café y cacao', BEBIDAS: 'Bebidas', CAFE_GRANO: 'Café en grano verde',
  // certificaciones y otros
  ORGANICO: 'Orgánico', COMERCIO_JUSTO: 'Comercio justo', RAINFOREST: 'Rainforest Alliance', TENDAL_M: 'Tendal', DEVOLUCION: 'Devolución', DESCARTE: 'Descarte', REPROCESO: 'Reproceso',
  // alertas
  ALTA: 'Alta', MEDIA: 'Media', BAJA_A: 'Baja', URGENTE: 'Urgente',
};

// texto(): si no hay traducción, convierte "TEXTO_CON_GUIONES" en "Texto con guiones".
export function texto(codigo: string | null | undefined): string {
  if (!codigo) return '—';
  return TEXTOS[codigo] ?? codigo.charAt(0) + codigo.slice(1).toLowerCase().replace(/_/g, ' ');
}

export type Tono = 'exito' | 'aviso' | 'peligro' | 'info' | 'neutro' | 'oro';

// tono(): color de la insignia según el estado.
export function tono(codigo: string | null | undefined): Tono {
  const verdes = ['DISPONIBLE', 'ALMACENADO', 'PAGADA', 'ENVIADA', 'ACEPTADA', 'FACTURADO', 'TERMINADA', 'ENTREGADO', 'DEVUELTO', 'ATENDIDA', 'APROBADO', 'EXPORTACION'];
  const amarillos = ['ULTIMAS_UNIDADES', 'SECO', 'PENDIENTE', 'PARCIAL', 'BORRADOR', 'PREPARANDO', 'PLANIFICADA', 'RESERVADO', 'PROGRAMADO', 'ABIERTA', 'ESPERANDO_REPUESTO', 'NUEVA', 'EN_GESTION', 'MEDIA', 'NACIONAL_G'];
  const rojos = ['AGOTADO', 'RECHAZADO', 'RECHAZO', 'ANULADA', 'ANULADO', 'ERROR_ENVIO', 'VENCIDA', 'EN_MANTENIMIENTO', 'CANCELADA', 'CANCELADO', 'BAJA', 'ALTA', 'URGENTE', 'DESCARTADA', 'RECHAZADA'];
  const azules = ['FERMENTANDO', 'SECANDO', 'EN_PROCESO', 'EN_RUTA', 'EN_VIAJE', 'ALQUILADO', 'ACTIVO', 'CONFIRMADO', 'EMITIDA', 'DESPACHADO', 'EN_USO', 'RECIBIDO'];
  if (!codigo) return 'neutro';
  if (codigo === 'PREMIUM') return 'oro';
  if (verdes.includes(codigo)) return 'exito';
  if (amarillos.includes(codigo)) return 'aviso';
  if (rojos.includes(codigo)) return 'peligro';
  if (azules.includes(codigo)) return 'info';
  return 'neutro';
}

export const FORMAS_PAGO: Record<string, string> = {
  '01': 'Efectivo',
  '16': 'Tarjeta de débito',
  '19': 'Tarjeta de crédito',
  '20': 'Transferencia',
};
