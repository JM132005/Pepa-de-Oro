// analitica.module.ts → KPIs, alertas, proyecciones e informes. Lee datos de casi todos los módulos.

import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module.js';
import { MantenimientoModule } from '../mantenimiento/mantenimiento.module.js';
import { LogisticaModule } from '../logistica/logistica.module.js';
import { CampoModule } from '../campo/campo.module.js';
import { PoscosechaModule } from '../poscosecha/poscosecha.module.js';
import { EquiposModule } from '../equipos/equipos.module.js';
import { VentasModule } from '../ventas/ventas.module.js';
import { RastreoModule } from '../rastreo/rastreo.module.js';
import { KpisService } from './kpis.service.js';
import { AlertasService } from './alertas.service.js';
import { ProyeccionesService } from './proyecciones.service.js';
import { InformesService } from './informes.service.js';
import { AnaliticaController } from './analitica.controller.js';

@Module({
  imports: [InventarioModule, MantenimientoModule, LogisticaModule, CampoModule, PoscosechaModule, EquiposModule, VentasModule, RastreoModule],
  controllers: [AnaliticaController],
  providers: [KpisService, AlertasService, ProyeccionesService, InformesService],
})
export class AnaliticaModule {}
