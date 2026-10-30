// campo.controller.ts → rutas /api/haciendas, /api/parcelas, /api/trabajadores, /api/labores,
// /api/sanidad, /api/clima, /api/cosechas y /api/campo/agenda.
// Permisos: Agrónomo y Gerente hacen todo; Acopio y Calidad pueden ver.

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { CampoService } from './campo.service.js';
import { HaciendasService, ParcelasService, TrabajadoresService } from './catalogos.service.js';
import {
  ActualizarHaciendaDto,
  ActualizarParcelaDto,
  ActualizarTrabajadorDto,
  CrearClimaDto,
  CrearCosechaDto,
  CrearHaciendaDto,
  CrearLaborDto,
  CrearMonitoreoDto,
  CrearParcelaDto,
  CrearTrabajadorDto,
} from './dto/campo.dto.js';

const VER = ['AGRONOMO', 'ACOPIO', 'CALIDAD'] as const;

@Controller()
export class CampoController {
  constructor(
    private readonly campo: CampoService,
    private readonly haciendas: HaciendasService,
    private readonly parcelas: ParcelasService,
    private readonly trabajadores: TrabajadoresService,
  ) {}

  // ─── Haciendas ───
  @Roles(...VER)
  @Get('haciendas')
  listarHaciendas() {
    return this.campo.resumenHaciendas();
  }

  @Roles(...VER)
  @Get('haciendas/:id')
  hacienda(@Param('id', IdMongoPipe) id: string) {
    return this.haciendas.obtener(id);
  }

  @Roles('AGRONOMO')
  @Post('haciendas')
  crearHacienda(@Body() dto: CrearHaciendaDto) {
    return this.haciendas.crear(dto);
  }

  @Roles('AGRONOMO')
  @Patch('haciendas/:id')
  actualizarHacienda(@Param('id', IdMongoPipe) id: string, @Body() dto: ActualizarHaciendaDto) {
    return this.haciendas.actualizar(id, dto);
  }

  // ─── Parcelas ───
  @Roles(...VER)
  @Get('parcelas')
  listarParcelas(@Query('hacienda') hacienda?: string) {
    return this.parcelas.listar(hacienda ? { hacienda } : {});
  }

  @Roles(...VER)
  @Get('parcelas/:id')
  parcela(@Param('id', IdMongoPipe) id: string) {
    return this.campo.fichaParcela(id);
  }

  @Roles('AGRONOMO')
  @Post('parcelas')
  crearParcela(@Body() dto: CrearParcelaDto) {
    return this.parcelas.crear(this.parcelas.preparar(dto));
  }

  @Roles('AGRONOMO')
  @Patch('parcelas/:id')
  actualizarParcela(@Param('id', IdMongoPipe) id: string, @Body() dto: ActualizarParcelaDto) {
    return this.parcelas.actualizar(id, this.parcelas.preparar(dto));
  }

  // ─── Trabajadores (también los usan logística y mantenimiento) ───
  @Get('trabajadores')
  listarTrabajadores(@Query('cargo') cargo?: string) {
    return this.trabajadores.listar(cargo ? { cargo, activo: true } : {});
  }

  @Roles('AGRONOMO', 'LOGISTICA', 'MANTENIMIENTO')
  @Post('trabajadores')
  crearTrabajador(@Body() dto: CrearTrabajadorDto) {
    this.trabajadores.validar(dto.cedula);
    return this.trabajadores.crear(dto);
  }

  @Roles('AGRONOMO', 'LOGISTICA', 'MANTENIMIENTO')
  @Patch('trabajadores/:id')
  actualizarTrabajador(@Param('id', IdMongoPipe) id: string, @Body() dto: ActualizarTrabajadorDto) {
    this.trabajadores.validar(dto.cedula);
    return this.trabajadores.actualizar(id, dto);
  }

  // ─── Labores, agenda y sanidad ───
  @Roles(...VER)
  @Get('campo/agenda')
  agenda() {
    return this.campo.agenda();
  }

  @Roles(...VER)
  @Get('labores')
  listarLabores(@Query('parcela') parcela?: string, @Query('hacienda') hacienda?: string, @Query('tipo') tipo?: string) {
    return this.campo.listarLabores({ parcela, hacienda, tipo });
  }

  @Roles('AGRONOMO')
  @Post('labores')
  registrarLabor(@Body() dto: CrearLaborDto, @UsuarioActual() u: UsuarioToken) {
    return this.campo.registrarLabor(dto, u);
  }

  @Roles(...VER)
  @Get('sanidad')
  monitoreos(@Query('parcela') parcela?: string) {
    return this.campo.listarMonitoreos(parcela);
  }

  @Roles('AGRONOMO')
  @Post('sanidad')
  monitoreo(@Body() dto: CrearMonitoreoDto, @UsuarioActual() u: UsuarioToken) {
    return this.campo.registrarMonitoreo(dto, u);
  }

  // ─── Clima ───
  @Roles(...VER)
  @Get('clima')
  clima(@Query('hacienda') hacienda?: string, @Query('dias') dias?: string) {
    return this.campo.listarClima(hacienda, dias ? Number(dias) : 90);
  }

  @Roles('AGRONOMO')
  @Post('clima')
  registrarClima(@Body() dto: CrearClimaDto) {
    return this.campo.registrarClima(dto);
  }

  // ─── Cosechas (RN-01) ───
  @Roles(...VER)
  @Get('cosechas')
  cosechas(@Query('parcela') parcela?: string, @Query('hacienda') hacienda?: string) {
    return this.campo.listarCosechas({ parcela, hacienda });
  }

  @Roles('AGRONOMO')
  @Post('cosechas')
  cosechar(@Body() dto: CrearCosechaDto, @UsuarioActual() u: UsuarioToken) {
    return this.campo.registrarCosecha(dto, u);
  }
}
