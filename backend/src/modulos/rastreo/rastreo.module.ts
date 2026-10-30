// rastreo.module.ts → trazabilidad pública "Rastrea tu cacao".

import { Module } from '@nestjs/common';
import { RastreoService } from './rastreo.service.js';
import { RastreoController } from './rastreo.controller.js';

@Module({
  controllers: [RastreoController],
  providers: [RastreoService],
  exports: [RastreoService], // el informe de trazabilidad lo usa
})
export class RastreoModule {}
