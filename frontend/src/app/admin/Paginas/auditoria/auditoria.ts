// auditoria.ts → BITÁCORA DE AUDITORÍA (solo gerente): quién hizo qué y cuándo en las acciones sensibles
// (anular facturas, ajustes y bajas de inventario, cambios de precio, baja de activos, configuración),
// con el valor ANTERIOR y el NUEVO. Nadie puede editarla ni borrarla desde el sistema.

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { SistemaService } from '../../../compartido/Servicios/sistema.service';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { fechaHora } from '../../../compartido/Utils/formato';

type Registro = { _id: string; fecha: string; usuarioNombre?: string; accion: string; entidad?: string; sensible?: boolean; antes?: unknown; despues?: unknown };

@Component({
  selector: 'app-auditoria',
  // JsonPipe: muestra un objeto como texto JSON ({{ x | json }}).
  imports: [JsonPipe, Tabla, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="encabezado-pagina">
      <div><h1>Auditoría</h1><p class="tenue">Registro inalterable de las acciones sensibles, con el valor anterior y el nuevo.</p></div>
      <label class="fila"><input type="checkbox" [checked]="soloSensibles()" (change)="soloSensibles.set(!soloSensibles()); cargar()" /> Solo acciones sensibles</label>
    </div>
    <app-tabla [filas]="registros()" [columnas]="columnas" [clicable]="true" (seleccion)="detalle.set($event)" nombreArchivo="auditoria" vacio="Sin registros todavía" />
    @if (detalle(); as d) {
      <app-modal [titulo]="d.accion" ancho="ancho" (cerrar)="detalle.set(null)">
        <p class="tenue">{{ fechaHora(d.fecha) }} · {{ d.usuarioNombre }} · {{ d.entidad }}</p>
        <div class="rejilla dos">
          <div><h3>Antes</h3><pre class="mono tarjeta" style="white-space:pre-wrap;font-size:0.8rem">{{ d.antes | json }}</pre></div>
          <div><h3>Después</h3><pre class="mono tarjeta" style="white-space:pre-wrap;font-size:0.8rem">{{ d.despues | json }}</pre></div>
        </div>
      </app-modal>
    }
  `,
})
export class Auditoria {
  private readonly sistema = inject(SistemaService);
  readonly registros = signal<Registro[]>([]);
  readonly soloSensibles = signal(true);
  readonly detalle = signal<Registro | null>(null);
  readonly columnas: Columna[] = [
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fechaHora' },
    { campo: 'usuarioNombre', titulo: 'Usuario' },
    { campo: 'accion', titulo: 'Acción', tipo: 'etiqueta' },
    { campo: 'entidad', titulo: 'Sobre' },
    { campo: 'sensible', titulo: 'Sensible', tipo: 'booleano' },
  ];
  readonly fechaHora = fechaHora;

  constructor() {
    this.cargar();
  }

  cargar() {
    this.sistema.auditoria(this.soloSensibles()).subscribe((r) => this.registros.set(r));
  }
}
