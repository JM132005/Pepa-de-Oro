// cosecha.esquema.ts → colección "cosechas": lo recolectado en una parcela un día.
// Cada cosecha genera un LOTE DE GRANO propio que entra al mismo flujo que el cacao comprado.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

@Schema({ collection: 'cosechas', timestamps: true })
export class Cosecha {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Parcela', required: true }) parcela: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Hacienda', required: true }) hacienda: string;
  @Prop({ required: true, default: () => new Date() }) fecha: Date;
  @Prop({ default: 0 }) mazorcas: number; // cacao: número de mazorcas abiertas
  @Prop({ required: true, min: 0.1 }) kg: number; // kg en baba (cacao) o en cereza (café)
  @Prop({ required: true }) estado: string; // BABA o CEREZA
  @Prop({ type: [{ trabajador: { type: SchemaTypes.ObjectId, ref: 'Trabajador' }, nombre: String, jornales: Number, costo: Number, _id: false }], default: [] })
  cuadrilla: { trabajador: string; nombre: string; jornales: number; costo: number }[];
  @Prop({ default: 0 }) costoManoObra: number;
  @Prop({ default: 0 }) costoAsignado: number; // costo de campo del período cargado a esta cosecha
  @Prop({ type: SchemaTypes.ObjectId, ref: 'LoteGrano' }) loteGrano?: string;
  @Prop() codigoLote?: string;
  @Prop() observaciones?: string;
  @Prop() usuario?: string;
}

export const CosechaEsquema = SchemaFactory.createForClass(Cosecha);
