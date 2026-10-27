// productos.module.ts → catálogo de productos y precios.

import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { ProductosService } from './productos.service.js';
import { ProductosController } from './productos.controller.js';

@Module({
  imports: [InventarioModule], // para mostrar el stock de cada variante
  controllers: [ProductosController],
  providers: [ProductosService],
  exports: [ProductosService],
})
export class ProductosModule {}
