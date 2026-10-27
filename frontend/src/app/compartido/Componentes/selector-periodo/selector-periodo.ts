// selector-periodo.ts → filtro de fechas reutilizable: botones rápidos (hoy, semana, mes, año) o rango a mano.

import { ChangeDetectionStrategy, Component, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isoDia } from '../../Utils/formato';

@Component({
  selector: 'app-selector-periodo',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="periodo">
      @for (p of rapidos; track p.id) {
        <button type="button" class="btn btn-sm" [class.btn-primario]="activo() === p.id" [class.btn-borde]="activo() !== p.id" (click)="elegir(p.id)">{{ p.texto }}</button>
      }
      <input type="date" [(ngModel)]="desde" (change)="manual()" aria-label="Desde" />
      <span class="tenue">a</span>
      <input type="date" [(ngModel)]="hasta" (change)="manual()" aria-label="Hasta" />
    </div>
  `,
  styles: `.periodo { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; } input { width: auto; padding: 0.35rem 0.5rem; }`,
})
export class SelectorPeriodo {
  // model(): valor de doble vía. El padre usa [(desde)] y [(hasta)].
  readonly desde = model(isoDia(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  readonly hasta = model(isoDia());
  readonly cambio = output<{ desde: string; hasta: string }>();
  readonly activo = signal('mes');
  readonly rapidos = [
    { id: 'hoy', texto: 'Hoy' },
    { id: 'semana', texto: '7 días' },
    { id: 'mes', texto: 'Este mes' },
    { id: 'anterior', texto: 'Mes anterior' },
    { id: 'anio', texto: 'Este año' },
  ];

  elegir(id: string) {
    const hoy = new Date();
    const rangos: Record<string, [Date, Date]> = {
      hoy: [hoy, hoy],
      semana: [new Date(hoy.getTime() - 6 * 86_400_000), hoy],
      mes: [new Date(hoy.getFullYear(), hoy.getMonth(), 1), hoy],
      anterior: [new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1), new Date(hoy.getFullYear(), hoy.getMonth(), 0)],
      anio: [new Date(hoy.getFullYear(), 0, 1), hoy],
    };
    const [d, h] = rangos[id];
    this.activo.set(id);
    this.desde.set(isoDia(d));
    this.hasta.set(isoDia(h));
    this.cambio.emit({ desde: this.desde(), hasta: this.hasta() });
  }

  manual() {
    this.activo.set('');
    this.cambio.emit({ desde: this.desde(), hasta: this.hasta() });
  }
}
