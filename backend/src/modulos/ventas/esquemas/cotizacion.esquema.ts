// cotizacion.esquema.ts → colección "cotizaciones": propuesta de precios que se envía al cliente en PDF.
// Vigencia de 15 días (RN-22). Si el cliente acepta, se convierte en pedido.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { ESTADOS_COTIZACION } from '../../../comun/constantes.js';
import { EnvioCorreo, EnvioCorreoEsquema, ItemVenta, ItemVentaEsquema, Totales, TotalesEsquema } from '../../../comun/esquemas/item-venta.esquema.js';

@Schema({ collection: 'cotizaciones', timestamps: true })
export class Cotizacion {
  @Prop({ required: true, unique: true }) numero: string; // COT-2026-0001
  @Prop({ required: true, default: () => new Date() }) fecha: Date;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cliente', required: true }) cliente: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'SolicitudWeb' }) solicitud?: string; // si vino de la web
  @Prop({ type: [ItemVentaEsquema], default: [] }) items: ItemVenta[];
  @Prop({ type: TotalesEsquema, default: {} }) totales: Totales;
  @Prop({ default: 15 }) diasValidez: number;
  @Prop() vence: Date;
  @Prop({ required: true, enum: ESTADOS_COTIZACION, default: 'BORRADOR' }) estado: string;
  @Prop({ default: 'MAYORISTA' }) canal: string;
  @Prop({ type: { id: String, nombre: String, _id: false } }) vendedor: { id: string; nombre: string };
  @Prop() condiciones?: string; // forma de pago, tiempo de entrega
  @Prop() observaciones?: string;
  @Prop({ type: [EnvioCorreoEsquema], default: [] }) envios: EnvioCorreo[];
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Pedido' }) pedido?: string;
}

export const CotizacionEsquema = SchemaFactory.createForClass(Cotizacion);
