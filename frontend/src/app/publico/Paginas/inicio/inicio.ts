// inicio.ts → PORTADA de la web: banner rotativo, cifras de la empresa, las cuatro líneas de negocio,
// productos destacados (con precio y stock en vivo), testimonios y un llamado a contactar.
// Los textos, banners y testimonios se editan desde el sistema (Contenido web), sin tocar este código.

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SitioService } from '../../Servicios/sitio.service';
import { WebService } from '../../../compartido/Servicios/web.service';
import { ProductoPublico } from '../../../compartido/Entidades/web';
import { TarjetaProducto } from '../../Componentes/tarjeta-producto/tarjeta-producto';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Imagen } from '../../../compartido/Componentes/imagen/imagen';
import { Cargando } from '../../../compartido/Componentes/cargando/cargando';
import { numero } from '../../../compartido/Utils/formato';

// Formas de los datos editables de la portada (vienen de la colección contenido_web).
interface Banner {
  titulo: string;
  subtitulo: string;
  imagen: string;
  boton: string;
  enlace: string;
}
interface DatosInicio {
  banners: Banner[];
  frase: string;
  lineas: { titulo: string; texto: string; icono: string }[];
}

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, TarjetaProducto, Icono, Imagen, Cargando],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inicio.html',
})
export class Inicio {
  readonly sitio = inject(SitioService);
  private readonly web = inject(WebService);

  readonly datos = signal<DatosInicio | null>(null);
  readonly testimonios = signal<{ nombre: string; cargo: string; texto: string }[]>([]);
  readonly destacados = signal<ProductoPublico[] | null>(null);
  // actual: índice del banner que se está mostrando.
  readonly actual = signal(0);
  readonly numero = numero;

  constructor() {
    this.sitio.contenido('inicio').subscribe((c) => this.datos.set(c.datos as DatosInicio));
    this.sitio.contenido('testimonios').subscribe((c) => this.testimonios.set((c.datos as { lista: [] }).lista ?? []));
    this.web.catalogo({ destacados: true }).subscribe({ next: (p) => this.destacados.set(p.slice(0, 8)), error: () => this.destacados.set([]) });

    // setInterval: cambia de banner cada 6 segundos. Se limpia al salir de la página (DestroyRef.onDestroy).
    const reloj = setInterval(() => this.siguiente(), 6000);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  siguiente() {
    const total = this.datos()?.banners.length ?? 0;
    if (total) this.actual.set((this.actual() + 1) % total);
  }
}
