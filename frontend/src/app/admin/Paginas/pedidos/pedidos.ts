// pedidos.ts → PEDIDOS por mayor y de exportación, en un tablero por estado:
//   CONFIRMADO (stock reservado) → PREPARANDO (bodega arma el pedido) → DESPACHADO (salió con logística)
//   → FACTURADO (factura emitida y enviada al correo). También se puede anular (libera la reserva).
// Cada rol ve los botones de su paso: bodega prepara, logística despacha, ventas factura.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VentasService } from '../../../compartido/Servicios/ventas.service';
import { CatalogoService } from '../../../compartido/Servicios/catalogo.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Cliente, Pedido } from '../../../compartido/Entidades/ventas';
import { Producto } from '../../../compartido/Entidades/catalogo';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { EditorLineas, LineaEditor, aItems } from '../../Componentes/editor-lineas/editor-lineas';
import { SelectorCliente } from '../../Componentes/selector-cliente/selector-cliente';
import { dinero, fecha } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

@Component({
  selector: 'app-pedidos',
  imports: [FormsModule, RouterLink, Modal, Icono, Insignia, Tabla, EditorLineas, SelectorCliente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pedidos.html',
})
export class Pedidos {
  private readonly ventas = inject(VentasService);
  private readonly catalogo = inject(CatalogoService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly pedidos = signal<Pedido[]>([]);
  readonly vista = signal<'tablero' | 'lista'>('tablero');
  readonly detalle = signal<Pedido | null>(null);
  readonly ocupado = signal(false);
  // Nuevo pedido directo (sin cotización)
  readonly creando = signal(false);
  readonly cliente = signal<Cliente | null>(null);
  readonly lineas = signal<LineaEditor[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly creditoNuevo = signal(0);

  // Columnas del tablero
  readonly columnasTablero = ['CONFIRMADO', 'PREPARANDO', 'DESPACHADO', 'FACTURADO'];
  readonly porEstado = computed(() => {
    const g: Record<string, Pedido[]> = {};
    for (const e of this.columnasTablero) g[e] = [];
    for (const p of this.pedidos()) if (g[p.estado]) g[p.estado].push(p);
    g['FACTURADO'] = g['FACTURADO'].slice(0, 15); // solo los 15 más recientes ya facturados
    return g;
  });
  readonly columnas: Columna[] = [
    { campo: 'numero', titulo: 'Pedido' },
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'cliente.nombre', titulo: 'Cliente' },
    { campo: 'canal', titulo: 'Canal', tipo: 'etiqueta' },
    { campo: 'totales.total', titulo: 'Total', tipo: 'dinero' },
    { campo: 'creditoDias', titulo: 'Crédito (días)', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'factura.numero', titulo: 'Factura', ocultarEnMovil: true },
    { campo: 'estado', titulo: 'Estado', tipo: 'insignia' },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly texto = texto;

  constructor() {
    this.cargar();
    if (this.auth.tieneRol('VENTAS')) this.catalogo.productos().subscribe((p) => this.productos.set(p.filter((x) => ['TERMINADO', 'GRANO'].includes(x.tipo) && x.activo)));
  }

  cargar() {
    this.ventas.pedidos().subscribe((p) => this.pedidos.set(p));
  }

  abrir(p: Pedido) {
    this.ventas.pedido(p._id).subscribe((x) => this.detalle.set(x));
  }

  // accion(): un paso del flujo. Cada uno llama a su ruta de la API y recarga el tablero.
  accion(p: Pedido, paso: 'preparar' | 'despachar' | 'anular' | 'facturar') {
    const peticiones = {
      preparar: () => this.ventas.prepararPedido(p._id),
      despachar: () => this.ventas.despacharPedido(p._id),
      anular: () => this.ventas.anularPedido(p._id),
      // Facturar: contado → pago por transferencia por el total; crédito → sin pagos (queda por cobrar, RN-18).
      facturar: () => this.ventas.emitirFactura({ pedidoId: p._id, creditoDias: p.creditoDias, pagos: p.creditoDias > 0 ? undefined : [{ codigo: '20', monto: p.totales.total }], enviarCorreo: true }),
    };
    const mensajes = { preparar: 'Pedido en preparación', despachar: 'Pedido despachado', anular: 'Pedido anulado y stock liberado', facturar: 'Factura emitida y enviada al cliente' };
    ejecutar(peticiones[paso]() as never, {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: mensajes[paso],
      luego: () => {
        this.detalle.set(null);
        this.cargar();
      },
    });
  }

  verFactura(p: Pedido) {
    if (p.factura) this.archivos.verPdf(`facturas/${p.factura._id}/pdf`, `Factura ${p.factura.numero}`, `factura-${p.factura.numero}.pdf`);
  }

  nuevo() {
    this.cliente.set(null);
    this.lineas.set([]);
    this.creando.set(true);
  }

  crear() {
    const c = this.cliente();
    if (!c || !this.lineas().length) return;
    ejecutar(this.ventas.crearPedido({ cliente: c._id, items: aItems(this.lineas()), canal: 'MAYORISTA', creditoDias: this.creditoNuevo() }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (p) => `Pedido ${p.numero} creado`,
      luego: () => {
        this.creando.set(false);
        this.cargar();
      },
    });
  }
}
