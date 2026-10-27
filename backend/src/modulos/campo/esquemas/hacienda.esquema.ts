// hacienda.esquema.ts → colección "haciendas": las fincas PROPIAS de Pepa de Oro.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'haciendas', timestamps: true })
export class Hacienda {
  @Prop({ required: true, unique: true, uppercase: true }) codigo: string; // LE, SJ, AZ
  @Prop({ required: true }) nombre: string;
  @Prop({ required: true }) canton: string;
  @Prop() parroquia?: string;
  // Coordenadas GPS para el mapa (latitud negativa = sur del ecuador).
  @Prop({ type: { lat: Number, lng: Number, _id: false } }) ubicacion?: { lat: number; lng: number };
  @Prop({ required: true, min: 0 }) hectareasTotales: number;
  @Prop({ default: 0 }) hectareasCultivadas: number;
  @Prop({ default: 0 }) altitudMsnm: number;
  @Prop() fuenteAgua?: string;
  @Prop() responsable?: string; // agrónomo a cargo
  @Prop({ type: [String], default: [] }) cultivos: string[];
  @Prop({ type: [{ tipo: String, codigo: String, vence: Date, _id: false }], default: [] }) certificaciones: { tipo: string; codigo?: string; vence: Date }[];
  @Prop() registroAgrocalidad?: string;
  @Prop() descripcion?: string; // para la web (Quiénes somos)
  @Prop() imagen?: string;
  @Prop({ default: true }) activa: boolean;
}

export const HaciendaEsquema = SchemaFactory.createForClass(Hacienda);
