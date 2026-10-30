// panel-kpis.ts → dibuja un PANEL completo (tarjetas + gráficos + listas) tal como lo manda la API.
// Un solo componente para los 10 paneles: gerencial, ventas, inventario, campo, acopio, calidad...

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Panel } from '../../Entidades/analitica';
import { TarjetaKpi } from '../tarjeta-kpi/tarjeta-kpi';
import { GraficoComponent } from '../grafico/grafico';

@Component({
  selector: 'app-panel-kpis',
  imports: [TarjetaKpi, GraficoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tarjetas">
      @for (t of panel().tarjetas; track t.id) {
        <app-tarjeta-kpi [tarjeta]="t" />
      }
    </div>
    <div class="graficos">
      @for (g of panel().graficos; track g.id) {
        <section class="tarjeta" [class.ancho]="g.tipo === 'calor' || g.tipo === 'barras_apiladas' || (g.categorias?.length ?? 0) > 14">
          <app-grafico [datos]="g" [titulo]="g.titulo" [alto]="g.tipo === 'medidor' ? 220 : g.tipo === 'calor' ? 340 : 280" />
        </section>
      }
    </div>
    @for (l of panel().listas; track l.id) {
      @if (l.filas.length) {
        <section class="tarjeta lista">
          <h3>{{ l.titulo }}</h3>
          <div class="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  @if (l.semaforo) {
                    <th></th>
                  }
                  @for (c of l.columnas; track c) {
                    <th>{{ c }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (f of l.filas; track $index) {
                  <tr>
                    @if (l.semaforo) {
                      <td><span class="semaforo {{ l.semaforo[$index] }}" [attr.aria-label]="l.semaforo[$index]"></span></td>
                    }
                    @for (celda of f; track $index) {
                      <td [class.num]="typeof celda === 'number'">{{ celda }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    }
  `,
  styles: `
    .tarjetas { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); margin-bottom: 1rem; }
    .graficos { display: grid; gap: 1rem; grid-template-columns: 1fr; margin-bottom: 1rem; }
    @media (min-width: 900px) { .graficos { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ancho { grid-column: 1 / -1; } }
    .lista { margin-bottom: 1rem; }
    .semaforo { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
    .semaforo.rojo { background: var(--peligro); } .semaforo.amarillo { background: var(--oro-500); } .semaforo.verde { background: var(--exito); }
  `,
})
export class PanelKpis {
  readonly panel = input.required<Panel>();
}
