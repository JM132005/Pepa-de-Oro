// boton-whatsapp.ts → botón verde flotante (abajo a la derecha) que abre WhatsApp con un mensaje ya escrito.
// La página actual puede cambiar el mensaje (ej. en la ficha: "me interesa el Chocolate 70 % maracuyá").

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { SitioService } from '../../Servicios/sitio.service';
import { Icono } from '../../../compartido/Componentes/icono/icono';

@Component({
  selector: 'app-boton-whatsapp',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- target="_blank": abre en otra pestaña. rel="noopener": la pestaña nueva no puede controlar esta (seguridad). -->
    <a class="web-whatsapp" [href]="enlace()" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp" title="Escríbenos por WhatsApp">
      <app-icono nombre="whatsapp" [tam]="28" />
    </a>
  `,
})
export class BotonWhatsapp {
  private readonly sitio = inject(SitioService);
  readonly mensaje = input('Hola Pepa de Oro, quisiera información');
  readonly enlace = computed(() => this.sitio.enlaceWhatsapp(this.mensaje()));
}
