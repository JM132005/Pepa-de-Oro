// usuario-actual.decorator.ts → decorador @UsuarioActual() para recibir en el controlador
// al usuario que hizo la petición (el que el JwtGuard dejó en request.usuario).

// createParamDecorator: crea decoradores para parámetros de métodos.
// ExecutionContext: da acceso a la petición HTTP actual.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UsuarioToken } from '../usuario-token.js';

export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): UsuarioToken => {
    // switchToHttp().getRequest(): obtiene el objeto "request" de Express.
    const peticion = contexto
      .switchToHttp()
      .getRequest<{ usuario: UsuarioToken }>();
    return peticion.usuario;
  },
);
