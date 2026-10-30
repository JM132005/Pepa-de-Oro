// sistema.service.ts → usuarios, configuración de la empresa y bitácora de auditoría.

import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Usuario } from '../Entidades/usuario';

@Injectable({ providedIn: 'root' })
export class SistemaService {
  private readonly api = inject(ApiService);

  usuarios() {
    return this.api.get<Usuario[]>('usuarios');
  }
  crearUsuario(datos: Partial<Usuario> & { contrasena: string }) {
    return this.api.post<Usuario>('usuarios', datos);
  }
  actualizarUsuario(id: string, datos: Partial<Usuario> & { contrasena?: string }) {
    return this.api.patch<Usuario>(`usuarios/${id}`, datos);
  }
  configuracion() {
    return this.api.get<Record<string, any>>('configuracion');
  }
  guardarConfiguracion(datos: Record<string, unknown>) {
    return this.api.patch<Record<string, any>>('configuracion', datos);
  }
  auditoria(sensibles = false) {
    return this.api.get<{ _id: string; fecha: string; usuarioNombre?: string; accion: string; entidad?: string; sensible?: boolean; antes?: unknown; despues?: unknown }[]>('auditoria', { sensibles });
  }
}
