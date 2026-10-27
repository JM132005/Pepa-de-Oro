// web.service.ts → datos de la PÁGINA PÚBLICA (sin login) y administración de solicitudes y contenido.

import { Injectable, inject } from '@angular/core';
import { ApiService, Filtros } from './api.service';
import { EmpresaPublica, EquipoPublico, ProductoPublico, Rastreo, SolicitudWeb } from '../Entidades/web';

@Injectable({ providedIn: 'root' })
export class WebService {
  private readonly api = inject(ApiService);

  // ─── Públicas ───
  empresa() {
    return this.api.get<EmpresaPublica>('publico/empresa');
  }
  contenido<T = Record<string, unknown>>(clave: string) {
    return this.api.get<{ clave: string; titulo: string; datos: T }>(`publico/contenido/${clave}`);
  }
  catalogo(f?: Filtros) {
    return this.api.get<ProductoPublico[]>('publico/productos', f);
  }
  producto(slug: string) {
    return this.api.get<ProductoPublico>(`publico/productos/${slug}`);
  }
  stock(ids: string[]) {
    return this.api.get<{ hora: string; stock: { _id: string; disponible: number; estado: string }[] }>('publico/stock', { ids: ids.join(',') });
  }
  equipos() {
    return this.api.get<EquipoPublico[]>('publico/equipos');
  }
  servicios() {
    return this.api.get<{ contenido: Record<string, any>; preciosDia: { cultivo: string; variedad: string; estado: string; precioQq: number; fecha: string }[] }>('publico/servicios');
  }
  rastrear(codigo: string) {
    return this.api.get<Rastreo>(`publico/rastreo/${encodeURIComponent(codigo)}`);
  }
  enviarSolicitud(datos: Record<string, unknown>) {
    return this.api.post<{ recibido: boolean; numero?: string }>('publico/solicitudes', datos);
  }

  // ─── Administración ───
  solicitudes(f?: Filtros) {
    return this.api.get<SolicitudWeb[]>('solicitudes', f);
  }
  actualizarSolicitud(id: string, datos: { estado?: string; nota?: string }) {
    return this.api.patch<SolicitudWeb>(`solicitudes/${id}`, datos);
  }
  solicitudACotizacion(id: string, clienteId: string) {
    return this.api.post<{ _id: string; numero: string }>(`solicitudes/${id}/cotizacion`, { clienteId });
  }
  contenidos() {
    return this.api.get<{ clave: string; titulo: string; datos: Record<string, unknown>; actualizadoPor?: string; updatedAt?: string }[]>('contenido-web');
  }
  guardarContenido(clave: string, titulo: string, datos: Record<string, unknown>) {
    return this.api.put(`contenido-web/${clave}`, { titulo, datos });
  }
}
