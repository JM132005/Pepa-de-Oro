// parcela.esquema.ts → colección "parcelas": cada lote de terreno de una hacienda (ej: LE-P03).

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { CULTIVOS, ESTADOS_PARCELA, VARIEDADES } from '../../../comun/constantes.js';

@Schema({ collection: 'parcelas', timestamps: true })
export class Parcela {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Hacienda', required: true }) hacienda: string;
  @Prop({ required: true, unique: true, uppercase: true }) codigo: string;
  @Prop({ required: true, min: 0 }) hectareas: number;
  @Prop({ required: true, enum: CULTIVOS }) cultivo: string;
  @Prop({ required: true, enum: VARIEDADES }) variedad: string;
  @Prop() clon?: string; // CCN-51, EET-103, Typica, Caturra...
  @Prop({ required: true }) anioSiembra: number;
  @Prop({ default: 1100 }) densidad: number; // plantas por hectárea
  @Prop({ default: 0 }) plantas: number;
  @Prop({ enum: ['MONOCULTIVO', 'SOMBRA_PLATANO', 'AGROFORESTAL'], default: 'MONOCULTIVO' }) sistema: string;
  @Prop({ enum: ['GOTEO', 'ASPERSION', 'GRAVEDAD', 'SECANO'], default: 'SECANO' }) riego: string;
  @Prop({ required: true, enum: ESTADOS_PARCELA, default: 'PRODUCCION' }) estado: string;
  // Plan de labores: qué toca y cada cuántos días (poda 180, fertilización 120...).
  @Prop({ type: [{ tipo: String, cadaDias: Number, ultimaFecha: Date, _id: false }], default: [] }) planLabores: { tipo: string; cadaDias: number; ultimaFecha?: Date }[];
}

export const ParcelaEsquema = SchemaFactory.createForClass(Parcela);
