// layout-publico.ts → "marco" de la web pública: cabecera arriba, la página en el medio (<router-outlet>),
// pie abajo, botón de WhatsApp flotante y el cajón de la lista de interés.
// También pone la descripción de cada página en <meta name="description"> (lo que Google muestra debajo del título).

import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
// takeUntilDestroyed: se desuscribe solo cuando el componente se destruye (evita fugas de memoria).
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
// Meta: servicio de Angular para leer y cambiar las etiquetas <meta> del <head>.
import { Meta } from '@angular/platform-browser';
import { filter } from 'rxjs';
import { Cabecera } from '../Componentes/cabecera/cabecera';
import { Pie } from '../Componentes/pie/pie';
import { BotonWhatsapp } from '../Componentes/boton-whatsapp/boton-whatsapp';
import { PanelInteres } from '../Componentes/panel-interes/panel-interes';

@Component({
  selector: 'app-layout-publico',
  imports: [RouterOutlet, Cabecera, Pie, BotonWhatsapp, PanelInteres],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './layout-publico.html',
})
export class LayoutPublico {
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly meta = inject(Meta);
  private readonly destruir = inject(DestroyRef);

  constructor() {
    // Cada vez que termina una navegación (NavigationEnd), se busca la ruta hija más profunda y su data.descripcion.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destruir),
      )
      .subscribe(() => {
        let actual = this.ruta;
        while (actual.firstChild) actual = actual.firstChild;
        const descripcion = actual.snapshot.data['descripcion'];
        if (descripcion) this.meta.updateTag({ name: 'description', content: descripcion });
      });
  }
}
