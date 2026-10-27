// cabecera.ts → barra superior de la web pública: logo, menú, botón de la lista de interés y acceso al sistema.
// En celular el menú se esconde detrás del botón ☰ (hamburguesa).

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
// RouterLink: enlaces internos sin recargar la página. RouterLinkActive: agrega una clase al enlace de la página actual.
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { ListaInteresService } from '../../../compartido/Servicios/lista-interes.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';

// Arreglo con las opciones del menú (así el menú de escritorio y el del celular salen de la misma lista).
export const MENU_PUBLICO = [
  { ruta: '/', texto: 'Inicio', exacto: true },
  { ruta: '/nosotros', texto: 'Nosotros', exacto: false },
  { ruta: '/productos', texto: 'Productos', exacto: false },
  { ruta: '/equipos', texto: 'Equipos', exacto: false },
  { ruta: '/servicios', texto: 'Servicios', exacto: false },
  { ruta: '/rastreo', texto: 'Rastrea tu cacao', exacto: false },
  { ruta: '/contacto', texto: 'Contacto', exacto: false },
];

@Component({
  selector: 'app-cabecera',
  imports: [RouterLink, RouterLinkActive, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="web-cabecera">
      <div class="web-contenedor barra">
        <a routerLink="/" class="web-logo" aria-label="Pepa de Oro, inicio">
          <img src="/img/logo.svg" alt="" width="36" height="36" />
          <span>Pepa de Oro<small>Cacao &amp; Café de El Oro</small></span>
        </a>

        <nav class="web-nav" aria-label="Menú principal">
          @for (m of menu; track m.ruta) {
            <a [routerLink]="m.ruta" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: m.exacto }">{{ m.texto }}</a>
          }
        </nav>

        <div class="derecha-cab">
          <!-- Lista de interés: NO es un carrito (no se paga en línea), es una lista para pedir cotización -->
          <button class="btn-icono contador-interes" type="button" (click)="interes.abierta.set(true)" aria-label="Mi lista de interés" title="Mi lista de interés">
            <app-icono nombre="lista" [tam]="22" />
            @if (interes.cantidad()) {
              <span class="burbuja">{{ interes.cantidad() }}</span>
            }
          </button>
          <a class="btn btn-borde btn-sm" [routerLink]="auth.conectado() ? '/admin' : '/login'">
            <app-icono nombre="usuarios" [tam]="16" /> {{ auth.conectado() ? 'Sistema' : 'Ingresar' }}
          </a>
          <button class="btn-icono solo-movil" type="button" (click)="abierto.set(!abierto())" [attr.aria-expanded]="abierto()" aria-label="Abrir menú">
            <app-icono [nombre]="abierto() ? 'cerrar' : 'menu'" [tam]="24" />
          </button>
        </div>
      </div>

      @if (abierto()) {
        <nav class="web-contenedor web-menu-movil solo-movil aparecer" aria-label="Menú">
          @for (m of menu; track m.ruta) {
            <a [routerLink]="m.ruta" (click)="abierto.set(false)">{{ m.texto }}</a>
          }
        </nav>
      }
    </header>
  `,
})
export class Cabecera {
  readonly interes = inject(ListaInteresService);
  readonly auth = inject(AuthService);
  readonly menu = MENU_PUBLICO;
  // abierto: ¿el menú del celular está desplegado?
  readonly abierto = signal(false);
}
