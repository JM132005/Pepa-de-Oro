// paneles.ts → PANELES DE CONTROL (dashboards). Un panel gerencial y uno por área (ventas, inventario,
// campo, acopio, calidad, producción, equipos, logística, mantenimiento). Cada uno se filtra por fecha y
// compara contra el período anterior (▲/▼). Las pestañas muestran solo los paneles que el rol puede ver.
// Todo el contenido (tarjetas, gráficos y listas) lo arma el backend (kpis.service.ts) y lo dibuja <app-panel-kpis>.

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnaliticaService } from '../../../compartido/Servicios/analitica.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Panel } from '../../../compartido/Entidades/analitica';
import { PanelKpis } from '../../../compartido/Componentes/panel-kpis/panel-kpis';
import { SelectorPeriodo } from '../../../compartido/Componentes/selector-periodo/selector-periodo';
import { Cargando } from '../../../compartido/Componentes/cargando/cargando';
import { mensajeError } from '../../../compartido/Utils/errores';
import { isoDia } from '../../../compartido/Utils/formato';
import { PANELES } from '../../menu';

@Component({
  selector: 'app-paneles',
  imports: [RouterLink, PanelKpis, SelectorPeriodo, Cargando],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paneles.html',
})
export class Paneles {
  private readonly analitica = inject(AnaliticaService);
  private readonly auth = inject(AuthService);

  // area: viene de la URL /admin/paneles/:area
  readonly area = input.required<string>();
  readonly desde = signal(isoDia(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  readonly hasta = signal(isoDia());
  readonly panel = signal<Panel | null>(null);
  readonly error = signal<string | null>(null);
  readonly cargando = signal(false);

  // disponibles: pestañas que este usuario puede ver.
  readonly disponibles = computed(() => PANELES.filter((p) => this.auth.tieneRol(...p.roles)));

  constructor() {
    // effect(): se vuelve a pedir el panel cuando cambia el área (pestaña) o el período.
    effect(() => {
      const area = this.area();
      const desde = this.desde();
      const hasta = this.hasta();
      this.cargar(area, desde, hasta);
    });
  }

  private cargar(area: string, desde: string, hasta: string) {
    // Si el usuario no puede ver el panel pedido (ej. un agrónomo en /paneles/gerencial), se le muestra el suyo.
    const permitido = this.disponibles().find((p) => p.area === area) ?? this.disponibles()[0];
    if (!permitido) return;
    this.cargando.set(true);
    this.error.set(null);
    this.analitica.panel(permitido.area, desde, hasta).subscribe({
      next: (p) => {
        this.panel.set(p);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  cambiarPeriodo(p: { desde: string; hasta: string }) {
    this.desde.set(p.desde);
    this.hasta.set(p.hasta);
  }
}
