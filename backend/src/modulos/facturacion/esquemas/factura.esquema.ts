// factura.esquema.ts → colección "facturas": facturas (código SRI 01) y notas de crédito (04).
//
// Una factura NUNCA se borra ni se edita (RN-21): si hay un error se emite una nota de crédito.
// Por eso los datos del cliente se COPIAN dentro de la factura ("snapshot"): si mañana el cliente
// cambia su dirección, la factura de ayer debe seguir mostrando la de ayer.
//
// IMPORTANTE: es una factura SIMULADA con el formato del SRI; no está autorizada por el SRI.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { CANALES_VENTA, ESTADOS_FACTURA } from '../../../comun/constantes.js';
import { EnvioCorreo, EnvioCorreoEsquema, ItemVenta, ItemVentaEsquema } from '../../../comun/esquemas/item-venta.esquema.js';

export type FacturaDocumento = HydratedDocument<Factura>;

@Schema({ collection: 'facturas', timestamps: true })
export class Factura {
  @Prop({ required: true, enum: ['01', '04'], default: '01' }) tipoComprobante: string; // 01 factura · 04 nota de crédito
  // numero NO es único por sí solo: la factura 001-001-000000001 y la nota de crédito 001-001-000000001 pueden
  // existir a la vez (el SRI numera cada tipo de comprobante por separado). Lo único es el par tipo + número (índice abajo).
  @Prop({ required: true }) numero: string; // 001-001-000000123 (RN-20)
  @Prop({ required: true }) secuencial: number;
  @Prop({ required: true, unique: true }) claveAcceso: string; // 49 dígitos
  @Prop({ required: true, default: () => new Date() }) fechaEmision: Date;

  // Copia de los datos del cliente al momento de emitir.
  @Prop({
    type: { id: String, tipoIdentificacion: String, identificacion: String, nombre: String, direccion: String, correo: String, telefono: String, tipoCliente: String, _id: false },
    required: true,
  })
  cliente: { id?: string; tipoIdentificacion: string; identificacion: string; nombre: string; direccion?: string; correo?: string; telefono?: string; tipoCliente?: string };

  @Prop({ required: true, enum: CANALES_VENTA, default: 'MOSTRADOR' }) canal: string;
  @Prop({ type: [ItemVentaEsquema], default: [] }) items: ItemVenta[];

  // Totales con formato SRI
  @Prop({ default: 0 }) subtotalIva: number; // base 15 %
  @Prop({ default: 0 }) subtotal0: number; // base 0 %
  @Prop({ default: 0 }) subtotalSinImpuestos: number;
  @Prop({ default: 0 }) descuento: number;
  @Prop({ default: 0 }) iva: number;
  @Prop({ required: true }) total: number;
  @Prop({ default: 15 }) tarifaIvaVigente: number;

  // Pago: una o varias formas (pago mixto en la caja).
  @Prop({ type: [{ codigo: String, nombre: String, monto: Number, _id: false }], default: [] })
  pagos: { codigo: string; nombre: string; monto: number }[];
  @Prop({ default: 0 }) recibido: number; // efectivo entregado por el cliente
  @Prop({ default: 0 }) cambio: number;
  // Crédito: días y fecha en que vence.
  @Prop({ default: 0 }) creditoDias: number;
  @Prop() vence?: Date;
  // Abonos a una factura a crédito.
  @Prop({ type: [{ fecha: Date, monto: Number, formaPago: String, referencia: String, usuario: String, _id: false }], default: [] })
  abonos: { fecha: Date; monto: number; formaPago: string; referencia?: string; usuario: string }[];
  @Prop({ default: 0 }) saldo: number; // lo que falta cobrar
  @Prop({ enum: ['PENDIENTE', 'PARCIAL', 'PAGADA'], default: 'PAGADA' }) estadoPago: string;

  @Prop({ required: true, enum: ESTADOS_FACTURA, default: 'EMITIDA' }) estado: string;
  @Prop({ type: [EnvioCorreoEsquema], default: [] }) envios: EnvioCorreo[];

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Pedido' }) pedido?: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'TurnoCaja' }) turnoCaja?: string;
  @Prop({ type: { id: String, nombre: String, _id: false } }) vendedor: { id: string; nombre: string };
  @Prop() observaciones?: string;

  // ─── Solo notas de crédito ───
  @Prop({ type: { id: String, numero: String, fecha: Date, _id: false } }) facturaModificada?: { id: string; numero: string; fecha: Date };
  @Prop() motivo?: string;
  @Prop({ default: false }) devuelveStock: boolean;
  // En la factura original: suma de las notas de crédito que se le hicieron.
  @Prop({ default: 0 }) totalNotasCredito: number;
}

export const FacturaEsquema = SchemaFactory.createForClass(Factura);
// Único: tipo de comprobante (01 factura, 04 nota de crédito) + número.
FacturaEsquema.index({ tipoComprobante: 1, numero: 1 }, { unique: true });
FacturaEsquema.index({ fechaEmision: -1 });
FacturaEsquema.index({ 'cliente.id': 1, saldo: 1 });
