// auditoria.esquema.ts → colección "auditoria": bitácora de QUIÉN hizo QUÉ y CUÁNDO.
// Las acciones sensibles (anular factura, ajustar inventario, cambiar precios, dar de baja un activo)
// guardan además el valor ANTES y DESPUÉS del cambio. Esta colección solo crece: nunca se edita.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

@Schema({ collection: 'auditoria', timestamps: { createdAt: 'fecha', updatedAt: false } })
export class Auditoria {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Usuario' })
  usuarioId?: string;

  @Prop() usuarioNombre?: string;

  // accion: "ANULAR_FACTURA", "AJUSTE_INVENTARIO", "POST /api/ventas/facturas"...
  @Prop({ required: true }) accion: string;

  @Prop() entidad?: string; // colección afectada: "facturas", "productos"...
  @Prop() entidadId?: string;

  // Mixed: puede guardar cualquier objeto (el documento antes y después del cambio).
  @Prop({ type: SchemaTypes.Mixed }) antes?: unknown;
  @Prop({ type: SchemaTypes.Mixed }) despues?: unknown;

  @Prop() sensible?: boolean; // true = acción que solo puede hacer el gerente
  @Prop() ip?: string;

  fecha?: Date; // la pone MongoDB (timestamps)
}

export const AuditoriaEsquema = SchemaFactory.createForClass(Auditoria);
// index(): acelera la búsqueda por fecha descendente (la bitácora se lee de lo más nuevo a lo más viejo).
AuditoriaEsquema.index({ fecha: -1 });
