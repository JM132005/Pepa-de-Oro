// app.ts → componente RAÍZ. Solo contiene el "hueco" donde se dibuja cada página (<router-outlet>)
// y dos piezas globales: los avisos emergentes y el visor de PDF.

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Notificaciones } from './compartido/Componentes/notificaciones/notificaciones';
import { VisorPdf } from './compartido/Componentes/visor-pdf/visor-pdf';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Notificaciones, VisorPdf],
  template: `<router-outlet /> <app-notificaciones /> <app-visor-pdf />`,
})
export class App {}
