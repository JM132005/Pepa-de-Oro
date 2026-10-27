// inicio-admin.ts → INICIO POR ROL: cada usuario entra a su propio tablero.
//   · saludo y fecha,
//   · accesos rápidos a sus pantallas (según sus roles),
//   · las alertas más urgentes de su área,
//   · el panel de KPIs de su área del mes en curso (el gerente ve el gerencial; el agrónomo, campo...).
// Además, a la cajera le muestra el estado de la caja y al agrónomo la agenda de labores atrasadas.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { AnaliticaService } from '../../../compartido/Servicios/analitica.service';
import { VentasService } from '../../../compartido/Servicios/ventas.service';
import { CampoService } from '../../../compartido/Servicios/campo.service';
import { Alerta, Panel } from '../../../compartido/Entidades/analitica';
import { TurnoCaja } from '../../../compartido/Entidades/ventas';
import { PanelKpis } from '../../../compartido/Componentes/panel-kpis/panel-kpis';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Cargando } from '../../../compartido/Componentes/cargando/cargando';
import { dinero, fechaHora } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { MENU_ADMIN, PANEL_DE_ROL } from '../../menu';

@Component({
  selector: 'app-inicio-admin',
  imports: [RouterLink, PanelKpis, Icono, Cargando],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inicio-admin.html',
})
export class InicioAdmin {
  readonly auth = inject(AuthService);
  private readonly analitica = inject(AnaliticaService);
  private readonly ventas = inject(VentasService);
  private readonly campo = inject(CampoService);

  readonly panel = signal<Panel | null>(null);
  readonly alertas = signal<Alerta[]>([]);
  readonly caja = signal<TurnoCaja | null | undefined>(undefined);
  readonly agenda = signal<{ parcela: { _id: string; codigo: string }; atrasadas: { tipo: string; diasAtraso: number }[]; bloqueo: string | null }[]>([]);

  // rolPrincipal: el primer rol del usuario decide qué panel ve al entrar.
  readonly rolPrincipal = computed(() => this.auth.usuario()?.roles[0] ?? 'GERENTE');
  readonly saludo = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  });
  // accesos: las opciones del menú que su rol permite (sin "Inicio" ni "Paneles").
  readonly accesos = computed(() =>
    MENU_ADMIN.flatMap((s) => s.opciones)
      .filter((o) => !['/admin', '/admin/paneles/gerencial'].includes(o.ruta) && this.auth.tieneRol(...o.roles))
      .slice(0, 10),
  );
  readonly hoy = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  readonly dinero = dinero;
  readonly fechaHora = fechaHora;
  readonly texto = texto;

  constructor() {
    const area = PANEL_DE_ROL[this.rolPrincipal()];
    this.analitica.panel(area).subscribe({ next: (p) => this.panel.set(p), error: () => undefined });
    this.analitica.alertas().subscribe({ next: (a) => this.alertas.set([...a].sort((x, y) => (x.nivel === 'ALTA' ? -1 : 1) - (y.nivel === 'ALTA' ? -1 : 1)).slice(0, 6)), error: () => undefined });
    if (this.auth.tieneRol('VENTAS')) this.ventas.cajaActual().subscribe({ next: (c) => this.caja.set(c), error: () => this.caja.set(null) });
    if (this.auth.usuario()?.roles.includes('AGRONOMO')) this.campo.agenda().subscribe({ next: (a) => this.agenda.set(a.filter((x) => x.atrasadas.length || x.bloqueo)), error: () => undefined });
  }
}
