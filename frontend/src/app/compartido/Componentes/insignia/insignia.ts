// insignia.ts → píldora de color para estados: <app-insignia [valor]="'PAGADA'" />

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { texto, tono } from '../../Utils/etiquetas';

@Component({
  selector: 'app-insignia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="insignia tono-{{ color() }}">{{ etiqueta() ?? textoValor() }}</span>`,
})
export class Insignia {
  readonly valor = input<string | null | undefined>('');
  readonly etiqueta = input<string | undefined>(undefined); // texto propio (opcional)
  readonly forzarTono = input<string | undefined>(undefined);
  readonly color = computed(() => this.forzarTono() ?? tono(this.valor()));
  readonly textoValor = computed(() => texto(this.valor()));
}
