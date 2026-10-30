// contenido-web.esquema.ts → colección "contenido_web": textos, banners y testimonios de la página pública.
// El gerente los cambia desde el sistema SIN tocar el código. Cada documento es una sección (clave).

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

@Schema({ collection: 'contenido_web', timestamps: true })
export class ContenidoWeb {
  // inicio, nosotros, servicios, testimonios, contacto
  @Prop({ required: true, unique: true }) clave: string;
  @Prop({ required: true }) titulo: string;
  // Mixed: cada sección tiene su propia forma (lista de banners, párrafos, testimonios...).
  @Prop({ type: SchemaTypes.Mixed, required: true }) datos: Record<string, unknown>;
  @Prop() actualizadoPor?: string;
}

export const ContenidoWebEsquema = SchemaFactory.createForClass(ContenidoWeb);
