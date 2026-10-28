// modal.ts → ventana emergente reutilizable. El contenido se "proyecta" con <ng-content>.
// Uso: @if (abierto()) { <app-modal titulo="Nuevo cliente" (cerrar)="abierto.set(false)"> ...formulario... </app-modal> }

import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { Icono } from '../icono/icono';

@Component({
  selector: 'app-modal',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fondo" (click)="cerrar.emit()"></div>
    <section class="ventana" [class.ancha]="ancho() === 'ancho'" [class.completa]="ancho() === 'completo'" role="dialog" aria-modal="true" [attr.aria-label]="titulo()">
      <header>
        <h3>{{ titulo() }}</h3>
        <button class="btn-icono" type="button" (click)="cerrar.emit()" aria-label="Cerrar"><app-icono nombre="cerrar" /></button>
      </header>
      <div class="cuerpo"><ng-content /></div>
    </section>
  `,
  styles: `
    .fondo { position: fixed; inset: 0; background: rgba(29, 15, 7, 0.45); z-index: 80; }
    /* Centrado SIN transform: inset 0 + margin auto + alto según el contenido.
       (Antes se centraba con transform: translate(-50%, -50%) y la animación de entrada lo pisaba:
       la ventana quedaba corrida abajo a la derecha. Además, un elemento con transform se vuelve el
       "marco" de los position: fixed que tiene dentro, así un modal abierto DENTRO de otro modal
       — como "Nuevo cliente" dentro de una solicitud — salía cortado fuera de la pantalla.) */
    .ventana { position: fixed; z-index: 81; inset: 0; margin: auto; height: fit-content; width: min(560px, calc(100vw - 24px)); max-height: calc(100vh - 32px); display: flex; flex-direction: column; background: var(--superficie); border-radius: var(--radio); box-shadow: var(--sombra-alta); animation: modal-entrar 0.2s ease backwards; }
    /* backwards: la animación solo aplica su estado inicial antes de empezar; al terminar no deja ningún
       transform puesto, así los modales anidados se centran en la pantalla y no dentro del modal padre. */
    @keyframes modal-entrar { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .ventana.ancha { width: min(860px, calc(100vw - 24px)); }
    .ventana.completa { width: min(1100px, calc(100vw - 24px)); height: calc(100vh - 32px); }
    header { display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1rem; border-bottom: 1px solid var(--borde); }
    header h3 { margin: 0; }
    .cuerpo { padding: 1rem; overflow: auto; flex: 1; }
  `,
})
export class Modal {
  readonly titulo = input('');
  readonly ancho = input<'normal' | 'ancho' | 'completo'>('normal');
  // output(): evento que el componente "emite" hacia el padre.
  readonly cerrar = output<void>();

  // @HostListener: escucha la tecla Escape en toda la página para cerrar.
  @HostListener('document:keydown.escape')
  alEscape() {
    this.cerrar.emit();
  }
}
