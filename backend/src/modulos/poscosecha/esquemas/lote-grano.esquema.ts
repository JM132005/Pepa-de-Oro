// lote-grano.esquema.ts → colección "lotes_grano": cada lote de cacao o café desde que llega hasta que se
// almacena seco y aprobado. El grano PROPIO (cosecha de las haciendas) y el COMPRADO (acopio) siguen el
// MISMO camino y las mismas reglas, así se pueden comparar.
//
// Recorrido: RECIBIDO → FERMENTANDO → SECANDO → SECO → ALMACENADO (o RECHAZADO por calidad).
// "historial" guarda cada evento con fecha y usuario: es la línea de tiempo de la trazabilidad.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { CULTIVOS, ESTADOS_ENTREGA, ESTADOS_LOTE_GRANO, METODOS_SECADO, ORIGENES_LOTE, VARIEDADES } from '../../../comun/constantes.js';

export type LoteGranoDocumento = HydratedDocument<LoteGrano>;

@Schema({ collection: 'lotes_grano', timestamps: true })
export class LoteGrano {
  @Prop({ required: true, unique: true }) codigo: string; // L-2026-0001
  @Prop({ required: true, enum: ORIGENES_LOTE }) origen: string; // PROPIO o COMPRA
  @Prop({ required: true, enum: CULTIVOS }) cultivo: string;
  @Prop({ required: true, enum: VARIEDADES }) variedad: string;
  @Prop({ required: true, enum: ESTADOS_ENTREGA }) estadoEntrega: string; // cómo llegó: BABA, SECO, CEREZA...
  @Prop({ required: true, default: () => new Date() }) fechaRecepcion: Date;

  // Origen COMPRA
  @Prop({ type: { id: String, nombre: String, canton: String, _id: false } }) productor?: { id: string; nombre: string; canton?: string };
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Liquidacion' }) liquidacion?: string;
  // Origen PROPIO
  @Prop({ type: { id: String, nombre: String, _id: false } }) hacienda?: { id: string; nombre: string };
  @Prop({ type: { id: String, codigo: String, _id: false } }) parcela?: { id: string; codigo: string };
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Cosecha' }) cosecha?: string;

  @Prop({ required: true, min: 0 }) kgEntrada: number; // kg al recibir
  @Prop({ default: 0 }) kgSeco: number; // kg al terminar el secado
  @Prop({ default: 0 }) mermaPct: number;
  @Prop({ default: 0 }) factorConversion: number; // kg seco ÷ kg entrada
  @Prop({ default: 0 }) humedadEntrada: number;
  @Prop({ default: 0 }) costoTotal: number; // lo pagado (compra) o el costo de campo (propio)
  @Prop({ default: 0 }) costoKgSeco: number;
  @Prop({ required: true, enum: ESTADOS_LOTE_GRANO, default: 'RECIBIDO' }) estado: string;

  // Fermentación: fermentador asignado, volteos y temperaturas de la masa.
  @Prop({
    type: {
      activo: { type: SchemaTypes.ObjectId, ref: 'Activo' },
      codigo: String,
      inicio: Date,
      fin: Date,
      volteos: [{ fecha: Date, temperatura: Number, usuario: String, _id: false }],
      _id: false,
    },
  })
  fermentacion?: { activo: string; codigo: string; inicio: Date; fin?: Date; volteos: { fecha: Date; temperatura?: number; usuario: string }[] };

  // Secado: tendal (sol) o secadora (máquina), con mediciones de humedad.
  @Prop({
    type: {
      metodo: { type: String, enum: METODOS_SECADO },
      activo: { type: SchemaTypes.ObjectId, ref: 'Activo' },
      codigo: String,
      inicio: Date,
      fin: Date,
      mediciones: [{ fecha: Date, humedad: Number, usuario: String, _id: false }],
      _id: false,
    },
  })
  secado?: { metodo: string; activo: string; codigo: string; inicio: Date; fin?: Date; mediciones: { fecha: Date; humedad: number; usuario: string }[] };

  // Calidad (RN-06): mediciones, grado calculado y destino sugerido.
  @Prop({ type: SchemaTypes.Mixed }) calidad?: {
    fecha: Date;
    usuario: string;
    bienFermentados?: number;
    violetas?: number;
    pizarrosos?: number;
    mohosos?: number;
    insectados?: number;
    germinados?: number;
    humedad: number;
    peso100Granos?: number;
    impurezas?: number;
    defectos300g?: number; // café
    puntajeTaza?: number; // café
    grado: string;
    motivos: string[];
    destino: string;
    cata?: { notas: string[]; puntaje: number; comentario?: string };
  };

  // No conformidad: si se rechaza, el lote queda bloqueado hasta decidir su destino.
  @Prop({ type: { causa: String, fecha: Date, destino: String, cerrada: Boolean, cierre: Date, usuario: String, _id: false } })
  noConformidad?: { causa: string; fecha: Date; destino?: string; cerrada: boolean; cierre?: Date; usuario: string };

  @Prop({ type: [String], default: [] }) lotesOrigen: string[]; // si es un lote combinado, de qué lotes salió
  @Prop() combinadoEn?: string; // si este lote se juntó con otros, el código del lote nuevo
  @Prop({ type: SchemaTypes.ObjectId, ref: 'LoteProducto' }) loteProducto?: string; // stock en bodega al aprobarse

  @Prop({ type: [{ fecha: Date, evento: String, detalle: String, usuario: String, _id: false }], default: [] })
  historial: { fecha: Date; evento: string; detalle: string; usuario: string }[];
}

export const LoteGranoEsquema = SchemaFactory.createForClass(LoteGrano);
LoteGranoEsquema.index({ estado: 1, fechaRecepcion: -1 });
