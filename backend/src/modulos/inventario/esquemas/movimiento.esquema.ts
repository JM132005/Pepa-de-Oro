// movimiento.esquema.ts → colección "movimientos_inventario": el KARDEX.
//
// Cada vez que el stock cambia se AGREGA un movimiento (nunca se edita ni se borra).
// Analogía: es el estado de cuenta del banco: no se cambia el saldo a mano, se registran depósitos y retiros.
// Con los movimientos se puede reconstruir el stock de cualquier día y auditar quién movió qué.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { TIPOS_MOVIMIENTO } from '../../../comun/constantes.js';

@Schema({ collection: 'movimientos_inventario', timestamps: { createdAt: 'fecha', updatedAt: false } })
export class Movimiento {
  @Prop({ required: true, enum: TIPOS_MOVIMIENTO }) tipo: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Producto', required: true }) producto: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Bodega', required: true }) bodega: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'LoteProducto' }) lote?: string;
  @Prop() codigoLote?: string;
  @Prop({ required: true }) cantidad: number; // siempre positiva
  @Prop({ required: true, enum: [1, -1] }) signo: number; // +1 entrada, −1 salida
  @Prop({ default: 0 }) costoUnitario: number;
  @Prop() saldoProducto?: number; // stock total del producto DESPUÉS del movimiento
  // Documento que originó el movimiento: { tipo: 'FACTURA', numero: '001-001-000000123', id }
  @Prop({ type: { tipo: String, numero: String, id: String, _id: false } }) documento?: { tipo: string; numero?: string; id?: string };
  @Prop() usuario?: string;
  @Prop() motivo?: string; // obligatorio en ajustes (RN-15)

  // "fecha" la pone MongoDB sola (timestamps.createdAt = 'fecha'); se declara aquí solo para TypeScript.
  fecha?: Date;
}

export const MovimientoEsquema = SchemaFactory.createForClass(Movimiento);
// Índice compuesto para el kardex: movimientos de un producto ordenados por fecha.
MovimientoEsquema.index({ producto: 1, fecha: -1 });
