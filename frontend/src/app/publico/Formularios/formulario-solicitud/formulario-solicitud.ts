// formulario-solicitud.ts → datos de contacto del visitante (nombre, correo, teléfono, ciudad, mensaje).
// Lo usan Contacto, la Lista de interés, Equipos y Servicios. Cada página agrega lo suyo
// (productos, equipo, fechas) y envía todo junto al backend como una "solicitud web".
//
// Uso: <app-formulario-solicitud [ocupado]="enviando()" (enviar)="enviar($event)" />

import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
// FormBuilder: atajo para crear formularios reactivos. Validators: reglas (obligatorio, correo, largo).
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

export interface DatosContacto {
  nombre: string;
  correo: string;
  telefono?: string;
  empresa?: string;
  ciudad?: string;
  mensaje?: string;
  sitioWeb?: string; // campo trampa anti-spam (debe llegar vacío)
}

@Component({
  selector: 'app-formulario-solicitud',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="mandar()" novalidate>
      <div class="rejilla-form">
        <div class="campo">
          <label for="sol-nombre">Nombre y apellido *</label>
          <input id="sol-nombre" formControlName="nombre" autocomplete="name" />
          @if (form.controls.nombre.invalid && form.controls.nombre.touched) {
            <span class="error-campo">Escribe tu nombre (mínimo 3 letras)</span>
          }
        </div>
        <div class="campo">
          <label for="sol-correo">Correo *</label>
          <input id="sol-correo" type="email" formControlName="correo" autocomplete="email" />
          @if (form.controls.correo.invalid && form.controls.correo.touched) {
            <span class="error-campo">Escribe un correo válido</span>
          }
        </div>
        <div class="campo">
          <label for="sol-telefono">Teléfono o WhatsApp</label>
          <input id="sol-telefono" type="tel" formControlName="telefono" autocomplete="tel" placeholder="09…" />
        </div>
        <div class="campo">
          <label for="sol-ciudad">Ciudad</label>
          <input id="sol-ciudad" formControlName="ciudad" autocomplete="address-level2" />
        </div>
        @if (conEmpresa()) {
          <div class="campo ancho-completo">
            <label for="sol-empresa">Empresa o negocio (opcional)</label>
            <input id="sol-empresa" formControlName="empresa" autocomplete="organization" />
          </div>
        }
        <div class="campo ancho-completo">
          <label for="sol-mensaje">Mensaje</label>
          <textarea id="sol-mensaje" rows="4" formControlName="mensaje"></textarea>
        </div>
      </div>
      <!-- Campo TRAMPA: oculto con CSS. Una persona no lo ve; un robot de spam lo llena y el backend lo descarta. -->
      <div class="campo-trampa" aria-hidden="true">
        <label for="sol-web">No llenes este campo</label>
        <input id="sol-web" formControlName="sitioWeb" tabindex="-1" autocomplete="off" />
      </div>
      <ng-content />
      <button class="btn btn-primario" type="submit" [disabled]="ocupado()">{{ ocupado() ? 'Enviando…' : textoBoton() }}</button>
      <p class="tenue" style="font-size:0.8rem;margin-top:0.6rem">Te enviaremos una confirmación por correo. No compartimos tus datos.</p>
    </form>
  `,
})
export class FormularioSolicitud {
  private readonly fb = inject(FormBuilder);
  readonly textoBoton = input('Enviar solicitud');
  readonly mensajeInicial = input('');
  readonly conEmpresa = input(true);
  readonly ocupado = input(false);
  readonly enviar = output<DatosContacto>();

  // form: grupo de controles. nonNullable: al reiniciar, los campos vuelven a '' (no a null).
  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: ['', Validators.maxLength(20)],
    ciudad: ['', Validators.maxLength(80)],
    empresa: ['', Validators.maxLength(120)],
    mensaje: ['', Validators.maxLength(2000)],
    sitioWeb: [''],
  });

  constructor() {
    // effect(): cuando la página cambia el mensaje inicial (ej. "Me interesa el tractor..."), se copia al campo.
    effect(() => {
      if (this.mensajeInicial()) this.form.controls.mensaje.setValue(this.mensajeInicial());
    });
  }

  mandar() {
    this.form.markAllAsTouched(); // muestra los errores de los campos que no tocó
    if (this.form.invalid) return;
    // Se quitan los campos vacíos para no enviar textos "" al backend.
    const v = this.form.getRawValue();
    const datos = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '')) as unknown as DatosContacto;
    this.enviar.emit(datos);
  }

  // reiniciar(): la página lo llama cuando el envío salió bien.
  reiniciar() {
    this.form.reset();
  }
}
