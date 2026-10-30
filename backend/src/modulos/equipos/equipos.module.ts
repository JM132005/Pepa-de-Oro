// equipos.module.ts → activos, venta y alquiler de maquinaria y vehículos.

import { Module } from '@nestjs/common';
import { EquiposService } from './equipos.service.js';
import { EquiposController } from './equipos.controller.js';

@Module({
  controllers: [EquiposController],
  providers: [EquiposService],
  exports: [EquiposService],
})
export class EquiposModule {}
