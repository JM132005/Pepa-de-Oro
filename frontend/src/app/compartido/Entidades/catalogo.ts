// catalogo.ts → productos (variantes), stock e inventario.

import { Documento } from './comunes';

export interface Producto extends Documento {
  sku: string;
  nombre: string;
  productoBase: string;
  slug: string;
  familia: string;
  tipo: 'GRANO' | 'TERMINADO' | 'SEMIELABORADO' | 'INSUMO' | 'REPUESTO';
  sabor?: string;
  presentacion?: string;
  unidad: string;
  pesoNetoG: number;
  precioMenor: number;
  precioMayor: number;
  cantidadMinimaMayor: number;
  escalas: { desde: number; precio: number }[];
  listas: Record<string, number>;
  tarifaIva: number;
  costoPromedio: number;
  stockMinimo: number;
  diasReposicion: number;
  vidaUtilDias: number;
  cultivo?: string;
  variedad?: string;
  grado?: string;
  descripcion?: string;
  notasCata: string[];
  origen?: string;
  ingredientes?: string;
  alergenos?: string;
  registroSanitario?: string;
  imagen?: string;
  publicado: boolean;
  destacado: boolean;
  proximamente: boolean;
  activo: boolean;
  historialPrecios: { fecha: string; usuario: string; precioMenor: number; precioMayor: number }[];
  stock?: ResumenStock | null;
  margen?: number;
  lotes?: LoteProducto[];
}

export interface ResumenStock {
  productoId: string;
  sku: string;
  nombre: string;
  familia: string;
  tipo: string;
  unidad: string;
  stockMinimo: number;
  costoPromedio: number;
  fisico: number;
  reservado: number;
  disponible: number;
  valor: number;
  estado: string;
  porBodega: Record<string, number>;
}

export interface Bodega extends Documento {
  codigo: string;
  nombre: string;
  tipo: string;
  ubicacion?: string;
  responsable?: string;
  activa: boolean;
}

export interface LoteProducto extends Documento {
  producto: Producto | string;
  bodega: Bodega | string;
  codigo: string;
  cantidad: number;
  reservado: number;
  costoUnitario: number;
  fechaElaboracion?: string;
  vencimiento?: string;
  grado?: string;
  liberado: boolean;
  bloqueado: boolean;
  motivoBloqueo?: string;
  tipoEmpaque?: string;
  tramo?: 'VENCIDO' | 30 | 60 | 90 | null;
  controlCalidad?: { fecha: string; usuario: string; liberado: boolean; motivos: string[]; pesoPromedioG: number };
  origen?: { tipo?: string; loteGrano?: string; ordenProduccion?: string };
}

export interface Movimiento extends Documento {
  tipo: string;
  producto: Producto | string;
  bodega: Bodega | string;
  codigoLote?: string;
  cantidad: number;
  signo: 1 | -1;
  costoUnitario: number;
  saldoProducto?: number;
  documento?: { tipo: string; numero?: string };
  usuario?: string;
  motivo?: string;
  fecha: string;
}
