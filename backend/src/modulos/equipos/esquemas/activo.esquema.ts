// activo.esquema.ts → colección "activos": cada máquina o vehículo con UNA sola ficha.
// Su estado decide qué se puede hacer: usarlo en planta, alquilarlo, asignarlo a un viaje,
// venderlo o mandarlo al taller. Los fermentadores y tendales también son activos (con capacidad en kg).

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { DOCUMENTOS_ACTIVO, ESTADOS_EQUIPO, TIPOS_EQUIPO, USOS_EQUIPO } from '../../../comun/constantes.js';

export type ActivoDocumento = HydratedDocument<Activo>;

@Schema({ collection: 'activos', timestamps: true })
export class Activo {
  @Prop({ required: true, unique: true, uppercase: true }) codigo: string; // MAQ-007, CAM-02, F-01
  @Prop({ required: true }) nombre: string;
  @Prop({ required: true, enum: TIPOS_EQUIPO }) tipo: string;
  @Prop() marca?: string;
  @Prop() modelo?: string;
  @Prop() anio?: number;
  @Prop() serie?: string;
  @Prop({ uppercase: true }) placa?: string;
  @Prop() capacidad?: string; // texto: "500 kg/h", "8 toneladas"
  @Prop({ default: 0 }) capacidadKg: number; // número para RN-05 (fermentador/tendal) y RN-25 (camión)
  // usos: para qué se tiene (puede ser varios: un tractor propio que también se alquila).
  @Prop({ type: [String], enum: USOS_EQUIPO, default: ['USO_INTERNO'] }) usos: string[];
  @Prop({ required: true, enum: ESTADOS_EQUIPO, default: 'DISPONIBLE' }) estado: string;
  @Prop({ default: false }) nuevo: boolean; // nuevo de distribuidor o usado propio

  // Dinero
  @Prop({ default: 0 }) valorCompra: number;
  @Prop({ default: 0 }) valorActual: number;
  @Prop({ default: 0 }) precioVenta: number;
  @Prop({ type: { hora: Number, dia: Number, semana: Number, temporada: Number, _id: false }, default: {} })
  tarifas: { hora?: number; dia?: number; semana?: number; temporada?: number };
  @Prop({ default: 0 }) tarifaOperadorDia: number;
  @Prop({ default: 0 }) garantia: number; // depósito que deja el cliente al alquilar
  @Prop({ default: 0 }) costoHora: number; // costo interno por hora de uso (para costear producción)

  // Uso acumulado: horas (máquinas) o km (vehículos). Alimenta el preventivo (RN-26).
  @Prop({ default: 0 }) horometro: number;
  @Prop({ default: 0 }) odometro: number;

  // Documentos legales con vencimiento (RN-24).
  @Prop({ type: [{ tipo: { type: String, enum: DOCUMENTOS_ACTIVO }, numero: String, vence: Date, _id: false }], default: [] })
  documentos: { tipo: string; numero?: string; vence: Date }[];

  // Plan de mantenimiento preventivo (RN-26): por tiempo, por uso o lo que llegue primero.
  @Prop({ type: [{ tarea: String, cadaDias: Number, cadaUso: Number, ultimaFecha: Date, ultimoUso: Number, _id: false }], default: [] })
  planMantenimiento: { tarea: string; cadaDias?: number; cadaUso?: number; ultimaFecha: Date; ultimoUso: number }[];

  // Web y ficha técnica
  @Prop() descripcion?: string;
  @Prop({ type: [{ etiqueta: String, valor: String, _id: false }], default: [] }) fichaTecnica: { etiqueta: string; valor: string }[];
  @Prop() imagen?: string;
  @Prop({ default: false }) publicado: boolean;
  @Prop() ubicacion?: string;
}

export const ActivoEsquema = SchemaFactory.createForClass(Activo);
