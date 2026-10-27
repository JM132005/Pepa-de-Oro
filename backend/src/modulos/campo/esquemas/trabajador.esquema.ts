// trabajador.esquema.ts → colección "trabajadores": personal de campo, choferes y técnicos (con jornal).
// No todos tienen usuario en el sistema (un jornalero no inicia sesión), por eso están aparte de "usuarios".

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

@Schema({ collection: 'trabajadores', timestamps: true })
export class Trabajador {
  @Prop({ required: true, unique: true }) cedula: string;
  @Prop({ required: true }) nombre: string;
  @Prop({ required: true, enum: ['JORNALERO', 'CAPATAZ', 'CHOFER', 'TECNICO', 'OPERARIO_PLANTA'] }) cargo: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Hacienda' }) hacienda?: string;
  @Prop({ default: 0 }) jornalDiario: number; // USD por día (8 horas)
  @Prop() telefono?: string;
  // Choferes: tipo y vencimiento de la licencia (no se asigna un viaje con licencia vencida).
  @Prop() licenciaTipo?: string; // C, D, E
  @Prop() licenciaVence?: Date;
  @Prop({ default: true }) activo: boolean;
}

export const TrabajadorEsquema = SchemaFactory.createForClass(Trabajador);
