// id-mongo.pipe.ts → PIPE que valida que un :id de la URL sea un ObjectId válido de MongoDB.
// Un "pipe" transforma o valida un dato ANTES de que llegue al controlador.
// Sin esto, un id mal escrito ("abc") provocaría un error 500 en vez de un 400 claro.

import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
// isValidObjectId: función de Mongoose que dice si un texto tiene formato de ObjectId.
import { isValidObjectId } from 'mongoose';

@Injectable()
export class IdMongoPipe implements PipeTransform<string, string> {
  transform(valor: string): string {
    if (!isValidObjectId(valor))
      throw new BadRequestException(`"${valor}" no es un id válido`);
    return valor;
  }
}
