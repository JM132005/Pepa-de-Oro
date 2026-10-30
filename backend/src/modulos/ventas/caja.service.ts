// caja.service.ts → turnos de caja de la tienda (apertura, ventas, cierre con diferencia).

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TurnoCaja } from './esquemas/turno-caja.esquema.js';
import { cierreCaja } from './ventas.reglas.js';
import { redondear } from '../../comun/utilidades.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';

@Injectable()
export class CajaService {
  constructor(@InjectModel(TurnoCaja.name) private readonly modelo: Model<TurnoCaja>) {}

  // actual(): el turno ABIERTO del cajero (o null).
  actual(usuario: UsuarioToken) {
    return this.modelo.findOne({ cajero: usuario.sub, estado: 'ABIERTO' }).lean().exec();
  }

  async abrir(montoInicial: number, usuario: UsuarioToken) {
    if (await this.actual(usuario)) throw new BadRequestException('Ya tienes un turno de caja abierto');
    return this.modelo.create({ cajero: usuario.sub, cajeroNombre: usuario.nombre, montoInicial });
  }

  // registrarVenta(): suma la venta al turno (lo llama facturación en cada venta de mostrador).
  async registrarVenta(turnoId: string, pagos: { codigo: string; monto: number }[]) {
    const inc: Record<string, number> = { numeroVentas: 1 };
    // "ventasPorFormaPago.01" → ruta con punto para incrementar una clave dentro del objeto.
    for (const p of pagos) inc[`ventasPorFormaPago.${p.codigo}`] = p.monto;
    await this.modelo.updateOne({ _id: turnoId }, { $inc: inc }).exec();
  }

  // cerrar(): compara el efectivo contado con el esperado (inicial + ventas en efectivo).
  async cerrar(contado: number, observaciones: string | undefined, usuario: UsuarioToken) {
    const turno = await this.actual(usuario);
    if (!turno) throw new NotFoundException('No tienes un turno de caja abierto');
    const efectivo = redondear(turno.ventasPorFormaPago?.['01'] ?? 0);
    const r = cierreCaja(turno.montoInicial, efectivo, contado);
    return this.modelo
      .findByIdAndUpdate(turno._id, { $set: { estado: 'CERRADO', cierre: new Date(), contado: r.contado, esperado: r.esperado, diferencia: r.diferencia, observaciones } }, { returnDocument: 'after' })
      .lean()
      .exec();
  }

  historial() {
    return this.modelo.find().sort({ apertura: -1 }).limit(60).lean().exec();
  }
}
