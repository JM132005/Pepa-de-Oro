// logistica.controller.ts → rutas /api/viajes

import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { LogisticaService } from './logistica.service.js';
import { CompletarViajeDto, CrearViajeDto, IniciarViajeDto } from './dto/logistica.dto.js';

@Controller('viajes')
export class LogisticaController {
  constructor(private readonly servicio: LogisticaService) {}

  @Roles('LOGISTICA', 'VENTAS', 'AGRONOMO', 'ACOPIO', 'MANTENIMIENTO')
  @Get()
  listar(@Query('estado') estado?: string, @Query('camion') camion?: string) {
    return this.servicio.listar({ estado, camion });
  }

  @Roles('LOGISTICA')
  @Get('costos')
  costos() {
    return this.servicio.costosPorCamion();
  }

  @Roles('LOGISTICA', 'VENTAS', 'AGRONOMO', 'ACOPIO', 'MANTENIMIENTO')
  @Get(':id')
  obtener(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.obtener(id);
  }

  // "Pedir viaje": Agrónomo, Acopio y Ventas pueden programar un viaje; Logística hace todo.
  @Roles('LOGISTICA', 'VENTAS', 'AGRONOMO', 'ACOPIO')
  @Post()
  crear(@Body() dto: CrearViajeDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.crear(dto, u);
  }

  @Roles('LOGISTICA')
  @Post(':id/iniciar')
  iniciar(@Param('id', IdMongoPipe) id: string, @Body() dto: IniciarViajeDto) {
    return this.servicio.iniciar(id, dto.kmSalida);
  }

  @Roles('LOGISTICA')
  @Post(':id/completar')
  completar(@Param('id', IdMongoPipe) id: string, @Body() dto: CompletarViajeDto) {
    return this.servicio.completar(id, dto);
  }

  @Roles('LOGISTICA')
  @Post(':id/cancelar')
  cancelar(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.cancelar(id);
  }

  @Roles('LOGISTICA', 'VENTAS', 'BODEGA')
  @Get(':id/guia')
  async guia(@Param('id', IdMongoPipe) id: string, @Res() res: Response) {
    const { viaje, buffer } = await this.servicio.guia(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Guia-${viaje.guiaRemision}.pdf"` });
    res.send(buffer);
  }
}
