// campos.ts → DESCRIPCIÓN de los formularios del sistema interno. Cada arreglo es la lista de campos que
// dibuja <app-formulario-dinamico>: así un formulario nuevo es una lista, no 100 líneas de HTML.
// Los "nombre" coinciden con los DTO del backend (ej. CrearClienteDto) y los "requerido" con sus @Is...().

import { CampoFormulario } from '../../compartido/Componentes/formulario-dinamico/formulario-dinamico';
import { texto } from '../../compartido/Utils/etiquetas';
import { opciones } from '../Utils/acciones';

// ─── Listas de valores (las mismas de backend/src/comun/constantes.ts) ───
export const TIPOS_IDENTIFICACION = ['CEDULA', 'RUC', 'PASAPORTE'];
export const TIPOS_CLIENTE = ['CONSUMIDOR', 'MAYORISTA', 'DISTRIBUIDOR', 'EXPORTADOR'];
export const CULTIVOS = ['CACAO', 'CAFE'];
export const VARIEDADES = ['NACIONAL', 'CCN51', 'ARABICA', 'ROBUSTA'];
export const ESTADOS_ENTREGA = ['BABA', 'SECO', 'CEREZA', 'PERGAMINO', 'ORO'];
export const TIPOS_LABOR = ['PODA', 'FERTILIZACION', 'FUMIGACION', 'DESHIERBE', 'RIEGO', 'CONTROL_SANITARIO', 'SIEMBRA', 'INJERTO'];
export const PLAGAS = ['MONILIA', 'ESCOBA_DE_BRUJA', 'MAZORCA_NEGRA', 'BROCA', 'ROYA', 'NINGUNA'];
export const ESTADOS_PARCELA = ['DESARROLLO', 'PRODUCCION', 'RENOVACION', 'DESCANSO'];
export const FAMILIAS = ['CACAO_GRANO', 'SEMIELABORADOS', 'CHOCOLATES', 'BOMBONES', 'CAFE', 'CAFE_CACAO', 'BEBIDAS', 'CAFE_GRANO', 'INSUMOS_CAMPO', 'INSUMOS_PLANTA', 'REPUESTOS'];
export const TIPOS_PRODUCTO = ['GRANO', 'TERMINADO', 'SEMIELABORADO', 'INSUMO', 'REPUESTO'];
export const UNIDADES = ['KG', 'UNIDAD', 'LITRO', 'SACO', 'QUINTAL', 'GALON'];
export const TIPOS_EQUIPO = ['CAMION', 'FURGON', 'MONTACARGAS', 'FERMENTADOR', 'TENDAL', 'DESCASCARILLADORA', 'CONCHADORA', 'TEMPLADORA', 'EMPACADORA', 'TRACTOR', 'SECADORA', 'DESPULPADORA', 'TOSTADORA', 'MOLINO', 'PRENSA', 'BALANZA', 'MOTOCULTOR', 'FUMIGADORA', 'GENERADOR'];
export const TIPOS_VIAJE = ['ENTREGA_VENTA', 'RECOLECCION_ACOPIO', 'FLETE_CLIENTE', 'EXPORTACION', 'TRASLADO_INTERNO'];
export const ROLES = ['GERENTE', 'AGRONOMO', 'ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA', 'VENTAS', 'LOGISTICA', 'MANTENIMIENTO'];
export const CARGOS = ['JORNALERO', 'CAPATAZ', 'CHOFER', 'TECNICO', 'OPERARIO_PLANTA'];

// ─── Formularios ───
export const CAMPOS_CLIENTE: CampoFormulario[] = [
  { nombre: 'tipoIdentificacion', etiqueta: 'Tipo de identificación', tipo: 'seleccion', requerido: true, opciones: opciones(TIPOS_IDENTIFICACION, texto) },
  { nombre: 'identificacion', etiqueta: 'Cédula / RUC', tipo: 'identificacion', requerido: true, ayuda: 'RN-02: se valida el dígito verificador' },
  { nombre: 'nombre', etiqueta: 'Nombre o razón social', tipo: 'texto', requerido: true, ancho: true },
  { nombre: 'nombreComercial', etiqueta: 'Nombre comercial', tipo: 'texto' },
  { nombre: 'tipoCliente', etiqueta: 'Tipo de cliente', tipo: 'seleccion', requerido: true, opciones: opciones(TIPOS_CLIENTE, texto) },
  { nombre: 'correo', etiqueta: 'Correo (aquí llega la factura)', tipo: 'correo' },
  { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
  { nombre: 'direccion', etiqueta: 'Dirección', tipo: 'texto', ancho: true },
  { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto' },
  { nombre: 'pais', etiqueta: 'País', tipo: 'texto' },
  { nombre: 'creditoDias', etiqueta: 'Días de crédito', tipo: 'numero', min: 0, ayuda: '0 = solo contado (RN-18)' },
  { nombre: 'cupo', etiqueta: 'Cupo de crédito (USD)', tipo: 'numero', min: 0 },
  { nombre: 'notas', etiqueta: 'Notas', tipo: 'area' },
];

export const CAMPOS_PRODUCTOR: CampoFormulario[] = [
  { nombre: 'cedula', etiqueta: 'Cédula', tipo: 'identificacion', requerido: true, campoTipoIdentificacion: '_cedula' },
  { nombre: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true },
  { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
  { nombre: 'finca', etiqueta: 'Nombre de la finca', tipo: 'texto' },
  { nombre: 'canton', etiqueta: 'Cantón', tipo: 'texto', requerido: true },
  { nombre: 'hectareas', etiqueta: 'Hectáreas', tipo: 'numero', min: 0 },
  { nombre: 'cultivos', etiqueta: 'Cultivos', tipo: 'multiple', opciones: opciones(CULTIVOS, texto) },
  { nombre: 'cuentaBancaria.banco', etiqueta: 'Banco', tipo: 'texto' },
  { nombre: 'cuentaBancaria.tipo', etiqueta: 'Tipo de cuenta', tipo: 'seleccion', opciones: opciones(['AHORROS', 'CORRIENTE'], texto) },
  { nombre: 'cuentaBancaria.numero', etiqueta: 'Número de cuenta', tipo: 'texto' },
  { nombre: 'activo', etiqueta: 'Activo (puede entregar cacao)', tipo: 'casilla' },
  { nombre: 'motivoInactivo', etiqueta: 'Motivo si está inactivo (RN-03)', tipo: 'texto', ancho: true },
];

export const CAMPOS_TRABAJADOR: CampoFormulario[] = [
  { nombre: 'cedula', etiqueta: 'Cédula', tipo: 'texto', requerido: true },
  { nombre: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true },
  { nombre: 'cargo', etiqueta: 'Cargo', tipo: 'seleccion', requerido: true, opciones: opciones(CARGOS, texto) },
  { nombre: 'jornalDiario', etiqueta: 'Jornal diario (USD)', tipo: 'numero', min: 0 },
  { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
  { nombre: 'licenciaTipo', etiqueta: 'Tipo de licencia (choferes)', tipo: 'texto' },
  { nombre: 'licenciaVence', etiqueta: 'Licencia vence', tipo: 'fecha' },
  { nombre: 'activo', etiqueta: 'Activo', tipo: 'casilla' },
];

export const CAMPOS_PRODUCTO: CampoFormulario[] = [
  { nombre: 'sku', etiqueta: 'SKU (código)', tipo: 'texto', requerido: true },
  { nombre: 'nombre', etiqueta: 'Nombre de la variante', tipo: 'texto', requerido: true, ayuda: 'Ej: Chocolate 70 % · Maracuyá · barra 50 g' },
  { nombre: 'productoBase', etiqueta: 'Producto base (agrupa variantes en la web)', tipo: 'texto', requerido: true },
  { nombre: 'familia', etiqueta: 'Familia', tipo: 'seleccion', requerido: true, opciones: opciones(FAMILIAS, texto) },
  { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', requerido: true, opciones: opciones(TIPOS_PRODUCTO, texto) },
  { nombre: 'unidad', etiqueta: 'Unidad', tipo: 'seleccion', requerido: true, opciones: opciones(UNIDADES, texto) },
  { nombre: 'sabor', etiqueta: 'Sabor', tipo: 'texto' },
  { nombre: 'presentacion', etiqueta: 'Presentación', tipo: 'texto' },
  { nombre: 'pesoNetoG', etiqueta: 'Peso neto (g)', tipo: 'numero', min: 0 },
  { nombre: 'precioMenor', etiqueta: 'Precio por menor (sin IVA)', tipo: 'numero', requerido: true, min: 0, paso: 0.01 },
  { nombre: 'precioMayor', etiqueta: 'Precio por mayor (sin IVA)', tipo: 'numero', requerido: true, min: 0, paso: 0.01 },
  { nombre: 'cantidadMinimaMayor', etiqueta: 'Cantidad mínima por mayor', tipo: 'numero', min: 1 },
  { nombre: 'tarifaIva', etiqueta: 'Tarifa IVA', tipo: 'seleccion', requerido: true, opciones: [{ valor: 15, texto: '15 %' }, { valor: 0, texto: '0 %' }, { valor: 5, texto: '5 %' }] },
  { nombre: 'stockMinimo', etiqueta: 'Stock mínimo (alerta)', tipo: 'numero', min: 0 },
  { nombre: 'vidaUtilDias', etiqueta: 'Vida útil (días)', tipo: 'numero', min: 0 },
  { nombre: 'diasReposicion', etiqueta: 'Días de reposición', tipo: 'numero', min: 0 },
  { nombre: 'origen', etiqueta: 'Origen', tipo: 'texto' },
  { nombre: 'registroSanitario', etiqueta: 'Registro sanitario', tipo: 'texto' },
  { nombre: 'imagen', etiqueta: 'Imagen (ruta en public/img)', tipo: 'texto', ayuda: 'Ej: img/productos/chocolate-70.svg' },
  { nombre: 'descripcion', etiqueta: 'Descripción para la web', tipo: 'area' },
  { nombre: 'ingredientes', etiqueta: 'Ingredientes', tipo: 'area' },
  { nombre: 'alergenos', etiqueta: 'Alérgenos', tipo: 'texto', ancho: true },
  { nombre: 'publicado', etiqueta: 'Publicado en la web', tipo: 'casilla' },
  { nombre: 'destacado', etiqueta: 'Destacado en la portada', tipo: 'casilla' },
  { nombre: 'proximamente', etiqueta: 'Próximamente (aún no se produce)', tipo: 'casilla' },
  { nombre: 'activo', etiqueta: 'Activo', tipo: 'casilla' },
];

export const CAMPOS_ACTIVO: CampoFormulario[] = [
  { nombre: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true },
  { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
  { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', requerido: true, opciones: opciones(TIPOS_EQUIPO, texto) },
  { nombre: 'usos', etiqueta: 'Usos', tipo: 'multiple', opciones: opciones(['VENTA', 'ALQUILER', 'USO_INTERNO'], texto) },
  { nombre: 'marca', etiqueta: 'Marca', tipo: 'texto' },
  { nombre: 'modelo', etiqueta: 'Modelo', tipo: 'texto' },
  { nombre: 'anio', etiqueta: 'Año', tipo: 'numero' },
  { nombre: 'placa', etiqueta: 'Placa', tipo: 'texto' },
  { nombre: 'serie', etiqueta: 'Serie', tipo: 'texto' },
  { nombre: 'capacidad', etiqueta: 'Capacidad (texto)', tipo: 'texto' },
  { nombre: 'capacidadKg', etiqueta: 'Capacidad (kg)', tipo: 'numero', min: 0, ayuda: 'RN-25: no se carga más de esto en un viaje' },
  { nombre: 'nuevo', etiqueta: 'Es nuevo', tipo: 'casilla' },
  { nombre: 'valorCompra', etiqueta: 'Valor de compra', tipo: 'numero', min: 0 },
  { nombre: 'valorActual', etiqueta: 'Valor actual', tipo: 'numero', min: 0 },
  { nombre: 'precioVenta', etiqueta: 'Precio de venta', tipo: 'numero', min: 0 },
  { nombre: 'tarifas.dia', etiqueta: 'Tarifa alquiler por día', tipo: 'numero', min: 0 },
  { nombre: 'tarifas.semana', etiqueta: 'Tarifa por semana', tipo: 'numero', min: 0 },
  { nombre: 'tarifaOperadorDia', etiqueta: 'Operador por día', tipo: 'numero', min: 0 },
  { nombre: 'garantia', etiqueta: 'Garantía de alquiler', tipo: 'numero', min: 0 },
  { nombre: 'costoHora', etiqueta: 'Costo por hora de uso', tipo: 'numero', min: 0 },
  { nombre: 'horometro', etiqueta: 'Horómetro (h)', tipo: 'numero', min: 0 },
  { nombre: 'odometro', etiqueta: 'Odómetro (km)', tipo: 'numero', min: 0 },
  { nombre: 'ubicacion', etiqueta: 'Ubicación', tipo: 'texto' },
  { nombre: 'imagen', etiqueta: 'Imagen (ruta en public/img)', tipo: 'texto' },
  { nombre: 'descripcion', etiqueta: 'Descripción para la web', tipo: 'area' },
  { nombre: 'publicado', etiqueta: 'Publicado en la web', tipo: 'casilla' },
];

export const CAMPOS_USUARIO: CampoFormulario[] = [
  { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
  { nombre: 'correo', etiqueta: 'Correo', tipo: 'correo', requerido: true },
  { nombre: 'cargo', etiqueta: 'Cargo', tipo: 'texto' },
  { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
  { nombre: 'roles', etiqueta: 'Roles (puede tener varios)', tipo: 'multiple', opciones: opciones(ROLES, texto) },
];
