// formulario-dinamico.ts → FORMULARIO que se arma a partir de una lista de campos.
// En vez de escribir 20 formularios casi iguales (bodega, trabajador, productor...), cada pantalla
// describe sus campos y este componente dibuja el formulario reactivo con sus validaciones.
//
// Uso: <app-formulario-dinamico [campos]="campos" [valores]="cliente" (guardar)="guardar($event)" />

import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
// FormBuilder/FormGroup/Validators: herramientas de formularios REACTIVOS de Angular.
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { identificacionValidador } from '../../Utils/validadores';

export interface CampoFormulario {
  nombre: string;
  etiqueta: string;
  tipo: 'texto' | 'numero' | 'fecha' | 'seleccion' | 'multiple' | 'casilla' | 'area' | 'correo' | 'contrasena' | 'identificacion';
  requerido?: boolean;
  opciones?: { valor: string | number; texto: string }[];
  min?: number;
  max?: number;
  paso?: number;
  ayuda?: string;
  ancho?: boolean; // ocupa las dos columnas
  campoTipoIdentificacion?: string; // para "identificacion": qué campo dice si es CÉDULA o RUC
}

@Component({
  selector: 'app-formulario-dinamico',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (formulario(); as f) {
      <form [formGroup]="f" (ngSubmit)="enviar()" novalidate>
        <div class="rejilla-form">
          @for (c of campos(); track c.nombre) {
            <div class="campo" [class.ancho-completo]="c.ancho || c.tipo === 'area' || c.tipo === 'multiple'">
              @switch (c.tipo) {
                @case ('casilla') {
                  <label class="casilla"><input type="checkbox" [formControlName]="c.nombre" /> {{ c.etiqueta }}</label>
                }
                @case ('seleccion') {
                  <label [for]="c.nombre">{{ c.etiqueta }}{{ c.requerido ? ' *' : '' }}</label>
                  <select [id]="c.nombre" [formControlName]="c.nombre">
                    <option [ngValue]="null">— Elegir —</option>
                    @for (o of c.opciones; track o.valor) {
                      <option [ngValue]="o.valor">{{ o.texto }}</option>
                    }
                  </select>
                }
                @case ('multiple') {
                  <label>{{ c.etiqueta }}</label>
                  <div class="opciones">
                    @for (o of c.opciones; track o.valor) {
                      <label class="casilla"><input type="checkbox" [checked]="marcado(c.nombre, o.valor)" (change)="alternar(c.nombre, o.valor)" /> {{ o.texto }}</label>
                    }
                  </div>
                }
                @case ('area') {
                  <label [for]="c.nombre">{{ c.etiqueta }}</label>
                  <textarea [id]="c.nombre" rows="3" [formControlName]="c.nombre"></textarea>
                }
                @default {
                  <label [for]="c.nombre">{{ c.etiqueta }}{{ c.requerido ? ' *' : '' }}</label>
                  <input [id]="c.nombre" [type]="tipoHtml(c)" [formControlName]="c.nombre" [attr.min]="c.min" [attr.max]="c.max" [attr.step]="c.paso ?? (c.tipo === 'numero' ? 'any' : null)" />
                }
              }
              @if (c.ayuda) {
                <small>{{ c.ayuda }}</small>
              }
              @if (f.get(c.nombre)?.invalid && f.get(c.nombre)?.touched) {
                <span class="error-campo">{{ mensaje(c) }}</span>
              }
            </div>
          }
        </div>
        <div class="acciones fin">
          <ng-content />
          <button class="btn btn-primario" type="submit" [disabled]="ocupado()">{{ ocupado() ? 'Guardando…' : textoBoton() }}</button>
        </div>
      </form>
    }
  `,
  styles: `
    .casilla { display: flex; gap: 0.4rem; align-items: center; font-weight: 500; color: var(--texto); }
    .opciones { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; }
    .fin { justify-content: flex-end; margin-top: 0.5rem; }
  `,
})
export class FormularioDinamico {
  readonly campos = input.required<CampoFormulario[]>();
  readonly valores = input<Record<string, any> | null>(null);
  readonly textoBoton = input('Guardar');
  readonly ocupado = input(false);
  readonly guardar = output<Record<string, any>>();
  readonly formulario = signal<FormGroup | null>(null);

  constructor() {
    // Cada vez que cambian los campos o los valores iniciales, se arma de nuevo el FormGroup.
    effect(() => {
      const valores = this.valores() ?? {};
      const controles: Record<string, FormControl> = {};
      for (const c of this.campos()) {
        const validadores: ValidatorFn[] = [];
        if (c.requerido) validadores.push(Validators.required);
        if (c.tipo === 'correo') validadores.push(Validators.email);
        if (c.min !== undefined) validadores.push(Validators.min(c.min));
        if (c.max !== undefined) validadores.push(Validators.max(c.max));
        if (c.tipo === 'contrasena') validadores.push(Validators.minLength(8));
        let inicial = this.leer(valores, c.nombre);
        if (c.tipo === 'fecha' && inicial) inicial = String(inicial).slice(0, 10);
        if (c.tipo === 'multiple') inicial = Array.isArray(inicial) ? inicial : [];
        if (c.tipo === 'casilla') inicial = Boolean(inicial);
        controles[c.nombre] = new FormControl(inicial ?? (c.tipo === 'seleccion' ? null : ''), validadores);
      }
      const grupo = new FormGroup(controles);
      // Validador de cédula/RUC (RN-02) que lee el tipo elegido en otro campo del mismo formulario.
      for (const c of this.campos().filter((x) => x.tipo === 'identificacion')) {
        grupo.get(c.nombre)!.addValidators(identificacionValidador(() => grupo.get(c.campoTipoIdentificacion ?? 'tipoIdentificacion')?.value ?? 'CEDULA'));
      }
      this.formulario.set(grupo);
    });
  }

  private leer(obj: Record<string, any>, ruta: string) {
    return ruta.split('.').reduce((o: any, k) => (o === null || o === undefined ? undefined : o[k]), obj);
  }

  tipoHtml(c: CampoFormulario) {
    return { numero: 'number', fecha: 'date', correo: 'email', contrasena: 'password' }[c.tipo as string] ?? 'text';
  }

  marcado(nombre: string, valor: unknown) {
    return ((this.formulario()?.get(nombre)?.value as unknown[]) ?? []).includes(valor);
  }

  alternar(nombre: string, valor: unknown) {
    const control = this.formulario()!.get(nombre)!;
    const actual = (control.value as unknown[]) ?? [];
    control.setValue(actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor]);
  }

  mensaje(c: CampoFormulario) {
    const e = this.formulario()?.get(c.nombre)?.errors ?? {};
    if (e['required']) return 'Este campo es obligatorio';
    if (e['email']) return 'El correo no es válido';
    if (e['min']) return `Mínimo ${c.min}`;
    if (e['max']) return `Máximo ${c.max}`;
    if (e['minlength']) return 'Mínimo 8 caracteres';
    if (e['identificacion']) return e['identificacion'];
    return 'Valor no válido';
  }

  // enviar(): marca todo como tocado (para mostrar errores) y, si es válido, entrega los datos al padre.
  enviar() {
    const f = this.formulario()!;
    f.markAllAsTouched();
    if (f.invalid) return;
    const datos: Record<string, any> = {};
    for (const c of this.campos()) {
      let v = f.get(c.nombre)!.value;
      if (c.tipo === 'numero' && v !== '' && v !== null) v = Number(v);
      if (v === '' || v === null) continue; // los vacíos no se envían
      // Rutas con punto ("tarifas.dia") se convierten en objetos anidados { tarifas: { dia } }.
      const partes = c.nombre.split('.');
      let destino = datos;
      partes.slice(0, -1).forEach((p) => (destino = destino[p] ??= {}));
      destino[partes.at(-1)!] = v;
    }
    this.guardar.emit(datos);
  }
}
