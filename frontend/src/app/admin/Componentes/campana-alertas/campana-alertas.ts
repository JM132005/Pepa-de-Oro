// campana-alertas.ts → la CAMPANA de la barra superior. Junta las alertas de todos los módulos
// (stock bajo, vencimientos, mantenimiento, labores atrasadas, facturas vencidas...) filtradas por los
// roles del usuario (el backend ya las filtra) y se actualiza sola cada minuto.

import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, computed, inject, signal, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnaliticaService } from '../../../compartido/Servicios/analitica.service';
import { Alerta } from '../../../compartido/Entidades/analitica';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { REFRESCO_ALERTAS_MS } from '../../../compartido/Utils/config';

@Component({
  selector: 'app-campana-alertas',
  imports: [RouterLink, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-campana">
      <button class="btn-icono" type="button" (click)="abierta.set(!abierta())" [attr.aria-expanded]="abierta()" aria-label="Alertas" title="Alertas">
        <app-icono nombre="campana" [tam]="22" />
        @if (alertas().length) {
          <span class="burbuja">{{ alertas().length > 99 ? '99+' : alertas().length }}</span>
        }
      </button>
      @if (abierta()) {
        <div class="adm-desplegable aparecer">
          <header class="fila entre">
            <span>Alertas ({{ alertas().length }})</span>
            <span class="tenue" style="font-weight:500;font-size:0.8rem">{{ altas() }} urgentes</span>
          </header>
          @for (a of alertas(); track $index) {
            <a class="adm-alerta" [class.alta]="a.nivel === 'ALTA'" [routerLink]="a.ruta ?? '/admin'" (click)="abierta.set(false)">
              <span class="punto"></span>
              <span><strong>{{ a.area }}</strong> · {{ a.mensaje }}</span>
            </a>
          } @empty {
            <p class="tenue" style="padding:1rem;margin:0">Todo en orden: no hay alertas. 🌱</p>
          }
        </div>
      }
    </div>
  `,
})
export class CampanaAlertas {
  private readonly analitica = inject(AnaliticaService);
  private readonly elemento = inject(ElementRef);
  readonly alertas = signal<Alerta[]>([]);
  readonly abierta = signal(false);
  readonly altas = computed(() => this.alertas().filter((a) => a.nivel === 'ALTA').length);

  constructor() {
    this.cargar();
    const reloj = setInterval(() => this.cargar(), REFRESCO_ALERTAS_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  cargar() {
    // Las ALTAS primero.
    this.analitica.alertas().subscribe({ next: (a) => this.alertas.set([...a].sort((x, y) => (x.nivel === y.nivel ? 0 : x.nivel === 'ALTA' ? -1 : 1))), error: () => undefined });
  }

  // Si se hace clic fuera de la campana, el desplegable se cierra.
  @HostListener('document:click', ['$event'])
  clicFuera(e: MouseEvent) {
    if (this.abierta() && !this.elemento.nativeElement.contains(e.target)) this.abierta.set(false);
  }
}
