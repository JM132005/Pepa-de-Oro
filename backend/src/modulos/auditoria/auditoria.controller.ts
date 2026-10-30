// auditoria.controller.ts → GET /api/auditoria : la bitácora (solo el gerente la ve).

import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { AuditoriaService } from './auditoria.service.js';

@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly servicio: AuditoriaService) {}

  // ?sensibles=true → solo acciones sensibles. ?entidad=facturas → solo de esa colección.
  @Roles('GERENTE')
  @Get()
  listar(@Query('sensibles') sensibles?: string, @Query('entidad') entidad?: string) {
    return this.servicio.listar({ soloSensibles: sensibles === 'true', entidad });
  }
}
