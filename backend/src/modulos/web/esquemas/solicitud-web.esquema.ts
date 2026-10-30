// solicitud-web.esquema.ts → colección "solicitudes_web": lo que un visitante pide desde la web
// (cotización, alquiler, servicio, contacto o "avísame cuando llegue"). NO es una compra:
// se asigna a un vendedor que la atiende y la convierte en cotización.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { ESTADOS_SOLICITUD, TIPOS_SOLICITUD } from '../../../comun/constantes.js';

@Schema({ collection: 'solicitudes_web', timestamps: true })
export class SolicitudWeb {
  @Prop({ required: true, unique: true }) numero: string; // SOL-2026-0001
  @Prop({ required: true, enum: TIPOS_SOLICITUD }) tipo: string;
  @Prop({ required: true, trim: true }) nombre: string;
  @Prop({ required: true, lowercase: true, trim: true }) correo: string;
  @Prop() telefono?: string;
  @Prop() empresa?: string;
  @Prop() ciudad?: string;
  @Prop() mensaje?: string;
  // Lista de interés: varios productos en una sola solicitud.
  @Prop({ type: [{ producto: { type: SchemaTypes.ObjectId, ref: 'Producto' }, sku: String, nombre: String, cantidad: Number, _id: false }], default: [] })
  items: { producto: string; sku: string; nombre: string; cantidad: number }[];
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Activo' }) activo?: string; // alquiler o compra de un equipo
  @Prop() desde?: Date;
  @Prop() hasta?: Date;
  @Prop() servicio?: string; // TRANSPORTE, MANTENIMIENTO, VENTA_CACAO
  @Prop({ required: true, enum: ESTADOS_SOLICITUD, default: 'NUEVA' }) estado: string;
  @Prop({ type: { id: String, nombre: String, _id: false } }) asignadoA?: { id: string; nombre: string };
  @Prop({ type: [{ fecha: Date, texto: String, usuario: String, _id: false }], default: [] }) notas: { fecha: Date; texto: string; usuario: string }[];
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cotizacion' }) cotizacion?: string;
  @Prop({ default: false }) avisado: boolean; // AVISO_STOCK: ya se le escribió que llegó el producto
  @Prop() ip?: string;
}

export const SolicitudWebEsquema = SchemaFactory.createForClass(SolicitudWeb);
