// tabla.ts → TABLA genérica para todos los listados del sistema: búsqueda, orden por columna,
// paginación, exportación a CSV (se abre en Excel) y columna de acciones opcional.
//
// Uso:
//   <app-tabla [filas]="clientes()" [columnas]="columnas" (seleccion)="abrir($event)" [acciones]="botones" />
//   <ng-template #botones let-fila> <button (click)="editar(fila)">Editar</button> </ng-template>

import { ChangeDetectionStrategy, Component, TemplateRef, computed, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Insignia } from '../insignia/insignia';
import { Icono } from '../icono/icono';
import { Vacio } from '../cargando/cargando';
import { dinero, fecha, fechaHora, kg, numero, porcentaje } from '../../Utils/formato';
import { texto } from '../../Utils/etiquetas';

export interface Columna {
  campo: string; // ruta del dato, admite puntos: "cliente.nombre"
  titulo: string;
  tipo?: 'texto' | 'dinero' | 'numero' | 'fecha' | 'fechaHora' | 'insignia' | 'kg' | 'porcentaje' | 'booleano' | 'etiqueta';
  valor?: (fila: any) => unknown; // valor calculado (si no basta con "campo")
  ocultarEnMovil?: boolean;
}

// leer(): obtiene fila["cliente"]["nombre"] a partir de "cliente.nombre".
function leer(fila: any, ruta: string): unknown {
  return ruta.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), fila);
}

@Component({
  selector: 'app-tabla',
  imports: [FormsModule, NgTemplateOutlet, Insignia, Icono, Vacio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (buscador()) {
      <div class="barra">
        <label class="buscar"><app-icono nombre="buscar" /><input type="search" placeholder="Buscar…" [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event); pagina.set(0)" /></label>
        <span class="tenue">{{ filtradas().length }} registro(s)</span>
        <button class="btn btn-borde btn-sm" type="button" (click)="exportarCsv()" title="Descargar en CSV (se abre en Excel)"><app-icono nombre="excel" /> CSV</button>
      </div>
    }
    @if (filtradas().length) {
      <div class="tabla-contenedor">
        <table>
          <thead>
            <tr>
              @for (c of columnas(); track c.campo + c.titulo) {
                <th [class.num]="esNumero(c)" [class.movil-oculto]="c.ocultarEnMovil" (click)="ordenar(c)" [attr.aria-sort]="orden()?.campo === c.campo ? (orden()?.asc ? 'ascending' : 'descending') : null">
                  {{ c.titulo }}
                  @if (orden()?.campo === c.campo) {
                    <span>{{ orden()?.asc ? '▲' : '▼' }}</span>
                  }
                </th>
              }
              @if (acciones()) {
                <th></th>
              }
            </tr>
          </thead>
          <tbody>
            @for (f of paginaActual(); track $index) {
              <tr [class.clicable]="clicable()" (click)="clicable() && seleccion.emit(f)">
                @for (c of columnas(); track c.campo + c.titulo) {
                  <td [class.num]="esNumero(c)" [class.movil-oculto]="c.ocultarEnMovil">
                    @if (c.tipo === 'insignia') {
                      <app-insignia [valor]="$any(valorDe(f, c))" />
                    } @else {
                      {{ mostrar(f, c) }}
                    }
                  </td>
                }
                @if (acciones(); as tpl) {
                  <td class="acciones-celda" (click)="$event.stopPropagation()">
                    <ng-container *ngTemplateOutlet="tpl; context: { $implicit: f }" />
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (totalPaginas() > 1) {
        <div class="paginas">
          <button class="btn btn-borde btn-sm" type="button" [disabled]="pagina() === 0" (click)="pagina.set(pagina() - 1)">Anterior</button>
          <span class="tenue">Página {{ pagina() + 1 }} de {{ totalPaginas() }}</span>
          <button class="btn btn-borde btn-sm" type="button" [disabled]="pagina() + 1 >= totalPaginas()" (click)="pagina.set(pagina() + 1)">Siguiente</button>
        </div>
      }
    } @else {
      <app-vacio [texto]="vacio()" />
    }
  `,
  styles: `
    .barra { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.6rem; }
    .buscar { display: flex; align-items: center; gap: 0.4rem; flex: 1; min-width: 200px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 999px; padding: 0 0.75rem; }
    .buscar input { border: none; outline: none; padding: 0.45rem 0; background: transparent; }
    th { cursor: pointer; user-select: none; }
    .acciones-celda { white-space: nowrap; text-align: right; }
    .paginas { display: flex; gap: 0.75rem; justify-content: center; align-items: center; margin-top: 0.6rem; }
    @media (max-width: 640px) { .movil-oculto { display: none; } }
  `,
})
export class Tabla {
  readonly filas = input<any[]>([]);
  readonly columnas = input.required<Columna[]>();
  readonly acciones = input<TemplateRef<unknown> | undefined>(undefined);
  readonly buscador = input(true);
  readonly clicable = input(false);
  readonly porPagina = input(25);
  readonly vacio = input('No hay registros');
  readonly nombreArchivo = input('datos');
  readonly seleccion = output<any>();

  readonly busqueda = signal('');
  readonly pagina = signal(0);
  readonly orden = signal<{ campo: string; asc: boolean } | null>(null);

  valorDe(f: any, c: Columna) {
    return c.valor ? c.valor(f) : leer(f, c.campo);
  }

  esNumero(c: Columna) {
    return ['dinero', 'numero', 'kg', 'porcentaje'].includes(c.tipo ?? '');
  }

  // mostrar(): el valor ya formateado según el tipo de la columna.
  mostrar(f: any, c: Columna): string {
    const v = this.valorDe(f, c);
    switch (c.tipo) {
      case 'dinero':
        return dinero(v as number);
      case 'numero':
        return numero(v as number);
      case 'kg':
        return kg(v as number);
      case 'porcentaje':
        return porcentaje(v as number);
      case 'fecha':
        return fecha(v as string);
      case 'fechaHora':
        return fechaHora(v as string);
      case 'booleano':
        return v ? 'Sí' : 'No';
      case 'etiqueta':
        return texto(v as string);
      default:
        return v === null || v === undefined || v === '' ? '—' : Array.isArray(v) ? v.join(', ') : String(v);
    }
  }

  // filtradas: computed → se recalcula solo cuando cambian filas, búsqueda u orden.
  readonly filtradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    let lista = this.filas() ?? [];
    if (q) lista = lista.filter((f) => this.columnas().some((c) => this.mostrar(f, c).toLowerCase().includes(q)));
    const o = this.orden();
    if (o) {
      const col = this.columnas().find((c) => c.campo === o.campo)!;
      lista = [...lista].sort((a, b) => {
        const va = this.valorDe(a, col) as any;
        const vb = this.valorDe(b, col) as any;
        const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''), 'es', { numeric: true });
        return o.asc ? r : -r;
      });
    }
    return lista;
  });
  readonly totalPaginas = computed(() => Math.ceil(this.filtradas().length / this.porPagina()));
  readonly paginaActual = computed(() => this.filtradas().slice(this.pagina() * this.porPagina(), (this.pagina() + 1) * this.porPagina()));

  ordenar(c: Columna) {
    const o = this.orden();
    this.orden.set(o?.campo === c.campo ? { campo: c.campo, asc: !o.asc } : { campo: c.campo, asc: true });
  }

  // exportarCsv(): arma un texto separado por ";" (Excel en español lo abre bien) y lo descarga.
  exportarCsv() {
    const encabezado = this.columnas().map((c) => c.titulo);
    const filas = this.filtradas().map((f) => this.columnas().map((c) => this.mostrar(f, c)));
    const csv = [encabezado, ...filas].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    // ﻿ (BOM): le dice a Excel que el archivo está en UTF-8 (para que salgan bien las tildes).
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${this.nombreArchivo()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
