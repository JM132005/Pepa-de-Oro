// web.module.ts → página pública y su administración (contenido y solicitudes).

import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { AcopioModule } from '../acopio/acopio.module.js';
import { VentasModule } from '../ventas/ventas.module.js';
import { WebService } from './web.service.js';
import { WebController } from './web.controller.js';

@Module({
  imports: [InventarioModule, AcopioModule, VentasModule],
  controllers: [WebController],
  providers: [WebService],
})
export class WebModule {}
