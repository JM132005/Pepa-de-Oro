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
    <section class="ventana aparecer" [class.ancha]="ancho() === 'ancho'" [class.completa]="ancho() === 'completo'" role="dialog" aria-modal="true" [attr.aria-label]="titulo()">
      <header>
        <h3>{{ titulo() }}</h3>
        <button class="btn-icono" type="button" (click)="cerrar.emit()" aria-label="Cerrar"><app-icono nombre="cerrar" /></button>
      </header>
      <div class="cuerpo"><ng-content /></div>
    </section>
  `,
  styles: `
    .fondo { position: fixed; inset: 0; background: rgba(29, 15, 7, 0.45); z-index: 80; }
    .ventana { position: fixed; z-index: 81; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, calc(100vw - 24px)); max-height: calc(100vh - 32px); display: flex; flex-direction: column; background: var(--superficie); border-radius: var(--radio); box-shadow: var(--sombra-alta); }
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
