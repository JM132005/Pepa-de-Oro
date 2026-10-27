// web.ts → lo que ve el visitante de la página pública.

export interface VariantePublica {
  _id: string;
  sku: string;
  nombre: string;
  sabor?: string;
  presentacion?: string;
  unidad: string;
  pesoNetoG: number;
  precioMenor: number;
  precioMayor: number;
  cantidadMinimaMayor: number;
  escalas: { desde: number; precio: number }[];
  tarifaIva: number;
  precioMenorConIva: number;
  disponible: number;
  estado: 'DISPONIBLE' | 'ULTIMAS_UNIDADES' | 'AGOTADO' | 'PROXIMAMENTE';
  sacos?: number;
  quintales?: number;
  imagen?: string;
}

export interface ProductoPublico {
  slug: string;
  productoBase: string;
  familia: string;
  familiaNombre: string;
  descripcion?: string;
  notasCata?: string[];
  origen?: string;
  ingredientes?: string;
  alergenos?: string;
  imagen?: string;
  destacado: boolean;
  desde: number;
  estado: string;
  sabores: string[];
  variantes: VariantePublica[];
}

export interface EquipoPublico {
  _id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  capacidad?: string;
  nuevo: boolean;
  horometro?: number;
  odometro?: number;
  enVenta: boolean;
  enAlquiler: boolean;
  precioVenta?: number;
  tarifas?: { hora?: number; dia?: number; semana?: number; temporada?: number };
  tarifaOperadorDia: number;
  garantia: number;
  descripcion?: string;
  fichaTecnica: { etiqueta: string; valor: string }[];
  imagen?: string;
  disponibilidad: string;
  ocupado: { desde: string; hasta: string }[];
}

export interface EmpresaPublica {
  nombreComercial: string;
  razonSocial: string;
  direccionMatriz: string;
  direccionTienda: string;
  telefono: string;
  whatsapp: string;
  correo: string;
  horario: string;
  haciendas: { _id: string; nombre: string; canton: string; hectareasTotales: number; hectareasCultivadas: number; cultivos: string[]; descripcion?: string; imagen?: string; ubicacion?: { lat: number; lng: number }; altitudMsnm: number; certificaciones: { tipo: string }[] }[];
  cifras: { hectareas: number; productores: number; anios: number; haciendas: number };
}

export interface Rastreo {
  codigo: string;
  tipo: 'PRODUCTO' | 'GRANO';
  producto: { nombre: string; imagen?: string; descripcion?: string } | null;
  fechas: { elaboracion?: string; vencimiento?: string };
  origenes: { tipo: string; nombre: string; canton?: string; variedad: string; parcela?: string; ubicacion?: { lat: number; lng: number }; codigoLote: string }[];
  calidad: { lote: string; grado: string; fermentados?: number; notas?: string[]; puntaje?: number }[];
  etapas: { fecha: string; titulo: string; detalle: string; lote: string }[];
  liberado: boolean;
}

export interface SolicitudWeb {
  _id: string;
  numero: string;
  tipo: string;
  nombre: string;
  correo: string;
  telefono?: string;
  empresa?: string;
  ciudad?: string;
  mensaje?: string;
  items: { producto: string; sku: string; nombre: string; cantidad: number }[];
  activo?: { _id: string; codigo: string; nombre: string };
  desde?: string;
  hasta?: string;
  servicio?: string;
  estado: string;
  asignadoA?: { id: string; nombre: string };
  notas: { fecha: string; texto: string; usuario: string }[];
  cotizacion?: string;
  createdAt: string;
}
