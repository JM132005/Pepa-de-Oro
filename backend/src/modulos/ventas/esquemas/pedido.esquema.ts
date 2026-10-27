// pedido.esquema.ts → colección "pedidos": venta por mayor o exportación confirmada.
// Al confirmarse RESERVA el stock; bodega lo prepara, logística lo entrega y se factura al despachar.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { ESTADOS_PEDIDO } from '../../../comun/constantes.js';
import { ItemVenta, ItemVentaEsquema, Totales, TotalesEsquema } from '../../../comun/esquemas/item-venta.esquema.js';

@Schema({ collection: 'pedidos', timestamps: true })
export class Pedido {
  @Prop({ required: true, unique: true }) numero: string; // PED-2026-0001
  @Prop({ required: true, default: () => new Date() }) fecha: Date;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cliente', required: true }) cliente: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cotizacion' }) cotizacion?: string;
  @Prop({ required: true, enum: ['MAYORISTA', 'EXPORTACION'], default: 'MAYORISTA' }) canal: string;
  @Prop({ type: [ItemVentaEsquema], default: [] }) items: ItemVenta[]; // items[].lotes = lo reservado
  @Prop({ type: TotalesEsquema, default: {} }) totales: Totales;
  @Prop({ required: true, enum: ESTADOS_PEDIDO, default: 'CONFIRMADO' }) estado: string;
  @Prop({ default: 0 }) creditoDias: number; // 0 = contado
  @Prop({ type: { id: String, nombre: String, _id: false } }) vendedor: { id: string; nombre: string };
  // Entrega en el país
  @Prop({ type: { direccion: String, fechaEstimada: Date, contacto: String, _id: false } }) entrega?: { direccion?: string; fechaEstimada?: Date; contacto?: string };
  // Exportación: Incoterm FOB = el comprador paga desde que la carga sube al barco en Puerto Bolívar.
  @Prop({ type: { incoterm: String, puertoOrigen: String, puertoDestino: String, pais: String, naviera: String, contenedor: String, booking: String, _id: false } })
  exportacion?: { incoterm?: string; puertoOrigen?: string; puertoDestino?: string; pais?: string; naviera?: string; contenedor?: string; booking?: string };
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Viaje' }) viaje?: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Factura' }) factura?: string;
  @Prop() observaciones?: string;
  @Prop() preparadoPor?: string;
}

export const PedidoEsquema = SchemaFactory.createForClass(Pedido);
