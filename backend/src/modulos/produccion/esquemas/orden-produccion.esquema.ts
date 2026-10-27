// orden-produccion.esquema.ts → colección "ordenes_produccion".
// PLANIFICADA → (iniciar: revisa insumos RN-09 y grano aprobado RN-08, reserva) EN_PROCESO
// → (cerrar: consume lo real, crea el lote de producto RN-10) TERMINADA.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { ESTADOS_ORDEN_PRODUCCION } from '../../../comun/constantes.js';

@Schema({ collection: 'ordenes_produccion', timestamps: true })
export class OrdenProduccion {
  @Prop({ required: true, unique: true }) codigo: string; // OP-2026-0001
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Producto', required: true }) producto: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Receta', required: true }) receta: string;
  @Prop({ required: true, min: 0.001 }) cantidadPlanificada: number;
  @Prop({ required: true }) fechaProgramada: Date;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Activo' }) maquina?: string; // línea o máquina asignada
  @Prop({ required: true, enum: ESTADOS_ORDEN_PRODUCCION, default: 'PLANIFICADA' }) estado: string;
  @Prop() responsable?: string;
  // Lo que pide la receta para esta cantidad.
  @Prop({ type: [{ producto: String, nombre: String, unidad: String, requerido: Number, _id: false }], default: [] })
  requerimientos: { producto: string; nombre: string; unidad: string; requerido: number }[];
  // Lo que se reservó al iniciar (lote por lote, FEFO).
  @Prop({ type: [{ producto: String, loteId: String, codigo: String, cantidad: Number, costoUnitario: Number, _id: false }], default: [] })
  reservas: { producto: string; loteId: string; codigo: string; cantidad: number; costoUnitario: number }[];
  // Lo que realmente se consumió al cerrar.
  @Prop({ type: [{ producto: String, nombre: String, loteId: String, codigo: String, cantidad: Number, costoUnitario: Number, _id: false }], default: [] })
  consumos: { producto: string; nombre: string; loteId: string; codigo: string; cantidad: number; costoUnitario: number }[];
  @Prop({ default: 0 }) cantidadProducida: number;
  @Prop({ default: 0 }) cantidadBuena: number; // descontando las defectuosas
  @Prop({ default: 0 }) mermaPct: number;
  @Prop({ default: 0 }) horasMaquinaReales: number;
  @Prop({ default: 0 }) manoObraHorasReales: number;
  @Prop({ type: { materiales: Number, manoObra: Number, maquina: Number, total: Number, unitario: Number, _id: false }, default: {} })
  costos: { materiales?: number; manoObra?: number; maquina?: number; total?: number; unitario?: number };
  // Lote de producto terminado que nace al cerrar (pendiente de calidad, RN-11).
  @Prop({ type: { id: String, codigo: String, vencimiento: Date, _id: false } }) loteProducto?: { id: string; codigo: string; vencimiento?: Date };
  @Prop() fechaInicio?: Date;
  @Prop() fechaCierre?: Date;
  @Prop() tipoEmpaque?: string;
  @Prop() observaciones?: string;
}

export const OrdenProduccionEsquema = SchemaFactory.createForClass(OrdenProduccion);
