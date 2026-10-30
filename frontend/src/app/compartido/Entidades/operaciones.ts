// operaciones.ts → producción, activos, alquileres, viajes y mantenimiento.

import { Documento } from './comunes';
import { Producto } from './catalogo';

export interface Receta extends Documento {
  producto: Producto;
  nombre: string;
  cantidadBase: number;
  componentes: { producto: string; nombre: string; cantidad: number; unidad: string }[];
  pasos: string[];
  horasMaquina: number;
  manoObraHoras: number;
  tiposMaquina: string[];
  rendimientoEsperado: number;
  activa: boolean;
}

export interface OrdenProduccion extends Documento {
  codigo: string;
  producto: Producto;
  receta: Receta | string;
  cantidadPlanificada: number;
  fechaProgramada: string;
  maquina?: { _id: string; codigo: string; nombre: string; estado?: string };
  estado: string;
  responsable?: string;
  requerimientos: { producto: string; nombre: string; unidad: string; requerido: number }[];
  reservas: { producto: string; loteId: string; codigo: string; cantidad: number; costoUnitario: number }[];
  consumos: { producto: string; nombre: string; codigo: string; cantidad: number; costoUnitario: number }[];
  cantidadProducida: number;
  cantidadBuena: number;
  mermaPct: number;
  costos: { materiales?: number; manoObra?: number; maquina?: number; total?: number; unitario?: number };
  loteProducto?: { id: string; codigo: string; vencimiento?: string };
  fechaInicio?: string;
  fechaCierre?: string;
}

export interface Verificacion {
  requerimientos: { productoId: string; nombre: string; unidad: string; requerido: number; disponible: number }[];
  faltantes: { nombre: string; falta: number; unidad: string }[];
  puedeIniciar: boolean;
  mensaje: string | null;
}

export interface Activo extends Documento {
  codigo: string;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  serie?: string;
  placa?: string;
  capacidad?: string;
  capacidadKg: number;
  usos: string[];
  estado: string;
  nuevo: boolean;
  valorCompra: number;
  valorActual: number;
  precioVenta: number;
  tarifas: { hora?: number; dia?: number; semana?: number; temporada?: number };
  tarifaOperadorDia: number;
  garantia: number;
  costoHora: number;
  horometro: number;
  odometro: number;
  documentos: { tipo: string; numero?: string; vence: string }[];
  planMantenimiento: { tarea: string; cadaDias?: number; cadaUso?: number; ultimaFecha: string; ultimoUso: number }[];
  descripcion?: string;
  fichaTecnica: { etiqueta: string; valor: string }[];
  imagen?: string;
  publicado: boolean;
  ubicacion?: string;
}

export interface FichaActivo extends Activo {
  alquileres: Alquiler[];
  ordenes: OrdenMantenimiento[];
  ocupado: { desde: string; hasta: string; etiqueta: string }[];
  costoMantenimiento: number;
  documentosPorVencer: { tipo: string; vence: string }[];
  usable: string | null;
}

export interface Alquiler extends Documento {
  codigo: string;
  activo: Activo;
  cliente: { _id: string; nombre: string; identificacion?: string };
  desde: string;
  hasta: string;
  tarifaDia: number;
  conOperador: boolean;
  tarifaOperadorDia: number;
  garantia: number;
  estado: string;
  lugarTrabajo?: string;
  entrega?: { fecha: string; horometro: number; estadoEquipo: string; observaciones?: string };
  devolucion?: { fecha: string; horometro: number; danos: number; observaciones?: string };
  calculo?: Record<string, number>;
  factura?: { _id: string; numero: string; total: number };
}

export interface Viaje extends Documento {
  codigo: string;
  tipo: string;
  camion: Activo;
  chofer: { _id: string; nombre: string; cedula?: string };
  origen: string;
  destino: string;
  salida: string;
  llegadaEstimada: string;
  llegada?: string;
  kmSalida?: number;
  kmLlegada?: number;
  kmEstimados: number;
  carga: { descripcion: string; pesoKg: number; bultos?: number };
  cliente?: { _id: string; nombre: string };
  pedido?: { _id: string; numero: string };
  tarifa?: { modo: string; valor: number; total: number };
  costos: { combustible?: number; peajes?: number; viaticos?: number };
  estado: string;
  guiaRemision?: string;
}

export interface OrdenMantenimiento extends Documento {
  codigo: string;
  tipo: string;
  activo?: Activo;
  equipoCliente?: { descripcion: string; marca?: string; modelo?: string; serie?: string };
  cliente?: { _id: string; nombre: string };
  tarea?: string;
  falla?: { descripcion: string; reportadoPor: string; fecha: string };
  prioridad: string;
  tecnico?: { id: string; nombre: string };
  programada?: string;
  inicio?: string;
  fin?: string;
  checklist: { tarea: string; hecha: boolean }[];
  repuestos: { producto: string; nombre: string; cantidad: number; costoUnitario: number }[];
  horasManoObra: number;
  costoHora: number;
  costos: { costoRepuestos?: number; costoManoObra?: number; costoTotal?: number };
  estado: string;
  presupuesto?: { total: number; aprobado: boolean };
  factura?: { _id: string; numero: string };
  observaciones?: string;
}

export interface TareaPlan {
  activoId: string;
  activo: string;
  nombre: string;
  tarea: string;
  cadaDias?: number;
  cadaUso?: number;
  usoActual: number;
  vencida: boolean;
  proxima: boolean;
  diasRestantes: number | null;
  usoRestante: number | null;
  motivo: string | null;
}

export interface IndicadorTaller {
  activoId: string;
  codigo: string;
  nombre: string;
  tipo: string;
  fallas: number;
  horasReparando: number;
  mtbf: number;
  mttr: number;
  disponibilidad: number;
  costoMantenimiento: number;
  valorActual: number;
}
