// orden-mantenimiento.esquema.ts → colección "ordenes_mantenimiento": todo trabajo del taller.
// Puede ser preventivo (por plan), correctivo (por falla) o un servicio pagado a un cliente.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { ESTADOS_ORDEN_MANTENIMIENTO, TIPOS_MANTENIMIENTO } from '../../../comun/constantes.js';

@Schema({ collection: 'ordenes_mantenimiento', timestamps: true })
export class OrdenMantenimiento {
  @Prop({ required: true, unique: true }) codigo: string; // OM-2026-0001
  @Prop({ required: true, enum: TIPOS_MANTENIMIENTO }) tipo: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Activo' }) activo?: string; // activo propio
  // Servicio a cliente: el equipo NO es nuestro, se describe aquí.
  @Prop({ type: { descripcion: String, marca: String, modelo: String, serie: String, _id: false } })
  equipoCliente?: { descripcion: string; marca?: string; modelo?: string; serie?: string };
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cliente' }) cliente?: string;
  @Prop() tarea?: string; // del plan preventivo
  @Prop({ type: { descripcion: String, reportadoPor: String, fecha: Date, _id: false } }) falla?: { descripcion: string; reportadoPor: string; fecha: Date };
  @Prop({ enum: ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'], default: 'MEDIA' }) prioridad: string;
  @Prop({ type: { id: String, nombre: String, _id: false } }) tecnico?: { id: string; nombre: string };
  @Prop() programada?: Date; // fecha planificada (preventivos)
  @Prop() inicio?: Date;
  @Prop() fin?: Date;
  @Prop({ type: [{ tarea: String, hecha: Boolean, _id: false }], default: [] }) checklist: { tarea: string; hecha: boolean }[];
  @Prop({ type: [{ producto: String, nombre: String, cantidad: Number, costoUnitario: Number, _id: false }], default: [] })
  repuestos: { producto: string; nombre: string; cantidad: number; costoUnitario: number }[];
  @Prop({ default: 0 }) horasManoObra: number;
  @Prop({ default: 8 }) costoHora: number;
  @Prop({ type: { costoRepuestos: Number, costoManoObra: Number, costoTotal: Number, _id: false }, default: {} })
  costos: { costoRepuestos?: number; costoManoObra?: number; costoTotal?: number };
  @Prop({ required: true, enum: ESTADOS_ORDEN_MANTENIMIENTO, default: 'ABIERTA' }) estado: string;
  // Presupuesto para clientes (se aprueba antes de trabajar).
  @Prop({ type: { total: Number, aprobado: Boolean, fecha: Date, _id: false } }) presupuesto?: { total: number; aprobado: boolean; fecha?: Date };
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Factura' }) factura?: string;
  @Prop() usoAlCerrar?: number; // horómetro u odómetro al terminar
  @Prop() observaciones?: string;
}

export const OrdenMantenimientoEsquema = SchemaFactory.createForClass(OrdenMantenimiento);
