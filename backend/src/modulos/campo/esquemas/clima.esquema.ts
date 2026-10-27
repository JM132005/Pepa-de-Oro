// clima.esquema.ts → colección "clima": lluvia y temperatura diaria por hacienda.
// Es una colección TIME SERIES de MongoDB (optimizada para datos por fecha); el mismo tipo se usará
// para los sensores del gemelo digital.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

@Schema({
  collection: 'clima',
  // timeseries: timeField = el campo de la fecha; metaField = a qué hacienda pertenece la medición.
  // MongoDB guarda juntas las mediciones de la misma hacienda y época: consultas por rango más rápidas.
  timeseries: { timeField: 'fecha', metaField: 'hacienda', granularity: 'hours' },
  autoCreate: false, // se crea con prepararColecciones() (FerretDB y Mongo viejos no soportan time series)
})
export class Clima {
  @Prop({ required: true }) fecha: Date;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Hacienda', required: true }) hacienda: string;
  @Prop({ default: 0 }) lluviaMm: number;
  @Prop() temperaturaMax?: number;
  @Prop() temperaturaMin?: number;
  @Prop() humedadRelativa?: number;
}

export const ClimaEsquema = SchemaFactory.createForClass(Clima);
