// viaje.esquema.ts → colección "viajes": cada salida de un camión de la flota.
// Tipos: recolección en fincas, entrega de pedido, traslado a puerto o flete a terceros.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { ESTADOS_VIAJE, TIPOS_VIAJE } from '../../../comun/constantes.js';

@Schema({ collection: 'viajes', timestamps: true })
export class Viaje {
  @Prop({ required: true, unique: true }) codigo: string; // V-2026-0001
  @Prop({ required: true, enum: TIPOS_VIAJE }) tipo: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Activo', required: true }) camion: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Trabajador', required: true }) chofer: string;
  @Prop({ required: true }) origen: string;
  @Prop({ required: true }) destino: string;
  @Prop({ required: true }) salida: Date;
  @Prop({ required: true }) llegadaEstimada: Date;
  @Prop() llegada?: Date;
  @Prop() kmSalida?: number;
  @Prop() kmLlegada?: number;
  @Prop({ default: 0 }) kmEstimados: number;
  @Prop({ type: { descripcion: String, pesoKg: Number, bultos: Number, _id: false }, required: true })
  carga: { descripcion: string; pesoKg: number; bultos?: number };
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Pedido' }) pedido?: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cliente' }) cliente?: string; // flete a terceros
  @Prop({ type: { modo: String, valor: Number, total: Number, _id: false } }) tarifa?: { modo: string; valor: number; total: number };
  @Prop({ type: { combustible: Number, peajes: Number, viaticos: Number, _id: false }, default: {} })
  costos: { combustible?: number; peajes?: number; viaticos?: number };
  @Prop({ required: true, enum: ESTADOS_VIAJE, default: 'PROGRAMADO' }) estado: string;
  @Prop() guiaRemision?: string; // número de la guía de remisión
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Factura' }) factura?: string;
  @Prop() observaciones?: string;
  @Prop() solicitadoPor?: string;
}

export const ViajeEsquema = SchemaFactory.createForClass(Viaje);
