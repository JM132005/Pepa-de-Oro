// salud.module.ts → módulo mínimo que solo registra el controlador de salud.

import { Module } from '@nestjs/common';
import { SaludController } from './salud.controller.js';

@Module({ controllers: [SaludController] })
export class SaludModule {}
