// contadores.service.ts → entrega números correlativos sin repetir (facturas, lotes, órdenes...).

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contador } from '../esquemas/contador.esquema.js';

@Injectable()
export class ContadoresService {
  constructor(@InjectModel(Contador.name) private readonly modelo: Model<Contador>) {}

  // siguiente(): suma 1 al contador y devuelve el nuevo valor en UNA sola operación atómica.
  //   $inc     → incrementa el campo "valor" en 1 dentro de MongoDB (no en JavaScript).
  //   upsert   → si el contador no existe todavía, lo crea empezando en 1.
  // Como MongoDB hace el incremento, dos cajeras facturando al mismo segundo reciben números distintos.
  async siguiente(clave: string): Promise<number> {
    const doc = await this.modelo
      .findOneAndUpdate({ _id: clave }, { $inc: { valor: 1 } }, { upsert: true, returnDocument: 'after' })
      .lean()
      .exec();
    return doc!.valor;
  }

  // codigoAnual(): "L-2026-0001" — código de lote de grano que se reinicia cada año.
  async codigoAnual(prefijo: string, digitos = 4, fecha = new Date()): Promise<string> {
    const anio = fecha.getFullYear();
    const n = await this.siguiente(`${prefijo}-${anio}`);
    return `${prefijo}-${anio}-${String(n).padStart(digitos, '0')}`;
  }

  // codigoDiario(): "PT-20261019-03" — código de lote de producto terminado (se reinicia cada día).
  async codigoDiario(prefijo: string, fecha = new Date()): Promise<string> {
    const dia = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;
    const n = await this.siguiente(`${prefijo}-${dia}`);
    return `${prefijo}-${dia}-${String(n).padStart(2, '0')}`;
  }
}
