// equipos.controller.ts → rutas /api/activos y /api/alquileres

import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { EquiposService } from './equipos.service.js';
import { ActualizarActivoDto, BajaActivoDto, CrearActivoDto, CrearAlquilerDto, DevolucionDto, EntregaDto } from './dto/equipos.dto.js';

@Controller()
export class EquiposController {
  constructor(private readonly servicio: EquiposService) {}

  // Todo el personal ve los activos (producción elige máquina, poscosecha el fermentador...).
  @Get('activos')
  listar(@Query('tipo') tipo?: string, @Query('uso') uso?: string, @Query('estado') estado?: string) {
    return this.servicio.buscar({ tipo, uso, estado });
  }

  @Get('activos/alertas-documentos')
  alertas() {
    return this.servicio.alertasDocumentos();
  }

  @Get('activos/:id')
  ficha(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.ficha(id);
  }

  @Roles('VENTAS', 'LOGISTICA', 'MANTENIMIENTO')
  @Post('activos')
  crear(@Body() dto: CrearActivoDto) {
    return this.servicio.crear(dto);
  }

  @Roles('VENTAS', 'LOGISTICA', 'MANTENIMIENTO')
  @Patch('activos/:id')
  actualizar(@Param('id', IdMongoPipe) id: string, @Body() dto: ActualizarActivoDto) {
    return this.servicio.actualizar(id, dto);
  }

  // Dar de baja = acción sensible del gerente.
  @Roles('GERENTE')
  @Post('activos/:id/baja')
  baja(@Param('id', IdMongoPipe) id: string, @Body() dto: BajaActivoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.darDeBaja(id, dto.motivo, u);
  }

  // ─── Alquileres (Ventas: todo · Logística y Mantenimiento: ver) ───
  @Roles('VENTAS', 'LOGISTICA', 'MANTENIMIENTO')
  @Get('alquileres')
  alquileres(@Query('estado') estado?: string, @Query('activo') activo?: string) {
    return this.servicio.listarAlquileres({ estado, activo });
  }

  @Roles('VENTAS', 'LOGISTICA', 'MANTENIMIENTO')
  @Get('alquileres/:id')
  alquiler(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.alquiler(id);
  }

  @Roles('VENTAS')
  @Post('alquileres')
  crearAlquiler(@Body() dto: CrearAlquilerDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.crearAlquiler(dto, u);
  }

  @Roles('VENTAS', 'LOGISTICA')
  @Post('alquileres/:id/entregar')
  entregar(@Param('id', IdMongoPipe) id: string, @Body() dto: EntregaDto) {
    return this.servicio.entregar(id, dto);
  }

  @Roles('VENTAS', 'LOGISTICA')
  @Post('alquileres/:id/devolver')
  devolver(@Param('id', IdMongoPipe) id: string, @Body() dto: DevolucionDto) {
    return this.servicio.devolver(id, dto);
  }

  @Roles('VENTAS')
  @Post('alquileres/:id/cancelar')
  cancelar(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.cancelar(id);
  }

  @Roles('VENTAS', 'LOGISTICA', 'MANTENIMIENTO')
  @Get('alquileres/:id/contrato')
  async contrato(@Param('id', IdMongoPipe) id: string, @Res() res: Response) {
    const { alquiler, buffer } = await this.servicio.contrato(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Contrato-${alquiler.codigo}.pdf"` });
    res.send(buffer);
  }
}
