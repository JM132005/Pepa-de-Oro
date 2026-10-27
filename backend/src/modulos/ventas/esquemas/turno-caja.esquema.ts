// turno-caja.esquema.ts → colección "turnos_caja": apertura y cierre de la caja de la tienda.
// Al abrir se cuenta el efectivo inicial; al cerrar se cuenta otra vez y se compara con lo vendido.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

@Schema({ collection: 'turnos_caja', timestamps: true })
export class TurnoCaja {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Usuario', required: true }) cajero: string;
  @Prop() cajeroNombre: string;
  @Prop({ required: true, default: () => new Date() }) apertura: Date;
  @Prop({ required: true, min: 0 }) montoInicial: number;
  @Prop() cierre?: Date;
  @Prop() contado?: number; // efectivo contado al cerrar
  @Prop() esperado?: number; // inicial + ventas en efectivo
  @Prop() diferencia?: number; // contado − esperado (negativo = faltante)
  // Ventas por forma de pago: { '01': 230.5, '19': 80 }
  @Prop({ type: SchemaTypes.Mixed, default: {} }) ventasPorFormaPago: Record<string, number>;
  @Prop({ default: 0 }) numeroVentas: number;
  @Prop({ required: true, enum: ['ABIERTO', 'CERRADO'], default: 'ABIERTO' }) estado: string;
  @Prop() observaciones?: string;
}

export const TurnoCajaEsquema = SchemaFactory.createForClass(TurnoCaja);
