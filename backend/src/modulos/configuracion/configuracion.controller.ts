// configuracion.controller.ts → /api/configuracion

import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { ConfiguracionService } from './configuracion.service.js';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto.js';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly servicio: ConfiguracionService) {}

  // GET: cualquier usuario logueado la lee (la caja necesita el límite de consumidor final, por ejemplo).
  @Get()
  obtener() {
    return this.servicio.obtener();
  }

  // PATCH: solo el gerente cambia parámetros (acción sensible → auditoría).
  @Roles('GERENTE')
  @Patch()
  actualizar(@Body() dto: ActualizarConfiguracionDto, @UsuarioActual() usuario: UsuarioToken) {
    return this.servicio.actualizar(dto as never, usuario);
  }
}
