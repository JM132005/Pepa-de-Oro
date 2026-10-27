// calidad.ts → CONTROL DE CALIDAD.
//   · Grano seco pendiente: PRUEBA DE CORTE del cacao (100 granos cortados: bien fermentados, violetas,
//     pizarrosos, mohosos…) o defectos y taza del café → el sistema asigna el GRADO (RN-06; solo Calidad y Gerencia evalúan, RN-07) y el destino.
//   · Producto terminado pendiente: control de peso, sellado y etiqueta → se LIBERA para la venta (RN-11).
//   · No conformidades: lotes rechazados; se decide si se devuelve, se reprocesa o se descarta.
//   · Evaluados: historial con grado, cata y certificado en PDF.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AcopioService } from '../../../compartido/Servicios/acopio.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { LoteGrano } from '../../../compartido/Entidades/acopio';
import { LoteProducto, Producto } from '../../../compartido/Entidades/catalogo';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { fecha, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

type Pestana = 'grano' | 'producto' | 'noconformidades' | 'evaluados';

@Component({
  selector: 'app-calidad',
  imports: [FormsModule, RouterLink, Tabla, Modal, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calidad.html',
})
export class Calidad {
  private readonly acopio = inject(AcopioService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly pestana = signal<Pestana>('grano');
  readonly grano = signal<LoteGrano[]>([]);
  readonly productoTerminado = signal<LoteProducto[]>([]);
  readonly noConformidades = signal<LoteGrano[]>([]);
  readonly evaluados = signal<LoteGrano[]>([]);
  readonly ocupado = signal(false);
  readonly puedeEvaluar = computed(() => this.auth.tieneRol('CALIDAD'));

  // ─── Prueba de corte / café ───
  readonly evaluando = signal<LoteGrano | null>(null);
  readonly corte = signal({ bienFermentados: 75, violetas: 15, pizarrosos: 6, mohosos: 1, insectados: 0, germinados: 0, humedad: 6.8, peso100Granos: 130, impurezas: 0.3 });
  readonly cafe = signal({ humedad: 11.2, defectos300g: 8, puntajeTaza: 82 });
  readonly sumaCorte = computed(() => {
    const c = this.corte();
    return c.bienFermentados + c.violetas + c.pizarrosos + c.mohosos + c.insectados + c.germinados;
  });
  // ─── Cata ───
  readonly catando = signal<LoteGrano | null>(null);
  readonly notasCata = signal('floral, frutal');
  readonly puntajeCata = signal(7);
  // ─── Producto terminado ───
  readonly controlando = signal<LoteProducto | null>(null);
  readonly control = signal({ pesoPromedioG: 50, selladoOk: true, etiquetaOk: true, temperaturaTemplado: 31, tipoEmpaque: 'Funda trilaminada' });
  // ─── No conformidad ───
  readonly cerrandoNc = signal<LoteGrano | null>(null);
  readonly destinoNc = signal('DEVOLUCION');
  readonly observacionNc = signal('');

  readonly columnasPt: Columna[] = [
    { campo: 'codigo', titulo: 'Lote' },
    { campo: 'producto.nombre', titulo: 'Producto' },
    { campo: 'cantidad', titulo: 'Unidades', tipo: 'numero' },
    { campo: 'fechaElaboracion', titulo: 'Elaborado', tipo: 'fecha' },
    { campo: 'vencimiento', titulo: 'Vence', tipo: 'fecha' },
  ];
  readonly columnasNc: Columna[] = [
    { campo: 'codigo', titulo: 'Lote' },
    { campo: 'productor.nombre', titulo: 'Productor', valor: (l: LoteGrano) => l.productor?.nombre ?? l.hacienda?.nombre },
    { campo: 'variedad', titulo: 'Variedad', tipo: 'etiqueta' },
    { campo: 'kgSeco', titulo: 'Kg', tipo: 'numero' },
    { campo: 'noConformidad.causa', titulo: 'Causa' },
    { campo: 'noConformidad.fecha', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'noConformidad.destino', titulo: 'Destino', tipo: 'etiqueta' },
  ];
  readonly columnasEvaluados: Columna[] = [
    { campo: 'codigo', titulo: 'Lote' },
    { campo: 'calidad.fecha', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'origen', titulo: 'Origen', tipo: 'etiqueta', ocultarEnMovil: true },
    { campo: 'productor.nombre', titulo: 'Productor / hacienda', valor: (l: LoteGrano) => l.productor?.nombre ?? l.hacienda?.nombre },
    { campo: 'variedad', titulo: 'Variedad', tipo: 'etiqueta' },
    { campo: 'calidad.bienFermentados', titulo: 'Fermentados %', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'calidad.humedad', titulo: 'Humedad %', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'calidad.grado', titulo: 'Grado', tipo: 'insignia' },
  ];
  readonly fecha = fecha;
  readonly numero = numero;
  readonly texto = texto;

  constructor() {
    this.cargar();
  }

  cargar() {
    this.acopio.pendientesCalidad().subscribe((p) => {
      this.grano.set(p.grano);
      this.productoTerminado.set(p.productoTerminado);
    });
    this.acopio.noConformidades().subscribe((n) => this.noConformidades.set(n));
  }

  cambiar(p: Pestana) {
    this.pestana.set(p);
    if (p === 'evaluados') this.acopio.evaluados().subscribe((e) => this.evaluados.set(e));
    if (p === 'noconformidades') this.acopio.noConformidades(true).subscribe((n) => this.noConformidades.set(n));
  }

  // cambiarCorte(): copia el objeto con el campo nuevo (los signals necesitan un objeto nuevo).
  cambiarCorte(campo: string, valor: number) {
    this.corte.update((c) => ({ ...c, [campo]: valor }));
  }
  cambiarCafe(campo: string, valor: number) {
    this.cafe.update((c) => ({ ...c, [campo]: valor }));
  }
  cambiarControl(campo: string, valor: unknown) {
    this.control.update((c) => ({ ...c, [campo]: valor }));
  }

  evaluar() {
    const l = this.evaluando();
    if (!l) return;
    const datos = l.cultivo === 'CAFE' ? this.cafe() : this.corte();
    ejecutar(this.acopio.evaluar(l._id, datos), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (r) => `Lote ${r.codigo}: grado ${texto(r.calidad?.grado)} → ${texto(r.estado)}`,
      luego: () => {
        this.evaluando.set(null);
        this.cargar();
      },
    });
  }

  catar() {
    const l = this.catando();
    if (!l) return;
    const notas = this.notasCata().split(',').map((n) => n.trim()).filter(Boolean);
    ejecutar(this.acopio.catar(l._id, { notas, puntaje: this.puntajeCata() }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Cata registrada (aparece en la web, en "Rastrea tu cacao")',
      luego: () => {
        this.catando.set(null);
        this.cambiar('evaluados');
      },
    });
  }

  prepararControl(l: LoteProducto) {
    const p = l.producto as Producto;
    this.control.set({ pesoPromedioG: p.pesoNetoG || 50, selladoOk: true, etiquetaOk: true, temperaturaTemplado: 31, tipoEmpaque: 'Funda trilaminada' });
    this.controlando.set(l);
  }

  liberar() {
    const l = this.controlando();
    if (!l) return;
    ejecutar(this.acopio.controlProducto(l._id, this.control()), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (r) => (r.liberado ? `Lote ${r.codigo} liberado para la venta` : `Lote ${r.codigo} bloqueado: ${r.motivos.join('; ')}`),
      luego: () => {
        this.controlando.set(null);
        this.cargar();
      },
    });
  }

  cerrarNc() {
    const l = this.cerrandoNc();
    if (!l) return;
    ejecutar(this.acopio.cerrarNoConformidad(l._id, this.destinoNc(), this.observacionNc() || undefined), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'No conformidad cerrada',
      luego: () => {
        this.cerrandoNc.set(null);
        this.cargar();
      },
    });
  }

  certificado(l: LoteGrano) {
    this.archivos.verPdf(`calidad/lotes-grano/${l._id}/certificado`, `Certificado ${l.codigo}`, `certificado-${l.codigo}.pdf`);
  }
}
