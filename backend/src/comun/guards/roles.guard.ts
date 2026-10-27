// roles.guard.ts → GUARD de autorización: si la ruta tiene @Roles(...), revisa que el usuario
// tenga AL MENOS UNO de esos roles. El GERENTE pasa siempre (es el administrador).
// Se ejecuta DESPUÉS del JwtGuard (por eso ya existe request.usuario).

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
// Reflector: lee la metadata que guardó el decorador @Roles.
import { Reflector } from '@nestjs/core';
import { ROLES_PERMITIDOS } from '../decoradores/roles.decorator.js';
import { Rol } from '../constantes.js';
import { tieneRol, type UsuarioToken } from '../usuario-token.js';
import { ES_PUBLICO } from '../decoradores/publico.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    // Las rutas públicas (web, login) no revisan roles.
    const esPublico = this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublico) return true;

    // getAllAndOverride: primero busca @Roles en el método; si no hay, en la clase del controlador.
    const permitidos = this.reflector.getAllAndOverride<Rol[]>(ROLES_PERMITIDOS, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!permitidos || permitidos.length === 0) return true; // ruta sin restricción de rol

    const usuario = contexto.switchToHttp().getRequest<{ usuario?: UsuarioToken }>().usuario;
    if (tieneRol(usuario, ...permitidos)) return true;
    throw new ForbiddenException(`Solo pueden hacer esto: GERENTE, ${permitidos.join(', ')}`);
  }
}
