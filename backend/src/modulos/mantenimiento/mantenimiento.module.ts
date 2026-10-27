// mantenimiento.module.ts → taller de mantenimiento.

import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { MantenimientoService } from './mantenimiento.service.js';
import { MantenimientoController } from './mantenimiento.controller.js';

@Module({
  imports: [InventarioModule],
  controllers: [MantenimientoController],
  providers: [MantenimientoService],
  exports: [MantenimientoService],
})
export class MantenimientoModule {}
