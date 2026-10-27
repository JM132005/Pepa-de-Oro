// formulario-campo.ts → formulario para registrar una COSECHA o una LABOR de campo.
// Tiene partes que el formulario dinámico no cubre: elegir la CUADRILLA (trabajadores de la hacienda con
// sus jornales), los INSUMOS usados (salen de la bodega de insumos de campo) y el AGROQUÍMICO con sus días
// de carencia (RN-01: mientras dure la carencia no se puede cosechar esa parcela).
//
// Uso: <app-formulario-campo modo="COSECHA" [parcelas]="parcelas()" [trabajadores]="trabajadores()" (guardar)="registrar($event)" />

import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Parcela, Trabajador } from '../../../compartido/Entidades/campo';
import { Producto } from '../../../compartido/Entidades/catalogo';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { texto } from '../../../compartido/Utils/etiquetas';
import { isoDia } from '../../../compartido/Utils/formato';
import { TIPOS_LABOR } from '../campos';

@Component({
  selector: 'app-formulario-campo',
  imports: [FormsModule, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario-campo.html',
})
export class FormularioCampo {
  readonly modo = input<'COSECHA' | 'LABOR'>('COSECHA');
  readonly parcelas = input<Parcela[]>([]);
  readonly trabajadores = input<Trabajador[]>([]);
  readonly insumosDisponibles = input<Producto[]>([]);
  readonly parcelaInicial = input<string>('');
  readonly ocupado = input(false);
  readonly guardar = output<Record<string, unknown>>();

  readonly parcela = signal('');
  readonly fecha = signal(isoDia());
  readonly kg = signal<number | null>(null);
  readonly mazorcas = signal<number | null>(null);
  readonly tipo = signal('FERTILIZACION');
  readonly observaciones = signal('');
  // cuadrilla: trabajadorId → jornales (0 = no participó).
  readonly cuadrilla = signal<Record<string, number>>({});
  readonly insumos = signal<{ producto: string; cantidad: number }[]>([]);
  readonly conAgroquimico = signal(false);
  readonly agroProducto = signal('');
  readonly agroDosis = signal('');
  readonly agroCarencia = signal(14);

  readonly tiposLabor = TIPOS_LABOR;
  readonly texto = texto;

  // haciendaDe(): el id de la hacienda de la parcela elegida (la parcela puede venir "poblada" o como id).
  readonly haciendaId = computed(() => {
    const p = this.parcelas().find((x) => x._id === this.parcela());
    return p ? (typeof p.hacienda === 'string' ? p.hacienda : p.hacienda._id) : '';
  });
  // Solo los trabajadores de campo de esa hacienda.
  readonly cuadrillaPosible = computed(() =>
    this.trabajadores().filter((t) => t.activo && ['JORNALERO', 'CAPATAZ'].includes(t.cargo) && (typeof t.hacienda === 'string' ? t.hacienda : t.hacienda?._id) === this.haciendaId()),
  );
  readonly totalJornales = computed(() => Object.values(this.cuadrilla()).reduce((s, j) => s + (j || 0), 0));

  constructor() {
    effect(() => {
      if (this.parcelaInicial()) this.parcela.set(this.parcelaInicial());
    });
  }

  marcar(id: string, jornales: number) {
    this.cuadrilla.update((c) => ({ ...c, [id]: jornales }));
  }

  agregarInsumo() {
    this.insumos.update((i) => [...i, { producto: this.insumosDisponibles()[0]?._id ?? '', cantidad: 1 }]);
  }

  cambiarInsumo(i: number, cambios: Partial<{ producto: string; cantidad: number }>) {
    this.insumos.update((lista) => lista.map((x, j) => (j === i ? { ...x, ...cambios } : x)));
  }

  quitarInsumo(i: number) {
    this.insumos.update((lista) => lista.filter((_, j) => j !== i));
  }

  enviar() {
    if (!this.parcela()) return;
    // Object.entries(...).filter: solo los trabajadores con jornales > 0.
    const cuadrilla = Object.entries(this.cuadrilla())
      .filter(([, j]) => j > 0)
      .map(([trabajador, jornales]) => ({ trabajador, jornales }));
    const base = { parcela: this.parcela(), fecha: new Date(`${this.fecha()}T12:00:00`).toISOString(), cuadrilla, observaciones: this.observaciones() || undefined };
    if (this.modo() === 'COSECHA') {
      if (!this.kg()) return;
      this.guardar.emit({ ...base, kg: this.kg(), mazorcas: this.mazorcas() ?? undefined });
    } else {
      const tipo = this.conAgroquimico() ? 'FUMIGACION' : this.tipo();
      this.guardar.emit({
        ...base,
        tipo,
        insumos: this.insumos().filter((i) => i.producto && i.cantidad > 0),
        agroquimico: this.conAgroquimico() ? { producto: this.agroProducto(), dosis: this.agroDosis() || undefined, diasCarencia: this.agroCarencia() } : undefined,
      });
    }
  }
}
