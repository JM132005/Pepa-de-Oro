// item-venta.esquema.ts → forma de UNA línea de detalle (cotizaciones, pedidos y facturas la comparten).
// Es un SUBDOCUMENTO: vive dentro del documento padre, no en su propia colección
// (se lee siempre junto con la factura, así que se "embebe").

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { TIPOS_ITEM } from '../constantes.js';

// _id: false → las líneas no necesitan _id propio.
@Schema({ _id: false })
export class ItemVenta {
  @Prop({ required: true, enum: TIPOS_ITEM }) tipo: string; // PRODUCTO, SERVICIO, EQUIPO, ALQUILER
  @Prop({ type: SchemaTypes.ObjectId }) refId?: string; // _id del producto, activo, alquiler u orden
  @Prop({ required: true }) codigo: string; // SKU o código del activo
  @Prop({ required: true }) descripcion: string;
  @Prop({ required: true, min: 0 }) cantidad: number;
  @Prop() unidad?: string;
  @Prop({ required: true, min: 0 }) precioUnitario: number;
  @Prop({ default: 0 }) descuentoPct: number;
  @Prop({ default: 0 }) descuento: number; // en dólares
  @Prop({ required: true }) subtotal: number; // sin IVA
  @Prop({ required: true, enum: [0, 5, 15] }) tarifaIva: number;
  @Prop({ default: 0 }) iva: number;
  @Prop() reglaPrecio?: string; // "Precio por mayor", "Escala desde 100"... (RN-16)
  @Prop({ default: 0 }) costoUnitario: number; // para calcular el margen de la venta
  // De qué lotes salió o se reservó (trazabilidad y FEFO).
  @Prop({ type: [{ loteId: String, codigo: String, cantidad: Number, _id: false }], default: [] })
  lotes: { loteId: string; codigo: string; cantidad: number }[];
}

export const ItemVentaEsquema = SchemaFactory.createForClass(ItemVenta);

// Totales comunes a cotización, pedido y factura.
@Schema({ _id: false })
export class Totales {
  @Prop({ default: 0 }) subtotalIva: number;
  @Prop({ default: 0 }) subtotal0: number;
  @Prop({ default: 0 }) subtotalSinImpuestos: number;
  @Prop({ default: 0 }) descuento: number;
  @Prop({ default: 0 }) iva: number;
  @Prop({ default: 0 }) total: number;
}
export const TotalesEsquema = SchemaFactory.createForClass(Totales);

// Registro de cada envío por correo (facturas, cotizaciones, liquidaciones).
@Schema({ _id: false })
export class EnvioCorreo {
  @Prop() fecha: Date;
  @Prop() ok: boolean;
  @Prop() modo: string;
  @Prop() destinatario: string;
  @Prop() error?: string;
  @Prop() archivo?: string;
}
export const EnvioCorreoEsquema = SchemaFactory.createForClass(EnvioCorreo);
