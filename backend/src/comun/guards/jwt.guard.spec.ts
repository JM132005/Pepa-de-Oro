// jwt.guard.spec.ts → pruebas del portero de autenticación.
// Se usan objetos "falsos" (mocks) en lugar de la base de datos real: así la prueba es rápida.

import { UnauthorizedException } from '@nestjs/common';
import { JwtGuard } from './jwt.guard.js';

// Crea un "contexto" HTTP falso con la cabecera Authorization indicada.
function contextoCon(authorization?: string) {
  const peticion: Record<string, unknown> = {
    headers: authorization ? { authorization } : {},
  };
  return {
    peticion,
    contexto: {
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => peticion }),
    } as never,
  };
}

// Arma el guard con dependencias falsas: vi.fn() crea funciones simuladas.
function crearGuard(usuarioExiste: boolean) {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) }; // la ruta NO es pública
  const jwt = {
    verifyAsync: vi.fn().mockResolvedValue({
      sub: 'u1',
      roles: ['VENTAS'],
      correo: 'l@x.com',
      nombre: 'L',
    }),
  };
  const usuarios = { existeActivo: vi.fn().mockResolvedValue(usuarioExiste) };
  return new JwtGuard(reflector as never, jwt as never, usuarios as never);
}

describe('JwtGuard', () => {
  it('rechaza peticiones sin token', async () => {
    await expect(
      crearGuard(true).canActivate(contextoCon().contexto),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deja pasar un token válido de un usuario que existe', async () => {
    const { contexto, peticion } = contextoCon('Bearer abc');
    await expect(crearGuard(true).canActivate(contexto)).resolves.toBe(true);
    expect((peticion['usuario'] as { sub: string }).sub).toBe('u1');
  });

  it('rechaza el token de un usuario que ya no existe (ej: tras recargar el seed)', async () => {
    const { contexto } = contextoCon('Bearer abc');
    await expect(
      crearGuard(false).canActivate(contexto),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
