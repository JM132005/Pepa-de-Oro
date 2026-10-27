// logistica.ts → FLOTA Y VIAJES: entregas de pedidos, exportaciones a Puerto Bolívar, recolección de cacao
// en fincas y fletes a terceros. PROGRAMADO → EN RUTA (km de salida) → ENTREGADO (km de llegada y gastos).
// RN-25: la carga no supera la capacidad del camión · RN-24: no sale un camión en mantenimiento o con
// documentos vencidos. Cada viaje tiene su guía de remisión en PDF y el costo por km de cada camión.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperacionesService } from '../../../compartido/Servicios/operaciones.service';
import { CampoService } from '../../../compartido/Servicios/campo.service';
import { VentasService } from '../../../compartido/Servicios/ventas.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Activo, Viaje } from '../../../compartido/Entidades/operaciones';
import { Trabajador } from '../../../compartido/Entidades/campo';
import { Cliente, Pedido } from '../../../compartido/Entidades/ventas';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { SelectorCliente } from '../../Componentes/selector-cliente/selector-cliente';
import { TIPOS_VIAJE } from '../../Formularios/campos';
import { dinero, fecha, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

// ahoraLocal(): "2026-10-20T14:30" para los <input type="datetime-local">.
function ahoraLocal(masHoras = 0) {
  const d = new Date(Date.now() + masHoras * 3_600_000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

@Component({
  selector: 'app-logistica',
  imports: [FormsModule, Tabla, Modal, Icono, SelectorCliente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logistica.html',
})
export class Logistica {
  private readonly ops = inject(OperacionesService);
  private readonly campo = inject(CampoService);
  private readonly ventas = inject(VentasService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly viajes = signal<Viaje[]>([]);
  readonly costos = signal<{ camion: string; viajes: number; km: number; costoPorKm: number; ingresos: number }[]>([]);
  readonly camiones = signal<Activo[]>([]);
  readonly choferes = signal<Trabajador[]>([]);
  readonly pedidos = signal<Pedido[]>([]);
  readonly estado = signal('PROGRAMADO,EN_RUTA');
  readonly ocupado = signal(false);
  readonly esLogistica = computed(() => this.auth.tieneRol('LOGISTICA'));

  // Nuevo viaje
  readonly creando = signal(false);
  readonly nuevo = signal({ tipo: 'ENTREGA_VENTA', camion: '', chofer: '', origen: 'Planta El Guabo', destino: '', salida: ahoraLocal(1), llegadaEstimada: ahoraLocal(5), kmEstimados: 50, descripcion: '', pesoKg: 1000, bultos: 0, pedido: '', tarifaModo: 'POR_KM', tarifaValor: 1.2 });
  readonly cliente = signal<Cliente | null>(null);
  // Iniciar / completar
  readonly iniciando = signal<{ viaje: Viaje; km: number } | null>(null);
  readonly completando = signal<{ viaje: Viaje; km: number; combustible: number; peajes: number; viaticos: number } | null>(null);

  readonly tipos = TIPOS_VIAJE;
  readonly camionElegido = computed(() => this.camiones().find((c) => c._id === this.nuevo().camion) ?? null);
  // RN-25: aviso en pantalla si la carga supera la capacidad (el backend lo vuelve a revisar).
  readonly excedeCapacidad = computed(() => {
    const c = this.camionElegido();
    return c?.capacidadKg ? this.nuevo().pesoKg > c.capacidadKg : false;
  });
  readonly columnas: Columna[] = [
    { campo: 'codigo', titulo: 'Viaje' },
    { campo: 'salida', titulo: 'Salida', tipo: 'fechaHora' },
    { campo: 'tipo', titulo: 'Tipo', tipo: 'etiqueta' },
    { campo: 'camion.codigo', titulo: 'Camión' },
    { campo: 'chofer.nombre', titulo: 'Chofer', ocultarEnMovil: true },
    { campo: 'destino', titulo: 'Destino' },
    { campo: 'carga.pesoKg', titulo: 'Kg', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'km', titulo: 'Km', tipo: 'numero', valor: (v: Viaje) => (v.kmLlegada && v.kmSalida ? v.kmLlegada - v.kmSalida : v.kmEstimados), ocultarEnMovil: true },
    { campo: 'tarifa.total', titulo: 'Flete', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'estado', titulo: 'Estado', tipo: 'insignia' },
  ];
  readonly columnasCostos: Columna[] = [
    { campo: 'camion', titulo: 'Camión' },
    { campo: 'viajes', titulo: 'Viajes', tipo: 'numero' },
    { campo: 'km', titulo: 'Km recorridos', tipo: 'numero' },
    { campo: 'costoPorKm', titulo: 'Costo por km', tipo: 'dinero' },
    { campo: 'ingresos', titulo: 'Ingresos por fletes', tipo: 'dinero' },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly numero = numero;
  readonly texto = texto;

  constructor() {
    this.cargar();
    this.ops.costosFlota().subscribe({ next: (c) => this.costos.set(c), error: () => undefined });
    this.ops.activos().subscribe((a) => this.camiones.set(a.filter((x) => ['CAMION', 'FURGON'].includes(x.tipo) && !['VENDIDO', 'BAJA'].includes(x.estado))));
    this.campo.trabajadores('CHOFER').subscribe({ next: (t) => this.choferes.set(t.filter((x) => x.activo)), error: () => undefined });
    if (this.auth.tieneRol('VENTAS', 'LOGISTICA')) this.ventas.pedidos('PREPARANDO').subscribe({ next: (p) => this.pedidos.set(p), error: () => undefined });
  }

  cargar() {
    this.ops.viajes({ estado: this.estado() }).subscribe((v) => this.viajes.set(v));
  }

  cambiarNuevo(campo: string, valor: unknown) {
    this.nuevo.update((n) => ({ ...n, [campo]: valor }));
  }

  // elegirPedido(): copia destino y descripción del pedido elegido.
  elegirPedido(id: string) {
    const p = this.pedidos().find((x) => x._id === id);
    this.nuevo.update((n) => ({ ...n, pedido: id, destino: p ? `${p.cliente.nombre} (${p.cliente.ciudad ?? ''})` : n.destino, descripcion: p ? `Pedido ${p.numero}` : n.descripcion, tipo: p?.canal === 'EXPORTACION' ? 'EXPORTACION' : n.tipo }));
  }

  crear() {
    const n = this.nuevo();
    const datos = {
      tipo: n.tipo,
      camion: n.camion,
      chofer: n.chofer,
      origen: n.origen,
      destino: n.destino,
      salida: new Date(n.salida).toISOString(),
      llegadaEstimada: new Date(n.llegadaEstimada).toISOString(),
      kmEstimados: n.kmEstimados,
      carga: { descripcion: n.descripcion || 'Carga general', pesoKg: n.pesoKg, bultos: n.bultos || undefined },
      pedido: n.pedido || undefined,
      cliente: n.tipo === 'FLETE_CLIENTE' ? this.cliente()?._id : undefined,
      tarifa: n.tipo === 'FLETE_CLIENTE' ? { modo: n.tarifaModo, valor: n.tarifaValor } : undefined,
    };
    ejecutar(this.ops.crearViaje(datos), { avisos: this.avisos, ocupado: this.ocupado, exito: (v) => `Viaje ${v.codigo} programado`, luego: () => { this.creando.set(false); this.cargar(); } });
  }

  iniciar() {
    const i = this.iniciando();
    if (!i) return;
    ejecutar(this.ops.iniciarViaje(i.viaje._id, i.km), { avisos: this.avisos, ocupado: this.ocupado, exito: 'Viaje en ruta', luego: () => { this.iniciando.set(null); this.cargar(); } });
  }

  completar() {
    const c = this.completando();
    if (!c) return;
    ejecutar(this.ops.completarViaje(c.viaje._id, { kmLlegada: c.km, combustible: c.combustible, peajes: c.peajes, viaticos: c.viaticos }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Viaje entregado',
      luego: () => { this.completando.set(null); this.cargar(); },
    });
  }

  cancelar(v: Viaje) {
    ejecutar(this.ops.cancelarViaje(v._id), { avisos: this.avisos, ocupado: this.ocupado, exito: 'Viaje cancelado', luego: () => this.cargar() });
  }

  guia(v: Viaje) {
    this.archivos.verPdf(`viajes/${v._id}/guia`, `Guía de remisión ${v.codigo}`, `guia-${v.codigo}.pdf`);
  }
}
