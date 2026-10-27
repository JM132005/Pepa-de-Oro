// auth.guard.ts → GUARDS de rutas: deciden si se puede entrar a una pantalla.
// Analogía: el guardia de la puerta de cada área de la planta.
// OJO: esto solo ESCONDE pantallas; la seguridad real la hace la API, que revisa el rol en cada petición.

import { inject } from '@angular/core';
// CanActivateFn: función que devuelve true (entra) o una ruta a la que redirigir.
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Servicios/auth.service';
import { Rol } from '../Entidades/usuario';

// conectadoGuard: solo usuarios con sesión. Si no hay sesión → /login?volver=/admin/caja
// (state.url es la dirección que intentaba abrir; después de ingresar, el login lo regresa allí).
export const conectadoGuard: CanActivateFn = (_ruta, state) => {
  const auth = inject(AuthService);
  return auth.conectado() ? true : inject(Router).createUrlTree(['/login'], { queryParams: { volver: state.url } });
};

// invitadoGuard: si ya hay sesión, el login no tiene sentido → al sistema.
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.conectado() ? inject(Router).createUrlTree(['/admin']) : true;
};

// rolGuard(...roles): fábrica de guards. Uso en las rutas: canActivate: [rolGuard('VENTAS', 'BODEGA')]
export function rolGuard(...roles: Rol[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    return auth.tieneRol(...roles) ? true : inject(Router).createUrlTree(['/admin']);
  };
}
