// acopio.controller.ts → rutas /api/productores, /api/precios-dia, /api/acopio y /api/liquidaciones.

import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { AcopioService } from './acopio.service.js';
import { ActualizarProductorDto, AnticipoDto, CrearProductorDto, PagoProductorDto, PrecioDiaDto, RecepcionDto } from './dto/acopio.dto.js';

@Controller()
export class AcopioController {
  constructor(private readonly servicio: AcopioService) {}

  // ─── Productores (Acopio: todo · Calidad: ver) ───
  @Roles('ACOPIO', 'CALIDAD')
  @Get('productores')
  listar(@Query('q') q?: string, @Query('activos') activos?: string) {
    return this.servicio.buscar(q, activos === 'true');
  }

  @Roles('ACOPIO', 'CALIDAD')
  @Get('productores/:id')
  detalle(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.detalleProductor(id);
  }

  @Roles('ACOPIO')
  @Post('productores')
  crear(@Body() dto: CrearProductorDto) {
    return this.servicio.crearProductor(dto);
  }

  @Roles('ACOPIO')
  @Patch('productores/:id')
  actualizar(@Param('id', IdMongoPipe) id: string, @Body() dto: ActualizarProductorDto) {
    return this.servicio.actualizarProductor(id, dto);
  }

  @Roles('ACOPIO')
  @Post('productores/:id/anticipos')
  anticipo(@Param('id', IdMongoPipe) id: string, @Body() dto: AnticipoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.anticipo(id, dto.monto, dto.motivo, u);
  }

  // ─── Precio del día ───
  @Get('precios-dia')
  vigentes() {
    return this.servicio.preciosVigentes();
  }

  @Get('precios-dia/historial')
  historial(@Query('cultivo') cultivo?: string) {
    return this.servicio.historialPrecios(cultivo);
  }

  @Roles('ACOPIO')
  @Post('precios-dia')
  registrarPrecio(@Body() dto: PrecioDiaDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.registrarPrecio(dto, u);
  }

  // ─── Recepción en báscula → lote + liquidación ───
  @Roles('ACOPIO')
  @Post('acopio/recepciones')
  recibir(@Body() dto: RecepcionDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.recibir(dto, u);
  }

  // ─── Liquidaciones y pagos ───
  @Roles('ACOPIO')
  @Get('liquidaciones')
  liquidaciones(@Query('estadoPago') estadoPago?: string, @Query('productor') productor?: string) {
    return this.servicio.listarLiquidaciones({ estadoPago, productor });
  }

  @Roles('ACOPIO')
  @Get('liquidaciones/:id')
  liquidacion(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.liquidacion(id);
  }

  @Roles('ACOPIO')
  @Get('liquidaciones/:id/pdf')
  async pdf(@Param('id', IdMongoPipe) id: string, @Res() res: Response) {
    const { liquidacion, buffer } = await this.servicio.pdfLiquidacion(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Liquidacion-${liquidacion.numero}.pdf"` });
    res.send(buffer);
  }

  @Roles('ACOPIO')
  @Post('liquidaciones/:id/pagos')
  pagar(@Param('id', IdMongoPipe) id: string, @Body() dto: PagoProductorDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.pagar(id, dto, u);
  }
}
