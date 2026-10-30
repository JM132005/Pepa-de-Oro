// mantenimiento.controller.ts → rutas /api/mantenimiento

import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { MantenimientoService } from './mantenimiento.service.js';
import { AsignarDto, PresupuestoDto, ReportarFallaDto, RepuestoDto, ServicioClienteDto, TerminarOrdenDto } from './dto/mantenimiento.dto.js';

@Controller('mantenimiento')
export class MantenimientoController {
  constructor(private readonly servicio: MantenimientoService) {}

  @Roles('MANTENIMIENTO', 'LOGISTICA', 'PRODUCCION')
  @Get('ordenes')
  listar(@Query('estado') estado?: string, @Query('tipo') tipo?: string, @Query('activo') activo?: string) {
    return this.servicio.listar({ estado, tipo, activo });
  }

  @Roles('MANTENIMIENTO', 'LOGISTICA', 'PRODUCCION')
  @Get('plan')
  plan() {
    return this.servicio.planPreventivo();
  }

  @Roles('MANTENIMIENTO')
  @Get('indicadores')
  indicadores(@Query('dias') dias?: string) {
    return this.servicio.indicadores(dias ? Number(dias) : 90);
  }

  @Roles('MANTENIMIENTO', 'LOGISTICA', 'PRODUCCION')
  @Get('ordenes/:id')
  obtener(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.obtener(id);
  }

  // Botón "Generar preventivos ahora" (además del cron diario de las 06:00).
  @Roles('MANTENIMIENTO')
  @Post('generar-preventivos')
  generar() {
    return this.servicio.generarPreventivos();
  }

  // "Reportar falla": lo pueden hacer Agrónomo, Acopio, Producción, Logística y Mantenimiento.
  @Roles('MANTENIMIENTO', 'AGRONOMO', 'ACOPIO', 'PRODUCCION', 'LOGISTICA')
  @Post('fallas')
  falla(@Body() dto: ReportarFallaDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.reportarFalla(dto, u);
  }

  @Roles('MANTENIMIENTO', 'VENTAS')
  @Post('servicios')
  servicioCliente(@Body() dto: ServicioClienteDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.servicioCliente(dto, u);
  }

  @Roles('MANTENIMIENTO')
  @Post('ordenes/:id/presupuesto')
  presupuesto(@Param('id', IdMongoPipe) id: string, @Body() dto: PresupuestoDto) {
    return this.servicio.presupuestar(id, dto);
  }

  @Roles('MANTENIMIENTO')
  @Post('ordenes/:id/asignar')
  asignar(@Param('id', IdMongoPipe) id: string, @Body() dto: AsignarDto) {
    return this.servicio.asignar(id, dto);
  }

  @Roles('MANTENIMIENTO')
  @Post('ordenes/:id/iniciar')
  iniciar(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.iniciar(id);
  }

  @Roles('MANTENIMIENTO')
  @Post('ordenes/:id/esperar-repuesto')
  esperar(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.esperarRepuesto(id);
  }

  @Roles('MANTENIMIENTO')
  @Post('ordenes/:id/repuestos')
  repuesto(@Param('id', IdMongoPipe) id: string, @Body() dto: RepuestoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.agregarRepuesto(id, dto.producto, dto.cantidad, u);
  }

  @Roles('MANTENIMIENTO')
  @Post('ordenes/:id/terminar')
  terminar(@Param('id', IdMongoPipe) id: string, @Body() dto: TerminarOrdenDto) {
    return this.servicio.terminar(id, dto);
  }

  @Roles('MANTENIMIENTO')
  @Post('ordenes/:id/cancelar')
  cancelar(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.cancelar(id);
  }

  @Roles('MANTENIMIENTO', 'VENTAS', 'LOGISTICA')
  @Get('ordenes/:id/pdf')
  async pdf(@Param('id', IdMongoPipe) id: string, @Res() res: Response) {
    const { orden, buffer } = await this.servicio.pdfOrden(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Orden-${orden.codigo}.pdf"` });
    res.send(buffer);
  }
}
