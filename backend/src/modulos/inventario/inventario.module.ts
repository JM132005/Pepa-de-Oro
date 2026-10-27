// inventario.module.ts → empaqueta el inventario. Exporta InventarioService porque lo usan
// ventas, facturación, producción, campo, calidad y mantenimiento.
// Los modelos (colecciones) los registra BaseDatosModule para todo el sistema.

import { Module } from '@nestjs/common';
import { InventarioService } from './inventario.service.js';
import { InventarioController } from './inventario.controller.js';

@Module({
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
