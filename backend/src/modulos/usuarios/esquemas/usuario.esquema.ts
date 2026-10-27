// usuario.esquema.ts → cómo se guarda un USUARIO en MongoDB (colección "usuarios").

// Prop: marca un campo. Schema: marca la clase como esquema. SchemaFactory: la convierte en esquema real.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// HydratedDocument: tipo de un documento ya guardado (con _id, save(), etc.).
import { HydratedDocument } from 'mongoose';
import { ROLES } from '../../../comun/constantes.js';

export type UsuarioDocumento = HydratedDocument<Usuario>;

// collection: nombre exacto de la colección. timestamps: agrega createdAt y updatedAt solos.
@Schema({ collection: 'usuarios', timestamps: true })
export class Usuario {
  @Prop({ required: true, trim: true }) // trim: quita espacios al inicio y al final
  nombre: string;

  // unique: no se repiten correos. lowercase: lo guarda en minúsculas.
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  correo: string;

  // select: false → este campo NUNCA se devuelve en las consultas, salvo que se pida explícitamente.
  @Prop({ required: true, select: false })
  contrasenaHash: string;

  // roles: ARREGLO de textos; enum valida que cada uno exista en ROLES. Un usuario puede tener varios.
  @Prop({ type: [String], enum: ROLES, required: true })
  roles: string[];

  @Prop({ trim: true }) cargo?: string; // "Jefa de bodega", "Cajera tienda Machala"
  @Prop({ trim: true }) telefono?: string;

  @Prop({ default: true })
  activo: boolean;
}

export const UsuarioEsquema = SchemaFactory.createForClass(Usuario);
