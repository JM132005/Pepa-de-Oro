// poscosecha.module.ts → lotes de grano, fermentación y secado.

import { Module } from '@nestjs/common';
import { PoscosechaService } from './poscosecha.service.js';
import { PoscosechaController } from './poscosecha.controller.js';

@Module({
  controllers: [PoscosechaController],
  providers: [PoscosechaService],
  exports: [PoscosechaService], // acopio y campo crean lotes; calidad los evalúa
})
export class PoscosechaModule {}
