// producto.esquema.ts → colección "productos": cada documento es una VARIANTE que se vende y tiene stock.
//
// Un "producto" es la idea («Chocolate 70 %»); una "variante" es lo que se vende con su SKU
// («Chocolate 70 % · Maracuyá · Barra 50 g», SKU CH70-MAR-50). Aquí cada documento es una variante y el
// campo "productoBase" + "slug" las agrupa: la web muestra una página por producto con todas sus variantes.
//
// SKU (Stock Keeping Unit) = código único de cada variante; es lo que se escanea en la caja.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { CULTIVOS, FAMILIAS, GRADOS, TIPOS_PRODUCTO, UNIDADES, VARIEDADES } from '../../../comun/constantes.js';

export type ProductoDocumento = HydratedDocument<Producto>;

@Schema({ collection: 'productos', timestamps: true })
export class Producto {
  @Prop({ required: true, unique: true, uppercase: true, trim: true }) sku: string;
  @Prop({ required: true, trim: true }) nombre: string; // nombre completo de la variante
  @Prop({ required: true, trim: true }) productoBase: string; // «Chocolate 70 %»
  @Prop({ required: true, index: true }) slug: string; // «chocolate-70» → /productos/chocolate-70
  @Prop({ required: true, enum: FAMILIAS }) familia: string;
  @Prop({ required: true, enum: TIPOS_PRODUCTO }) tipo: string;

  // Variante: sabor y presentación (lo que diferencia una variante de otra del mismo producto).
  @Prop() sabor?: string; // natural, maracuyá, café, sal marina...
  @Prop() presentacion?: string; // barra 50 g, caja de 12, saco 69 kg...
  @Prop({ required: true, enum: UNIDADES, default: 'UNIDAD' }) unidad: string; // en qué se cuenta el stock
  @Prop({ default: 0 }) pesoNetoG: number; // gramos por unidad (para etiqueta y control de peso)

  // ─── Precios (RN-16) ───
  @Prop({ required: true, min: 0 }) precioMenor: number;
  @Prop({ required: true, min: 0 }) precioMayor: number;
  @Prop({ default: 12, min: 1 }) cantidadMinimaMayor: number;
  // Escalas por volumen: [{ desde: 100, precio: 2.5 }]. _id: false → los subdocumentos no llevan _id propio.
  @Prop({ type: [{ desde: Number, precio: Number, _id: false }], default: [] }) escalas: { desde: number; precio: number }[];
  // Listas por tipo de cliente: { DISTRIBUIDOR: 2.6, EXPORTADOR: 2.3 }
  @Prop({ type: SchemaTypes.Mixed, default: {} }) listas: Record<string, number>;
  // IVA: 0 (grano y productos agrícolas sin procesar) o 15 (elaborados). Configurable por variante.
  @Prop({ required: true, enum: [0, 5, 15], default: 15 }) tarifaIva: number;
  // Grano: el precio de venta puede ligarse al precio del día + margen.
  @Prop({ default: 0 }) margenSobrePrecioDia: number;
  // Historial de cambios de precio (quién y cuándo).
  @Prop({
    type: [{ fecha: Date, usuario: String, precioMenor: Number, precioMayor: Number, _id: false }],
    default: [],
  })
  historialPrecios: { fecha: Date; usuario: string; precioMenor: number; precioMayor: number }[];

  // ─── Costos e inventario ───
  @Prop({ default: 0 }) costoPromedio: number; // costo promedio ponderado (se recalcula en cada entrada)
  @Prop({ default: 0 }) stockMinimo: number; // bajo esto: alerta y "últimas unidades" en la web
  @Prop({ default: 7 }) diasReposicion: number; // cuánto tarda producir o comprar (punto de reorden)
  @Prop({ default: 0 }) vidaUtilDias: number; // 0 = no vence (repuestos)

  // ─── Solo para GRANO ───
  @Prop({ enum: [...CULTIVOS, null] }) cultivo?: string;
  @Prop({ enum: [...VARIEDADES, null] }) variedad?: string;
  @Prop({ enum: [...GRADOS, null] }) grado?: string;

  // ─── Ficha para la web ───
  @Prop() descripcion?: string;
  @Prop({ type: [String], default: [] }) notasCata: string[]; // floral, frutal, nuez...
  @Prop() origen?: string; // «Hacienda La Esperanza, El Guabo»
  @Prop() ingredientes?: string;
  @Prop() alergenos?: string;
  @Prop() registroSanitario?: string; // ARCSA (ficticio)
  @Prop() imagen?: string; // ruta dentro de frontend/public/img
  @Prop({ default: false }) publicado: boolean; // ¿se muestra en la web?
  @Prop({ default: false }) destacado: boolean; // ¿sale en el inicio?
  @Prop({ default: false }) proximamente: boolean;
  @Prop({ default: true }) activo: boolean;
}

export const ProductoEsquema = SchemaFactory.createForClass(Producto);
ProductoEsquema.index({ familia: 1, publicado: 1 });
