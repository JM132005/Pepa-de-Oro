// pie.ts → pie de página de la web pública: datos de la empresa, enlaces, horario y aviso legal.

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SitioService } from '../../Servicios/sitio.service';
import { MENU_PUBLICO } from '../cabecera/cabecera';

@Component({
  selector: 'app-pie',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="web-pie">
      <div class="web-contenedor">
        <div class="columnas">
          <div>
            <h4>Pepa de Oro — Cacao &amp; Café de El Oro</h4>
            <p>Cultivamos, transformamos y compartimos lo mejor del cacao y el café orense desde 2011.</p>
            @if (sitio.empresa(); as e) {
              <p class="tenue" style="color:#b9a587">{{ e.razonSocial }}</p>
            }
          </div>
          <div>
            <h4>La web</h4>
            <ul>
              @for (m of menu; track m.ruta) {
                <li><a [routerLink]="m.ruta">{{ m.texto }}</a></li>
              }
            </ul>
          </div>
          <div>
            <h4>Comprar</h4>
            <ul>
              <li><a routerLink="/productos" [queryParams]="{ familia: 'CHOCOLATES' }">Chocolates</a></li>
              <li><a routerLink="/productos" [queryParams]="{ familia: 'CACAO_GRANO' }">Cacao en grano</a></li>
              <li><a routerLink="/productos" [queryParams]="{ familia: 'CAFE' }">Café</a></li>
              <li><a routerLink="/equipos">Maquinaria</a></li>
              <li><a routerLink="/servicios">Fletes y taller</a></li>
            </ul>
          </div>
          <div>
            <h4>Visítanos</h4>
            @if (sitio.empresa(); as e) {
              <ul>
                <li>Matriz: {{ e.direccionMatriz }}</li>
                <li>Tienda: {{ e.direccionTienda }}</li>
                <li><a [href]="'tel:' + e.telefono">{{ e.telefono }}</a></li>
                <li><a [href]="'mailto:' + e.correo">{{ e.correo }}</a></li>
                <li>{{ e.horario }}</li>
              </ul>
            }
          </div>
        </div>
        <div class="legal">
          <span>© {{ anio }} Pepa de Oro. Proyecto académico: todos los datos son ficticios.</span>
          <span>Precios en USD. La venta se cierra en la tienda o con un asesor.</span>
        </div>
      </div>
    </footer>
  `,
})
export class Pie {
  readonly sitio = inject(SitioService);
  readonly menu = MENU_PUBLICO;
  readonly anio = new Date().getFullYear();
}
