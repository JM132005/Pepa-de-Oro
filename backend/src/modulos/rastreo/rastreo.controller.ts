// rastreo.controller.ts → GET /api/publico/rastreo/:codigo (PÚBLICO: es lo que abre el QR de la etiqueta).

import { Controller, Get, Param } from '@nestjs/common';
import { Publico } from '../../comun/decoradores/publico.decorator.js';
import { RastreoService } from './rastreo.service.js';

@Controller('publico/rastreo')
export class RastreoController {
  constructor(private readonly servicio: RastreoService) {}

  @Publico()
  @Get(':codigo')
  rastrear(@Param('codigo') codigo: string) {
    return this.servicio.rastrear(codigo);
  }
}
