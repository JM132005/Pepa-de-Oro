// jwt.guard.ts → GUARD de autenticación. Un "guard" es un portero: decide si la petición pasa o no.
// Se registra como global en app.module.ts, así TODAS las rutas exigen token salvo las @Publico().

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
// Reflector: lee la metadata que guardan los decoradores (@Publico).
import { Reflector } from '@nestjs/core';
// JwtService: firma y verifica tokens JWT (librería @nestjs/jwt).
import { JwtService } from '@nestjs/jwt';
import { ES_PUBLICO } from '../decoradores/publico.decorator.js';
import type { UsuarioToken } from '../usuario-token.js';
// UsuariosService: para comprobar que el dueño del token todavía existe en la base.
import { UsuariosService } from '../../modulos/usuarios/usuarios.service.js';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usuariosService: UsuariosService,
  ) {}

  // canActivate: devuelve true (pasa) o lanza un error 401 (no pasa).
  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    // getAllAndOverride: busca @Publico() en el método y, si no, en la clase del controlador.
    const esPublico = this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublico) return true;

    const peticion = contexto.switchToHttp().getRequest<{
      headers: Record<string, string>;
      usuario?: UsuarioToken;
    }>();
    // El frontend envía la cabecera:  Authorization: Bearer <token>
    const [tipo, token] = (peticion.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token)
      throw new UnauthorizedException('Falta el token de acceso');

    let datos: UsuarioToken;
    try {
      // verifyAsync: comprueba la firma y la fecha de expiración; devuelve el contenido del token.
      datos = await this.jwtService.verifyAsync<UsuarioToken>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Un token puede tener firma válida pero ser de un usuario que ya no existe
    // (por ejemplo, después de recargar los datos de prueba). En ese caso → 401,
    // y el frontend cierra la sesión solo y manda al login.
    if (!(await this.usuariosService.existeActivo(datos.sub))) {
      throw new UnauthorizedException(
        'Tu sesión ya no es válida; vuelve a iniciar sesión',
      );
    }

    peticion.usuario = datos;
    return true;
  }
}
