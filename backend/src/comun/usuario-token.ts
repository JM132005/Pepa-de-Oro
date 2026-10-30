// usuario-token.ts → forma de los datos que viajan DENTRO del token JWT.
// Cada petición protegida trae el token; el JwtGuard lo descifra y deja este objeto en request.usuario.

import { Rol } from './constantes.js';

export interface UsuarioToken {
  sub: string; // "subject": el _id del usuario en MongoDB (nombre estándar en JWT)
  correo: string;
  nombre: string;
  roles: Rol[]; // un usuario puede tener varios roles (ej: BODEGA + LOGISTICA)
}

// tieneRol(): ¿el usuario tiene alguno de estos roles? El GERENTE siempre pasa.
export function tieneRol(usuario: UsuarioToken | undefined, ...roles: Rol[]): boolean {
  if (!usuario) return false;
  if (usuario.roles.includes('GERENTE')) return true;
  // some(): true si al menos un rol del usuario está en la lista pedida.
  return usuario.roles.some((r) => roles.includes(r));
}
