// cotizaciones.ts → COTIZACIONES (venta por mayor y exportación).
// Flujo: BORRADOR → ENVIADA (PDF al correo del cliente) → ACEPTADA (se convierte en pedido y se reserva
// el stock) o RECHAZADA. Si pasan los días de validez sin respuesta, queda VENCIDA (los precios cambian).

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VentasService } from '../../../compartido/Servicios/ventas.service';
import { CatalogoService } from '../../../compartido/Servicios/catalogo.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { Cliente, Cotizacion } from '../../../compartido/Entidades/ventas';
import { Producto } from '../../../compartido/Entidades/catalogo';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { EditorLineas, LineaEditor, aItems } from '../../Componentes/editor-lineas/editor-lineas';
import { SelectorCliente } from '../../Componentes/selector-cliente/selector-cliente';
import { dinero, fecha, fechaHora, isoDia } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

@Component({
  selector: 'app-cotizaciones',
  imports: [FormsModule, Tabla, Modal, Icono, Insignia, EditorLineas, SelectorCliente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cotizaciones.html',
})
export class Cotizaciones {
  private readonly ventas = inject(VentasService);
  private readonly catalogo = inject(CatalogoService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  private readonly router = inject(Router);

  readonly estados = ['', 'BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA'];
  readonly estado = signal('');
  readonly lista = signal<Cotizacion[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly ocupado = signal(false);

  // Nueva cotización
  readonly creando = signal(false);
  readonly cliente = signal<Cliente | null>(null);
  readonly lineas = signal<LineaEditor[]>([]);
  readonly canal = signal('MAYORISTA');
  readonly diasValidez = signal(15);
  readonly condiciones = signal('');
  readonly observaciones = signal('');

  // Detalle y acciones
  readonly detalle = signal<Cotizacion | null>(null);
  readonly aceptando = signal(false);
  readonly creditoDias = signal(0);
  readonly direccion = signal('');
  readonly fechaEntrega = signal(isoDia(new Date(Date.now() + 3 * 86_400_000)));
  readonly naviera = signal('');
  readonly puerto = signal('');
  readonly contenedor = signal('');
  readonly motivoRechazo = signal('');

  readonly tipoCliente = computed(() => this.cliente()?.tipoCliente ?? 'MAYORISTA');
  readonly columnas: Columna[] = [
    { campo: 'numero', titulo: 'Número' },
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'cliente.nombre', titulo: 'Cliente' },
    { campo: 'canal', titulo: 'Canal', tipo: 'etiqueta', ocultarEnMovil: true },
    { campo: 'totales.total', titulo: 'Total', tipo: 'dinero' },
    { campo: 'vence', titulo: 'Válida hasta', tipo: 'fecha', ocultarEnMovil: true },
    { campo: 'estado', titulo: 'Estado', tipo: 'insignia' },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly fechaHora = fechaHora;
  readonly texto = texto;

  constructor() {
    this.cargar();
    this.catalogo.productos().subscribe((p) => this.productos.set(p.filter((x) => ['TERMINADO', 'GRANO'].includes(x.tipo) && x.activo)));
  }

  cargar() {
    this.ventas.cotizaciones(this.estado() || undefined).subscribe((c) => this.lista.set(c));
  }

  filtrar(e: string) {
    this.estado.set(e);
    this.cargar();
  }

  nueva() {
    this.cliente.set(null);
    this.lineas.set([]);
    this.canal.set('MAYORISTA');
    this.condiciones.set('');
    this.observaciones.set('');
    this.creando.set(true);
  }

  // guardar(enviar): crea la cotización y, si se pide, la envía de una vez por correo.
  guardar(enviar: boolean) {
    const c = this.cliente();
    if (!c || !this.lineas().length) return;
    const datos = { cliente: c._id, items: aItems(this.lineas()), canal: this.canal(), diasValidez: this.diasValidez(), condiciones: this.condiciones() || undefined, observaciones: this.observaciones() || undefined };
    ejecutar(this.ventas.crearCotizacion(datos), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (r) => `Cotización ${r.numero} creada`,
      luego: (r) => {
        this.creando.set(false);
        if (enviar) this.enviar(r);
        else this.cargar();
      },
    });
  }

  abrir(c: Cotizacion) {
    this.ventas.cotizacion(c._id).subscribe((x) => {
      this.detalle.set(x);
      this.creditoDias.set(x.cliente.creditoDias ?? 0);
      this.direccion.set(x.cliente.direccion ?? '');
      this.aceptando.set(false);
    });
  }

  pdf(c: Cotizacion) {
    this.archivos.verPdf(`cotizaciones/${c._id}/pdf`, `Cotización ${c.numero}`, `cotizacion-${c.numero}.pdf`);
  }

  enviar(c: Cotizacion) {
    ejecutar(this.ventas.enviarCotizacion(c._id), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (r) => (r.ok ? `Enviada a ${r.destinatario}` : `Quedó como ${r.estado}`),
      luego: () => {
        this.cargar();
        if (this.detalle()) this.abrir(c);
      },
    });
  }

  aceptar() {
    const c = this.detalle();
    if (!c) return;
    const exportacion = c.canal === 'EXPORTACION' ? { naviera: this.naviera(), puertoDestino: this.puerto(), contenedor: this.contenedor() } : undefined;
    ejecutar(this.ventas.aceptarCotizacion(c._id, { creditoDias: this.creditoDias(), entrega: { direccion: this.direccion(), fechaEstimada: new Date(this.fechaEntrega()).toISOString() }, exportacion }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (p) => `Pedido ${p.numero} creado y stock reservado`,
      luego: () => {
        this.detalle.set(null);
        this.router.navigate(['/admin/pedidos']);
      },
    });
  }

  rechazar() {
    const c = this.detalle();
    if (!c || !this.motivoRechazo().trim()) return;
    ejecutar(this.ventas.rechazarCotizacion(c._id, this.motivoRechazo()), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Cotización marcada como rechazada',
      luego: () => {
        this.detalle.set(null);
        this.cargar();
      },
    });
  }
}
