// inventario.controller.ts → rutas /api/inventario y /api/bodegas.
// Un CONTROLADOR recibe la petición HTTP, valida con el DTO y llama al servicio. No tiene lógica de negocio.

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { InventarioService } from './inventario.service.js';
import { AjusteDto, BajaDto, CrearBodegaDto, EntradaCompraDto, TransferenciaDto } from './dto/inventario.dto.js';

@Controller()
export class InventarioController {
  constructor(private readonly servicio: InventarioService) {}

  // ─── Bodegas ───
  @Get('bodegas')
  bodegas() {
    return this.servicio.listarBodegas();
  }

  @Roles('BODEGA')
  @Post('bodegas')
  crearBodega(@Body() dto: CrearBodegaDto) {
    return this.servicio.crearBodega(dto);
  }

  @Roles('BODEGA')
  @Patch('bodegas/:id')
  actualizarBodega(@Param('id', IdMongoPipe) id: string, @Body() dto: Partial<CrearBodegaDto>) {
    return this.servicio.actualizarBodega(id, dto);
  }

  // ─── Consultas de stock (todo el personal puede verlas) ───
  // GET /api/inventario/stock → resumen por producto
  @Get('inventario/stock')
  stock() {
    return this.servicio.resumenStock();
  }

  // GET /api/inventario/lotes?bodega=...&pendientesCalidad=true
  @Get('inventario/lotes')
  lotes(@Query('bodega') bodega?: string, @Query('pendientesCalidad') pendientes?: string, @Query('bloqueados') bloqueados?: string, @Query('producto') producto?: string) {
    return this.servicio.listarLotes({ bodega, producto, pendientesCalidad: pendientes === 'true', bloqueados: bloqueados === 'true' });
  }

  @Get('inventario/kardex/:productoId')
  kardex(@Param('productoId', IdMongoPipe) productoId: string, @Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.servicio.kardex(productoId, desde ? new Date(desde) : undefined, hasta ? new Date(hasta) : undefined);
  }

  @Get('inventario/movimientos')
  movimientos() {
    return this.servicio.movimientosRecientes();
  }

  @Get('inventario/por-vencer')
  porVencer() {
    return this.servicio.porVencer();
  }

  @Get('inventario/bajo-minimo')
  bajoMinimo() {
    return this.servicio.bajoMinimo();
  }

  @Get('inventario/valorizado')
  valorizado() {
    return this.servicio.valorizado();
  }

  // ─── Operaciones (solo Bodega y Gerente) ───
  @Roles('BODEGA')
  @Post('inventario/entradas')
  entrada(@Body() dto: EntradaCompraDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.entrada({
      productoId: dto.productoId,
      bodegaId: dto.bodegaId,
      cantidad: dto.cantidad,
      costoUnitario: dto.costoUnitario,
      codigoLote: dto.codigoLote,
      vencimiento: dto.vencimiento ? new Date(dto.vencimiento) : undefined,
      tipo: 'ENTRADA_COMPRA',
      origen: { tipo: 'COMPRA' },
      documento: { tipo: 'COMPRA', numero: dto.factura ?? dto.proveedor },
      usuario: u.nombre,
      motivo: dto.proveedor ? `Compra a ${dto.proveedor}` : undefined,
    });
  }

  @Roles('BODEGA')
  @Post('inventario/transferencias')
  transferir(@Body() dto: TransferenciaDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.transferir(dto.loteId, dto.bodegaDestinoId, dto.cantidad, u);
  }

  // RN-15: el servicio revisa que sea el gerente; Bodega puede pedirlo pero recibirá el mensaje.
  @Roles('BODEGA')
  @Post('inventario/ajustes')
  ajustar(@Body() dto: AjusteDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.ajustar(dto.loteId, dto.cantidadContada, dto.motivo, u);
  }

  @Roles('BODEGA')
  @Post('inventario/bajas')
  baja(@Body() dto: BajaDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.darDeBaja(dto.loteId, dto.motivo, u);
  }
}
