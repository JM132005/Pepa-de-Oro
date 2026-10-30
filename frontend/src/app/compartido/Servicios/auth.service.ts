// auth.service.ts → SERVICIO de sesión: inicia/cierra sesión y recuerda quién está conectado.

// signal / computed: valores reactivos; cuando cambian, la pantalla se actualiza sola.
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
// tap: operador de RxJS que ejecuta algo con la respuesta sin modificarla.
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { CLAVE_SESION } from '../Utils/config';
import { RespuestaLogin, Rol, Usuario } from '../Entidades/usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  // Estado de la sesión (privado: solo este servicio lo cambia).
  private readonly sesion = signal<RespuestaLogin | null>(this.leerSesionGuardada());

  // computed: se recalculan solos cuando cambia "sesion".
  readonly usuario = computed<Usuario | null>(() => this.sesion()?.usuario ?? null);
  readonly token = computed<string | null>(() => this.sesion()?.token ?? null);
  readonly conectado = computed(() => this.token() !== null);
  readonly esGerente = computed(() => this.usuario()?.roles.includes('GERENTE') ?? false);

  login(correo: string, contrasena: string): Observable<RespuestaLogin> {
    return this.api.post<RespuestaLogin>('auth/login', { correo, contrasena }).pipe(
      tap((respuesta) => {
        this.sesion.set(respuesta);
        this.guardarSesion(respuesta);
      }),
    );
  }

  logout(): void {
    this.sesion.set(null);
    this.guardarSesion(null);
    this.router.navigate(['/login']);
  }

  // tieneRol(): ¿tiene alguno de estos roles? El GERENTE siempre puede (igual que en el backend).
  tieneRol(...roles: Rol[]): boolean {
    const u = this.usuario();
    if (!u) return false;
    return u.roles.includes('GERENTE') || u.roles.some((r) => roles.includes(r));
  }

  // localStorage: la sesión sobrevive al recargar. try/catch: en incógnito puede estar bloqueado.
  private leerSesionGuardada(): RespuestaLogin | null {
    try {
      const texto = localStorage.getItem(CLAVE_SESION);
      return texto ? (JSON.parse(texto) as RespuestaLogin) : null;
    } catch {
      return null;
    }
  }

  private guardarSesion(valor: RespuestaLogin | null): void {
    try {
      if (valor) localStorage.setItem(CLAVE_SESION, JSON.stringify(valor));
      else localStorage.removeItem(CLAVE_SESION);
    } catch {
      /* sin almacenamiento: la sesión dura hasta recargar */
    }
  }
}
