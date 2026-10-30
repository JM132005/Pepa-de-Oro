// auth.module.ts → configura JWT y empaqueta el login.

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

@Module({
  imports: [
    UsuariosModule,
    // registerAsync + useFactory: lee JWT_SECRET después de cargar el .env.
    // global: true → JwtService queda disponible en toda la app (lo usa el JwtGuard).
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'secreto-solo-para-desarrollo',
        signOptions: { expiresIn: '8h' }, // el token caduca en 8 horas
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
