// precio-dia.esquema.ts → colección "precios_dia": precio por quintal que se paga hoy por cada tipo de grano.
// Se guarda cada cambio (historial) para los informes y para la web (/servicios muestra el precio del día).

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CULTIVOS, ESTADOS_ENTREGA, VARIEDADES } from '../../../comun/constantes.js';

@Schema({ collection: 'precios_dia', timestamps: true })
export class PrecioDia {
  @Prop({ required: true, default: () => new Date() }) fecha: Date;
  @Prop({ required: true, enum: CULTIVOS }) cultivo: string;
  @Prop({ required: true, enum: VARIEDADES }) variedad: string;
  @Prop({ required: true, enum: ESTADOS_ENTREGA }) estado: string; // BABA, SECO...
  @Prop({ required: true, min: 0 }) precioQq: number; // USD por quintal (45,36 kg)
  @Prop() precioReferencia?: number; // bolsa de Nueva York convertida, para comparar
  @Prop() usuario: string;
}

export const PrecioDiaEsquema = SchemaFactory.createForClass(PrecioDia);
PrecioDiaEsquema.index({ cultivo: 1, variedad: 1, estado: 1, fecha: -1 });
