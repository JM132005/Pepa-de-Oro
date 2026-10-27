// equipos.ts → EQUIPOS Y ALQUILERES.
//   · Activos: maquinaria de planta, vehículos y equipos para vender o alquilar, con su ficha (alquileres,
//     mantenimientos, documentos como matrícula y SOAT, costo de mantenimiento) y si se puede usar (RN-24).
//   · Alquileres: RESERVADO → ACTIVO (entregado con horómetro) → DEVUELTO (con daños) → se factura.
//     RN-23: no se alquila si las fechas cruzan otro alquiler o un mantenimiento.
//   · Venta de un equipo: factura con línea tipo EQUIPO (el activo pasa a VENDIDO).

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperacionesService } from '../../../compartido/Servicios/operaciones.service';
import { VentasService } from '../../../compartido/Servicios/ventas.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Activo, Alquiler, FichaActivo } from '../../../compartido/Entidades/operaciones';
import { Cliente } from '../../../compartido/Entidades/ventas';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { Imagen } from '../../../compartido/Componentes/imagen/imagen';
import { FormularioDinamico } from '../../../compartido/Componentes/formulario-dinamico/formulario-dinamico';
import { SelectorCliente } from '../../Componentes/selector-cliente/selector-cliente';
import { CAMPOS_ACTIVO, TIPOS_EQUIPO } from '../../Formularios/campos';
import { dinero, fecha, isoDia, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

type Pestana = 'activos' | 'alquileres';

@Component({
  selector: 'app-equipos-admin',
  imports: [FormsModule, Tabla, Modal, Icono, Insignia, Imagen, FormularioDinamico, SelectorCliente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './equipos.html',
})
export class EquiposAdmin {
  private readonly ops = inject(OperacionesService);
  private readonly ventas = inject(VentasService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly pestana = signal<Pestana>('activos');
  readonly activos = signal<Activo[]>([]);
  readonly alquileres = signal<Alquiler[]>([]);
  readonly tipo = signal('');
  readonly uso = signal('');
  readonly estadoAlquiler = signal('RESERVADO,ACTIVO');
  readonly ocupado = signal(false);
  readonly tipos = TIPOS_EQUIPO;
  readonly campos = CAMPOS_ACTIVO;

  // Ventanas
  readonly ficha = signal<FichaActivo | null>(null);
  readonly editando = signal<Partial<Activo> | null>(null);
  readonly baja = signal<{ activo: Activo; motivo: string } | null>(null);
  readonly vendiendo = signal<Activo | null>(null);
  readonly precioVenta = signal(0);
  // Nuevo alquiler
  readonly alquilando = signal(false);
  readonly activoAlquiler = signal('');
  readonly cliente = signal<Cliente | null>(null);
  readonly desde = signal(isoDia(new Date(Date.now() + 86_400_000)));
  readonly hasta = signal(isoDia(new Date(Date.now() + 4 * 86_400_000)));
  readonly conOperador = signal(false);
  readonly lugar = signal('');
  // Entrega / devolución
  readonly entrega = signal<{ alquiler: Alquiler; horometro: number; estadoEquipo: string } | null>(null);
  readonly devolucion = signal<{ alquiler: Alquiler; horometro: number; danos: number; observaciones: string } | null>(null);

  readonly filtrados = computed(() => this.activos().filter((a) => (!this.tipo() || a.tipo === this.tipo()) && (!this.uso() || a.usos.includes(this.uso()))));
  readonly paraAlquilar = computed(() => this.activos().filter((a) => a.usos.includes('ALQUILER') && !['VENDIDO', 'BAJA'].includes(a.estado)));
  readonly elegidoAlquiler = computed(() => this.activos().find((a) => a._id === this.activoAlquiler()) ?? null);
  readonly dias = computed(() => Math.max(1, Math.round((new Date(this.hasta()).getTime() - new Date(this.desde()).getTime()) / 86_400_000) + 1));
  readonly estimado = computed(() => {
    const a = this.elegidoAlquiler();
    return a ? this.dias() * ((a.tarifas.dia ?? 0) + (this.conOperador() ? a.tarifaOperadorDia : 0)) : 0;
  });

  readonly columnasActivos: Columna[] = [
    { campo: 'codigo', titulo: 'Código' },
    { campo: 'nombre', titulo: 'Equipo' },
    { campo: 'tipo', titulo: 'Tipo', tipo: 'etiqueta' },
    { campo: 'usos', titulo: 'Usos', valor: (a: Activo) => a.usos.map((u) => texto(u)).join(', '), ocultarEnMovil: true },
    { campo: 'uso', titulo: 'Horas / km', valor: (a: Activo) => (a.odometro ? `${numero(a.odometro, 0)} km` : a.horometro ? `${numero(a.horometro, 0)} h` : '—'), ocultarEnMovil: true },
    { campo: 'valorActual', titulo: 'Valor', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'estado', titulo: 'Estado', tipo: 'insignia' },
  ];
  readonly columnasAlquileres: Columna[] = [
    { campo: 'codigo', titulo: 'Contrato' },
    { campo: 'activo.nombre', titulo: 'Equipo' },
    { campo: 'cliente.nombre', titulo: 'Cliente' },
    { campo: 'desde', titulo: 'Desde', tipo: 'fecha' },
    { campo: 'hasta', titulo: 'Hasta', tipo: 'fecha' },
    { campo: 'tarifaDia', titulo: 'Tarifa/día', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'factura.numero', titulo: 'Factura', ocultarEnMovil: true },
    { campo: 'estado', titulo: 'Estado', tipo: 'insignia' },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly numero = numero;
  readonly texto = texto;

  constructor() {
    this.cargarActivos();
    this.cargarAlquileres();
  }

  cargarActivos() {
    this.ops.activos().subscribe((a) => this.activos.set(a));
  }
  cargarAlquileres() {
    this.ops.alquileres({ estado: this.estadoAlquiler() }).subscribe((a) => this.alquileres.set(a));
  }

  abrirFicha(a: Activo) {
    this.ops.activo(a._id).subscribe((f) => this.ficha.set(f));
  }

  guardar(datos: Record<string, unknown>) {
    const actual = this.editando();
    const peticion = actual?._id ? this.ops.actualizarActivo(actual._id, datos as Partial<Activo>) : this.ops.crearActivo(datos as Partial<Activo>);
    ejecutar(peticion, { avisos: this.avisos, ocupado: this.ocupado, exito: 'Equipo guardado', luego: () => { this.editando.set(null); this.ficha.set(null); this.cargarActivos(); } });
  }

  darDeBaja() {
    const b = this.baja();
    if (!b) return;
    ejecutar(this.ops.bajaActivo(b.activo._id, b.motivo), { avisos: this.avisos, ocupado: this.ocupado, exito: 'Equipo dado de baja', luego: () => { this.baja.set(null); this.ficha.set(null); this.cargarActivos(); } });
  }

  prepararVenta(a: Activo) {
    this.vendiendo.set(a);
    this.precioVenta.set(a.precioVenta);
    this.cliente.set(null);
  }

  // vender(): factura con una línea tipo EQUIPO; al emitirla el backend marca el activo como VENDIDO.
  vender() {
    const a = this.vendiendo();
    const c = this.cliente();
    if (!a || !c) return;
    ejecutar(this.ventas.emitirFactura({ clienteId: c._id, items: [{ tipo: 'EQUIPO', refId: a._id, cantidad: 1, precioUnitario: this.precioVenta() }], canal: 'MAYORISTA', creditoDias: 0, pagos: undefined, enviarCorreo: true }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (f) => `Equipo vendido · factura ${f.numero}`,
      luego: () => { this.vendiendo.set(null); this.ficha.set(null); this.cargarActivos(); },
    });
  }

  crearAlquiler() {
    const c = this.cliente();
    if (!c || !this.activoAlquiler()) return;
    ejecutar(
      this.ops.crearAlquiler({ activo: this.activoAlquiler(), cliente: c._id, desde: new Date(`${this.desde()}T08:00:00`).toISOString(), hasta: new Date(`${this.hasta()}T17:00:00`).toISOString(), conOperador: this.conOperador(), lugarTrabajo: this.lugar() || undefined }),
      { avisos: this.avisos, ocupado: this.ocupado, exito: (a) => `Alquiler ${a.codigo} reservado`, luego: () => { this.alquilando.set(false); this.cargarAlquileres(); this.cargarActivos(); } },
    );
  }

  entregar() {
    const e = this.entrega();
    if (!e) return;
    ejecutar(this.ops.entregarAlquiler(e.alquiler._id, { horometro: e.horometro, estadoEquipo: e.estadoEquipo }), { avisos: this.avisos, ocupado: this.ocupado, exito: 'Equipo entregado al cliente', luego: () => { this.entrega.set(null); this.cargarAlquileres(); this.cargarActivos(); } });
  }

  devolver() {
    const d = this.devolucion();
    if (!d) return;
    ejecutar(this.ops.devolverAlquiler(d.alquiler._id, { horometro: d.horometro, danos: d.danos, observaciones: d.observaciones || undefined }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Equipo devuelto',
      luego: () => { this.devolucion.set(null); this.cargarAlquileres(); this.cargarActivos(); },
    });
  }

  // facturar(): la factura del alquiler calcula días reales, operador, daños y descuenta la garantía.
  facturar(a: Alquiler) {
    ejecutar(this.ventas.emitirFactura({ clienteId: a.cliente._id, items: [{ tipo: 'ALQUILER', refId: a._id, cantidad: 1 }], canal: 'MAYORISTA', creditoDias: 0, enviarCorreo: true }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (f) => `Factura ${f.numero} emitida y enviada`,
      luego: () => this.cargarAlquileres(),
    });
  }

  cancelar(a: Alquiler) {
    ejecutar(this.ops.cancelarAlquiler(a._id), { avisos: this.avisos, ocupado: this.ocupado, exito: 'Alquiler cancelado', luego: () => this.cargarAlquileres() });
  }

  contrato(a: Alquiler) {
    this.archivos.verPdf(`alquileres/${a._id}/contrato`, `Contrato ${a.codigo}`, `contrato-${a.codigo}.pdf`);
  }
}
