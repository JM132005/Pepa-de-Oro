// no-encontrada.ts → página 404: la dirección escrita no existe.

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-encontrada',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section style="min-height:80vh;display:grid;place-items:center;text-align:center;padding:2rem">
      <div>
        <img src="/img/logo.svg" alt="" width="72" height="72" style="margin:0 auto 1rem" />
        <h1>Esta pepa se perdió en el camino</h1>
        <p class="tenue">La página que buscas no existe o cambió de dirección.</p>
        <div class="acciones" style="justify-content:center">
          <a class="btn btn-primario" routerLink="/">Ir al inicio</a>
          <a class="btn btn-borde" routerLink="/productos">Ver productos</a>
        </div>
      </div>
    </section>
  `,
})
export class NoEncontrada {}
