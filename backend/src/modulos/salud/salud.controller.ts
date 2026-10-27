// salud.controller.ts → GET /api/salud : responde si la API está viva (no necesita token).

import { Controller, Get } from '@nestjs/common';
import { Publico } from '../../comun/decoradores/publico.decorator.js';

@Controller('salud')
export class SaludController {
  @Publico() // no exige token
  @Get()
  verificar() {
    return {
      estado: 'ok',
      servicio: 'pepadeoro-api',
      hora: new Date().toISOString(),
    };
  }
}
