// produccion.controller.ts → rutas /api/recetas y /api/produccion

import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { ProduccionService } from './produccion.service.js';
import { ActualizarRecetaDto, CerrarOrdenDto, CrearOrdenDto, CrearRecetaDto, SimularDto } from './dto/produccion.dto.js';

@Controller()
export class ProduccionController {
  constructor(private readonly servicio: ProduccionService) {}

  // ─── Recetas (Producción: todo · Bodega y Calidad: ver) ───
  @Roles('PRODUCCION', 'BODEGA', 'CALIDAD')
  @Get('recetas')
  recetas() {
    return this.servicio.listarRecetas();
  }

  @Roles('PRODUCCION', 'BODEGA', 'CALIDAD')
  @Get('recetas/:id')
  receta(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.receta(id);
  }

  @Roles('PRODUCCION')
  @Post('recetas')
  crearReceta(@Body() dto: CrearRecetaDto) {
    return this.servicio.crearReceta(dto);
  }

  @Roles('PRODUCCION')
  @Patch('recetas/:id')
  actualizarReceta(@Param('id', IdMongoPipe) id: string, @Body() dto: ActualizarRecetaDto) {
    return this.servicio.actualizarReceta(id, dto);
  }

  // ─── Órdenes ───
  @Roles('PRODUCCION', 'BODEGA', 'CALIDAD')
  @Get('produccion/ordenes')
  ordenes(@Query('estado') estado?: string, @Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.servicio.listarOrdenes({ estado, desde, hasta });
  }

  @Roles('PRODUCCION', 'BODEGA')
  @Get('produccion/tablero')
  tablero(@Query('desde') desde?: string) {
    const inicio = desde ? new Date(desde) : new Date();
    inicio.setHours(0, 0, 0, 0);
    return this.servicio.tablero(inicio);
  }

  // GET /api/produccion/verificar?producto=...&cantidad=250 → ¿alcanzan los insumos? (RN-09)
  @Roles('PRODUCCION', 'BODEGA')
  @Get('produccion/verificar')
  verificar(@Query('producto') producto: string, @Query('cantidad') cantidad: string) {
    return this.servicio.verificar(producto, Number(cantidad));
  }

  @Roles('PRODUCCION', 'BODEGA', 'CALIDAD')
  @Get('produccion/ordenes/:id')
  orden(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.orden(id);
  }

  @Roles('PRODUCCION')
  @Post('produccion/ordenes')
  crear(@Body() dto: CrearOrdenDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.crearOrden(dto, u);
  }

  @Roles('PRODUCCION')
  @Post('produccion/ordenes/:id/iniciar')
  iniciar(@Param('id', IdMongoPipe) id: string, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.iniciar(id, u);
  }

  @Roles('PRODUCCION')
  @Post('produccion/ordenes/:id/cerrar')
  cerrar(@Param('id', IdMongoPipe) id: string, @Body() dto: CerrarOrdenDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.cerrar(id, dto, u);
  }

  @Roles('PRODUCCION')
  @Post('produccion/ordenes/:id/anular')
  anular(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.anular(id);
  }

  // Simulador «¿qué pasa si?» (Gerente y Producción).
  @Roles('PRODUCCION')
  @Post('produccion/simular')
  simular(@Body() dto: SimularDto) {
    return this.servicio.simular(dto.producto, dto.cantidad);
  }

  @Roles('PRODUCCION', 'BODEGA', 'CALIDAD')
  @Get('produccion/lotes/:id/etiquetas')
  async etiquetas(@Param('id', IdMongoPipe) id: string, @Res() res: Response) {
    const { lote, buffer } = await this.servicio.etiquetas(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Etiquetas-${lote.codigo}.pdf"` });
    res.send(buffer);
  }
}
