// auth.controller.ts → rutas /api/auth

import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Publico } from '../../comun/decoradores/publico.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/login → público; devuelve { token, usuario }.
  @Publico()
  @HttpCode(200) // por defecto un POST responde 201 "creado"; un login no crea nada → 200
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // GET /api/auth/perfil → datos del usuario dueño del token.
  @Get('perfil')
  perfil(@UsuarioActual() usuario: UsuarioToken) {
    return usuario;
  }
}
