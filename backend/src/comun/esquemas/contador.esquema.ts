// contador.esquema.ts → colección "contadores": guarda el último número usado de cada secuencia.
// Ejemplo de documento: { _id: "FACTURA-001-001", valor: 123 }
// Así la siguiente factura será 001-001-000000124 y NUNCA se repite ni se salta (RN-20).

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// _id: false en las opciones NO se usa aquí: el _id lo ponemos nosotros (texto con el nombre de la secuencia).
@Schema({ collection: 'contadores', versionKey: false })
export class Contador {
  @Prop({ type: String }) // el _id es un texto, no un ObjectId
  _id: string;

  @Prop({ required: true, default: 0 })
  valor: number;
}

export const ContadorEsquema = SchemaFactory.createForClass(Contador);
