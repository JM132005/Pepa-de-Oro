// logistica.module.ts → flota, viajes y fletes.

import { Module } from '@nestjs/common';
import { LogisticaService } from './logistica.service.js';
import { LogisticaController } from './logistica.controller.js';

@Module({
  controllers: [LogisticaController],
  providers: [LogisticaService],
  exports: [LogisticaService],
})
export class LogisticaModule {}
