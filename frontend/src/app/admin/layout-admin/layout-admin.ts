// layout-admin.ts → "marco" del SISTEMA INTERNO: menú lateral (solo con lo que los roles permiten),
// barra superior con el título de la página, la campana de alertas y el usuario, y el contenido en el medio.
// En celular el menú se esconde y se abre con el botón ☰.

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs';
import { AuthService } from '../../compartido/Servicios/auth.service';
import { Icono } from '../../compartido/Componentes/icono/icono';
import { CampanaAlertas } from '../Componentes/campana-alertas/campana-alertas';
import { MENU_ADMIN } from '../menu';
import { texto } from '../../compartido/Utils/etiquetas';

@Component({
  selector: 'app-layout-admin',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono, CampanaAlertas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './layout-admin.html',
})
export class LayoutAdmin {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly tituloPagina = inject(Title);

  readonly menuAbierto = signal(false);
  readonly titulo = signal('Sistema');

  // menu: secciones con solo las opciones permitidas; las secciones vacías desaparecen.
  readonly menu = computed(() =>
    MENU_ADMIN.map((s) => ({ ...s, opciones: s.opciones.filter((o) => this.auth.tieneRol(...o.roles)) })).filter((s) => s.opciones.length),
  );
  readonly iniciales = computed(() => {
    const n = this.auth.usuario()?.nombre ?? '?';
    const p = n.split(' ');
    return (p[0][0] + (p[1]?.[0] ?? '')).toUpperCase();
  });
  readonly roles = computed(() => (this.auth.usuario()?.roles ?? []).map((r) => texto(r)).join(' + '));

  constructor() {
    // Al cambiar de página: se cierra el menú del celular y el título de la barra toma el de la pestaña.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        this.menuAbierto.set(false);
        // setTimeout: espera a que Angular termine de poner el título de la nueva ruta.
        setTimeout(() => this.titulo.set(this.tituloPagina.getTitle().replace(' · Sistema', '')));
      });
    this.titulo.set(this.tituloPagina.getTitle().replace(' · Sistema', ''));
  }
}
