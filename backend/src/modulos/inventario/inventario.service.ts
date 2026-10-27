// inventario.service.ts → el ÚNICO lugar del sistema que cambia el stock.
// Ventas, producción, acopio, campo y mantenimiento llaman a entrada() o salida() y este servicio:
//   1. aplica las reglas (RN-12 stock nunca negativo, RN-13 FEFO, RN-14 vencidos, RN-15 ajustes),
//   2. cambia la cantidad del lote con una operación ATÓMICA,
//   3. recalcula el costo promedio y
//   4. deja el movimiento en el kardex.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Producto } from '../productos/esquemas/producto.esquema.js';
import { Bodega } from './esquemas/bodega.esquema.js';
import { LoteProducto } from './esquemas/lote-producto.esquema.js';
import { Movimiento } from './esquemas/movimiento.esquema.js';
import { asignarSalida, costoPromedio, esVendible, estadoStock, tramoVencimiento, verificarAjuste, disponible, TOLERANCIA, type LoteStock } from './inventario.reglas.js';
import { redondear, sumarDias } from '../../comun/utilidades.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { TipoMovimiento } from '../../comun/constantes.js';

// Documento que justifica un movimiento (factura, orden, liquidación...).
export interface DocumentoOrigen {
  tipo: string;
  numero?: string;
  id?: string;
}

export interface DatosEntrada {
  productoId: string;
  bodegaId: string;
  cantidad: number;
  costoUnitario: number;
  tipo: TipoMovimiento;
  codigoLote?: string; // si no se envía se genera uno
  vencimiento?: Date;
  fechaElaboracion?: Date;
  liberado?: boolean;
  grado?: string;
  origen?: { tipo?: string; loteGrano?: string; ordenProduccion?: string };
  documento?: DocumentoOrigen;
  usuario?: string;
  motivo?: string;
}

export interface DatosSalida {
  productoId: string;
  cantidad: number;
  tipo: TipoMovimiento;
  bodegaId?: string; // si no se envía, busca en todas (en el orden de bodegasPreferidas)
  bodegasPreferidas?: string[]; // tipos de bodega en orden de preferencia, ej: ['TIENDA', 'PRODUCTO_TERMINADO']
  soloVendibles?: boolean; // ventas: solo lotes liberados y sin vencer
  usarReservado?: boolean; // al despachar un pedido se usa lo que ya estaba reservado
  asignacion?: { loteId: string; cantidad: number }[]; // lotes exactos (pedido reservado, orden de producción)
  documento?: DocumentoOrigen;
  usuario?: string;
  motivo?: string;
}

// Lo que devuelve una salida: de qué lote salió y a qué costo (sirve para costear la venta o la producción).
export interface LineaSalida {
  loteId: string;
  codigo: string;
  bodegaId: string;
  cantidad: number;
  costoUnitario: number;
  vencimiento?: Date;
  loteGrano?: string;
  grado?: string;
}

@Injectable()
export class InventarioService {
  constructor(
    @InjectModel(Producto.name) private readonly productos: Model<Producto>,
    @InjectModel(Bodega.name) private readonly bodegas: Model<Bodega>,
    @InjectModel(LoteProducto.name) private readonly lotes: Model<LoteProducto>,
    @InjectModel(Movimiento.name) private readonly movimientos: Model<Movimiento>,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ─────────────────────────── Consultas de apoyo ───────────────────────────

  // bodegaPorTipo(): la primera bodega activa de un tipo (MATERIA_PRIMA, TIENDA...).
  async bodegaPorTipo(tipo: string) {
    const b = await this.bodegas.findOne({ tipo, activa: true }).lean().exec();
    if (!b) throw new NotFoundException(`No hay una bodega activa de tipo ${tipo}`);
    return b;
  }

  // stockTotal(): suma de la cantidad física de todos los lotes de un producto.
  private async stockTotal(productoId: string): Promise<number> {
    const lotes = await this.lotes.find({ producto: productoId }).select('cantidad').lean().exec();
    return redondear(lotes.reduce((s, l) => s + l.cantidad, 0), 3);
  }

  // registrarMovimiento(): agrega una línea al kardex con el saldo resultante.
  private async registrarMovimiento(m: Omit<Movimiento, 'saldoProducto'>) {
    const saldoProducto = await this.stockTotal(String(m.producto));
    await this.movimientos.create({ ...m, saldoProducto });
  }

  // ─────────────────────────── ENTRADAS ───────────────────────────

  // entrada(): suma stock a un lote (lo crea si no existe) y recalcula el costo promedio del producto.
  async entrada(d: DatosEntrada) {
    if (d.cantidad <= 0) throw new BadRequestException('La cantidad de entrada debe ser mayor que cero');
    const producto = await this.productos.findById(d.productoId).exec();
    if (!producto) throw new NotFoundException('Producto no encontrado');
    const stockAntes = await this.stockTotal(d.productoId);
    const codigo = (d.codigoLote ?? `${producto.sku}-${Date.now().toString(36)}`).toUpperCase();
    // Vencimiento automático con la vida útil del producto (si no lo trae).
    const vencimiento =
      d.vencimiento ?? (producto.vidaUtilDias > 0 ? sumarDias(d.fechaElaboracion ?? new Date(), producto.vidaUtilDias) : undefined);

    // findOneAndUpdate con upsert: si el lote ya existe en esa bodega suma ($inc); si no, lo crea ($setOnInsert).
    const lote = await this.lotes
      .findOneAndUpdate(
        { producto: d.productoId, bodega: d.bodegaId, codigo },
        {
          $inc: { cantidad: d.cantidad },
          $set: { costoUnitario: d.costoUnitario },
          $setOnInsert: {
            fechaElaboracion: d.fechaElaboracion ?? new Date(),
            vencimiento,
            liberado: d.liberado ?? true,
            grado: d.grado,
            origen: d.origen ?? { tipo: d.tipo },
            reservado: 0,
            bloqueado: false,
          },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
    await this.normalizar(String(lote._id));

    // Costo promedio ponderado (se guarda en el producto).
    producto.costoPromedio = costoPromedio(stockAntes, producto.costoPromedio, d.cantidad, d.costoUnitario);
    await producto.save();

    await this.registrarMovimiento({
      tipo: d.tipo,
      producto: d.productoId,
      bodega: d.bodegaId,
      lote: String(lote!._id),
      codigoLote: codigo,
      cantidad: d.cantidad,
      signo: 1,
      costoUnitario: d.costoUnitario,
      documento: d.documento,
      usuario: d.usuario,
      motivo: d.motivo,
    });
    return lote!.toObject();
  }

  // ─────────────────────────── SALIDAS ───────────────────────────

  // lotesCandidatos(): lotes con stock de un producto, en las bodegas permitidas.
  private async lotesCandidatos(productoId: string, bodegaId?: string, bodegasPreferidas?: string[]) {
    const filtro: Record<string, unknown> = { producto: productoId, cantidad: { $gt: 0 } };
    if (bodegaId) filtro.bodega = bodegaId;
    const lotes = await this.lotes.find(filtro).populate('bodega').lean().exec();
    if (!bodegasPreferidas?.length) return lotes;
    // Ordena: primero las bodegas del tipo más preferido (ej: en la caja, primero TIENDA).
    const rango = (l: (typeof lotes)[number]) => {
      const tipo = (l.bodega as unknown as Bodega).tipo;
      const i = bodegasPreferidas.indexOf(tipo);
      return i === -1 ? 99 : i;
    };
    return lotes.filter((l) => rango(l) < 99).sort((a, b) => rango(a) - rango(b));
  }

  // salida(): saca stock aplicando FEFO. Si algo falla a la mitad, DEVUELVE lo que ya había sacado
  // (compensación), así nunca queda una venta "a medias".
  async salida(d: DatosSalida): Promise<LineaSalida[]> {
    if (d.cantidad <= 0) throw new BadRequestException('La cantidad de salida debe ser mayor que cero');
    let plan: { loteId: string; cantidad: number }[];
    const lotes = await this.lotesCandidatos(d.productoId, d.bodegaId, d.bodegasPreferidas);
    if (d.asignacion?.length) {
      plan = d.asignacion;
    } else {
      // Si hay bodegas preferidas se intenta en orden: primero toda la cantidad desde la bodega preferida.
      const comoStock: LoteStock[] = lotes.map((l) => ({
        _id: String(l._id),
        codigo: l.codigo,
        cantidad: l.cantidad,
        reservado: l.reservado,
        vencimiento: l.vencimiento,
        liberado: l.liberado,
        bloqueado: l.bloqueado,
      }));
      try {
        plan = asignarSalida(comoStock, d.cantidad, { soloVendibles: d.soloVendibles, usarReservado: d.usarReservado });
      } catch (e) {
        const producto = await this.productos.findById(d.productoId).select('nombre').lean().exec();
        throw new BadRequestException(`${producto?.nombre ?? 'Producto'}: ${(e as Error).message}`);
      }
    }

    const hechos: LineaSalida[] = [];
    try {
      for (const p of plan) {
        // ATÓMICO: "resta X SOLO SI la cantidad es >= X". Si otra caja vendió justo antes, no resta y falla.
        // TOLERANCIA: las sumas con decimales dejan restos (47,99999999999996 en vez de 48); se acepta esa diferencia mínima.
        const condicion: Record<string, unknown> = { _id: p.loteId, cantidad: { $gte: p.cantidad - TOLERANCIA } };
        const cambio: Record<string, number> = { cantidad: -p.cantidad };
        if (d.usarReservado) cambio.reservado = -p.cantidad;
        const lote = await this.lotes.findOneAndUpdate(condicion, { $inc: cambio }, { returnDocument: 'after' }).exec();
        if (!lote) throw new BadRequestException('RN-12: el stock cambió mientras se procesaba; vuelve a intentar');
        await this.normalizar(String(lote._id));
        hechos.push({
          loteId: String(lote._id),
          codigo: lote.codigo,
          bodegaId: String(lote.bodega),
          cantidad: p.cantidad,
          costoUnitario: lote.costoUnitario,
          vencimiento: lote.vencimiento,
          loteGrano: lote.origen?.loteGrano ? String(lote.origen.loteGrano) : undefined,
          grado: lote.grado,
        });
      }
    } catch (error) {
      // Compensación: se devuelve lo que alcanzó a salir.
      for (const h of hechos) {
        const inc: Record<string, number> = { cantidad: h.cantidad };
        if (d.usarReservado) inc.reservado = h.cantidad;
        await this.lotes.updateOne({ _id: h.loteId }, { $inc: inc }).exec();
        await this.normalizar(h.loteId);
      }
      throw error;
    }

    for (const h of hechos) {
      await this.registrarMovimiento({
        tipo: d.tipo,
        producto: d.productoId,
        bodega: h.bodegaId,
        lote: h.loteId,
        codigoLote: h.codigo,
        cantidad: h.cantidad,
        signo: -1,
        costoUnitario: h.costoUnitario,
        documento: d.documento,
        usuario: d.usuario,
        motivo: d.motivo,
      });
    }
    return hechos;
  }

  // ─────────────────────────── RESERVAS ───────────────────────────

  // reservar(): aparta stock para un pedido confirmado o una orden de producción.
  // La web muestra el DISPONIBLE (físico − reservado), así no se ofrece lo que ya está comprometido.
  async reservar(productoId: string, cantidad: number, opciones: { soloVendibles?: boolean; bodegasPreferidas?: string[] } = {}) {
    const lotes = await this.lotesCandidatos(productoId, undefined, opciones.bodegasPreferidas);
    const comoStock: LoteStock[] = lotes.map((l) => ({
      _id: String(l._id),
      codigo: l.codigo,
      cantidad: l.cantidad,
      reservado: l.reservado,
      vencimiento: l.vencimiento,
      liberado: l.liberado,
      bloqueado: l.bloqueado,
    }));
    let plan;
    try {
      plan = asignarSalida(comoStock, cantidad, { soloVendibles: opciones.soloVendibles ?? true });
    } catch (e) {
      const producto = await this.productos.findById(productoId).select('nombre').lean().exec();
      throw new BadRequestException(`${producto?.nombre ?? 'Producto'}: ${(e as Error).message}`);
    }
    const hechas: { loteId: string; codigo: string; cantidad: number; costoUnitario: number }[] = [];
    for (const p of plan) {
      // Concurrencia optimista: se reserva SOLO SI el lote sigue como lo leímos (mismo "reservado")
      // y la cantidad física alcanza. Si otro usuario reservó justo antes, no coincide y se avisa.
      const leido = lotes.find((l) => String(l._id) === p.loteId)!;
      const lote = await this.lotes
        .findOneAndUpdate(
          { _id: p.loteId, reservado: leido.reservado ?? 0, cantidad: { $gte: (leido.reservado ?? 0) + p.cantidad - TOLERANCIA } },
          { $inc: { reservado: p.cantidad } },
          { returnDocument: 'after' },
        )
        .exec();
      if (!lote) {
        await this.liberarReserva(hechas);
        throw new BadRequestException('RN-12: el stock cambió mientras se reservaba; vuelve a intentar');
      }
      hechas.push({ loteId: p.loteId, codigo: p.codigo, cantidad: p.cantidad, costoUnitario: lote.costoUnitario });
    }
    return hechas;
  }

  // normalizar(): después de sumar o restar decimales, deja "cantidad" y "reservado" redondeados a 3 decimales
  // y nunca negativos. Evita que se acumulen restos como 47,99999999999996 (error normal del punto flotante).
  // Usa una actualización con "pipeline" ([{ $set: ... }]) para que MongoDB calcule el redondeo ($round) él mismo.
  private async normalizar(loteId: string) {
    await this.lotes.collection.updateOne({ _id: new Types.ObjectId(loteId) }, [
      { $set: { cantidad: { $max: [0, { $round: ['$cantidad', 3] }] }, reservado: { $max: [0, { $round: [{ $ifNull: ['$reservado', 0] }, 3] }] } } },
    ]);
  }

  // liberarReserva(): devuelve lo reservado (pedido anulado, orden cancelada).
  async liberarReserva(reservas: { loteId: string; cantidad: number }[]) {
    for (const r of reservas) {
      await this.lotes.updateOne({ _id: r.loteId }, { $inc: { reservado: -r.cantidad } }).exec();
      await this.normalizar(r.loteId);
    }
  }

  // ─────────────────────────── TRANSFERENCIAS Y AJUSTES ───────────────────────────

  // transferir(): mueve parte de un lote a otra bodega (ej: de producto terminado a la tienda).
  async transferir(loteId: string, bodegaDestinoId: string, cantidad: number, usuario: UsuarioToken) {
    const lote = await this.lotes.findById(loteId).lean().exec();
    if (!lote) throw new NotFoundException('Lote no encontrado');
    if (String(lote.bodega) === bodegaDestinoId) throw new BadRequestException('La bodega de destino es la misma');
    const documento = { tipo: 'TRANSFERENCIA', numero: `${lote.codigo}` };
    await this.salida({ productoId: String(lote.producto), cantidad, tipo: 'TRANSFERENCIA', asignacion: [{ loteId, cantidad }], documento, usuario: usuario.nombre });
    return this.entrada({
      productoId: String(lote.producto),
      bodegaId: bodegaDestinoId,
      cantidad,
      costoUnitario: lote.costoUnitario,
      tipo: 'TRANSFERENCIA',
      codigoLote: lote.codigo,
      vencimiento: lote.vencimiento,
      fechaElaboracion: lote.fechaElaboracion,
      liberado: lote.liberado,
      grado: lote.grado,
      origen: lote.origen,
      documento,
      usuario: usuario.nombre,
    });
  }

  // ajustar(): conteo físico o merma. RN-15: exige motivo y que lo haga el gerente. Queda en la auditoría.
  async ajustar(loteId: string, cantidadContada: number, motivo: string, usuario: UsuarioToken) {
    const error = verificarAjuste(motivo, usuario.roles.includes('GERENTE'));
    if (error) throw new BadRequestException(error);
    const lote = await this.lotes.findById(loteId).lean().exec();
    if (!lote) throw new NotFoundException('Lote no encontrado');
    const diferencia = redondear(cantidadContada - lote.cantidad, 3);
    if (diferencia === 0) return { sinCambios: true };
    const documento = { tipo: 'AJUSTE', numero: lote.codigo };
    if (diferencia > 0) {
      await this.entrada({ productoId: String(lote.producto), bodegaId: String(lote.bodega), cantidad: diferencia, costoUnitario: lote.costoUnitario, tipo: 'ENTRADA_AJUSTE', codigoLote: lote.codigo, documento, usuario: usuario.nombre, motivo });
    } else {
      await this.salida({ productoId: String(lote.producto), cantidad: -diferencia, tipo: 'SALIDA_AJUSTE', asignacion: [{ loteId, cantidad: -diferencia }], documento, usuario: usuario.nombre, motivo });
    }
    await this.auditoria.registrar({ usuario, accion: 'AJUSTE_INVENTARIO', entidad: 'lotes_producto', entidadId: loteId, antes: { cantidad: lote.cantidad }, despues: { cantidad: cantidadContada, motivo }, sensible: true });
    return { diferencia };
  }

  // darDeBaja(): producto vencido o dañado (sale todo el lote con motivo).
  async darDeBaja(loteId: string, motivo: string, usuario: UsuarioToken) {
    const lote = await this.lotes.findById(loteId).lean().exec();
    if (!lote || lote.cantidad <= 0) throw new NotFoundException('Lote sin stock');
    const error = verificarAjuste(motivo, usuario.roles.includes('GERENTE'));
    if (error) throw new BadRequestException(error);
    await this.salida({ productoId: String(lote.producto), cantidad: lote.cantidad, tipo: 'BAJA_VENCIMIENTO', asignacion: [{ loteId, cantidad: lote.cantidad }], documento: { tipo: 'BAJA', numero: lote.codigo }, usuario: usuario.nombre, motivo });
    await this.auditoria.registrar({ usuario, accion: 'BAJA_INVENTARIO', entidad: 'lotes_producto', entidadId: loteId, antes: { cantidad: lote.cantidad }, despues: { cantidad: 0, motivo }, sensible: true });
    return { baja: lote.cantidad };
  }

  // bloquear(): Calidad bloquea un lote (no conformidad) o lo libera (RN-11).
  async cambiarLiberacion(loteId: string, cambios: { liberado?: boolean; bloqueado?: boolean; motivoBloqueo?: string; controlCalidad?: unknown }) {
    const lote = await this.lotes.findByIdAndUpdate(loteId, { $set: cambios }, { returnDocument: 'after' }).populate('producto').lean().exec();
    if (!lote) throw new NotFoundException('Lote no encontrado');
    return lote;
  }

  // ─────────────────────────── REPORTES DE STOCK ───────────────────────────

  // resumenStock(): por producto → físico, reservado, disponible para vender, valor y estado para la web.
  async resumenStock(filtro: { productoIds?: string[]; soloPublicados?: boolean } = {}) {
    const qProd: Record<string, unknown> = { activo: true };
    if (filtro.productoIds) qProd._id = { $in: filtro.productoIds.map((id) => new Types.ObjectId(id)) };
    if (filtro.soloPublicados) qProd.publicado = true;
    const productos = await this.productos.find(qProd).lean().exec();
    const lotes = await this.lotes
      .find({ producto: { $in: productos.map((p) => String(p._id)) }, cantidad: { $gt: 0 } })
      .populate('bodega', 'codigo nombre tipo')
      .lean()
      .exec();
    const hoy = new Date();
    return productos.map((p) => {
      const propios = lotes.filter((l) => String(l.producto) === String(p._id));
      const fisico = redondear(propios.reduce((s, l) => s + l.cantidad, 0), 3);
      const reservado = redondear(propios.reduce((s, l) => s + (l.reservado ?? 0), 0), 3);
      const vendible = redondear(
        propios
          .filter((l) => esVendible({ ...l, _id: String(l._id) } as LoteStock, hoy))
          .reduce((s, l) => s + disponible({ ...l, _id: String(l._id) } as LoteStock), 0),
        3,
      );
      return {
        productoId: String(p._id),
        sku: p.sku,
        nombre: p.nombre,
        familia: p.familia,
        tipo: p.tipo,
        unidad: p.unidad,
        stockMinimo: p.stockMinimo,
        costoPromedio: p.costoPromedio,
        fisico,
        reservado,
        disponible: vendible,
        valor: redondear(fisico * p.costoPromedio),
        estado: estadoStock(vendible, p.stockMinimo, p.proximamente),
        porBodega: propios.reduce<Record<string, number>>((acc, l) => {
          const b = (l.bodega as unknown as Bodega)?.codigo ?? '—';
          acc[b] = redondear((acc[b] ?? 0) + l.cantidad, 3);
          return acc;
        }, {}),
      };
    });
  }

  // lotesDeProducto(): detalle de lotes de un producto (para la ficha y para elegir de qué lote vender).
  lotesDeProducto(productoId: string) {
    return this.lotes.find({ producto: productoId, cantidad: { $gt: 0 } }).populate('bodega', 'codigo nombre tipo').sort({ vencimiento: 1 }).lean().exec();
  }

  // listarLotes(): todos los lotes con stock, con filtros (bodega, pendientes de calidad, bloqueados).
  listarLotes(filtro: { bodega?: string; pendientesCalidad?: boolean; bloqueados?: boolean; producto?: string }) {
    const q: Record<string, unknown> = { cantidad: { $gt: 0 } };
    if (filtro.bodega) q.bodega = filtro.bodega;
    if (filtro.producto) q.producto = filtro.producto;
    if (filtro.pendientesCalidad) q.liberado = false;
    if (filtro.bloqueados) q.bloqueado = true;
    return this.lotes.find(q).populate('producto', 'sku nombre unidad tipo familia pesoNetoG').populate('bodega', 'codigo nombre tipo').sort({ vencimiento: 1 }).lean().exec();
  }

  // kardex(): movimientos de un producto entre dos fechas, del más antiguo al más nuevo.
  kardex(productoId: string, desde?: Date, hasta?: Date) {
    const q: Record<string, unknown> = { producto: productoId };
    if (desde || hasta) q.fecha = { ...(desde ? { $gte: desde } : {}), ...(hasta ? { $lte: hasta } : {}) };
    return this.movimientos.find(q).populate('bodega', 'codigo nombre').sort({ fecha: 1 }).lean().exec();
  }

  // movimientosRecientes(): últimos movimientos de todo el inventario.
  movimientosRecientes(limite = 100) {
    return this.movimientos.find().populate('producto', 'sku nombre unidad').populate('bodega', 'codigo').sort({ fecha: -1 }).limit(limite).lean().exec();
  }

  // porVencer(): lotes con vencimiento en 30/60/90 días o ya vencidos.
  async porVencer() {
    const lotes = await this.lotes.find({ cantidad: { $gt: 0 }, vencimiento: { $ne: null } }).populate('producto', 'sku nombre unidad').populate('bodega', 'codigo').sort({ vencimiento: 1 }).lean().exec();
    return lotes.map((l) => ({ ...l, tramo: tramoVencimiento(l.vencimiento) })).filter((l) => l.tramo !== null);
  }

  // bajoMinimo(): productos cuyo disponible está en o bajo el stock mínimo.
  async bajoMinimo() {
    const resumen = await this.resumenStock();
    return resumen.filter((r) => r.stockMinimo > 0 && r.disponible <= r.stockMinimo);
  }

  // valorizado(): valor del inventario por bodega y por familia (stock × costo).
  async valorizado() {
    const lotes = await this.lotes.find({ cantidad: { $gt: 0 } }).populate('producto', 'familia nombre costoPromedio').populate('bodega', 'codigo nombre').lean().exec();
    const porBodega: Record<string, number> = {};
    const porFamilia: Record<string, number> = {};
    let total = 0;
    for (const l of lotes) {
      const p = l.producto as unknown as Producto;
      const valor = l.cantidad * (l.costoUnitario || p.costoPromedio || 0);
      const b = (l.bodega as unknown as Bodega).nombre;
      porBodega[b] = redondear((porBodega[b] ?? 0) + valor);
      porFamilia[p.familia] = redondear((porFamilia[p.familia] ?? 0) + valor);
      total += valor;
    }
    return { total: redondear(total), porBodega, porFamilia };
  }

  listarBodegas() {
    return this.bodegas.find().sort({ codigo: 1 }).lean().exec();
  }

  crearBodega(datos: Partial<Bodega>) {
    return this.bodegas.create(datos);
  }

  async actualizarBodega(id: string, datos: Partial<Bodega>) {
    const b = await this.bodegas.findByIdAndUpdate(id, datos, { returnDocument: 'after' }).lean().exec();
    if (!b) throw new NotFoundException('Bodega no encontrada');
    return b;
  }
}
