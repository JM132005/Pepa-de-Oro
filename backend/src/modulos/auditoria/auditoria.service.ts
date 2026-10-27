// auditoria.service.ts → registra y consulta la bitácora de auditoría.

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Auditoria } from './auditoria.esquema.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';

// Campos que JAMÁS deben quedar escritos en la bitácora.
const CAMPOS_SECRETOS = ['contrasena', 'contrasenaHash', 'token', 'password'];

@Injectable()
export class AuditoriaService {
  constructor(@InjectModel(Auditoria.name) private readonly modelo: Model<Auditoria>) {}

  // limpiar(): copia el objeto quitando contraseñas antes de guardarlo.
  private limpiar(valor: unknown): unknown {
    if (!valor || typeof valor !== 'object') return valor;
    // JSON.parse(JSON.stringify()) hace una copia profunda y convierte ObjectId/fechas en texto.
    const copia = JSON.parse(JSON.stringify(valor)) as Record<string, unknown>;
    for (const campo of CAMPOS_SECRETOS) delete copia[campo];
    return copia;
  }

  // registrar(): guarda una línea en la bitácora. Si falla, NO detiene la operación principal.
  async registrar(datos: {
    usuario?: UsuarioToken;
    accion: string;
    entidad?: string;
    entidadId?: string;
    antes?: unknown;
    despues?: unknown;
    sensible?: boolean;
    ip?: string;
  }) {
    try {
      await this.modelo.create({
        usuarioId: datos.usuario?.sub,
        usuarioNombre: datos.usuario?.nombre,
        accion: datos.accion,
        entidad: datos.entidad,
        entidadId: datos.entidadId,
        antes: this.limpiar(datos.antes),
        despues: this.limpiar(datos.despues),
        sensible: datos.sensible ?? false,
        ip: datos.ip,
      });
    } catch {
      // la auditoría es "best effort": nunca debe impedir vender o producir
    }
  }

  // listar(): últimas acciones; con soloSensibles = true muestra solo las del gerente.
  listar(filtro: { soloSensibles?: boolean; entidad?: string; limite?: number }) {
    const q: Record<string, unknown> = {};
    if (filtro.soloSensibles) q.sensible = true;
    if (filtro.entidad) q.entidad = filtro.entidad;
    return this.modelo.find(q).sort({ fecha: -1 }).limit(filtro.limite ?? 200).lean().exec();
  }
}
