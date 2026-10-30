// login.ts → INICIO DE SESIÓN del sistema interno.
// Pide correo y contraseña, llama a POST /api/auth/login y guarda el token (AuthService).
// Para la presentación hay botones de "cuentas de prueba" que llenan el formulario con cada rol.

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { mensajeError } from '../../../compartido/Utils/errores';

// Cuentas creadas por el seed (backend/src/semilla/datos.ts). Todas usan la misma contraseña de prueba.
const CONTRASENA_DEMO = 'PepaDeOro2026*';
const CUENTAS_DEMO = [
  { rol: 'Gerente', correo: 'gerente@pepadeoro.ec' },
  { rol: 'Caja', correo: 'caja@pepadeoro.ec' },
  { rol: 'Ventas', correo: 'ventas@pepadeoro.ec' },
  { rol: 'Agrónomo', correo: 'agronomo@pepadeoro.ec' },
  { rol: 'Acopio', correo: 'acopio@pepadeoro.ec' },
  { rol: 'Calidad', correo: 'calidad@pepadeoro.ec' },
  { rol: 'Producción', correo: 'produccion@pepadeoro.ec' },
  { rol: 'Bodega', correo: 'bodega@pepadeoro.ec' },
  { rol: 'Logística', correo: 'logistica@pepadeoro.ec' },
  { rol: 'Taller', correo: 'taller@pepadeoro.ec' },
  { rol: 'Bodega + Logística', correo: 'supervisora@pepadeoro.ec' },
];

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly cuentas = CUENTAS_DEMO;
  readonly ocupado = signal(false);
  readonly error = signal<string | null>(null);
  readonly verContrasena = signal(false);

  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
  });

  // usarCuenta(): llena el formulario con una cuenta de prueba.
  usarCuenta(correo: string) {
    this.form.setValue({ correo, contrasena: CONTRASENA_DEMO });
  }

  entrar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.ocupado.set(true);
    this.error.set(null);
    const { correo, contrasena } = this.form.getRawValue();
    this.auth.login(correo.trim().toLowerCase(), contrasena).subscribe({
      next: () => {
        // Si venía de una página protegida (?volver=/admin/caja), vuelve allí; si no, a su inicio.
        const volver = this.ruta.snapshot.queryParamMap.get('volver');
        this.router.navigateByUrl(volver?.startsWith('/admin') ? volver : '/admin');
      },
      error: (e) => {
        this.ocupado.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
}
