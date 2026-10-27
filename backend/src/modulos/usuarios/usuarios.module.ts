// usuarios.module.ts → empaqueta esquema + servicio + controlador de usuarios.

import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service.js';
import { UsuariosController } from './usuarios.controller.js';

@Module({
  // La colección "usuarios" se registra en BaseDatosModule (global).
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService], // AuthModule lo usa para el login
})
export class UsuariosModule {}
