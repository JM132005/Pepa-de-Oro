// calidad.controller.ts → rutas /api/calidad

import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { CalidadService } from './calidad.service.js';
import { CataDto, CerrarNoConformidadDto, ControlProductoDto, EvaluarGranoDto } from './dto/calidad.dto.js';

@Controller('calidad')
export class CalidadController {
  constructor(private readonly servicio: CalidadService) {}

  @Roles('CALIDAD', 'ACOPIO', 'PRODUCCION', 'BODEGA')
  @Get('pendientes')
  pendientes() {
    return this.servicio.pendientes();
  }

  @Roles('CALIDAD', 'ACOPIO', 'PRODUCCION', 'BODEGA')
  @Get('evaluados')
  evaluados() {
    return this.servicio.evaluados();
  }

  @Roles('CALIDAD')
  @Get('no-conformidades')
  noConformidades(@Query('todas') todas?: string) {
    return this.servicio.noConformidades(todas !== 'true');
  }

  // RN-07: el guard deja pasar solo a CALIDAD (y al GERENTE); el servicio lo vuelve a revisar.
  @Roles('CALIDAD')
  @Post('lotes-grano/:id/evaluar')
  evaluar(@Param('id', IdMongoPipe) id: string, @Body() dto: EvaluarGranoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.evaluarGrano(id, dto, u);
  }

  @Roles('CALIDAD')
  @Post('lotes-grano/:id/cata')
  catar(@Param('id', IdMongoPipe) id: string, @Body() dto: CataDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.catar(id, dto, u);
  }

  @Roles('CALIDAD')
  @Post('lotes-grano/:id/no-conformidad/cerrar')
  cerrar(@Param('id', IdMongoPipe) id: string, @Body() dto: CerrarNoConformidadDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.cerrarNoConformidad(id, dto.destino, dto.observacion, u);
  }

  @Roles('CALIDAD', 'ACOPIO', 'VENTAS')
  @Get('lotes-grano/:id/certificado')
  async certificado(@Param('id', IdMongoPipe) id: string, @Res() res: Response) {
    const { lote, buffer } = await this.servicio.certificado(id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Certificado-${lote.codigo}.pdf"` });
    res.send(buffer);
  }

  // RN-11: liberar (o bloquear) un lote de producto terminado.
  @Roles('CALIDAD')
  @Post('lotes-producto/:id/control')
  control(@Param('id', IdMongoPipe) id: string, @Body() dto: ControlProductoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.controlProductoTerminado(id, dto, u);
  }
}
