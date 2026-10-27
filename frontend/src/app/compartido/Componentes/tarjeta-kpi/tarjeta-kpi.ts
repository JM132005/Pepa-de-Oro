// tarjeta-kpi.ts → una tarjeta de indicador: título, valor grande y variación (▲ verde / ▼ rojo).
// Si el indicador es un costo o un rechazo (mejorSiBaja), BAJAR es bueno y la flecha se pinta verde.

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tarjeta } from '../../Entidades/analitica';
import { dinero, numero } from '../../Utils/formato';

@Component({
  selector: 'app-tarjeta-kpi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="kpi" [title]="t().ayuda">
      <p class="titulo">{{ t().titulo }}</p>
      <p class="valor">{{ valorTexto() }}</p>
      @if (t().variacion !== null && t().variacion !== undefined) {
        <p class="variacion" [class.bueno]="esBueno()" [class.malo]="!esBueno()">
          <span aria-hidden="true">{{ t().variacion! >= 0 ? '▲' : '▼' }}</span>
          {{ abs() }} % <span class="tenue">vs. período anterior ({{ anteriorTexto() }})</span>
        </p>
      } @else {
        <p class="variacion tenue">{{ t().ayuda }}</p>
      }
    </article>
  `,
  styles: `
    .kpi { background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); padding: 0.85rem 1rem; box-shadow: var(--sombra); min-height: 112px; }
    .titulo { font-size: 0.8rem; color: var(--texto-suave); margin: 0 0 0.25rem; font-weight: 600; }
    .valor { font-family: var(--fuente-titulos); font-size: 1.65rem; font-weight: 700; margin: 0; color: var(--texto); font-variant-numeric: tabular-nums; }
    .variacion { font-size: 0.78rem; margin: 0.25rem 0 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .bueno { color: var(--exito); } .malo { color: var(--peligro); }
  `,
})
export class TarjetaKpi {
  readonly t = input.required<Tarjeta>({ alias: 'tarjeta' });

  private formatear(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    switch (this.t().formato) {
      case 'dinero':
        return dinero(v);
      case 'porcentaje':
        return `${numero(v, 1)} %`;
      case 'kg':
        return `${numero(v, 0)} kg`;
      case 'dias':
        return `${numero(v, 0)} días`;
      case 'horas':
        return `${numero(v, 1)} h`;
      default:
        return numero(v);
    }
  }
  readonly valorTexto = computed(() => this.formatear(this.t().valor));
  readonly anteriorTexto = computed(() => this.formatear(this.t().anterior));
  readonly abs = computed(() => numero(Math.abs(this.t().variacion ?? 0), 1));
  readonly esBueno = computed(() => ((this.t().variacion ?? 0) >= 0) !== Boolean(this.t().mejorSiBaja));
}
