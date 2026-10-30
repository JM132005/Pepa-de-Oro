// bodega.esquema.ts → colección "bodegas": lugares donde se guarda el stock.
// Ejemplo: BOD-MP (materia prima), BOD-PT (producto terminado), BOD-TDA (tienda Machala).

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { TIPOS_BODEGA } from '../../../comun/constantes.js';

@Schema({ collection: 'bodegas', timestamps: true })
export class Bodega {
  @Prop({ required: true, unique: true, uppercase: true }) codigo: string;
  @Prop({ required: true }) nombre: string;
  @Prop({ required: true, enum: TIPOS_BODEGA }) tipo: string;
  @Prop() ubicacion?: string;
  @Prop() responsable?: string;
  @Prop({ default: true }) activa: boolean;
}

export const BodegaEsquema = SchemaFactory.createForClass(Bodega);
