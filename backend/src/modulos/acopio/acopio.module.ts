// acopio.module.ts → compra de grano a productores externos.

import { Module } from '@nestjs/common';
import { PoscosechaModule } from '../poscosecha/poscosecha.module.js';
import { AcopioService } from './acopio.service.js';
import { AcopioController } from './acopio.controller.js';

@Module({
  imports: [PoscosechaModule], // cada recepción crea un lote de grano
  controllers: [AcopioController],
  providers: [AcopioService],
  exports: [AcopioService], // calidad aplica el bono premium
})
export class AcopioModule {}
