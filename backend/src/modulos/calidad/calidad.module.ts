// calidad.module.ts → control de calidad de grano y de producto terminado.

import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { AcopioModule } from '../acopio/acopio.module.js';
import { CalidadService } from './calidad.service.js';
import { CalidadController } from './calidad.controller.js';

@Module({
  imports: [InventarioModule, AcopioModule],
  controllers: [CalidadController],
  providers: [CalidadService],
})
export class CalidadModule {}
