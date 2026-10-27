// produccion.module.ts → transformación de grano en productos.

import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { ProduccionService } from './produccion.service.js';
import { ProduccionController } from './produccion.controller.js';

@Module({
  imports: [InventarioModule],
  controllers: [ProduccionController],
  providers: [ProduccionService],
  exports: [ProduccionService],
})
export class ProduccionModule {}
