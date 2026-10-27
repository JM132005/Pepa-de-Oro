// crud-base.service.ts → servicio "plantilla" con las 4 operaciones básicas (CRUD) para cualquier colección.
//
// CRUD = Create (crear), Read (leer), Update (actualizar), Delete (borrar).
// Muchas colecciones (haciendas, bodegas, clientes, productores...) necesitan exactamente lo mismo.
// En vez de copiar y pegar ese código 15 veces, cada servicio HEREDA de esta clase:
//
//   export class HaciendasService extends CrudBase<Hacienda> { ... }
//
// y solo escribe lo que es propio de su negocio (reglas, cálculos). Esto se llama HERENCIA
// (programación orientada a objetos) y es un ejemplo del principio DRY: "Don't Repeat Yourself".
//
// <T> es un GENÉRICO: un "hueco" para el tipo. CrudBase<Hacienda> trabaja con haciendas;
// CrudBase<Cliente>, con clientes. El mismo código sirve para todos.

import { NotFoundException } from '@nestjs/common';
import type { Model, PopulateOptions, QueryFilter } from 'mongoose';

export abstract class CrudBase<T> {
  // protected: las clases hijas pueden usar "this.modelo"; desde fuera no se ve.
  // nombre: se usa en los mensajes de error ("Hacienda no encontrada").
  protected constructor(
    protected readonly modelo: Model<T>,
    protected readonly nombre: string,
    // populate: qué referencias rellenar al leer (ej: en una parcela, traer los datos de su hacienda).
    protected readonly relleno: (string | PopulateOptions)[] = [],
    // orden por defecto de los listados (1 = ascendente, -1 = descendente).
    protected readonly orden: Record<string, 1 | -1> = { createdAt: -1 },
  ) {}

  // listar(): todos los documentos que cumplan el filtro. lean() devuelve objetos simples (más rápido).
  listar(filtro: QueryFilter<T> = {}) {
    return this.modelo.find(filtro).sort(this.orden).populate(this.relleno).lean().exec();
  }

  // obtener(): uno por su _id o error 404 si no existe.
  async obtener(id: string) {
    const doc = await this.modelo.findById(id).populate(this.relleno).lean().exec();
    if (!doc) throw new NotFoundException(`${this.nombre} no encontrado(a)`);
    return doc;
  }

  // crear(): guarda un documento nuevo. Las validaciones del esquema (required, enum, min) se aplican aquí.
  async crear(datos: Partial<T> | object) {
    const creado = await this.modelo.create(datos);
    return this.obtener(String(creado._id));
  }

  // actualizar(): cambia solo los campos enviados. runValidators: aplica las reglas del esquema también al editar.
  async actualizar(id: string, cambios: Partial<T> | object) {
    const doc = await this.modelo
      .findByIdAndUpdate(id, cambios, { returnDocument: 'after', runValidators: true })
      .exec();
    if (!doc) throw new NotFoundException(`${this.nombre} no encontrado(a)`);
    return this.obtener(id);
  }

  // eliminar(): borra de verdad. Solo se usa en catálogos sin historia; lo demás se "desactiva".
  async eliminar(id: string) {
    const doc = await this.modelo.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`${this.nombre} no encontrado(a)`);
    return { eliminado: true };
  }
}
