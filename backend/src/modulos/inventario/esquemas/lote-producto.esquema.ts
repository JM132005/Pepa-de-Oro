// lote-producto.esquema.ts → colección "lotes_producto": el STOCK, separado por lote y bodega.
//
// ¿Por qué por lote? Porque cada lote tiene su propio vencimiento (FEFO, RN-13), su costo y su historia
// (trazabilidad). Ejemplo: 240 barras del lote PT-20261019-03 en la bodega de producto terminado.
// La cantidad SOLO cambia mediante movimientos (kardex); nunca se edita a mano.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type LoteProductoDocumento = HydratedDocument<LoteProducto>;

@Schema({ collection: 'lotes_producto', timestamps: true })
export class LoteProducto {
  // SchemaTypes.ObjectId + ref: guarda el _id y permite "populate" (traer los datos del producto).
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Producto', required: true, index: true }) producto: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Bodega', required: true }) bodega: string;
  @Prop({ required: true, uppercase: true }) codigo: string; // PT-20261019-03, L-2026-0012, INS-...

  @Prop({ required: true, min: 0, default: 0 }) cantidad: number; // físico
  @Prop({ min: 0, default: 0 }) reservado: number; // apartado por pedidos y órdenes de producción
  @Prop({ default: 0 }) costoUnitario: number;

  @Prop() fechaElaboracion?: Date;
  @Prop() vencimiento?: Date;
  @Prop() grado?: string; // grano: PREMIUM, EXPORTACION, NACIONAL

  // RN-11: un lote de producción nace "liberado: false" y solo Calidad lo libera.
  @Prop({ default: true }) liberado: boolean;
  @Prop({ default: false }) bloqueado: boolean; // no conformidad o vencido
  @Prop() motivoBloqueo?: string;

  // De dónde salió: sirve para la trazabilidad hacia atrás.
  @Prop({
    type: {
      tipo: String, // ACOPIO, COSECHA, PRODUCCION, COMPRA, AJUSTE, TRANSFERENCIA
      loteGrano: { type: SchemaTypes.ObjectId, ref: 'LoteGrano' },
      ordenProduccion: { type: SchemaTypes.ObjectId, ref: 'OrdenProduccion' },
      _id: false,
    },
    default: {},
  })
  origen: { tipo?: string; loteGrano?: string; ordenProduccion?: string };

  // Control de calidad de producto terminado (RN-11).
  @Prop({ type: SchemaTypes.Mixed }) controlCalidad?: {
    fecha: Date;
    usuario: string;
    pesoNominalG: number;
    pesoPromedioG: number;
    selladoOk: boolean;
    etiquetaOk: boolean;
    temperaturaTemplado?: number;
    liberado: boolean;
    motivos: string[];
  };
  @Prop() tipoEmpaque?: string; // funda trilaminada, caja, saco de yute
}

export const LoteProductoEsquema = SchemaFactory.createForClass(LoteProducto);
// Índice único compuesto: no puede haber dos documentos del mismo lote en la misma bodega.
LoteProductoEsquema.index({ producto: 1, bodega: 1, codigo: 1 }, { unique: true });
LoteProductoEsquema.index({ vencimiento: 1 });
