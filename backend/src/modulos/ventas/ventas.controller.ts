// ventas.controller.ts → rutas /api/clientes, /api/cotizaciones, /api/pedidos y /api/caja.

import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
// Response de Express: para devolver el PDF como archivo (no como JSON).
import type { Response } from 'express';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { ClientesService } from './clientes.service.js';
import { CotizacionesService } from './cotizaciones.service.js';
import { PedidosService } from './pedidos.service.js';
import { CajaService } from './caja.service.js';
import { AbrirCajaDto, ActualizarClienteDto, CerrarCajaDto, ConvertirCotizacionDto, CrearClienteDto, CrearCotizacionDto, CrearPedidoDto } from './dto/ventas.dto.js';

@Controller()
export class VentasController {
  constructor(
    private readonly clientes: ClientesService,
    private readonly cotizaciones: CotizacionesService,
    private readonly pedidos: PedidosService,
    private readonly caja: CajaService,
  ) {}

  // ─────────── Clientes ───────────
  @Get('clientes')
  listarClientes(@Query('q') q?: string, @Query('tipo') tipo?: string) {
    return this.clientes.buscar(q, tipo);
  }

  @Get('clientes/consumidor-final')
  consumidorFinal() {
    return this.clientes.consumidorFinal();
  }

  @Get('clientes/:id')
  cliente(@Param('id', IdMongoPipe) id: string) {
    return this.clientes.obtener(id);
  }

  @Get('clientes/:id/estado-cuenta')
  estadoCuenta(@Param('id', IdMongoPipe) id: string) {
    return this.clientes.estadoCuenta(id);
  }

  @Roles('VENTAS', 'LOGISTICA', 'MANTENIMIENTO')
  @Post('clientes')
  crearCliente(@Body() dto: CrearClienteDto) {
    return this.clientes.crearCliente(dto);
  }

  @Roles('VENTAS')
  @Patch('clientes/:id')
  actualizarCliente(@Param('id', IdMongoPipe) id: string, @Body() dto: ActualizarClienteDto) {
    return this.clientes.actualizarCliente(id, dto);
  }

  // ─────────── Cotizaciones ───────────
  @Roles('VENTAS')
  @Get('cotizaciones')
  listarCotizaciones(@Query('estado') estado?: string) {
    return this.cotizaciones.listar(estado);
  }

  @Roles('VENTAS')
  @Get('cotizaciones/:id')
  cotizacion(@Param('id', IdMongoPipe) id: string) {
    return this.cotizaciones.obtener(id);
  }

  @Roles('VENTAS')
  @Post('cotizaciones')
  crearCotizacion(@Body() dto: CrearCotizacionDto, @UsuarioActual() u: UsuarioToken) {
    return this.cotizaciones.crear(dto, u);
  }

  // GET /api/cotizaciones/:id/pdf → se abre en el navegador (Content-Disposition: inline).
  @Roles('VENTAS')
  @Get('cotizaciones/:id/pdf')
  async pdfCotizacion(@Param('id', IdMongoPipe) id: string, @Res() res: Response) {
    const { cot, buffer } = await this.cotizaciones.generarPdf(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Cotizacion-${cot.numero}.pdf"` });
    res.send(buffer);
  }

  @Roles('VENTAS')
  @Post('cotizaciones/:id/enviar')
  enviarCotizacion(@Param('id', IdMongoPipe) id: string) {
    return this.cotizaciones.enviar(id);
  }

  @Roles('VENTAS')
  @Post('cotizaciones/:id/aceptar')
  aceptar(@Param('id', IdMongoPipe) id: string, @Body() dto: ConvertirCotizacionDto, @UsuarioActual() u: UsuarioToken) {
    return this.cotizaciones.aceptar(id, dto, u);
  }

  @Roles('VENTAS')
  @Post('cotizaciones/:id/rechazar')
  rechazar(@Param('id', IdMongoPipe) id: string, @Body('motivo') motivo?: string) {
    return this.cotizaciones.rechazar(id, motivo);
  }

  // ─────────── Pedidos ───────────
  @Roles('VENTAS', 'BODEGA', 'LOGISTICA')
  @Get('pedidos')
  listarPedidos(@Query('estado') estado?: string) {
    return this.pedidos.listar(estado);
  }

  @Roles('VENTAS', 'BODEGA', 'LOGISTICA')
  @Get('pedidos/:id')
  pedido(@Param('id', IdMongoPipe) id: string) {
    return this.pedidos.obtener(id);
  }

  @Roles('VENTAS')
  @Post('pedidos')
  crearPedido(@Body() dto: CrearPedidoDto, @UsuarioActual() u: UsuarioToken) {
    return this.pedidos.crear(dto, u);
  }

  // Bodega prepara (lista de despacho).
  @Roles('BODEGA')
  @Post('pedidos/:id/preparar')
  preparar(@Param('id', IdMongoPipe) id: string, @UsuarioActual() u: UsuarioToken) {
    return this.pedidos.cambiarEstado(id, 'PREPARANDO', u);
  }

  // Logística despacha.
  @Roles('LOGISTICA', 'BODEGA')
  @Post('pedidos/:id/despachar')
  despachar(@Param('id', IdMongoPipe) id: string, @UsuarioActual() u: UsuarioToken) {
    return this.pedidos.cambiarEstado(id, 'DESPACHADO', u);
  }

  @Roles('VENTAS')
  @Post('pedidos/:id/anular')
  anular(@Param('id', IdMongoPipe) id: string) {
    return this.pedidos.anular(id);
  }

  // ─────────── Caja ───────────
  @Roles('VENTAS')
  @Get('caja/actual')
  cajaActual(@UsuarioActual() u: UsuarioToken) {
    return this.caja.actual(u);
  }

  @Roles('VENTAS')
  @Get('caja/historial')
  historialCaja() {
    return this.caja.historial();
  }

  @Roles('VENTAS')
  @Post('caja/abrir')
  abrirCaja(@Body() dto: AbrirCajaDto, @UsuarioActual() u: UsuarioToken) {
    return this.caja.abrir(dto.montoInicial, u);
  }

  @Roles('VENTAS')
  @Post('caja/cerrar')
  cerrarCaja(@Body() dto: CerrarCajaDto, @UsuarioActual() u: UsuarioToken) {
    return this.caja.cerrar(dto.contado, dto.observaciones, u);
  }
}
