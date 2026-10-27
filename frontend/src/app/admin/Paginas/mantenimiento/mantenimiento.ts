// mantenimiento.ts → TALLER: mantenimiento de la maquinaria y los vehículos propios y servicio a clientes.
//   · Órdenes: ABIERTA → EN PROCESO (técnico asignado) → ESPERANDO REPUESTO → TERMINADA (horas, repuestos,
//     checklist y costo). Mientras está abierta, el activo queda EN MANTENIMIENTO y no se usa (RN-24).
//   · Plan preventivo: cada tarea vence por tiempo o por uso, lo que llegue primero (RN-26).
//   · Indicadores: disponibilidad, MTBF (tiempo medio entre fallas) y MTTR (tiempo medio de reparación).
//   · Reportar falla (cualquier área) y servicio de taller a clientes (con presupuesto y factura).

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperacionesService } from '../../../compartido/Servicios/operaciones.service';
import { CatalogoService } from '../../../compartido/Servicios/catalogo.service';
import { VentasService } from '../../../compartido/Servicios/ventas.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Activo, IndicadorTaller, OrdenMantenimiento, TareaPlan } from '../../../compartido/Entidades/operaciones';
import { Producto } from '../../../compartido/Entidades/catalogo';
import { Cliente } from '../../../compartido/Entidades/ventas';
import { Grafico } from '../../../compartido/Entidades/analitica';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { GraficoComponent } from '../../../compartido/Componentes/grafico/grafico';
import { SelectorCliente } from '../../Componentes/selector-cliente/selector-cliente';
import { dinero, fecha, fechaHora, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

type Pestana = 'ordenes' | 'plan' | 'indicadores';

@Component({
  selector: 'app-mantenimiento',
  imports: [FormsModule, Tabla, Modal, Icono, Insignia, GraficoComponent, SelectorCliente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mantenimiento.html',
})
export class Mantenimiento {
  private readonly ops = inject(OperacionesService);
  private readonly catalogo = inject(CatalogoService);
  private readonly ventas = inject(VentasService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly pestana = signal<Pestana>('ordenes');
  readonly ordenes = signal<OrdenMantenimiento[]>([]);
  readonly estado = signal('ABIERTA,EN_PROCESO,ESPERANDO_REPUESTO');
  readonly plan = signal<TareaPlan[]>([]);
  readonly indicadores = signal<IndicadorTaller[]>([]);
  readonly activos = signal<Activo[]>([]);
  readonly repuestos = signal<Producto[]>([]);
  readonly ocupado = signal(false);
  readonly esTaller = computed(() => this.auth.tieneRol('MANTENIMIENTO'));

  // Ventanas
  readonly detalle = signal<OrdenMantenimiento | null>(null);
  readonly falla = signal<{ activo: string; descripcion: string; prioridad: string } | null>(null);
  readonly servicio = signal<{ descripcion: string; marca: string; serie: string; falla: string } | null>(null);
  readonly clienteServicio = signal<Cliente | null>(null);
  // Acciones dentro del detalle
  readonly tecnico = signal('');
  readonly repuesto = signal('');
  readonly cantidadRepuesto = signal(1);
  readonly horas = signal(2);
  readonly usoCierre = signal<number | null>(null);
  readonly checklist = signal<{ tarea: string; hecha: boolean }[]>([]);
  readonly presupuesto = signal(0);

  readonly vencidas = computed(() => this.plan().filter((t) => t.vencida).length);
  readonly graficoDisponibilidad = computed<Grafico>(() => {
    const top = [...this.indicadores()].sort((a, b) => a.disponibilidad - b.disponibilidad).slice(0, 12);
    return { id: 'disp', titulo: 'Disponibilidad por activo (%)', tipo: 'horizontal', formato: 'porcentaje', categorias: top.map((i) => i.codigo), series: [{ nombre: 'Disponibilidad', datos: top.map((i) => i.disponibilidad) }] };
  });
  readonly columnas: Columna[] = [
    { campo: 'codigo', titulo: 'Orden' },
    { campo: 'createdAt', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'tipo', titulo: 'Tipo', tipo: 'etiqueta' },
    { campo: 'equipo', titulo: 'Equipo', valor: (o: OrdenMantenimiento) => (o.activo ? `${o.activo.codigo} · ${o.activo.nombre}` : `${o.equipoCliente?.descripcion} (${o.cliente?.nombre})`) },
    { campo: 'tarea', titulo: 'Tarea / falla', valor: (o: OrdenMantenimiento) => o.tarea ?? o.falla?.descripcion, ocultarEnMovil: true },
    { campo: 'prioridad', titulo: 'Prioridad', tipo: 'insignia', ocultarEnMovil: true },
    { campo: 'tecnico.nombre', titulo: 'Técnico', ocultarEnMovil: true },
    { campo: 'costos.costoTotal', titulo: 'Costo', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'estado', titulo: 'Estado', tipo: 'insignia' },
  ];
  readonly columnasPlan: Columna[] = [
    { campo: 'activo', titulo: 'Activo' },
    { campo: 'nombre', titulo: 'Nombre', ocultarEnMovil: true },
    { campo: 'tarea', titulo: 'Tarea' },
    { campo: 'frecuencia', titulo: 'Cada', valor: (t: TareaPlan) => [t.cadaDias ? `${t.cadaDias} días` : '', t.cadaUso ? `${t.cadaUso} h/km` : ''].filter(Boolean).join(' o ') },
    { campo: 'diasRestantes', titulo: 'Días restantes', tipo: 'numero' },
    { campo: 'usoRestante', titulo: 'Uso restante', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'estadoPlan', titulo: 'Estado', valor: (t: TareaPlan) => (t.vencida ? 'VENCIDA' : t.proxima ? 'PRÓXIMA' : 'AL DÍA') },
  ];
  readonly columnasIndicadores: Columna[] = [
    { campo: 'codigo', titulo: 'Activo' },
    { campo: 'nombre', titulo: 'Nombre', ocultarEnMovil: true },
    { campo: 'fallas', titulo: 'Fallas', tipo: 'numero' },
    { campo: 'horasReparando', titulo: 'Horas en taller', tipo: 'numero' },
    { campo: 'mtbf', titulo: 'MTBF (h)', tipo: 'numero' },
    { campo: 'mttr', titulo: 'MTTR (h)', tipo: 'numero' },
    { campo: 'disponibilidad', titulo: 'Disponibilidad', tipo: 'porcentaje' },
    { campo: 'costoMantenimiento', titulo: 'Costo', tipo: 'dinero' },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly fechaHora = fechaHora;
  readonly numero = numero;
  readonly texto = texto;

  constructor() {
    this.cargar();
    this.ops.planPreventivo().subscribe({ next: (p) => this.plan.set(p), error: () => undefined });
    // Equipos a los que se les puede reportar una falla (no vendidos ni dados de baja; los tendales y cajones no tienen motor).
    this.ops.activos().subscribe((a) => this.activos.set(a.filter((x) => !['VENDIDO', 'BAJA'].includes(x.estado) && !['TENDAL', 'FERMENTADOR'].includes(x.tipo))));
    if (this.esTaller()) this.catalogo.productos({ familia: 'REPUESTOS' }).subscribe((p) => this.repuestos.set(p));
  }

  cargar() {
    this.ops.ordenesMantenimiento({ estado: this.estado() }).subscribe((o) => this.ordenes.set(o));
  }

  cambiar(p: Pestana) {
    this.pestana.set(p);
    if (p === 'indicadores') this.ops.indicadoresTaller(180).subscribe({ next: (i) => this.indicadores.set(i), error: () => undefined });
    if (p === 'plan') this.ops.planPreventivo().subscribe({ next: (x) => this.plan.set(x), error: () => undefined });
  }

  abrir(o: OrdenMantenimiento) {
    this.detalle.set(o);
    this.tecnico.set(o.tecnico?.nombre ?? this.auth.usuario()?.nombre ?? '');
    this.checklist.set(o.checklist.length ? o.checklist : [{ tarea: o.tarea ?? 'Reparación de la falla', hecha: false }, { tarea: 'Prueba de funcionamiento', hecha: false }]);
    this.usoCierre.set(o.activo ? (o.activo.odometro || o.activo.horometro) : null);
    this.presupuesto.set(o.presupuesto?.total ?? 0);
  }

  // refrescar(): después de cada acción se vuelve a pedir la orden actualizada.
  private refrescar(mensaje: string) {
    return (o: OrdenMantenimiento) => {
      this.avisos.exito(mensaje);
      this.detalle.set(o);
      this.cargar();
    };
  }

  asignar(o: OrdenMantenimiento) {
    ejecutar(this.ops.asignarOrden(o._id, { tecnicoNombre: this.tecnico() }), { avisos: this.avisos, ocupado: this.ocupado, luego: this.refrescar('Técnico asignado') });
  }
  accion(o: OrdenMantenimiento, a: 'iniciar' | 'esperar-repuesto' | 'cancelar') {
    ejecutar(this.ops.accionOrden(o._id, a), { avisos: this.avisos, ocupado: this.ocupado, luego: this.refrescar({ iniciar: 'Orden en proceso', 'esperar-repuesto': 'Esperando repuesto', cancelar: 'Orden cancelada' }[a]) });
  }
  agregarRepuesto(o: OrdenMantenimiento) {
    if (!this.repuesto()) return;
    ejecutar(this.ops.repuesto(o._id, this.repuesto(), this.cantidadRepuesto()), { avisos: this.avisos, ocupado: this.ocupado, luego: this.refrescar('Repuesto descontado de la bodega') });
  }
  guardarPresupuesto(o: OrdenMantenimiento, aprobado: boolean) {
    ejecutar(this.ops.presupuesto(o._id, this.presupuesto(), aprobado), { avisos: this.avisos, ocupado: this.ocupado, luego: this.refrescar(aprobado ? 'Presupuesto aprobado por el cliente' : 'Presupuesto guardado') });
  }
  terminar(o: OrdenMantenimiento) {
    ejecutar(this.ops.terminarOrden(o._id, { horasManoObra: this.horas(), usoAlCerrar: this.usoCierre() ?? undefined, checklist: this.checklist() }), { avisos: this.avisos, ocupado: this.ocupado, luego: this.refrescar('Orden terminada: el equipo vuelve a estar disponible') });
  }
  marcarTarea(i: number) {
    this.checklist.update((l) => l.map((t, j) => (j === i ? { ...t, hecha: !t.hecha } : t)));
  }

  // facturar(): servicio a cliente → línea SERVICIO con la orden (el backend calcula el precio con su margen).
  facturar(o: OrdenMantenimiento) {
    if (!o.cliente) return;
    ejecutar(this.ventas.emitirFactura({ clienteId: o.cliente._id, items: [{ tipo: 'SERVICIO', refId: o._id, cantidad: 1, tarifaIva: 15 }], canal: 'MAYORISTA', creditoDias: 0, enviarCorreo: true }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (f) => `Factura ${f.numero} emitida`,
      luego: () => { this.detalle.set(null); this.cargar(); },
    });
  }

  pdf(o: OrdenMantenimiento) {
    this.archivos.verPdf(`mantenimiento/ordenes/${o._id}/pdf`, `Orden de trabajo ${o.codigo}`, `orden-${o.codigo}.pdf`);
  }

  reportarFalla() {
    const f = this.falla();
    if (!f || !f.activo || f.descripcion.trim().length < 5) return;
    ejecutar(this.ops.reportarFalla(f), { avisos: this.avisos, ocupado: this.ocupado, exito: (o) => `Falla reportada: orden ${o.codigo} (el equipo queda en mantenimiento)`, luego: () => { this.falla.set(null); this.cargar(); } });
  }

  crearServicio() {
    const s = this.servicio();
    const c = this.clienteServicio();
    if (!s || !c) return;
    ejecutar(this.ops.servicioCliente({ cliente: c._id, equipoCliente: { descripcion: s.descripcion, marca: s.marca || undefined, serie: s.serie || undefined }, falla: s.falla }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (o) => `Orden ${o.codigo} creada: falta el presupuesto`,
      luego: () => { this.servicio.set(null); this.cargar(); },
    });
  }

  generarPreventivos() {
    ejecutar(this.ops.generarPreventivos(), { avisos: this.avisos, ocupado: this.ocupado, exito: (r) => `${r.creadas} orden(es) preventiva(s) creada(s)`, luego: () => { this.cargar(); this.cambiar('plan'); } });
  }
}
