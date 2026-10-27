// api.service.ts → puerta ÚNICA hacia el backend. Todos los demás servicios la usan.
// Centraliza la URL base y la forma de enviar filtros, así nadie escribe "http://localhost:3000" a mano.

import { Injectable, inject } from '@angular/core';
// HttpClient: cliente HTTP de Angular. HttpParams: arma la parte "?desde=...&hasta=..." de la URL.
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../Utils/config';

// Filtros: un objeto simple { clave: valor }. Los vacíos se ignoran.
export type Filtros = Record<string, string | number | boolean | null | undefined>;

@Injectable({ providedIn: 'root' }) // providedIn root: una sola instancia para toda la app
export class ApiService {
  private readonly http = inject(HttpClient);

  // parametros(): convierte { desde: '2026-10-01', vacio: '' } en HttpParams sin los vacíos.
  private parametros(filtros?: Filtros): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(filtros ?? {})) if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    return p;
  }

  // <T>: genérico; quien llama dice qué forma tiene la respuesta (ej. get<Producto[]>).
  get<T>(ruta: string, filtros?: Filtros): Observable<T> {
    return this.http.get<T>(`${API_URL}/${ruta}`, { params: this.parametros(filtros) });
  }
  post<T>(ruta: string, cuerpo: unknown = {}): Observable<T> {
    return this.http.post<T>(`${API_URL}/${ruta}`, cuerpo);
  }
  patch<T>(ruta: string, cuerpo: unknown): Observable<T> {
    return this.http.patch<T>(`${API_URL}/${ruta}`, cuerpo);
  }
  put<T>(ruta: string, cuerpo: unknown): Observable<T> {
    return this.http.put<T>(`${API_URL}/${ruta}`, cuerpo);
  }

  // archivo(): pide un PDF o Excel. responseType 'blob' = el cuerpo llega como archivo binario, no como JSON.
  // Se pide por HttpClient (y no con un enlace normal) para que el interceptor agregue el token.
  archivo(ruta: string, filtros?: Filtros): Observable<Blob> {
    return this.http.get(`${API_URL}/${ruta}`, { params: this.parametros(filtros), responseType: 'blob' });
  }
}
