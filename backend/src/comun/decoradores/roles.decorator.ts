// roles.decorator.ts → decorador @Roles('VENTAS', 'BODEGA') para limitar una ruta a ciertos roles.
// Puede ir encima de un método (una ruta) o de la clase entera (todo el controlador).
// El GERENTE no se escribe: siempre tiene permiso.

import { SetMetadata } from '@nestjs/common';
import { Rol } from '../constantes.js';

export const ROLES_PERMITIDOS = 'rolesPermitidos';

// "...roles" (parámetro rest) recibe cualquier cantidad de roles y los junta en un arreglo.
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_PERMITIDOS, roles);
