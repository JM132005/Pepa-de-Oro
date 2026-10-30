// campo.module.ts → haciendas propias.

import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { PoscosechaModule } from '../poscosecha/poscosecha.module.js';
import { CampoService } from './campo.service.js';
import { HaciendasService, ParcelasService, TrabajadoresService } from './catalogos.service.js';
import { CampoController } from './campo.controller.js';

@Module({
  imports: [InventarioModule, PoscosechaModule],
  controllers: [CampoController],
  providers: [CampoService, HaciendasService, ParcelasService, TrabajadoresService],
  exports: [CampoService],
})
export class CampoModule {}
