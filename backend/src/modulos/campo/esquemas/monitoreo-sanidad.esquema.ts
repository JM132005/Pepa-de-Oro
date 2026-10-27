// monitoreo-sanidad.esquema.ts → colección "monitoreos_sanidad": conteo de plagas y enfermedades por parcela.
// Ejemplo: de 200 mazorcas revisadas, 12 tienen monilia → incidencia 6 %. Alimenta el mapa de calor.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { PLAGAS } from '../../../comun/constantes.js';

@Schema({ collection: 'monitoreos_sanidad', timestamps: true })
export class MonitoreoSanidad {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Parcela', required: true }) parcela: string;
  @Prop({ required: true, default: () => new Date() }) fecha: Date;
  @Prop({ required: true, enum: PLAGAS }) plaga: string;
  @Prop({ required: true, min: 1 }) evaluadas: number; // mazorcas o plantas revisadas
  @Prop({ required: true, min: 0 }) afectadas: number;
  @Prop({ default: 0 }) incidencia: number; // % calculado
  @Prop() accion?: string; // qué se hizo (retiro de mazorcas, fumigación)
  @Prop() usuario?: string;
}

export const MonitoreoSanidadEsquema = SchemaFactory.createForClass(MonitoreoSanidad);
