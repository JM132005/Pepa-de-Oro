// facturacion.module.ts → facturas, notas de crédito, PDF y envío por correo.

import { Module } from '@nestjs/common';
import { VentasModule } from '../ventas/ventas.module.js';
import { InventarioModule } from '../inventario/inventario.module.js';
import { FacturacionService } from './facturacion.service.js';
import { FacturacionController } from './facturacion.controller.js';

@Module({
  imports: [VentasModule, InventarioModule],
  controllers: [FacturacionController],
  providers: [FacturacionService],
  exports: [FacturacionService],
})
export class FacturacionModule {}
