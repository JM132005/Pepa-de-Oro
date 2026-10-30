// catalogos.service.ts → CRUD sencillos del campo. Cada clase HEREDA de CrudBase (crear, listar,
// obtener, actualizar) y solo indica su modelo, su nombre, qué referencias rellenar y el orden.

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrudBase } from '../../comun/crud-base.service.js';
import { Hacienda } from './esquemas/hacienda.esquema.js';
import { Parcela } from './esquemas/parcela.esquema.js';
import { Trabajador } from './esquemas/trabajador.esquema.js';
import { VARIEDADES_POR_CULTIVO, type Cultivo, type Variedad } from '../../comun/constantes.js';
import { validarCedula } from '../../comun/identificacion.reglas.js';

@Injectable()
export class HaciendasService extends CrudBase<Hacienda> {
  constructor(@InjectModel(Hacienda.name) modelo: Model<Hacienda>) {
    super(modelo, 'Hacienda', [], { codigo: 1 });
  }
}

@Injectable()
export class ParcelasService extends CrudBase<Parcela> {
  constructor(@InjectModel(Parcela.name) modelo: Model<Parcela>) {
    super(modelo, 'Parcela', [{ path: 'hacienda', select: 'nombre codigo' }], { codigo: 1 });
  }

  // validar(): la variedad debe ser del cultivo (no existe "café CCN-51") y se calcula el número de plantas.
  preparar<T extends { cultivo?: string; variedad?: string; hectareas?: number; densidad?: number; plantas?: number }>(dto: T): T {
    if (dto.cultivo && dto.variedad && !VARIEDADES_POR_CULTIVO[dto.cultivo as Cultivo].includes(dto.variedad as Variedad)) {
      throw new BadRequestException(`${dto.variedad} no es una variedad de ${dto.cultivo}`);
    }
    if (dto.hectareas && !dto.plantas) dto.plantas = Math.round(dto.hectareas * (dto.densidad ?? 1100));
    return dto;
  }
}

@Injectable()
export class TrabajadoresService extends CrudBase<Trabajador> {
  constructor(@InjectModel(Trabajador.name) modelo: Model<Trabajador>) {
    super(modelo, 'Trabajador', [{ path: 'hacienda', select: 'nombre' }], { nombre: 1 });
  }

  validar(cedula?: string) {
    if (cedula && !validarCedula(cedula)) throw new BadRequestException(`RN-02: la cédula ${cedula} no es válida`);
  }
}
