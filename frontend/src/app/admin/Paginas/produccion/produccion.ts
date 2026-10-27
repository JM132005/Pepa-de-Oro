// produccion.ts → PRODUCCIÓN en la planta.
//   · Órdenes: PLANIFICADA → EN PROCESO (reserva los insumos; RN-09 sin insumos no inicia; RN-08 solo grano
//     aprobado) → TERMINADA (descuenta lo consumido, calcula el costo y crea el lote PT sin liberar; RN-10).
//   · Tablero semanal: qué orden va en qué máquina cada día.
//   · Recetas (lista de materiales): qué se necesita para producir cada producto.
//   · Simulador "¿qué pasa si?": cuánto grano, horas de máquina, costo y margen para producir X unidades.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperacionesService } from '../../../compartido/Servicios/operaciones.service';
import { CatalogoService } from '../../../compartido/Servicios/catalogo.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Activo, OrdenProduccion, Receta, Verificacion } from '../../../compartido/Entidades/operaciones';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { dinero, fecha, isoDia, numero, porcentaje } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

type Pestana = 'ordenes' | 'tablero' | 'recetas' | 'simulador';
interface Simulacion {
  producto: string;
  cantidad: number;
  materiales: { productoId: string; nombre: string; unidad: string; necesita: number; disponible: number; falta: number; costo: number }[];
  horas: { maquina: number; manoObra: number };
  costoMateriales: number;
  costoHoras: number;
  costoTotal: number;
  costoUnitario: number;
  ingresoPorMenor: number;
  margenPct: number;
}

@Component({
  selector: 'app-produccion',
  imports: [FormsModule, Tabla, Modal, Icono, Insignia],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './produccion.html',
})
export class Produccion {
  private readonly ops = inject(OperacionesService);
  private readonly catalogo = inject(CatalogoService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly pestana = signal<Pestana>('ordenes');
  readonly ordenes = signal<OrdenProduccion[]>([]);
  readonly estado = signal('PLANIFICADA,EN_PROCESO');
  readonly recetas = signal<Receta[]>([]);
  readonly maquinas = signal<Activo[]>([]);
  readonly tablero = signal<{ desde: string; hasta: string; maquinas: Activo[]; ordenes: OrdenProduccion[] } | null>(null);
  readonly semana = signal(isoDia(this.lunes(new Date())));
  readonly ocupado = signal(false);
  readonly puedeProducir = computed(() => this.auth.tieneRol('PRODUCCION'));

  // Nueva orden
  readonly creando = signal(false);
  readonly productoNuevo = signal('');
  readonly cantidadNueva = signal(100);
  readonly fechaNueva = signal(isoDia());
  readonly maquinaNueva = signal('');
  readonly verificacion = signal<Verificacion | null>(null);
  // Detalle y cierre
  readonly detalle = signal<OrdenProduccion | null>(null);
  readonly cerrando = signal(false);
  readonly producidas = signal(0);
  readonly buenas = signal(0);
  readonly empaque = signal('Funda trilaminada');
  // Receta y simulador
  readonly receta = signal<Receta | null>(null);
  readonly simProducto = signal('');
  readonly simCantidad = signal(2000);
  readonly simulacion = signal<Simulacion | null>(null);

  readonly recetaElegida = computed(() => this.recetas().find((r) => r.producto._id === this.productoNuevo()) ?? null);
  // Máquinas que sirven para la receta elegida y no están en mantenimiento (RN-24).
  readonly maquinasPosibles = computed(() => {
    const r = this.recetaElegida();
    return this.maquinas().filter((m) => (!r || r.tiposMaquina.includes(m.tipo)) && m.estado !== 'EN_MANTENIMIENTO');
  });
  // dias: los 7 días de la semana del tablero.
  readonly dias = computed(() => Array.from({ length: 7 }, (_, i) => isoDia(new Date(new Date(`${this.semana()}T12:00:00`).getTime() + i * 86_400_000))));

  readonly columnas: Columna[] = [
    { campo: 'codigo', titulo: 'Orden' },
    { campo: 'fechaProgramada', titulo: 'Programada', tipo: 'fecha' },
    { campo: 'producto.nombre', titulo: 'Producto' },
    { campo: 'cantidadPlanificada', titulo: 'Planificado', tipo: 'numero' },
    { campo: 'cantidadBuena', titulo: 'Buenas', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'mermaPct', titulo: 'Merma', tipo: 'porcentaje', ocultarEnMovil: true },
    { campo: 'costos.unitario', titulo: 'Costo unit.', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'maquina.codigo', titulo: 'Máquina', ocultarEnMovil: true },
    { campo: 'estado', titulo: 'Estado', tipo: 'insignia' },
  ];
  readonly columnasRecetas: Columna[] = [
    { campo: 'producto.sku', titulo: 'SKU' },
    { campo: 'nombre', titulo: 'Receta' },
    { campo: 'cantidadBase', titulo: 'Rinde (base)', tipo: 'numero' },
    { campo: 'componentes', titulo: 'Componentes', valor: (r: Receta) => r.componentes.length },
    { campo: 'horasMaquina', titulo: 'Horas máquina', tipo: 'numero' },
    { campo: 'tiposMaquina', titulo: 'Máquina', valor: (r: Receta) => r.tiposMaquina.map((t) => texto(t)).join(', ') },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly numero = numero;
  readonly porcentaje = porcentaje;
  readonly texto = texto;

  constructor() {
    this.cargar();
    this.ops.recetas().subscribe((r) => this.recetas.set(r));
    this.ops.activos().subscribe((a) => this.maquinas.set(a.filter((x) => ['TOSTADORA', 'DESCASCARILLADORA', 'MOLINO', 'PRENSA', 'CONCHADORA', 'TEMPLADORA', 'EMPACADORA'].includes(x.tipo))));
  }

  // lunes(): el lunes de la semana de una fecha (getDay: 0 domingo … 6 sábado).
  private lunes(d: Date) {
    const r = new Date(d);
    r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
    return r;
  }

  cargar() {
    this.ops.ordenes({ estado: this.estado() }).subscribe((o) => this.ordenes.set(o));
  }

  cambiar(p: Pestana) {
    this.pestana.set(p);
    if (p === 'tablero') this.cargarTablero();
  }

  cargarTablero() {
    this.ops.tablero(this.semana()).subscribe((t) => this.tablero.set(t));
  }

  moverSemana(dias: number) {
    this.semana.set(isoDia(new Date(new Date(`${this.semana()}T12:00:00`).getTime() + dias * 86_400_000)));
    this.cargarTablero();
  }

  // ordenesDe(): órdenes de una máquina en un día (para la celda del tablero).
  ordenesDe(maquinaId: string, dia: string) {
    return (this.tablero()?.ordenes ?? []).filter((o) => o.maquina?._id === maquinaId && o.fechaProgramada.slice(0, 10) === dia);
  }
  sinMaquina(dia: string) {
    return (this.tablero()?.ordenes ?? []).filter((o) => !o.maquina && o.fechaProgramada.slice(0, 10) === dia);
  }

  // verificar(): RN-09 antes de crear: ¿alcanzan los insumos para esa cantidad?
  verificar() {
    if (!this.productoNuevo() || this.cantidadNueva() <= 0) return;
    this.ops.verificar(this.productoNuevo(), this.cantidadNueva()).subscribe({ next: (v) => this.verificacion.set(v), error: (e) => this.avisos.error(e) });
  }

  crear() {
    ejecutar(
      this.ops.crearOrden({ producto: this.productoNuevo(), cantidadPlanificada: this.cantidadNueva(), fechaProgramada: new Date(`${this.fechaNueva()}T08:00:00`).toISOString(), maquina: this.maquinaNueva() || undefined }),
      {
        avisos: this.avisos,
        ocupado: this.ocupado,
        exito: (o) => `Orden ${o.codigo} planificada`,
        luego: () => {
          this.creando.set(false);
          this.verificacion.set(null);
          this.cargar();
        },
      },
    );
  }

  abrir(o: OrdenProduccion) {
    this.ops.orden(o._id).subscribe((x) => {
      this.detalle.set(x);
      this.cerrando.set(false);
      this.producidas.set(x.cantidadPlanificada);
      this.buenas.set(x.cantidadPlanificada);
    });
  }

  iniciar(o: OrdenProduccion) {
    ejecutar(this.ops.iniciarOrden(o._id), { avisos: this.avisos, ocupado: this.ocupado, exito: 'Orden en proceso: insumos reservados', luego: (x) => { this.detalle.set(x); this.cargar(); } });
  }

  cerrar() {
    const o = this.detalle();
    if (!o) return;
    ejecutar(this.ops.cerrarOrden(o._id, { cantidadProducida: this.producidas(), cantidadBuena: this.buenas(), tipoEmpaque: this.empaque() }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (x) => `Orden cerrada · lote ${x.loteProducto?.codigo} creado (espera liberación de Calidad)`,
      luego: (x) => {
        this.detalle.set(x);
        this.cerrando.set(false);
        this.cargar();
      },
    });
  }

  anular(o: OrdenProduccion) {
    ejecutar(this.ops.anularOrden(o._id), { avisos: this.avisos, ocupado: this.ocupado, exito: 'Orden anulada y reservas liberadas', luego: () => { this.detalle.set(null); this.cargar(); } });
  }

  etiquetas(o: OrdenProduccion) {
    if (o.loteProducto) this.archivos.verPdf(`produccion/lotes/${o.loteProducto.id}/etiquetas`, `Etiquetas ${o.loteProducto.codigo}`, `etiquetas-${o.loteProducto.codigo}.pdf`);
  }

  simular() {
    if (!this.simProducto()) return;
    this.ops.simular(this.simProducto(), this.simCantidad()).subscribe({ next: (s) => this.simulacion.set(s as unknown as Simulacion), error: (e) => this.avisos.error(e) });
  }
}
