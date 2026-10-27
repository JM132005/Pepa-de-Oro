// receta.esquema.ts → colección "recetas": la LISTA DE MATERIALES (BOM) de cada producto.
// Ejemplo: 100 barras de chocolate 70 % de 50 g = 3,5 kg de pasta de cacao + 1,5 kg de azúcar
// + 0,05 kg de manteca + 100 envolturas + 100 etiquetas.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

@Schema({ collection: 'recetas', timestamps: true })
export class Receta {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Producto', required: true, unique: true }) producto: string; // lo que sale
  @Prop({ required: true }) nombre: string;
  @Prop({ required: true, min: 0.001 }) cantidadBase: number; // para cuántas unidades (o kg) es la receta
  @Prop({ type: [{ producto: { type: SchemaTypes.ObjectId, ref: 'Producto' }, nombre: String, cantidad: Number, unidad: String, _id: false }], default: [] })
  componentes: { producto: string; nombre: string; cantidad: number; unidad: string }[];
  @Prop({ type: [String], default: [] }) pasos: string[]; // tostado, descascarillado, molienda, conchado, templado...
  @Prop({ default: 0 }) horasMaquina: number; // por cantidadBase
  @Prop({ default: 0 }) manoObraHoras: number;
  @Prop({ type: [String], default: [] }) tiposMaquina: string[]; // TOSTADORA, MOLINO, CONCHADORA...
  @Prop({ default: 98 }) rendimientoEsperado: number; // % de unidades buenas esperadas
  @Prop({ default: true }) activa: boolean;
}

export const RecetaEsquema = SchemaFactory.createForClass(Receta);
