// usuario.ts → forma de los datos de usuarios y sesión (lo que responde la API).
// Una "entidad" o "interfaz" describe los campos de un objeto para que TypeScript avise si escribimos mal un nombre.

export type Rol = 'GERENTE' | 'AGRONOMO' | 'ACOPIO' | 'CALIDAD' | 'PRODUCCION' | 'BODEGA' | 'VENTAS' | 'LOGISTICA' | 'MANTENIMIENTO';
export const ROLES: Rol[] = ['GERENTE', 'AGRONOMO', 'ACOPIO', 'CALIDAD', 'PRODUCCION', 'BODEGA', 'VENTAS', 'LOGISTICA', 'MANTENIMIENTO'];

export interface Usuario {
  _id: string;
  nombre: string;
  correo: string;
  roles: Rol[];
  cargo?: string;
  telefono?: string;
  activo?: boolean;
}

export interface RespuestaLogin {
  token: string;
  usuario: Usuario;
}
