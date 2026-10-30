// alquiler.esquema.ts → colección "alquileres": contrato de alquiler de un activo a un cliente.
// Calendario: no se puede alquilar en fechas que se crucen con otro alquiler o un mantenimiento (RN-23).

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { ESTADOS_ALQUILER } from '../../../comun/constantes.js';

@Schema({ collection: 'alquileres', timestamps: true })
export class Alquiler {
  @Prop({ required: true, unique: true }) codigo: string; // AL-2026-0001
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Activo', required: true }) activo: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cliente', required: true }) cliente: string;
  @Prop({ required: true }) desde: Date;
  @Prop({ required: true }) hasta: Date; // fecha pactada de devolución
  @Prop({ required: true, min: 0 }) tarifaDia: number;
  @Prop({ default: false }) conOperador: boolean;
  @Prop({ default: 0 }) tarifaOperadorDia: number;
  @Prop({ default: 0 }) garantia: number;
  @Prop({ required: true, enum: ESTADOS_ALQUILER, default: 'RESERVADO' }) estado: string;
  @Prop() lugarTrabajo?: string; // finca donde se usará
  @Prop() condiciones?: string;
  // Entrega y devolución: estado del equipo, horómetro y daños.
  @Prop({ type: { fecha: Date, horometro: Number, estadoEquipo: String, observaciones: String, _id: false } })
  entrega?: { fecha: Date; horometro: number; estadoEquipo: string; observaciones?: string };
  @Prop({ type: { fecha: Date, horometro: Number, danos: Number, observaciones: String, _id: false } })
  devolucion?: { fecha: Date; horometro: number; danos: number; observaciones?: string };
  @Prop({ type: SchemaTypes.Mixed }) calculo?: Record<string, number>; // resultado de calcularAlquiler()
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Factura' }) factura?: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'SolicitudWeb' }) solicitud?: string;
  @Prop() creadoPor?: string;
}

export const AlquilerEsquema = SchemaFactory.createForClass(Alquiler);
AlquilerEsquema.index({ activo: 1, desde: 1 });
