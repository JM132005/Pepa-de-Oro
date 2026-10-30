// poscosecha.controller.ts → rutas /api/lotes-grano (fermentación y secado).

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { PoscosechaService } from './poscosecha.service.js';
import { CombinarLotesDto, IniciarFermentacionDto, IniciarSecadoDto, MedicionHumedadDto, TerminarSecadoDto, VolteoDto } from './dto/poscosecha.dto.js';

@Controller('lotes-grano')
export class PoscosechaController {
  constructor(private readonly servicio: PoscosechaService) {}

  // Ver: Agrónomo, Acopio, Calidad, Producción y Bodega (matriz de permisos).
  @Roles('AGRONOMO', 'ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA')
  @Get()
  listar(@Query('estado') estado?: string, @Query('origen') origen?: string, @Query('cultivo') cultivo?: string) {
    return this.servicio.listar({ estado, origen, cultivo });
  }

  @Roles('AGRONOMO', 'ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA')
  @Get('ocupacion')
  ocupacion() {
    return this.servicio.ocupacion();
  }

  @Roles('AGRONOMO', 'ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA')
  @Get(':id')
  obtener(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.obtener(id);
  }

  // Registrar: Acopio (recibe y fermenta), Calidad y Producción.
  @Roles('ACOPIO', 'CALIDAD', 'PRODUCCION')
  @Post(':id/fermentacion')
  fermentar(@Param('id', IdMongoPipe) id: string, @Body() dto: IniciarFermentacionDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.iniciarFermentacion(id, dto.fermentadorId, u);
  }

  @Roles('ACOPIO', 'CALIDAD', 'PRODUCCION')
  @Post(':id/volteos')
  voltear(@Param('id', IdMongoPipe) id: string, @Body() dto: VolteoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.registrarVolteo(id, dto.temperatura, u);
  }

  @Roles('ACOPIO', 'CALIDAD', 'PRODUCCION')
  @Post(':id/secado')
  secar(@Param('id', IdMongoPipe) id: string, @Body() dto: IniciarSecadoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.iniciarSecado(id, dto.metodo, dto.activoId, u);
  }

  @Roles('ACOPIO', 'CALIDAD', 'PRODUCCION')
  @Post(':id/humedad')
  humedad(@Param('id', IdMongoPipe) id: string, @Body() dto: MedicionHumedadDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.medirHumedad(id, dto.humedad, u);
  }

  @Roles('ACOPIO', 'CALIDAD', 'PRODUCCION')
  @Post(':id/terminar-secado')
  terminar(@Param('id', IdMongoPipe) id: string, @Body() dto: TerminarSecadoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.terminarSecado(id, dto.kgSeco, dto.humedadFinal, u);
  }

  @Roles('ACOPIO', 'CALIDAD')
  @Post('combinar')
  combinar(@Body() dto: CombinarLotesDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.combinar(dto.lotes, u);
  }
}
