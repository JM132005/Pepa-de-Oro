// configuracion.service.ts → lee y actualiza la configuración de la empresa.
// Guarda una copia en memoria (caché) durante 30 s para no consultar la base en cada factura.

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Configuracion } from './configuracion.esquema.js';
import { CONFIGURACION_INICIAL } from './configuracion.valores.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';

@Injectable()
export class ConfiguracionService {
  private cache?: { valor: Configuracion; hasta: number };

  constructor(
    @InjectModel(Configuracion.name) private readonly modelo: Model<Configuracion>,
    private readonly auditoria: AuditoriaService,
  ) {}

  // obtener(): devuelve la configuración; si no existe todavía, crea la inicial.
  async obtener(): Promise<Configuracion> {
    if (this.cache && this.cache.hasta > Date.now()) return this.cache.valor;
    let doc = await this.modelo.findById('principal').lean<Configuracion>().exec();
    if (!doc) {
      await this.modelo.create(CONFIGURACION_INICIAL);
      doc = CONFIGURACION_INICIAL;
    }
    this.cache = { valor: doc, hasta: Date.now() + 30_000 };
    return doc;
  }

  // actualizar(): solo el gerente. Reemplaza las secciones enviadas y deja todo en la auditoría.
  async actualizar(cambios: Partial<Configuracion>, usuario: UsuarioToken) {
    const antes = await this.obtener();
    // $set con cada sección enviada: { "empresa": {...}, "ventas": {...} }
    const set: Record<string, unknown> = {};
    for (const seccion of ['empresa', 'iva', 'calidad', 'ventas', 'acopio', 'alertas'] as const) {
      if (cambios[seccion]) set[seccion] = { ...(antes[seccion] as object), ...(cambios[seccion] as object) };
    }
    await this.modelo.updateOne({ _id: 'principal' }, { $set: set }, { upsert: true }).exec();
    this.cache = undefined; // se borra la caché para leer los valores nuevos
    const despues = await this.obtener();
    await this.auditoria.registrar({ usuario, accion: 'CAMBIAR_CONFIGURACION', entidad: 'configuracion', antes, despues, sensible: true });
    return despues;
  }

  // empresa(): atajo para los PDF y correos.
  async empresa() {
    return (await this.obtener()).empresa;
  }
}
