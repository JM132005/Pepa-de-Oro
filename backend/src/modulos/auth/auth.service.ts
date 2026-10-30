// auth.service.ts → lógica del login: comprobar contraseña y generar el token JWT.

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { LoginDto } from './dto/login.dto.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { Rol } from '../../comun/constantes.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.buscarParaLogin(dto.correo);
    // compare(): cifra la contraseña escrita y la compara con el hash guardado.
    const valida =
      usuario?.activo &&
      (await bcrypt.compare(dto.contrasena, usuario.contrasenaHash));
    // Mismo mensaje para "no existe" y "contraseña mala": no se da pistas a un atacante.
    if (!usuario || !valida)
      throw new UnauthorizedException('Correo o contraseña incorrectos');

    // payload: datos que viajarán dentro del token.
    const payload: UsuarioToken = {
      sub: String(usuario._id),
      correo: usuario.correo,
      nombre: usuario.nombre,
      roles: usuario.roles as Rol[],
    };
    // signAsync(): firma el token con el secreto JWT_SECRET (configurado en auth.module.ts).
    const token = await this.jwtService.signAsync(payload);
    return {
      token,
      usuario: {
        _id: payload.sub,
        nombre: payload.nombre,
        correo: payload.correo,
        roles: payload.roles,
        cargo: usuario.cargo,
      },
    };
  }
}
