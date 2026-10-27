// roles.guard.spec.ts → pruebas del portero de roles (quién puede hacer qué).

import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard.js';

// contexto(): simula una petición hecha por un usuario con ciertos roles.
function contexto(roles: string[]) {
  return {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ usuario: { sub: 'u1', roles } }) }),
  } as never;
}

// guardQuePide(): la primera lectura del reflector es @Publico (false); la segunda, @Roles.
function guardQuePide(permitidos: string[] | undefined) {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(permitidos) };
  return new RolesGuard(reflector as never);
}

describe('RolesGuard', () => {
  it('deja pasar si la ruta no pide roles', () => {
    expect(guardQuePide(undefined).canActivate(contexto(['BODEGA']))).toBe(true);
  });
  it('deja pasar si el usuario tiene uno de los roles pedidos', () => {
    expect(guardQuePide(['VENTAS', 'BODEGA']).canActivate(contexto(['LOGISTICA', 'BODEGA']))).toBe(true);
  });
  it('el GERENTE pasa aunque no esté en la lista', () => {
    expect(guardQuePide(['CALIDAD']).canActivate(contexto(['GERENTE']))).toBe(true);
  });
  it('rechaza con 403 si no tiene ninguno de los roles', () => {
    expect(() => guardQuePide(['CALIDAD']).canActivate(contexto(['VENTAS']))).toThrow(ForbiddenException);
  });
});
