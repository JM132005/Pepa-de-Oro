// tarjeta-producto.ts → tarjeta del catálogo: foto, familia, nombre, precio "desde", estado del stock y sabores.
// Toda la tarjeta es un enlace a la ficha del producto (/productos/:slug).

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductoPublico } from '../../../compartido/Entidades/web';
import { Imagen } from '../../../compartido/Componentes/imagen/imagen';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { dinero } from '../../../compartido/Utils/formato';

@Component({
  selector: 'app-tarjeta-producto',
  imports: [RouterLink, Imagen, Insignia],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="web-producto" [routerLink]="['/productos', p().slug]">
      <div class="foto"><app-imagen [src]="p().imagen" [alt]="p().productoBase" /></div>
      <div class="info">
        <span class="familia">{{ p().familiaNombre }}</span>
        <h3>{{ p().productoBase }}</h3>
        @if (p().sabores.length > 1) {
          <span class="tenue" style="font-size:0.82rem">{{ p().sabores.length }} sabores · {{ p().variantes.length }} presentaciones</span>
        } @else {
          <span class="tenue" style="font-size:0.82rem">{{ p().variantes.length }} presentación(es)</span>
        }
        <div class="pie-tarjeta">
          <span class="web-precio">{{ desde() }}<small> desde</small></span>
          <app-insignia [valor]="p().estado" />
        </div>
      </div>
    </a>
  `,
})
export class TarjetaProducto {
  // alias 'producto': en la plantilla del padre se escribe [producto]="..." aunque aquí se llame p().
  readonly p = input.required<ProductoPublico>({ alias: 'producto' });
  readonly desde = computed(() => dinero(this.p().desde));
}
