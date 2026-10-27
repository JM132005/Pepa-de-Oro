// labor.esquema.ts → colección "labores": cada trabajo hecho en una parcela (poda, fumigación...).
// Guarda jornales e insumos para saber CUÁNTO CUESTA producir un kg; y si es un agroquímico,
// su período de carencia (RN-01).

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { TIPOS_LABOR } from '../../../comun/constantes.js';

@Schema({ collection: 'labores', timestamps: true })
export class Labor {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Parcela', required: true }) parcela: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Hacienda', required: true }) hacienda: string;
  @Prop({ required: true, enum: TIPOS_LABOR }) tipo: string;
  @Prop({ required: true, default: () => new Date() }) fecha: Date;
  @Prop() responsable?: string;
  // Cuadrilla: quién trabajó y cuántos días (jornales).
  @Prop({ type: [{ trabajador: { type: SchemaTypes.ObjectId, ref: 'Trabajador' }, nombre: String, jornales: Number, costo: Number, _id: false }], default: [] })
  cuadrilla: { trabajador: string; nombre: string; jornales: number; costo: number }[];
  // Insumos sacados de la bodega de campo.
  @Prop({ type: [{ producto: { type: SchemaTypes.ObjectId, ref: 'Producto' }, nombre: String, cantidad: Number, unidad: String, costo: Number, _id: false }], default: [] })
  insumos: { producto: string; nombre: string; cantidad: number; unidad: string; costo: number }[];
  // Agroquímico aplicado (RN-01): producto, dosis y días de carencia.
  @Prop({ type: { producto: String, dosis: String, diasCarencia: Number, _id: false } }) agroquimico?: { producto: string; dosis?: string; diasCarencia: number };
  @Prop({ default: 0 }) costoManoObra: number;
  @Prop({ default: 0 }) costoInsumos: number;
  @Prop({ default: 0 }) costoTotal: number;
  @Prop() observaciones?: string;
}

export const LaborEsquema = SchemaFactory.createForClass(Labor);
LaborEsquema.index({ parcela: 1, fecha: -1 });
