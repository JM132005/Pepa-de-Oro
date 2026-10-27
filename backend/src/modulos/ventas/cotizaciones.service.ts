// cotizaciones.service.ts → venta por mayor, paso 2: la cotización con PDF por correo.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cotizacion } from './esquemas/cotizacion.esquema.js';
import { Cliente } from './esquemas/cliente.esquema.js';
import { LineasService } from './lineas.service.js';
import { PedidosService } from './pedidos.service.js';
import { ContadoresService } from '../../comun/servicios/contadores.service.js';
import { CorreoService } from '../../comun/servicios/correo.service.js';
import { PdfService } from '../../comun/servicios/pdf.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { dinero, fechaCorta, sumarDias } from '../../comun/utilidades.js';
import { cotizacionVigente, verificarConversion } from './ventas.reglas.js';
import { pdfCotizacion } from './pdf-cotizacion.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { ConvertirCotizacionDto, CrearCotizacionDto } from './dto/ventas.dto.js';

@Injectable()
export class CotizacionesService {
  constructor(
    @InjectModel(Cotizacion.name) private readonly modelo: Model<Cotizacion>,
    @InjectModel(Cliente.name) private readonly clientes: Model<Cliente>,
    private readonly lineas: LineasService,
    private readonly pedidos: PedidosService,
    private readonly contadores: ContadoresService,
    private readonly correo: CorreoService,
    private readonly pdf: PdfService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  // listar(): marca como VENCIDA (RN-22) las que pasaron su vigencia sin respuesta.
  async listar(estado?: string) {
    await this.modelo.updateMany({ estado: { $in: ['BORRADOR', 'ENVIADA'] }, vence: { $lt: new Date() } }, { $set: { estado: 'VENCIDA' } }).exec();
    const q = estado ? { estado } : {};
    return this.modelo.find(q).populate('cliente', 'nombre identificacion tipoCliente correo').sort({ fecha: -1 }).lean().exec();
  }

  async obtener(id: string) {
    const c = await this.modelo.findById(id).populate('cliente').populate('pedido', 'numero estado').lean().exec();
    if (!c) throw new NotFoundException('Cotización no encontrada');
    return c;
  }

  // crear(): arma las líneas con precios mayoristas (RN-16) y descuentos con tope (RN-17).
  async crear(dto: CrearCotizacionDto, usuario: UsuarioToken) {
    const cliente = await this.clientes.findById(dto.cliente).lean().exec();
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    const config = await this.configuracion.obtener();
    const canal = dto.canal ?? (cliente.tipoCliente === 'EXPORTADOR' ? 'EXPORTACION' : 'MAYORISTA');
    const { items, totales } = await this.lineas.armar(dto.items, cliente.tipoCliente, usuario, canal);
    const diasValidez = dto.diasValidez ?? config.ventas.diasValidezCotizacion;
    const fecha = new Date();
    return this.modelo.create({
      numero: await this.contadores.codigoAnual('COT'),
      fecha,
      cliente: dto.cliente,
      solicitud: dto.solicitud,
      items,
      totales,
      canal,
      diasValidez,
      vence: sumarDias(fecha, diasValidez),
      vendedor: { id: usuario.sub, nombre: usuario.nombre },
      condiciones: dto.condiciones,
      observaciones: dto.observaciones,
    });
  }

  // generarPdf(): PDF de la cotización en memoria.
  async generarPdf(id: string) {
    const cot = await this.modelo.findById(id).lean().exec();
    if (!cot) throw new NotFoundException('Cotización no encontrada');
    const cliente = await this.clientes.findById(cot.cliente).lean().exec();
    return { cot, cliente: cliente!, buffer: await pdfCotizacion(this.pdf, await this.configuracion.empresa(), cot, cliente!) };
  }

  // enviar(): manda el PDF al correo del cliente y pasa la cotización a ENVIADA.
  async enviar(id: string) {
    const { cot, cliente, buffer } = await this.generarPdf(id);
    if (!cliente.correo) throw new BadRequestException('El cliente no tiene correo registrado');
    if (!cotizacionVigente(cot.fecha, cot.diasValidez)) throw new BadRequestException('RN-22: la cotización ya venció');
    const resultado = await this.correo.enviar({
      para: cliente.correo,
      asunto: `Cotización ${cot.numero} – Pepa de Oro`,
      html: this.correo.plantilla(
        `Cotización ${cot.numero}`,
        `<p>Estimado/a <b>${cliente.nombre}</b>:</p>
         <p>Adjuntamos la cotización solicitada por un total de <b>${dinero(cot.totales.total)}</b>, válida hasta el <b>${fechaCorta(cot.vence)}</b>.</p>
         <p>Para aceptarla basta con responder este correo. Quedamos atentos.</p>`,
      ),
      adjuntos: [{ filename: `Cotizacion-${cot.numero}.pdf`, content: buffer, contentType: 'application/pdf' }],
    });
    const envio = { fecha: resultado.fecha, ok: resultado.ok, modo: resultado.modo, destinatario: resultado.destinatarioReal, error: resultado.error, archivo: resultado.archivo };
    await this.modelo.updateOne({ _id: id }, { $push: { envios: envio }, ...(resultado.ok && cot.estado === 'BORRADOR' ? { $set: { estado: 'ENVIADA' } } : {}) }).exec();
    return { ...envio, estado: resultado.ok ? 'ENVIADA' : cot.estado };
  }

  // aceptar(): el cliente acepta → se convierte en PEDIDO y se reserva el stock (RN-22 la debe dejar vigente).
  async aceptar(id: string, dto: ConvertirCotizacionDto, usuario: UsuarioToken) {
    const cot = await this.modelo.findById(id).lean().exec();
    if (!cot) throw new NotFoundException('Cotización no encontrada');
    const error = verificarConversion(cot);
    if (error) throw new BadRequestException(error);
    const pedido = await this.pedidos.crearDesdeLineas(
      {
        cliente: String(cot.cliente),
        canal: cot.canal === 'EXPORTACION' ? 'EXPORTACION' : 'MAYORISTA',
        items: cot.items,
        totales: cot.totales,
        creditoDias: dto.creditoDias ?? 0,
        entrega: dto.entrega ? { ...dto.entrega, fechaEstimada: dto.entrega.fechaEstimada ? new Date(dto.entrega.fechaEstimada) : undefined } : undefined,
        exportacion: dto.exportacion,
        cotizacion: id,
      },
      usuario,
    );
    await this.modelo.updateOne({ _id: id }, { $set: { estado: 'ACEPTADA', pedido: pedido._id } }).exec();
    return pedido;
  }

  async rechazar(id: string, motivo?: string) {
    const r = await this.modelo.findOneAndUpdate({ _id: id, estado: { $in: ['BORRADOR', 'ENVIADA'] } }, { $set: { estado: 'RECHAZADA', observaciones: motivo } }, { returnDocument: 'after' }).lean().exec();
    if (!r) throw new BadRequestException('Solo se rechazan cotizaciones en borrador o enviadas');
    return r;
  }
}
