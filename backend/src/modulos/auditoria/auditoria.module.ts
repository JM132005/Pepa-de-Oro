// auditoria.module.ts → módulo GLOBAL de auditoría: cualquier servicio puede inyectar AuditoriaService
// para registrar acciones sensibles con el valor anterior y el nuevo.

import { Global, Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service.js';
import { AuditoriaController } from './auditoria.controller.js';

@Global()
@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
