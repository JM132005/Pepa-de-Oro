// notificaciones.ts → dibuja los avisos (toasts) que pide NotificacionService.

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificacionService } from '../../Servicios/notificacion.service';

@Component({
  selector: 'app-notificaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pila" aria-live="polite">
      @for (a of servicio.avisos(); track a.id) {
        <div class="aviso-flotante aparecer {{ a.tipo }}" (click)="servicio.cerrar(a.id)">
          <strong>{{ a.tipo === 'exito' ? '✓' : a.tipo === 'error' ? '⚠' : 'ℹ' }}</strong>
          <span>{{ a.texto }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .pila { position: fixed; right: 12px; bottom: 12px; z-index: 120; display: flex; flex-direction: column; gap: 0.5rem; max-width: min(420px, calc(100vw - 24px)); }
    .aviso-flotante { display: flex; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: var(--radio-sm); box-shadow: var(--sombra-alta); cursor: pointer; font-size: 0.9rem; background: var(--superficie); border-left: 4px solid var(--info); }
    .exito { border-left-color: var(--exito); } .error { border-left-color: var(--peligro); }
  `,
})
export class Notificaciones {
  readonly servicio = inject(NotificacionService);
}
