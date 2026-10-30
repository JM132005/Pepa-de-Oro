// productos.ts → CATÁLOGO de la web: filtros por familia, sabor, presentación y precio, búsqueda y tarjetas
// con precio por menor y estado del stock (que se actualiza solo cada 20 segundos).
//
// Los filtros viven en la URL (?familia=CHOCOLATES&q=maracuya): así el visitante puede compartir el enlace
// y el botón "atrás" del navegador funciona.

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WebService } from '../../../compartido/Servicios/web.service';
import { ProductoPublico } from '../../../compartido/Entidades/web';
import { TarjetaProducto } from '../../Componentes/tarjeta-producto/tarjeta-producto';
import { Cargando, Vacio } from '../../../compartido/Componentes/cargando/cargando';
import { REFRESCO_STOCK_MS } from '../../../compartido/Utils/config';
import { dinero, hace } from '../../../compartido/Utils/formato';
import { aplicarStock, idsDe } from '../../Utils/stock-vivo';

@Component({
  selector: 'app-productos',
  imports: [FormsModule, TarjetaProducto, Cargando, Vacio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './productos.html',
})
export class Productos {
  private readonly web = inject(WebService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  // todos: el catálogo completo (se filtra en el navegador: son pocos productos y así el filtro es instantáneo).
  readonly todos = signal<ProductoPublico[] | null>(null);
  readonly horaStock = signal<string | null>(null);

  // Filtros (signals). Se leen de la URL al entrar y se escriben en la URL al cambiar.
  readonly familia = signal('');
  readonly busqueda = signal('');
  readonly sabor = signal('');
  readonly presentacion = signal('');
  readonly precioMax = signal<number | null>(null);
  readonly soloDisponibles = signal(false);

  // Opciones de los filtros, calculadas a partir del catálogo (computed: se recalculan solas).
  readonly familias = computed(() => {
    const mapa = new Map<string, string>();
    for (const p of this.todos() ?? []) mapa.set(p.familia, p.familiaNombre);
    return [...mapa.entries()].map(([valor, texto]) => ({ valor, texto }));
  });
  readonly sabores = computed(() => [...new Set((this.todos() ?? []).flatMap((p) => p.sabores))].filter(Boolean).sort());
  readonly presentaciones = computed(() => [...new Set((this.todos() ?? []).flatMap((p) => p.variantes.map((v) => v.presentacion ?? '')))].filter(Boolean).sort());
  readonly precioTope = computed(() => Math.ceil(Math.max(1, ...(this.todos() ?? []).map((p) => p.desde))));

  // filtrados: lo que se muestra. Cada filtro vacío "deja pasar" todo.
  readonly filtrados = computed(() => {
    const q = this.normalizar(this.busqueda());
    return (this.todos() ?? []).filter(
      (p) =>
        (!this.familia() || p.familia === this.familia()) &&
        (!this.sabor() || p.sabores.includes(this.sabor())) &&
        (!this.presentacion() || p.variantes.some((v) => v.presentacion === this.presentacion())) &&
        (this.precioMax() === null || p.desde <= this.precioMax()!) &&
        (!this.soloDisponibles() || ['DISPONIBLE', 'ULTIMAS_UNIDADES'].includes(p.estado)) &&
        (!q || this.normalizar(`${p.productoBase} ${p.descripcion ?? ''} ${p.sabores.join(' ')} ${p.familiaNombre}`).includes(q)),
    );
  });

  readonly dinero = dinero;
  readonly hace = hace;

  constructor() {
    const destruir = inject(DestroyRef);
    // queryParamMap: los parámetros de la URL. Cada vez que cambian (atrás/adelante), se copian a los filtros.
    this.ruta.queryParamMap.pipe(takeUntilDestroyed(destruir)).subscribe((q) => {
      this.familia.set(q.get('familia') ?? '');
      this.busqueda.set(q.get('q') ?? '');
      this.sabor.set(q.get('sabor') ?? '');
      this.presentacion.set(q.get('presentacion') ?? '');
      this.precioMax.set(q.get('precioMax') ? Number(q.get('precioMax')) : null);
    });

    this.web.catalogo().subscribe({ next: (p) => this.todos.set(p), error: () => this.todos.set([]) });

    // Stock en vivo: cada REFRESCO_STOCK_MS se pide solo el stock y se aplica a las tarjetas.
    const reloj = setInterval(() => this.refrescarStock(), REFRESCO_STOCK_MS);
    destruir.onDestroy(() => clearInterval(reloj));
  }

  refrescarStock() {
    const productos = this.todos();
    if (!productos?.length) return;
    this.web.stock(idsDe(productos)).subscribe({
      next: (r) => {
        this.todos.set(aplicarStock(this.todos() ?? [], r.stock));
        this.horaStock.set(r.hora);
      },
      error: () => undefined, // si falla una vez, se intenta en el siguiente ciclo
    });
  }

  // filtrar(): escribe el filtro en la URL. replaceUrl: no llena el historial con cada letra escrita.
  filtrar(cambios: Record<string, string | number | null>) {
    this.router.navigate([], { relativeTo: this.ruta, queryParams: cambios, queryParamsHandling: 'merge', replaceUrl: true });
  }

  limpiar() {
    this.soloDisponibles.set(false);
    this.router.navigate([], { relativeTo: this.ruta, queryParams: {}, replaceUrl: true });
  }

  // normalizar(): quita tildes y mayúsculas para que "maracuya" encuentre "Maracuyá".
  // normalize('NFD') separa la letra de su tilde y el replace borra las tildes.
  private normalizar(t: string) {
    return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }
}
