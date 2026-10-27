// clientes.service.ts → clientes, su crédito (RN-18) y su estado de cuenta.

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrudBase } from '../../comun/crud-base.service.js';
import { validarIdentificacion } from '../../comun/identificacion.reglas.js';
import { escaparRegex, redondear } from '../../comun/utilidades.js';
import { Cliente } from './esquemas/cliente.esquema.js';
import { Factura } from '../facturacion/esquemas/factura.esquema.js';
import { estaVencida, tramoAntiguedad } from './ventas.reglas.js';
import type { CrearClienteDto, ActualizarClienteDto } from './dto/ventas.dto.js';

@Injectable()
export class ClientesService extends CrudBase<Cliente> {
  constructor(
    @InjectModel(Cliente.name) modelo: Model<Cliente>,
    @InjectModel(Factura.name) private readonly facturas: Model<Factura>,
  ) {
    super(modelo, 'Cliente', [{ path: 'vendedor', select: 'nombre' }], { nombre: 1 });
  }

  // RN-02: cédula/RUC con dígito verificador antes de guardar.
  private validar(tipo?: string, numero?: string) {
    if (tipo && numero && !validarIdentificacion(tipo, numero)) {
      throw new BadRequestException(`RN-02: ${tipo === 'RUC' ? 'el RUC' : 'la identificación'} ${numero} no es válido(a); revisa el dígito verificador`);
    }
  }

  async crearCliente(dto: CrearClienteDto) {
    this.validar(dto.tipoIdentificacion, dto.identificacion);
    if (await this.modelo.exists({ identificacion: dto.identificacion })) throw new BadRequestException('Ya existe un cliente con esa identificación');
    return this.crear(dto);
  }

  async actualizarCliente(id: string, dto: ActualizarClienteDto) {
    const actual = await this.obtener(id);
    this.validar(dto.tipoIdentificacion ?? actual.tipoIdentificacion, dto.identificacion ?? actual.identificacion);
    return this.actualizar(id, dto);
  }

  buscar(q?: string, tipo?: string) {
    const filtro: Record<string, unknown> = {};
    if (tipo) filtro.tipoCliente = tipo;
    if (q) {
      const r = { $regex: escaparRegex(q), $options: 'i' };
      filtro.$or = [{ nombre: r }, { identificacion: r }, { nombreComercial: r }];
    }
    return this.listar(filtro);
  }

  // consumidorFinal(): el "cliente genérico" 9999999999999 (existe siempre).
  async consumidorFinal() {
    const existe = await this.modelo.findOne({ identificacion: '9999999999999' }).lean().exec();
    if (existe) return existe;
    const creado = await this.modelo.create({ tipoIdentificacion: 'CONSUMIDOR_FINAL', identificacion: '9999999999999', nombre: 'CONSUMIDOR FINAL', tipoCliente: 'CONSUMIDOR' });
    return creado.toObject();
  }

  // situacionCredito(): lo que el cliente debe y si tiene facturas vencidas (para RN-18).
  async situacionCredito(clienteId: string) {
    const cliente = await this.obtener(clienteId);
    const pendientes = await this.facturas.find({ 'cliente.id': clienteId, tipoComprobante: '01', estado: { $ne: 'ANULADA' }, saldo: { $gt: 0.005 } }).lean().exec();
    const saldoPendiente = redondear(pendientes.reduce((s, f) => s + f.saldo, 0));
    const facturasVencidas = pendientes.filter((f) => estaVencida(f)).length;
    return { creditoDias: cliente.creditoDias, cupo: cliente.cupo, saldoPendiente, facturasVencidas, disponible: redondear(Math.max(0, cliente.cupo - saldoPendiente)) };
  }

  // estadoCuenta(): facturas, abonos y saldo, con la antigüedad de cada deuda.
  async estadoCuenta(clienteId: string) {
    const cliente = await this.obtener(clienteId);
    const facturas = await this.facturas.find({ 'cliente.id': clienteId }).sort({ fechaEmision: -1 }).lean().exec();
    const credito = await this.situacionCredito(clienteId);
    return {
      cliente,
      credito,
      facturas: facturas.map((f) => ({
        _id: f._id,
        numero: f.numero,
        tipoComprobante: f.tipoComprobante,
        fechaEmision: f.fechaEmision,
        vence: f.vence,
        total: f.total,
        saldo: f.saldo,
        estado: f.estado,
        estadoPago: f.estadoPago,
        abonos: f.abonos,
        vencida: estaVencida(f),
        tramo: f.saldo > 0 ? tramoAntiguedad(f.fechaEmision) : null,
      })),
    };
  }
}
