// cliente.esquema.ts → colección "clientes": a quién se le vende (consumidor, tienda, distribuidor, exportador).

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { TIPOS_CLIENTE, TIPOS_IDENTIFICACION } from '../../../comun/constantes.js';

@Schema({ collection: 'clientes', timestamps: true })
export class Cliente {
  @Prop({ required: true, enum: TIPOS_IDENTIFICACION }) tipoIdentificacion: string;
  // unique: no se repite la cédula/RUC. RN-02 la valida antes de guardar.
  @Prop({ required: true, unique: true, trim: true }) identificacion: string;
  @Prop({ required: true, trim: true }) nombre: string; // nombre o razón social
  @Prop({ trim: true }) nombreComercial?: string;
  @Prop({ trim: true, lowercase: true }) correo?: string; // aquí llegan las facturas
  @Prop() telefono?: string;
  @Prop() direccion?: string;
  @Prop() ciudad?: string;
  @Prop() pais?: string; // exportadores
  @Prop({ required: true, enum: TIPOS_CLIENTE, default: 'CONSUMIDOR' }) tipoCliente: string;
  // Crédito (RN-18): días de plazo y cupo máximo. 0 días = solo contado.
  @Prop({ default: 0, min: 0 }) creditoDias: number;
  @Prop({ default: 0, min: 0 }) cupo: number;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Usuario' }) vendedor?: string;
  @Prop() notas?: string;
  @Prop({ default: true }) activo: boolean;
}

export const ClienteEsquema = SchemaFactory.createForClass(Cliente);
