// pedidos.service.ts → venta por mayor y exportación: pedido confirmado con stock RESERVADO.
// Flujo: CONFIRMADO (reserva) → PREPARANDO (bodega arma) → DESPACHADO (logística entrega) → FACTURADO.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pedido } from './esquemas/pedido.esquema.js';
import { Cliente } from './esquemas/cliente.esquema.js';
import { LineasService } from './lineas.service.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { ContadoresService } from '../../comun/servicios/contadores.service.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { CrearPedidoDto } from './dto/ventas.dto.js';
import type { ItemVenta, Totales } from '../../comun/esquemas/item-venta.esquema.js';

@Injectable()
export class PedidosService {
  constructor(
    @InjectModel(Pedido.name) private readonly modelo: Model<Pedido>,
    @InjectModel(Cliente.name) private readonly clientes: Model<Cliente>,
    private readonly lineas: LineasService,
    private readonly inventario: InventarioService,
    private readonly contadores: ContadoresService,
  ) {}

  listar(estado?: string) {
    const q = estado ? { estado: { $in: estado.split(',') } } : {};
    return this.modelo.find(q).populate('cliente', 'nombre identificacion tipoCliente').sort({ fecha: -1 }).lean().exec();
  }

  async obtener(id: string) {
    const p = await this.modelo.findById(id).populate('cliente').populate('factura', 'numero total').populate('viaje', 'codigo estado').lean().exec();
    if (!p) throw new NotFoundException('Pedido no encontrado');
    return p;
  }

  // crear(): pedido directo (sin cotización).
  async crear(dto: CrearPedidoDto, usuario: UsuarioToken) {
    const cliente = await this.clientes.findById(dto.cliente).lean().exec();
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    const canal = dto.canal ?? (cliente.tipoCliente === 'EXPORTADOR' ? 'EXPORTACION' : 'MAYORISTA');
    const { items, totales } = await this.lineas.armar(dto.items, cliente.tipoCliente, usuario, canal);
    return this.crearDesdeLineas(
      {
        cliente: dto.cliente,
        canal,
        items,
        totales,
        creditoDias: dto.creditoDias ?? 0,
        entrega: dto.entrega ? { ...dto.entrega, fechaEstimada: dto.entrega.fechaEstimada ? new Date(dto.entrega.fechaEstimada) : undefined } : undefined,
        exportacion: dto.exportacion,
        observaciones: dto.observaciones,
      },
      usuario,
    );
  }

  // crearDesdeLineas(): reserva cada producto (FEFO) y guarda el pedido. Si una reserva falla,
  // se liberan las anteriores para no dejar stock "secuestrado".
  async crearDesdeLineas(
    d: { cliente: string; canal: string; items: ItemVenta[]; totales: Totales; creditoDias: number; entrega?: Pedido['entrega']; exportacion?: Pedido['exportacion']; cotizacion?: string; observaciones?: string },
    usuario: UsuarioToken,
  ) {
    const reservadas: { loteId: string; cantidad: number }[] = [];
    const items: ItemVenta[] = [];
    try {
      for (const item of d.items) {
        if (item.tipo !== 'PRODUCTO') {
          items.push(item);
          continue;
        }
        // Exportación y mayoristas salen de producto terminado o materia prima, no de la tienda.
        const lotes = await this.inventario.reservar(String(item.refId), item.cantidad, { bodegasPreferidas: ['PRODUCTO_TERMINADO', 'MATERIA_PRIMA', 'TIENDA'] });
        reservadas.push(...lotes);
        items.push({ ...item, lotes: lotes.map((l) => ({ loteId: l.loteId, codigo: l.codigo, cantidad: l.cantidad })) });
      }
    } catch (error) {
      await this.inventario.liberarReserva(reservadas);
      throw error;
    }
    return this.modelo.create({
      numero: await this.contadores.codigoAnual('PED'),
      cliente: d.cliente,
      cotizacion: d.cotizacion,
      canal: d.canal,
      items,
      totales: d.totales,
      creditoDias: d.creditoDias,
      entrega: d.entrega,
      exportacion: d.canal === 'EXPORTACION' ? { incoterm: 'FOB', puertoOrigen: 'Puerto Bolívar', ...d.exportacion } : undefined,
      vendedor: { id: usuario.sub, nombre: usuario.nombre },
      observaciones: d.observaciones,
    });
  }

  // cambiarEstado(): bodega marca PREPARANDO; logística, DESPACHADO.
  async cambiarEstado(id: string, estado: 'PREPARANDO' | 'DESPACHADO', usuario: UsuarioToken) {
    const permitido: Record<string, string> = { PREPARANDO: 'CONFIRMADO', DESPACHADO: 'PREPARANDO' };
    const p = await this.modelo
      .findOneAndUpdate({ _id: id, estado: permitido[estado] }, { $set: { estado, ...(estado === 'PREPARANDO' ? { preparadoPor: usuario.nombre } : {}) } }, { returnDocument: 'after' })
      .lean()
      .exec();
    if (!p) throw new BadRequestException(`Solo un pedido ${permitido[estado]} puede pasar a ${estado}`);
    return p;
  }

  // anular(): libera las reservas. Un pedido facturado no se anula aquí (se hace nota de crédito).
  async anular(id: string) {
    const p = await this.modelo.findById(id).lean().exec();
    if (!p) throw new NotFoundException('Pedido no encontrado');
    if (['FACTURADO', 'ANULADO'].includes(p.estado)) throw new BadRequestException(`El pedido está ${p.estado.toLowerCase()}`);
    await this.inventario.liberarReserva(p.items.flatMap((i) => i.lotes.map((l) => ({ loteId: l.loteId, cantidad: l.cantidad }))));
    await this.modelo.updateOne({ _id: id }, { $set: { estado: 'ANULADO' } }).exec();
    return { anulado: true };
  }

  // marcarFacturado(): lo llama facturación al emitir la factura del pedido.
  async marcarFacturado(id: string, facturaId: string) {
    await this.modelo.updateOne({ _id: id }, { $set: { estado: 'FACTURADO', factura: facturaId } }).exec();
  }
}
