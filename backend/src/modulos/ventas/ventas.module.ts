// ventas.module.ts → clientes, cotizaciones, pedidos y caja.

import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { VentasController } from './ventas.controller.js';
import { ClientesService } from './clientes.service.js';
import { CotizacionesService } from './cotizaciones.service.js';
import { PedidosService } from './pedidos.service.js';
import { CajaService } from './caja.service.js';
import { LineasService } from './lineas.service.js';

@Module({
  imports: [InventarioModule],
  controllers: [VentasController],
  providers: [ClientesService, CotizacionesService, PedidosService, CajaService, LineasService],
  // Facturación y la web los usan.
  exports: [ClientesService, CotizacionesService, PedidosService, CajaService, LineasService],
})
export class VentasModule {}
