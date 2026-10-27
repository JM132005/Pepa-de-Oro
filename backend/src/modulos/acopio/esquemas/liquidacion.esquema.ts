// liquidacion.esquema.ts → colección "liquidaciones": LIQUIDACIÓN DE COMPRA al productor (código SRI 03).
// Es el documento que se entrega al campesino que no emite factura: dice cuánto se le compró, a qué
// precio, qué se descontó (humedad, impurezas, anticipos) y cuánto se le paga.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

@Schema({ collection: 'liquidaciones', timestamps: true })
export class Liquidacion {
  @Prop({ required: true, unique: true }) numero: string; // LC-001-001-000000123
  @Prop({ required: true }) secuencial: number;
  @Prop({ required: true }) claveAcceso: string;
  @Prop({ required: true, default: () => new Date() }) fecha: Date;
  @Prop({ type: { id: String, cedula: String, nombre: String, canton: String, _id: false }, required: true }) productor: { id: string; cedula: string; nombre: string; canton: string };
  @Prop({ type: SchemaTypes.ObjectId, ref: 'LoteGrano' }) loteGrano?: string;
  @Prop() codigoLote?: string;
  @Prop({ required: true }) cultivo: string;
  @Prop({ required: true }) variedad: string;
  @Prop({ required: true }) estadoEntrega: string;
  // Báscula y descuentos
  @Prop({ required: true }) kgBrutos: number;
  @Prop({ default: 0 }) taraKg: number;
  @Prop() kgNetos: number;
  @Prop({ default: 0 }) humedad: number;
  @Prop({ default: 0 }) impurezasPct: number;
  @Prop({ default: 0 }) descuentoHumedadKg: number; // RN-04
  @Prop({ default: 0 }) descuentoImpurezasKg: number;
  @Prop() kgPagables: number;
  @Prop() quintales: number;
  // Dinero
  @Prop({ required: true }) precioQq: number;
  @Prop() precioKg: number;
  @Prop() subtotal: number;
  @Prop({ type: [{ concepto: String, monto: Number, _id: false }], default: [] }) bonos: { concepto: string; monto: number }[];
  @Prop({ default: 0 }) retencion: number;
  @Prop({ default: 0 }) anticipoDescontado: number;
  @Prop({ required: true }) totalPagar: number;
  // Pagos (efectivo o transferencia, total o parcial)
  @Prop({ type: [{ fecha: Date, monto: Number, forma: String, referencia: String, usuario: String, _id: false }], default: [] }) pagos: { fecha: Date; monto: number; forma: string; referencia?: string; usuario: string }[];
  @Prop({ default: 0 }) pagado: number;
  @Prop({ default: 0 }) saldo: number;
  @Prop({ enum: ['PENDIENTE', 'PARCIAL', 'PAGADA'], default: 'PENDIENTE' }) estadoPago: string;
  @Prop() usuario: string;
  @Prop() observaciones?: string;
}

export const LiquidacionEsquema = SchemaFactory.createForClass(Liquidacion);
