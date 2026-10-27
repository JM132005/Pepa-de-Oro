// auditoria.interceptor.ts → INTERCEPTOR global que anota en la bitácora toda petición que CAMBIA datos
// (POST, PATCH, PUT, DELETE) hecha por un usuario con sesión.
// Un interceptor "envuelve" cada petición: puede hacer algo antes y después del controlador.

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
// Observable y tap: el controlador responde con un "flujo" (RxJS); tap() ejecuta algo cuando llega la respuesta
// sin modificarla.
import { Observable, tap } from 'rxjs';
import { AuditoriaService } from './auditoria.service.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(private readonly auditoria: AuditoriaService) {}

  intercept(contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    const peticion = contexto.switchToHttp().getRequest<{
      method: string;
      originalUrl: string;
      body: unknown;
      ip?: string;
      usuario?: UsuarioToken;
    }>();
    const cambiaDatos = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(peticion.method);
    // handle(): ejecuta el controlador. Solo se anota si salió bien y había usuario logueado.
    return siguiente.handle().pipe(
      tap(() => {
        if (cambiaDatos && peticion.usuario && !peticion.originalUrl.includes('/auth/')) {
          void this.auditoria.registrar({
            usuario: peticion.usuario,
            accion: `${peticion.method} ${peticion.originalUrl.split('?')[0]}`,
            despues: peticion.body,
            ip: peticion.ip,
          });
        }
      }),
    );
  }
}
