// cargando.ts → indicador de "cargando..." y estado vacío reutilizables.

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-cargando',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="cargando"><span class="punto"></span><span class="punto"></span><span class="punto"></span> {{ texto() }}</div>`,
  styles: `
    .cargando { display: flex; align-items: center; gap: 0.35rem; color: var(--texto-suave); padding: 1.5rem; justify-content: center; }
    .punto { width: 8px; height: 8px; border-radius: 50%; background: var(--oro-500); animation: rebote 1s infinite ease-in-out; }
    .punto:nth-child(2) { animation-delay: 0.15s; } .punto:nth-child(3) { animation-delay: 0.3s; }
    @keyframes rebote { 0%, 80%, 100% { transform: scale(0.5); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
  `,
})
export class Cargando {
  readonly texto = input('Cargando');
}

@Component({
  selector: 'app-vacio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="vacio"><div class="dibujo">🌱</div><p>{{ texto() }}</p><ng-content /></div>`,
  styles: `.vacio { text-align: center; padding: 2rem 1rem; color: var(--texto-suave); } .dibujo { font-size: 2rem; margin-bottom: 0.25rem; }`,
})
export class Vacio {
  readonly texto = input('No hay datos para mostrar');
}
