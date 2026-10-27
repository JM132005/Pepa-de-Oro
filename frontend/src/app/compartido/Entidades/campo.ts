// campo.ts → haciendas, parcelas, labores, cosechas, sanidad, clima y trabajadores.

import { Documento } from './comunes';

export interface Hacienda extends Documento {
  codigo: string;
  nombre: string;
  canton: string;
  parroquia?: string;
  ubicacion?: { lat: number; lng: number };
  hectareasTotales: number;
  hectareasCultivadas: number;
  altitudMsnm: number;
  fuenteAgua?: string;
  responsable?: string;
  cultivos: string[];
  certificaciones: { tipo: string; codigo?: string; vence: string }[];
  descripcion?: string;
  imagen?: string;
  // resumen calculado
  parcelas?: number;
  hectareasProduccion?: number;
  kgSecosAnio?: number;
  rendimientoKgHa?: number;
  costoPorKg?: number | null;
}

export interface Parcela extends Documento {
  hacienda: Hacienda | string;
  codigo: string;
  hectareas: number;
  cultivo: string;
  variedad: string;
  clon?: string;
  anioSiembra: number;
  densidad: number;
  plantas: number;
  sistema: string;
  riego: string;
  estado: string;
  planLabores: { tipo: string; cadaDias: number; ultimaFecha?: string }[];
}

export interface FichaParcela extends Parcela {
  etapa: { edad: number; etapa: string; factorProduccion: number };
  bloqueoCarencia: string | null;
  laboresAtrasadas: { tipo: string; cadaDias: number; proxima: string; diasAtraso: number }[];
  labores: Labor[];
  cosechas: Cosecha[];
  monitoreos: Monitoreo[];
  kpis: { kgCosechados: number; kgSecos: number; rendimientoKgHa: number; costoJornales: number; costoInsumos: number; costoPorKg: number | null };
}

export interface Trabajador extends Documento {
  cedula: string;
  nombre: string;
  cargo: string;
  hacienda?: { _id: string; nombre: string } | string;
  jornalDiario: number;
  telefono?: string;
  licenciaTipo?: string;
  licenciaVence?: string;
  activo: boolean;
}

export interface Labor extends Documento {
  parcela: { _id: string; codigo: string } | string;
  tipo: string;
  fecha: string;
  responsable?: string;
  cuadrilla: { nombre: string; jornales: number; costo: number }[];
  insumos: { nombre: string; cantidad: number; unidad: string; costo: number }[];
  agroquimico?: { producto: string; dosis?: string; diasCarencia: number };
  costoTotal: number;
  observaciones?: string;
}

export interface Cosecha extends Documento {
  parcela: { _id: string; codigo: string; variedad?: string } | string;
  hacienda: { _id: string; nombre: string } | string;
  fecha: string;
  mazorcas: number;
  kg: number;
  estado: string;
  costoManoObra: number;
  costoAsignado: number;
  codigoLote?: string;
  loteGrano?: string;
}

export interface Monitoreo extends Documento {
  parcela: { _id: string; codigo: string } | string;
  fecha: string;
  plaga: string;
  evaluadas: number;
  afectadas: number;
  incidencia: number;
  accion?: string;
}

export interface Clima {
  fecha: string;
  hacienda: string;
  lluviaMm: number;
  temperaturaMax?: number;
  temperaturaMin?: number;
  humedadRelativa?: number;
}
