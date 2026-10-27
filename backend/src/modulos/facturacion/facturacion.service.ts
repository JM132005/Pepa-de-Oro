// facturacion.service.ts → emite facturas y notas de crédito, genera el PDF y lo envía al correo del cliente.
//
// Emitir una factura toca VARIAS colecciones: facturas, lotes_producto (stock), movimientos_inventario,
// pedidos, activos (si se vende una máquina), alquileres, turnos_caja y contadores. Por eso todo va dentro
// de enTransaccion(): con replica set es "todo o nada"; sin él, se valida TODO antes de mover nada.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Model } from 'mongoose';
import { Factura } from './esquemas/factura.esquema.js';
import { Pedido } from '../ventas/esquemas/pedido.esquema.js';
import { Activo } from '../equipos/esquemas/activo.esquema.js';
import { Alquiler } from '../equipos/esquemas/alquiler.esquema.js';
import { OrdenMantenimiento } from '../mantenimiento/esquemas/orden-mantenimiento.esquema.js';
import { LoteProducto } from '../inventario/esquemas/lote-producto.esquema.js';
import { ClientesService } from '../ventas/clientes.service.js';
import { LineasService } from '../ventas/lineas.service.js';
import { CajaService } from '../ventas/caja.service.js';
import { PedidosService } from '../ventas/pedidos.service.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { ContadoresService } from '../../comun/servicios/contadores.service.js';
import { CorreoService } from '../../comun/servicios/correo.service.js';
import { PdfService } from '../../comun/servicios/pdf.service.js';
import { enTransaccion } from '../../comun/transaccion.js';
import { dinero, fechaCorta, redondear, sumarDias } from '../../comun/utilidades.js';
import { FORMAS_PAGO } from '../../comun/constantes.js';
import { calcularTotales, claveAcceso, numeroComprobante, verificarConsumidorFinal, verificarNotaCredito } from './facturacion.reglas.js';
import { verificarCredito, cambio as calcularCambio } from '../ventas/ventas.reglas.js';
import { estadoPago } from '../acopio/acopio.reglas.js';
import { pdfFactura } from './pdf-factura.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { AbonoDto, EmitirFacturaDto, NotaCreditoDto } from './dto/facturacion.dto.js';
import type { ItemVenta } from '../../comun/esquemas/item-venta.esquema.js';

@Injectable()
export class FacturacionService {
  constructor(
    @InjectConnection() private readonly conexion: Connection,
    @InjectModel(Factura.name) private readonly modelo: Model<Factura>,
    @InjectModel(Pedido.name) private readonly pedidosModelo: Model<Pedido>,
    @InjectModel(Activo.name) private readonly activos: Model<Activo>,
    @InjectModel(Alquiler.name) private readonly alquileres: Model<Alquiler>,
    @InjectModel(OrdenMantenimiento.name) private readonly ordenes: Model<OrdenMantenimiento>,
    @InjectModel(LoteProducto.name) private readonly lotes: Model<LoteProducto>,
    private readonly clientes: ClientesService,
    private readonly lineas: LineasService,
    private readonly caja: CajaService,
    private readonly pedidos: PedidosService,
    private readonly inventario: InventarioService,
    private readonly configuracion: ConfiguracionService,
    private readonly auditoria: AuditoriaService,
    private readonly contadores: ContadoresService,
    private readonly correo: CorreoService,
    private readonly pdf: PdfService,
  ) {}

  // ─────────────────────────── CONSULTAS ───────────────────────────

  listar(f: { desde?: string; hasta?: string; q?: string; tipo?: string; estadoPago?: string; canal?: string }) {
    const q: Record<string, unknown> = {};
    if (f.tipo) q.tipoComprobante = f.tipo;
    if (f.canal) q.canal = f.canal;
    if (f.estadoPago) q.estadoPago = { $in: f.estadoPago.split(',') };
    if (f.desde || f.hasta) q.fechaEmision = { ...(f.desde ? { $gte: new Date(f.desde) } : {}), ...(f.hasta ? { $lte: new Date(`${f.hasta}T23:59:59`) } : {}) };
    if (f.q) q.$or = [{ numero: { $regex: f.q } }, { 'cliente.nombre': { $regex: f.q, $options: 'i' } }, { 'cliente.identificacion': { $regex: f.q } }];
    return this.modelo.find(q).sort({ fechaEmision: -1 }).limit(500).lean().exec();
  }

  async obtener(id: string) {
    const f = await this.modelo.findById(id).lean().exec();
    if (!f) throw new NotFoundException('Factura no encontrada');
    return f;
  }

  // cuentasPorCobrar(): facturas a crédito con saldo, para cobranza.
  porCobrar() {
    return this.modelo.find({ tipoComprobante: '01', estado: { $ne: 'ANULADA' }, saldo: { $gt: 0.005 } }).sort({ vence: 1 }).lean().exec();
  }

  // ─────────────────────────── EMITIR ───────────────────────────

  async emitir(dto: EmitirFacturaDto, usuario: UsuarioToken) {
    const config = await this.configuracion.obtener();
    const empresa = config.empresa;

    // 1. ¿De dónde salen las líneas? De un pedido (reservado) o de la caja/vendedor.
    let pedido: (Pedido & { _id: unknown }) | null = null;
    let items: ItemVenta[];
    let clienteId = dto.clienteId;
    let canal = dto.canal ?? 'MOSTRADOR';
    let creditoDias = dto.creditoDias ?? 0;
    if (dto.pedidoId) {
      pedido = await this.pedidosModelo.findById(dto.pedidoId).lean().exec();
      if (!pedido) throw new NotFoundException('Pedido no encontrado');
      if (['FACTURADO', 'ANULADO'].includes(pedido.estado)) throw new BadRequestException(`El pedido ya está ${pedido.estado.toLowerCase()}`);
      items = pedido.items;
      clienteId = String(pedido.cliente);
      canal = pedido.canal;
      creditoDias = dto.creditoDias ?? pedido.creditoDias;
    } else {
      if (!dto.items?.length) throw new BadRequestException('La factura necesita al menos una línea');
      items = [];
    }

    // 2. Cliente: el elegido o CONSUMIDOR FINAL.
    const cliente = clienteId ? await this.clientes.obtener(clienteId) : await this.clientes.consumidorFinal();
    if (!pedido) items = (await this.lineas.armar(dto.items!, cliente.tipoCliente, usuario, canal)).items;
    const totales = calcularTotales(items);

    // 3. Reglas antes de mover nada.
    const errorCf = verificarConsumidorFinal(cliente.tipoIdentificacion, totales.total, config.ventas.limiteConsumidorFinal); // RN-19
    if (errorCf) throw new BadRequestException(errorCf);
    if (creditoDias > 0) {
      const error = verificarCredito(await this.clientes.situacionCredito(String(cliente._id)), totales.total); // RN-18
      if (error) throw new BadRequestException(error);
    }
    // Pagos de contado: si no se indican, todo en efectivo. Deben sumar el total.
    let pagos = (dto.pagos ?? []).map((p) => ({ ...p, nombre: FORMAS_PAGO[p.codigo as keyof typeof FORMAS_PAGO] }));
    if (creditoDias === 0) {
      if (!pagos.length) pagos = [{ codigo: '01', nombre: FORMAS_PAGO['01'], monto: totales.total }];
      const suma = redondear(pagos.reduce((s, p) => s + p.monto, 0));
      if (Math.abs(suma - totales.total) > 0.009) throw new BadRequestException(`Los pagos suman ${dinero(suma)} y el total es ${dinero(totales.total)}`);
    }
    const efectivo = pagos.filter((p) => p.codigo === '01').reduce((s, p) => s + p.monto, 0);
    const vuelto = dto.recibido !== undefined && efectivo > 0 ? calcularCambio(efectivo, dto.recibido) : 0;
    // La caja de la tienda necesita un turno abierto.
    const turno = canal === 'MOSTRADOR' ? await this.caja.actual(usuario) : null;
    if (canal === 'MOSTRADOR' && !turno) throw new BadRequestException('Abre tu turno de caja antes de vender en mostrador');
    // Pre-chequeo de stock (RN-12) de todas las líneas para no quedar a medias.
    if (!pedido) {
      const productos = items.filter((i) => i.tipo === 'PRODUCTO');
      const stock = await this.inventario.resumenStock({ productoIds: productos.map((p) => String(p.refId)) });
      for (const p of productos) {
        const s = stock.find((x) => x.productoId === String(p.refId));
        const pedidoTotal = productos.filter((x) => String(x.refId) === String(p.refId)).reduce((t, x) => t + x.cantidad, 0);
        if (!s || s.disponible < pedidoTotal) throw new BadRequestException(`RN-12: ${p.descripcion}: hay ${s?.disponible ?? 0} disponibles y se piden ${pedidoTotal}`);
      }
    }

    // 4. Escritura (todo o nada).
    const factura = await enTransaccion(this.conexion, async () => {
      const secuencial = await this.contadores.siguiente(`FACTURA-${empresa.establecimiento}-${empresa.puntoEmision}`);
      const fecha = new Date();
      const numero = numeroComprobante(empresa.establecimiento, empresa.puntoEmision, secuencial); // RN-20
      const clave = claveAcceso({ fecha, tipoComprobante: '01', ruc: empresa.ruc, ambiente: empresa.ambiente, establecimiento: empresa.establecimiento, puntoEmision: empresa.puntoEmision, secuencial, codigoNumerico: String(secuencial).padStart(8, '0') });
      const documento = { tipo: 'FACTURA', numero };

      // Inventario: sale el producto (FEFO); en pedidos, lo que ya estaba reservado.
      for (const item of items) {
        if (item.tipo === 'PRODUCTO') {
          const salida = await this.inventario.salida({
            productoId: String(item.refId),
            cantidad: item.cantidad,
            tipo: 'SALIDA_VENTA',
            soloVendibles: true,
            usarReservado: Boolean(pedido),
            asignacion: pedido ? item.lotes.map((l) => ({ loteId: l.loteId, cantidad: l.cantidad })) : undefined,
            bodegasPreferidas: canal === 'MOSTRADOR' ? ['TIENDA', 'PRODUCTO_TERMINADO', 'MATERIA_PRIMA'] : ['PRODUCTO_TERMINADO', 'MATERIA_PRIMA', 'TIENDA'],
            documento,
            usuario: usuario.nombre,
          });
          item.lotes = salida.map((s) => ({ loteId: s.loteId, codigo: s.codigo, cantidad: s.cantidad }));
          // Costo real de lo vendido = promedio ponderado de los lotes que salieron.
          item.costoUnitario = redondear(salida.reduce((t, s) => t + s.cantidad * s.costoUnitario, 0) / item.cantidad, 4);
        }
      }

      const creada = await this.modelo.create({
        tipoComprobante: '01',
        numero,
        secuencial,
        claveAcceso: clave,
        fechaEmision: fecha,
        cliente: { id: String(cliente._id), tipoIdentificacion: cliente.tipoIdentificacion, identificacion: cliente.identificacion, nombre: cliente.nombre, direccion: cliente.direccion, correo: cliente.correo, telefono: cliente.telefono, tipoCliente: cliente.tipoCliente },
        canal,
        items,
        subtotalIva: totales.subtotalIva,
        subtotal0: totales.subtotal0,
        subtotalSinImpuestos: totales.subtotalSinImpuestos,
        descuento: totales.descuento,
        iva: totales.iva,
        total: totales.total,
        tarifaIvaVigente: config.iva.tarifaGeneral,
        pagos: creditoDias > 0 ? [] : pagos,
        recibido: dto.recibido ?? 0,
        cambio: vuelto,
        creditoDias,
        vence: creditoDias > 0 ? sumarDias(fecha, creditoDias) : undefined,
        saldo: creditoDias > 0 ? totales.total : 0,
        estadoPago: creditoDias > 0 ? 'PENDIENTE' : 'PAGADA',
        pedido: pedido ? String(pedido._id) : undefined,
        turnoCaja: turno ? String(turno._id) : undefined,
        vendedor: { id: usuario.sub, nombre: usuario.nombre },
        observaciones: dto.observaciones,
      });

      // Efectos en otros módulos
      for (const item of items) {
        if (item.tipo === 'EQUIPO') {
          await this.activos.updateOne({ _id: item.refId }, { $set: { estado: 'VENDIDO', publicado: false } }).exec();
          await this.auditoria.registrar({ usuario, accion: 'VENTA_ACTIVO', entidad: 'activos', entidadId: String(item.refId), despues: { factura: numero }, sensible: false });
        }
        if (item.tipo === 'ALQUILER') await this.alquileres.updateOne({ _id: item.refId }, { $set: { factura: creada._id } }).exec();
        if (item.tipo === 'SERVICIO' && item.refId) await this.ordenes.updateOne({ _id: item.refId }, { $set: { factura: creada._id } }).exec();
      }
      if (pedido) await this.pedidos.marcarFacturado(String(pedido._id), String(creada._id));
      if (turno) await this.caja.registrarVenta(String(turno._id), pagos);
      return creada.toObject();
    });

    // 5. Correo (fuera de la transacción: si falla el correo, la factura igual existe y se reintenta).
    if (dto.enviarCorreo !== false && factura.cliente.correo) {
      await this.enviarPorCorreo(String(factura._id));
    }
    return this.obtener(String(factura._id));
  }

  // ─────────────────────────── PDF Y CORREO ───────────────────────────

  async generarPdf(id: string) {
    const f = await this.obtener(id);
    const config = await this.configuracion.obtener();
    return { factura: f, buffer: await pdfFactura(this.pdf, config.empresa, f, config.empresa.urlWeb) };
  }

  // enviarPorCorreo(): adjunta el PDF y lo manda desde el Gmail de la empresa.
  // Estado: ENVIADA si salió; ERROR_ENVIO si falló (se puede reintentar con el botón "Reenviar").
  async enviarPorCorreo(id: string) {
    const { factura: f, buffer } = await this.generarPdf(id);
    if (!f.cliente.correo) throw new BadRequestException('El cliente no tiene correo; agrégalo en su ficha y reenvía');
    const esNc = f.tipoComprobante === '04';
    const tipo = esNc ? 'Nota de crédito' : 'Factura';
    const resultado = await this.correo.enviar({
      para: f.cliente.correo,
      asunto: `${tipo} ${f.numero} – Pepa de Oro`,
      html: this.correo.plantilla(
        `${tipo} ${f.numero}`,
        `<p>Hola <b>${f.cliente.nombre}</b>, gracias por su compra.</p>
         <table style="border-collapse:collapse;width:100%;font-size:14px">
           <tr><td style="padding:6px;border-bottom:1px solid #eee">Fecha</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${fechaCorta(f.fechaEmision)}</td></tr>
           <tr><td style="padding:6px;border-bottom:1px solid #eee">Subtotal</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${dinero(f.subtotalSinImpuestos)}</td></tr>
           <tr><td style="padding:6px;border-bottom:1px solid #eee">IVA</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">${dinero(f.iva)}</td></tr>
           <tr><td style="padding:6px"><b>Total</b></td><td style="padding:6px;text-align:right"><b>${dinero(f.total)}</b></td></tr>
         </table>
         ${f.creditoDias > 0 ? `<p>Esta factura es a crédito y vence el <b>${fechaCorta(f.vence)}</b>.</p>` : ''}
         <p>Adjuntamos el documento en PDF. Clave de acceso: <span style="font-family:monospace;font-size:12px">${f.claveAcceso}</span></p>`,
      ),
      adjuntos: [{ filename: `${tipo.replace(' ', '-')}-${f.numero}.pdf`, content: buffer, contentType: 'application/pdf' }],
    });
    const envio = { fecha: resultado.fecha, ok: resultado.ok, modo: resultado.modo, destinatario: resultado.destinatarioReal, error: resultado.error, archivo: resultado.archivo };
    const nuevoEstado = f.estado === 'ANULADA' ? 'ANULADA' : resultado.ok ? 'ENVIADA' : 'ERROR_ENVIO';
    await this.modelo.updateOne({ _id: id }, { $push: { envios: envio }, $set: { estado: nuevoEstado } }).exec();
    return { ...envio, estado: nuevoEstado };
  }

  // ─────────────────────────── COBROS ───────────────────────────

  async abonar(id: string, dto: AbonoDto, usuario: UsuarioToken) {
    const f = await this.obtener(id);
    if (f.estado === 'ANULADA') throw new BadRequestException('La factura está anulada');
    if (dto.monto > f.saldo + 0.005) throw new BadRequestException(`El abono (${dinero(dto.monto)}) supera el saldo (${dinero(f.saldo)})`);
    const saldo = redondear(f.saldo - dto.monto);
    const pagado = redondear(f.total - f.totalNotasCredito - saldo);
    await this.modelo
      .updateOne(
        { _id: id },
        {
          $push: { abonos: { fecha: new Date(), monto: dto.monto, formaPago: dto.formaPago, referencia: dto.referencia, usuario: usuario.nombre } },
          $set: { saldo, estadoPago: estadoPago(f.total - f.totalNotasCredito, pagado) },
        },
      )
      .exec();
    return this.obtener(id);
  }

  // ─────────────────────────── NOTA DE CRÉDITO (RN-21) ───────────────────────────

  async notaCredito(id: string, dto: NotaCreditoDto, usuario: UsuarioToken) {
    const original = await this.obtener(id);
    if (original.tipoComprobante !== '01') throw new BadRequestException('Solo se emiten notas de crédito sobre facturas');
    const config = await this.configuracion.obtener();
    const empresa = config.empresa;

    // Líneas que se devuelven: las indicadas o TODAS (anulación total).
    const devueltas: ItemVenta[] = (dto.lineas?.length ? dto.lineas : original.items.map((_, indice) => ({ indice, cantidad: original.items[indice].cantidad }))).map((l) => {
      const base = original.items[l.indice];
      if (!base) throw new BadRequestException(`La factura no tiene la línea ${l.indice + 1}`);
      if (l.cantidad > base.cantidad) throw new BadRequestException(`Se facturaron ${base.cantidad} de ${base.descripcion}`);
      return { ...base, cantidad: l.cantidad, lotes: base.lotes };
    });
    const totales = calcularTotales(devueltas);
    const error = verificarNotaCredito(original, totales.total);
    if (error) throw new BadRequestException(error);

    const nc = await enTransaccion(this.conexion, async () => {
      const secuencial = await this.contadores.siguiente(`NC-${empresa.establecimiento}-${empresa.puntoEmision}`);
      const fecha = new Date();
      const numero = numeroComprobante(empresa.establecimiento, empresa.puntoEmision, secuencial);
      const clave = claveAcceso({ fecha, tipoComprobante: '04', ruc: empresa.ruc, ambiente: empresa.ambiente, establecimiento: empresa.establecimiento, puntoEmision: empresa.puntoEmision, secuencial, codigoNumerico: String(90_000_000 + secuencial) });

      // El producto vuelve a su mismo lote y bodega si está en buen estado.
      if (dto.devolverStock) {
        for (const item of devueltas.filter((i) => i.tipo === 'PRODUCTO')) {
          let porDevolver = item.cantidad;
          for (const l of item.lotes) {
            if (porDevolver <= 0) break;
            const lote = await this.lotes.findById(l.loteId).lean().exec();
            if (!lote) continue;
            const cant = Math.min(l.cantidad, porDevolver);
            await this.inventario.entrada({ productoId: String(item.refId), bodegaId: String(lote.bodega), cantidad: cant, costoUnitario: lote.costoUnitario, tipo: 'ENTRADA_DEVOLUCION', codigoLote: lote.codigo, documento: { tipo: 'NOTA_CREDITO', numero }, usuario: usuario.nombre, motivo: dto.motivo });
            porDevolver = redondear(porDevolver - cant, 3);
          }
        }
      }

      const creada = await this.modelo.create({
        tipoComprobante: '04',
        numero,
        secuencial,
        claveAcceso: clave,
        fechaEmision: fecha,
        cliente: original.cliente,
        canal: original.canal,
        items: devueltas.map((d, i) => ({ ...d, ...totales.lineas[i] })),
        subtotalIva: totales.subtotalIva,
        subtotal0: totales.subtotal0,
        subtotalSinImpuestos: totales.subtotalSinImpuestos,
        descuento: totales.descuento,
        iva: totales.iva,
        total: totales.total,
        tarifaIvaVigente: original.tarifaIvaVigente,
        estadoPago: 'PAGADA',
        vendedor: { id: usuario.sub, nombre: usuario.nombre },
        facturaModificada: { id: String(original._id), numero: original.numero, fecha: original.fechaEmision },
        motivo: dto.motivo,
        devuelveStock: Boolean(dto.devolverStock),
      });

      // La factura original: suma la NC, baja su saldo y, si se anuló completa, queda ANULADA (nunca se borra).
      const totalNc = redondear(original.totalNotasCredito + totales.total);
      const anulada = totalNc + 0.005 >= original.total;
      await this.modelo.updateOne({ _id: id }, { $set: { totalNotasCredito: totalNc, saldo: redondear(Math.max(0, original.saldo - totales.total)), ...(anulada ? { estado: 'ANULADA' } : {}) } }).exec();
      await this.auditoria.registrar({ usuario, accion: anulada ? 'ANULAR_FACTURA' : 'NOTA_CREDITO_PARCIAL', entidad: 'facturas', entidadId: id, antes: { estado: original.estado, saldo: original.saldo }, despues: { notaCredito: numero, monto: totales.total, motivo: dto.motivo }, sensible: true });
      return creada.toObject();
    });

    if (nc.cliente.correo) await this.enviarPorCorreo(String(nc._id));
    return this.obtener(String(nc._id));
  }
}
