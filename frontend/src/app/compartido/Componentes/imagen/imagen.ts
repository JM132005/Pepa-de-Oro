// imagen.ts → <img> con imagen de RESPALDO. Si la foto no existe (o todavía no la reemplazan por una real),
// muestra una ilustración genérica en vez del ícono de "imagen rota".
// Uso: <app-imagen [src]="producto.imagen" alt="Chocolate 70 %" />

import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-imagen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // host: estilos del propio <app-imagen> para que llene el espacio de su contenedor.
  host: { style: 'display:block;width:100%;height:100%' },
  template: `<img [src]="ruta()" [alt]="alt()" [attr.loading]="perezosa() ? 'lazy' : null" (error)="fallo.set(true)" [style.object-fit]="ajuste()" />`,
  styles: `img { width: 100%; height: 100%; display: block; }`,
})
export class Imagen {
  readonly src = input<string | null | undefined>('');
  readonly alt = input('');
  readonly respaldo = input('img/generico.svg');
  readonly ajuste = input<'cover' | 'contain'>('cover');
  // loading="lazy": el navegador descarga la imagen solo cuando está por aparecer en pantalla (la web carga más rápido).
  readonly perezosa = input(true);
  readonly fallo = signal(false);

  // ruta(): las imágenes viven en frontend/public/img. Se antepone "/" para que funcione desde cualquier ruta (/productos/xyz).
  readonly ruta = computed(() => {
    const s = this.fallo() || !this.src() ? this.respaldo() : this.src()!;
    return s.startsWith('http') || s.startsWith('/') || s.startsWith('data:') ? s : `/${s}`;
  });
}
