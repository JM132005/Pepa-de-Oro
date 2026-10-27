// productor.esquema.ts → colección "productores": agricultores de la zona que venden su cacao o café.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'productores', timestamps: true })
export class Productor {
  @Prop({ required: true, unique: true }) cedula: string; // RN-02: validada con módulo 10
  @Prop({ required: true, trim: true }) nombre: string;
  @Prop() telefono?: string;
  @Prop() finca?: string;
  @Prop({ required: true }) canton: string; // El Guabo, Pasaje, Santa Rosa...
  @Prop() parroquia?: string;
  @Prop({ default: 0 }) hectareas: number;
  @Prop({ type: [String], default: [] }) cultivos: string[]; // CACAO, CAFE
  // Certificaciones con vencimiento (dan bono en el precio).
  @Prop({ type: [{ tipo: String, codigo: String, vence: Date, _id: false }], default: [] }) certificaciones: { tipo: string; codigo?: string; vence: Date }[];
  // Cuenta para pagar por transferencia.
  @Prop({ type: { banco: String, tipo: String, numero: String, _id: false } }) cuentaBancaria?: { banco: string; tipo: string; numero: string };
  @Prop({ default: true }) activo: boolean; // RN-03
  @Prop() motivoInactivo?: string;
  // Anticipos: préstamos antes de la cosecha que se descuentan en las siguientes entregas.
  @Prop({ type: [{ fecha: Date, monto: Number, motivo: String, usuario: String, _id: false }], default: [] }) anticipos: { fecha: Date; monto: number; motivo?: string; usuario: string }[];
  @Prop({ default: 0 }) saldoAnticipo: number;
  @Prop({ default: 0 }) calificacion: number; // promedio de % de granos bien fermentados de sus entregas
}

export const ProductorEsquema = SchemaFactory.createForClass(Productor);
