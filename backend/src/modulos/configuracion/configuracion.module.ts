// configuracion.module.ts → módulo GLOBAL: facturación, calidad, acopio y web leen la configuración.

import { Global, Module } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service.js';
import { ConfiguracionController } from './configuracion.controller.js';

@Global()
@Module({
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
