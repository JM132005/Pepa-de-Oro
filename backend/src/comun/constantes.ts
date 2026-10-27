// constantes.ts → valores fijos que usa TODO el sistema Pepa de Oro.
// Tenerlos en un solo archivo evita escribir textos distintos ("Bodega" vs "BODEGA") en cada módulo
// y permite cambiar un límite (ej: humedad máxima del cacao) en UN solo lugar.
//
// "as const" convierte el arreglo en una lista de solo lectura con valores exactos;
// así TypeScript sabe que, por ejemplo, un Rol solo puede ser uno de esos textos.

// ───────────────────────────── ROLES DEL PERSONAL ─────────────────────────────
// Cada rol ve solo su parte del sistema (matriz de permisos en docs/06-ROLES-Y-PERMISOS.md).
export const ROLES = [
  'GERENTE', // dueño/administrador: ve y hace todo, ve KPIs globales y configura la empresa
  'AGRONOMO', // haciendas, parcelas, labores, cosechas, clima
  'ACOPIO', // compra de cacao/café a productores externos, liquidaciones y pagos
  'CALIDAD', // pruebas de corte, cata, humedad, certificados y no conformidades
  'PRODUCCION', // fermentación, secado, recetas y órdenes de producción
  'BODEGA', // inventario, movimientos, conteos, transferencias
  'VENTAS', // clientes, cotizaciones, pedidos, caja (POS), facturas y cobros
  'LOGISTICA', // flota, viajes, fletes, guías de remisión
  'MANTENIMIENTO', // planes y órdenes de mantenimiento de equipos
] as const;
// Tipo derivado del arreglo: Rol = 'GERENTE' | 'AGRONOMO' | ...
export type Rol = (typeof ROLES)[number];

// ───────────────────────────── CULTIVOS Y VARIEDADES ─────────────────────────────
export const CULTIVOS = ['CACAO', 'CAFE'] as const;
export type Cultivo = (typeof CULTIVOS)[number];

// Variedades que maneja la empresa.
//   NACIONAL → cacao fino de aroma "Arriba", el más apreciado del Ecuador.
//   CCN51    → cacao clonal de alto rendimiento (Castro Naranjal 51).
//   ARABICA  → café de altura (Zaruma, Piñas).
//   ROBUSTA  → café de zonas bajas, se usa para soluble y mezclas.
export const VARIEDADES = ['NACIONAL', 'CCN51', 'ARABICA', 'ROBUSTA'] as const;
export type Variedad = (typeof VARIEDADES)[number];

// Variedades válidas por cultivo (no se puede registrar "café CCN51").
export const VARIEDADES_POR_CULTIVO: Record<Cultivo, readonly Variedad[]> = {
  CACAO: ['NACIONAL', 'CCN51'],
  CAFE: ['ARABICA', 'ROBUSTA'],
};

// ───────────────────────────── CAMPO (haciendas propias) ─────────────────────────────
export const TIPOS_LABOR = [
  'PODA',
  'FERTILIZACION',
  'FUMIGACION', // aplicación de agroquímico → activa el período de carencia (RN-01)
  'DESHIERBE',
  'RIEGO',
  'CONTROL_SANITARIO', // retiro de mazorcas enfermas (monilia, escoba de bruja)
  'SIEMBRA',
  'INJERTO',
  'COSECHA', // recolección (se registra en "cosechas", aquí solo sirve para el plan)
] as const;
// Plagas y enfermedades típicas del cacao y café en El Oro.
export const ESTADOS_PARCELA = ['DESARROLLO', 'PRODUCCION', 'RENOVACION', 'DESCANSO'] as const;
export const PLAGAS = [
  'MONILIA', // Moniliophthora roreri: pudre la mazorca por dentro
  'ESCOBA_DE_BRUJA', // Moniliophthora perniciosa: brotes deformes
  'MAZORCA_NEGRA', // Phytophthora: mancha negra en la mazorca
  'BROCA', // insecto del café
  'ROYA', // hongo del café (hojas con polvo naranja)
  'NINGUNA',
] as const;

// ───────────────────────────── POSCOSECHA ─────────────────────────────
// Recorrido de un lote de grano (cacao o café) EN ORDEN: no se puede saltar pasos.
export const FLUJO_LOTE_GRANO = [
  'RECIBIDO', // llegó en baba (cacao) o cereza (café) y se pesó
  'FERMENTANDO', // en cajón fermentador (cacao) o tanque (café lavado)
  'SECANDO', // en tendal o secadora
  'SECO', // terminó el secado, espera análisis de calidad
  'ALMACENADO', // aprobado por calidad y guardado en bodega como producto "grano"
] as const;
export const ESTADOS_LOTE_GRANO = [...FLUJO_LOTE_GRANO, 'RECHAZADO', 'COMBINADO'] as const;
export type EstadoLoteGrano = (typeof ESTADOS_LOTE_GRANO)[number];
export const ORIGENES_LOTE = ['PROPIO', 'COMPRA'] as const;
export const METODOS_SECADO = ['TENDAL', 'SECADORA'] as const;
// Estado en que llega el producto al centro de acopio.
export const ESTADOS_ENTREGA = ['BABA', 'SECO', 'CEREZA', 'PERGAMINO', 'ORO'] as const;
export type EstadoEntrega = (typeof ESTADOS_ENTREGA)[number];

// ───────────────────────────── CALIDAD ─────────────────────────────
// Grados que asigna el sistema (RN-06), inspirados en la norma NTE INEN 176.
export const GRADOS = ['PREMIUM', 'EXPORTACION', 'NACIONAL', 'RECHAZO'] as const;
export type Grado = (typeof GRADOS)[number];
export const DESTINOS_RECHAZO = ['DEVOLUCION', 'REPROCESO', 'DESCARTE'] as const;
export const ESTADOS_NO_CONFORMIDAD = ['ABIERTA', 'EN_TRATAMIENTO', 'CERRADA'] as const;

// ───────────────────────────── PRODUCTOS E INVENTARIO ─────────────────────────────
// Familias del catálogo (cómo se agrupan en la web y en los informes).
export const FAMILIAS = [
  'CACAO_GRANO',
  'SEMIELABORADOS',
  'CHOCOLATES',
  'BOMBONES',
  'CAFE',
  'CAFE_CACAO',
  'BEBIDAS',
  'CAFE_GRANO',
  'INSUMOS_CAMPO',
  'INSUMOS_PLANTA',
  'REPUESTOS',
] as const;
export const TIPOS_PRODUCTO = [
  'GRANO', // cacao seco o café verde a granel (se vende y es materia prima)
  'TERMINADO', // chocolate, cocoa, café tostado, mocca, nibs...
  'SEMIELABORADO', // nibs, licor y manteca de cacao (se usan en otras recetas)
  'INSUMO', // azúcar, leche en polvo, empaques, fertilizantes, fungicidas
  'REPUESTO', // filtros, aceite, bandas: se consumen en mantenimiento
] as const;
export type TipoProducto = (typeof TIPOS_PRODUCTO)[number];
export const UNIDADES = ['KG', 'UNIDAD', 'LITRO', 'SACO', 'QUINTAL', 'GALON'] as const;
export const TIPOS_BODEGA = ['MATERIA_PRIMA', 'INSUMOS_CAMPO', 'INSUMOS_PLANTA', 'PRODUCTO_TERMINADO', 'TIENDA', 'REPUESTOS'] as const;
// Tipos de movimiento del kardex: entradas suman, salidas restan.
export const TIPOS_MOVIMIENTO = [
  'ENTRADA_ACOPIO', // grano seco comprado y aprobado que entra a bodega
  'ENTRADA_COSECHA', // grano seco de las haciendas propias, aprobado
  'ENTRADA_PRODUCCION', // producto terminado que sale de una orden
  'ENTRADA_COMPRA', // insumos o repuestos comprados
  'ENTRADA_AJUSTE', // sobrante en conteo físico
  'ENTRADA_DEVOLUCION', // nota de crédito: el cliente devuelve
  'SALIDA_VENTA',
  'SALIDA_PRODUCCION', // consumo de una orden de producción
  'SALIDA_MANTENIMIENTO', // repuestos usados en una orden de mantenimiento
  'SALIDA_CAMPO', // insumos usados en una labor agrícola
  'SALIDA_AJUSTE', // faltante en conteo o merma
  'BAJA_VENCIMIENTO', // producto vencido o dañado que se destruye
  'TRANSFERENCIA', // de una bodega a otra (sale de una y entra en otra)
] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

// ───────────────────────────── PRODUCCIÓN ─────────────────────────────
// Pasos de una orden de producción en orden.
export const ESTADOS_ORDEN_PRODUCCION = ['PLANIFICADA', 'EN_PROCESO', 'TERMINADA', 'ANULADA'] as const;

// ───────────────────────────── VENTAS Y FACTURACIÓN ─────────────────────────────
export const TIPOS_CLIENTE = ['CONSUMIDOR', 'MAYORISTA', 'EXPORTADOR', 'DISTRIBUIDOR'] as const;
// Tipos de identificación del SRI (tabla 6 de la ficha técnica de comprobantes electrónicos).
export const TIPOS_IDENTIFICACION = ['RUC', 'CEDULA', 'PASAPORTE', 'CONSUMIDOR_FINAL'] as const;
export const CODIGO_IDENTIFICACION_SRI: Record<string, string> = {
  RUC: '04',
  CEDULA: '05',
  PASAPORTE: '06',
  CONSUMIDOR_FINAL: '07',
};
export const CANALES_VENTA = ['MOSTRADOR', 'MAYORISTA', 'EXPORTACION', 'WEB'] as const;
export type CanalVenta = (typeof CANALES_VENTA)[number];
// Formas de pago del SRI (tabla 24): código → nombre.
export const FORMAS_PAGO = {
  '01': 'Sin utilización del sistema financiero (efectivo)',
  '16': 'Tarjeta de débito',
  '19': 'Tarjeta de crédito',
  '20': 'Otros con utilización del sistema financiero (transferencia)',
} as const;
export const CODIGOS_FORMA_PAGO = Object.keys(FORMAS_PAGO);
export const ESTADOS_COTIZACION = ['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA'] as const;
export const ESTADOS_PEDIDO = ['CONFIRMADO', 'PREPARANDO', 'DESPACHADO', 'FACTURADO', 'ANULADO'] as const;
// Estado del documento (RN-21: nunca se borra, se anula con nota de crédito).
export const ESTADOS_FACTURA = ['EMITIDA', 'ENVIADA', 'ERROR_ENVIO', 'ANULADA'] as const;
// Tipo de comprobante con su código SRI: 01 factura, 04 nota de crédito.
export const TIPOS_COMPROBANTE = { FACTURA: '01', NOTA_CREDITO: '04', LIQUIDACION_COMPRA: '03', GUIA_REMISION: '06' } as const;
// Qué se está vendiendo en cada línea de una factura.
export const TIPOS_ITEM = ['PRODUCTO', 'SERVICIO', 'EQUIPO', 'ALQUILER'] as const;
export type TipoItem = (typeof TIPOS_ITEM)[number];

// ───────────────────────────── EQUIPOS, LOGÍSTICA Y MANTENIMIENTO ─────────────────────────────
export const TIPOS_EQUIPO = [
  'CAMION',
  'FURGON',
  'MONTACARGAS',
  'FERMENTADOR', // cajón de madera donde fermenta el cacao en baba (planta)
  'TENDAL', // patio de cemento donde se seca el grano al sol
  'DESCASCARILLADORA',
  'CONCHADORA',
  'TEMPLADORA',
  'EMPACADORA',
  'TRACTOR',
  'SECADORA',
  'DESPULPADORA',
  'TOSTADORA',
  'MOLINO',
  'PRENSA',
  'BALANZA',
  'MOTOCULTOR',
  'FUMIGADORA',
  'GENERADOR',
] as const;
// Para qué tiene la empresa el equipo.
export const USOS_EQUIPO = ['VENTA', 'ALQUILER', 'USO_INTERNO'] as const;
export const ESTADOS_EQUIPO = [
  'DISPONIBLE',
  'EN_USO', // trabajando en planta
  'ALQUILADO',
  'EN_VIAJE',
  'EN_MANTENIMIENTO',
  'VENDIDO',
  'BAJA',
] as const;
export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[number];
export const ESTADOS_ALQUILER = ['RESERVADO', 'ACTIVO', 'DEVUELTO', 'CANCELADO'] as const;
export const TIPOS_VIAJE = ['ENTREGA_VENTA', 'RECOLECCION_ACOPIO', 'FLETE_CLIENTE', 'EXPORTACION', 'TRASLADO_INTERNO'] as const;
export const ESTADOS_VIAJE = ['PROGRAMADO', 'EN_RUTA', 'ENTREGADO', 'CANCELADO'] as const;
export const TIPOS_MANTENIMIENTO = ['PREVENTIVO', 'CORRECTIVO', 'SERVICIO_CLIENTE'] as const;
export const ESTADOS_ORDEN_MANTENIMIENTO = ['ABIERTA', 'EN_PROCESO', 'ESPERANDO_REPUESTO', 'TERMINADA', 'CANCELADA'] as const;
// Documentos legales de un activo (RN-24: si alguno venció, el activo no se usa).
export const DOCUMENTOS_ACTIVO = ['MATRICULA', 'SOAT', 'REVISION_TECNICA', 'GARANTIA'] as const;

// ───────────────────────────── SITIO WEB ─────────────────────────────
export const TIPOS_SOLICITUD = ['COTIZACION', 'ALQUILER', 'SERVICIO', 'CONTACTO', 'AVISO_STOCK'] as const;
export const ESTADOS_SOLICITUD = ['NUEVA', 'EN_GESTION', 'ATENDIDA', 'DESCARTADA'] as const;

// ───────────────────────────── LÍMITES Y PARÁMETROS ─────────────────────────────
// Valores de referencia. Los que cambian seguido (precios, IVA) viven en la colección "configuracion"
// y el gerente los edita desde el sistema; estos son los valores por defecto y los límites técnicos.
export const LIMITES = {
  // Humedad máxima para considerar SECO el grano.
  humedadMaximaCacao: 7, // % — NTE INEN 176: el cacao comercial no debe pasar de 7 %
  humedadMaximaCafe: 12, // % — café verde (oro) entre 10 y 12 %
  // Días mínimos y máximos de fermentación por variedad (RN-06).
  fermentacionDias: {
    NACIONAL: { min: 4, max: 6 },
    CCN51: { min: 5, max: 7 }, // si pasa de 7 días sin cerrarse sale una alerta
    ARABICA: { min: 1, max: 2 }, // café lavado: 12 a 48 horas
    ROBUSTA: { min: 1, max: 2 },
  } as Record<Variedad, { min: number; max: number }>,
  horasEntreVolteos: 48, // se voltea la masa cada 48 h para airear
  // Conversión de peso: cuántos kg de grano seco salen de 1 kg de baba/cereza.
  rendimientoSecado: {
    BABA: 0.37, // ≈ 1 kg seco por cada 2,7 kg en baba
    SECO: 1,
    CEREZA: 0.2, // 100 kg de café cereza ≈ 20 kg de café oro
    PERGAMINO: 0.8,
    ORO: 1,
  } as Record<EstadoEntrega, number>,
  kgPorQuintal: 45.36, // 1 quintal = 100 libras = 45,36 kg (así se cotiza el cacao en Ecuador)
  kgPorSacoExportacion: 69, // saco de yute para exportación
  limiteConsumidorFinal: 50, // USD — sobre este total la factura debe llevar datos del cliente (RN-19)
  diasValidezCotizacion: 15,
  diasAvisoVencimiento: 30, // productos que vencen en menos de 30 días se marcan en rojo
} as const;
