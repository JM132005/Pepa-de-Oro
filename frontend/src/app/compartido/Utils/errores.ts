// errores.ts → convierte cualquier error de la API en un mensaje legible para el usuario.

import { HttpErrorResponse } from '@angular/common/http';

export function mensajeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor. ¿Está encendido el backend (npm run start:dev)?';
    const cuerpo = error.error as { message?: string | string[] } | null;
    const m = cuerpo?.message;
    if (Array.isArray(m)) return m.join(' · ');
    if (m) return m;
    return `Error ${error.status}`;
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}
