// caja.ts → CAJA DE LA TIENDA (venta por menor).
//   1. Abrir el turno con el fondo de caja.
//   2. Vender: buscar o escanear productos, elegir cliente (o consumidor final hasta $50, RN-19),
//      cobrar con una o varias formas de pago (efectivo con cambio, tarjeta, transferencia).
//   3. La factura sale en PDF, se puede imprimir y se envía al correo del cliente.
//   4. Cerrar el turno: se cuenta el efectivo y el sistema calcula la diferencia.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../../../compartido/Servicios/ventas.service';
import { CatalogoService } from '../../../compartido/Servicios/catalogo.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { Cliente, Factura, TurnoCaja } from '../../../compartido/Entidades/ventas';
import { Producto } from '../../../compartido/Entidades/catalogo';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Cargando } from '../../../compartido/Componentes/cargando/cargando';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { EditorLineas, LineaEditor, aItems, totalesDe } from '../../Componentes/editor-lineas/editor-lineas';
import { SelectorCliente } from '../../Componentes/selector-cliente/selector-cliente';
import { FORMAS_PAGO } from '../../../compartido/Utils/etiquetas';
import { dinero, fechaHora, redondear } from '../../../compartido/Utils/formato';
import { ejecutar } from '../../Utils/acciones';

interface Pago {
  codigo: string;
  monto: number;
}

@Component({
  selector: 'app-caja',
  imports: [FormsModule, Icono, Modal, Cargando, Tabla, EditorLineas, SelectorCliente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './caja.html',
})
export class Caja {
  private readonly ventas = inject(VentasService);
  private readonly catalogo = inject(CatalogoService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);

  // turno: undefined = cargando; null = caja cerrada; objeto = turno abierto.
  readonly turno = signal<TurnoCaja | null | undefined>(undefined);
  readonly productos = signal<Producto[]>([]);
  readonly historial = signal<TurnoCaja[]>([]);
  readonly montoInicial = signal(50);
  readonly ocupado = signal(false);

  // Venta en curso
  readonly lineas = signal<LineaEditor[]>([]);
  readonly cliente = signal<Cliente | null>(null);
  readonly pagos = signal<Pago[]>([{ codigo: '01', monto: 0 }]);
  readonly recibido = signal<number | null>(null);
  readonly enviarCorreo = signal(true);
  readonly ultimaFactura = signal<Factura | null>(null);

  // Cierre
  readonly cerrando = signal(false);
  readonly contado = signal<number | null>(null);
  readonly observaciones = signal('');

  readonly formasPago = Object.entries(FORMAS_PAGO).map(([codigo, nombre]) => ({ codigo, nombre }));
  readonly tipoCliente = computed(() => this.cliente()?.tipoCliente ?? 'CONSUMIDOR');
  readonly totales = computed(() => totalesDe(this.lineas(), this.tipoCliente()));
  readonly sumaPagos = computed(() => redondear(this.pagos().reduce((s, p) => s + (Number(p.monto) || 0), 0)));
  readonly efectivo = computed(() => this.pagos().filter((p) => p.codigo === '01').reduce((s, p) => s + (Number(p.monto) || 0), 0));
  readonly cambio = computed(() => (this.recibido() ? redondear((this.recibido() ?? 0) - this.efectivo()) : 0));
  // RN-19: consumidor final (sin cliente o con el genérico) solo hasta $50.
  readonly excedeConsumidorFinal = computed(() => (!this.cliente() || this.cliente()!.tipoIdentificacion === 'CONSUMIDOR_FINAL') && this.totales().total > 50);
  readonly puedeCobrar = computed(() => this.lineas().length > 0 && Math.abs(this.sumaPagos() - this.totales().total) < 0.01 && !this.excedeConsumidorFinal() && (!this.recibido() || this.cambio() >= 0));
  // esperado: lo que debería haber en efectivo al cerrar = fondo + ventas en efectivo.
  readonly esperado = computed(() => redondear((this.turno()?.montoInicial ?? 0) + (this.turno()?.ventasPorFormaPago?.['01'] ?? 0)));

  readonly columnasHistorial: Columna[] = [
    { campo: 'apertura', titulo: 'Apertura', tipo: 'fechaHora' },
    { campo: 'cierre', titulo: 'Cierre', tipo: 'fechaHora' },
    { campo: 'cajeroNombre', titulo: 'Cajero/a' },
    { campo: 'numeroVentas', titulo: 'Ventas', tipo: 'numero' },
    { campo: 'esperado', titulo: 'Esperado', tipo: 'dinero' },
    { campo: 'contado', titulo: 'Contado', tipo: 'dinero' },
    { campo: 'diferencia', titulo: 'Diferencia', tipo: 'dinero' },
  ];
  readonly dinero = dinero;
  readonly fechaHora = fechaHora;

  constructor() {
    this.cargarTurno();
    // Solo productos que se venden en la tienda (terminados y grano); el stock viene incluido.
    this.catalogo.productos().subscribe((p) => this.productos.set(p.filter((x) => ['TERMINADO', 'GRANO'].includes(x.tipo) && x.activo)));
    this.ventas.historialCaja().subscribe((h) => this.historial.set(h));
  }

  cargarTurno() {
    this.ventas.cajaActual().subscribe({ next: (t) => this.turno.set(t), error: () => this.turno.set(null) });
  }

  abrir() {
    ejecutar(this.ventas.abrirCaja(this.montoInicial()), { avisos: this.avisos, ocupado: this.ocupado, exito: 'Caja abierta', luego: (t) => this.turno.set(t) });
  }

  // completarPago(): pone el total en la primera forma de pago (lo normal: una sola forma).
  completarPago() {
    const total = this.totales().total;
    const otros = this.pagos().slice(1).reduce((s, p) => s + (Number(p.monto) || 0), 0);
    this.pagos.update((ps) => ps.map((p, i) => (i === 0 ? { ...p, monto: redondear(total - otros) } : p)));
  }

  agregarPago() {
    this.pagos.update((ps) => [...ps, { codigo: '19', monto: redondear(Math.max(0, this.totales().total - this.sumaPagos())) }]);
  }

  cambiarPago(i: number, cambios: Partial<Pago>) {
    this.pagos.update((ps) => ps.map((p, j) => (j === i ? { ...p, ...cambios } : p)));
  }

  quitarPago(i: number) {
    this.pagos.update((ps) => ps.filter((_, j) => j !== i));
  }

  cobrar() {
    if (!this.puedeCobrar()) return;
    const datos = {
      clienteId: this.cliente()?._id,
      items: aItems(this.lineas()),
      canal: 'MOSTRADOR',
      pagos: this.pagos().filter((p) => p.monto > 0),
      recibido: this.recibido() ?? undefined,
      enviarCorreo: this.enviarCorreo() && Boolean(this.cliente()?.correo),
    };
    ejecutar(this.ventas.emitirFactura(datos), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (f) => `Factura ${f.numero} emitida${f.cambio ? ' · cambio ' + dinero(f.cambio) : ''}`,
      luego: (f) => {
        this.ultimaFactura.set(f);
        this.nuevaVenta();
        this.cargarTurno();
        // Se actualiza el stock mostrado en el buscador.
        this.catalogo.productos().subscribe((p) => this.productos.set(p.filter((x) => ['TERMINADO', 'GRANO'].includes(x.tipo) && x.activo)));
      },
    });
  }

  nuevaVenta() {
    this.lineas.set([]);
    this.cliente.set(null);
    this.pagos.set([{ codigo: '01', monto: 0 }]);
    this.recibido.set(null);
  }

  verFactura(f: Factura) {
    this.archivos.verPdf(`facturas/${f._id}/pdf`, `Factura ${f.numero}`, `factura-${f.numero}.pdf`);
  }

  cerrar() {
    if (this.contado() === null) return;
    ejecutar(this.ventas.cerrarCaja(this.contado()!, this.observaciones() || undefined), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (t) => `Caja cerrada. Diferencia: ${dinero(t.diferencia ?? 0)}`,
      luego: () => {
        this.cerrando.set(false);
        this.contado.set(null);
        this.turno.set(null);
        this.ventas.historialCaja().subscribe((h) => this.historial.set(h));
      },
    });
  }
}
