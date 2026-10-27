// inventario.ts → INVENTARIO en 6 pestañas:
//   1. Stock: cada producto con físico, reservado, disponible, valor y estado (bajo mínimo en rojo).
//   2. Lotes: cada lote con su bodega, vencimiento y si Calidad lo liberó; transferir, ajustar o dar de baja.
//   3. Kardex: entradas, salidas y saldo de un producto (con costo).
//   4. Por vencer: lotes que vencen en 30, 60 y 90 días o ya vencidos (RN-14).
//   5. Compras: registrar la entrada de insumos y repuestos comprados.
//   6. Movimientos: lo último que entró o salió en toda la empresa.
// Ajustes y bajas solo los hace el gerente (RN-15) y quedan en la auditoría.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogoService } from '../../../compartido/Servicios/catalogo.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Bodega, LoteProducto, Movimiento, Producto, ResumenStock } from '../../../compartido/Entidades/catalogo';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { FormularioDinamico, CampoFormulario } from '../../../compartido/Componentes/formulario-dinamico/formulario-dinamico';
import { dinero, fecha, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

type Pestana = 'stock' | 'lotes' | 'kardex' | 'vencer' | 'compras' | 'movimientos';

@Component({
  selector: 'app-inventario',
  imports: [FormsModule, Tabla, Modal, Icono, FormularioDinamico],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventario.html',
})
export class Inventario {
  private readonly catalogo = inject(CatalogoService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly pestana = signal<Pestana>('stock');
  readonly stock = signal<ResumenStock[]>([]);
  readonly valorizado = signal<{ total: number; porBodega: Record<string, number>; porFamilia: Record<string, number> } | null>(null);
  readonly bodegas = signal<Bodega[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly lotes = signal<LoteProducto[]>([]);
  readonly porVencer = signal<LoteProducto[]>([]);
  readonly movimientos = signal<Movimiento[]>([]);
  readonly kardex = signal<Movimiento[]>([]);
  readonly ocupado = signal(false);

  // Filtros
  readonly tipoStock = signal('');
  readonly soloBajos = signal(false);
  readonly bodegaLotes = signal('');
  readonly productoKardex = signal('');

  // Acciones sobre un lote
  readonly accion = signal<{ tipo: 'transferir' | 'ajustar' | 'baja'; lote: LoteProducto } | null>(null);
  readonly destino = signal('');
  readonly cantidad = signal(0);
  readonly motivo = signal('');

  readonly stockFiltrado = computed(() => this.stock().filter((s) => (!this.tipoStock() || s.tipo === this.tipoStock()) && (!this.soloBajos() || ['AGOTADO', 'ULTIMAS_UNIDADES'].includes(s.estado))));
  readonly bajos = computed(() => this.stock().filter((s) => s.stockMinimo > 0 && s.disponible <= s.stockMinimo).length);
  readonly vencidos = computed(() => this.porVencer().filter((l) => l.tramo === 'VENCIDO').length);
  readonly camposCompra = computed<CampoFormulario[]>(() => [
    { nombre: 'productoId', etiqueta: 'Producto', tipo: 'seleccion', requerido: true, ancho: true, opciones: this.productos().filter((p) => ['INSUMO', 'REPUESTO', 'GRANO'].includes(p.tipo)).map((p) => ({ valor: p._id, texto: `${p.sku} · ${p.nombre}` })) },
    { nombre: 'bodegaId', etiqueta: 'Bodega', tipo: 'seleccion', requerido: true, opciones: this.bodegas().map((b) => ({ valor: b._id, texto: b.nombre })) },
    { nombre: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', requerido: true, min: 0.001 },
    { nombre: 'costoUnitario', etiqueta: 'Costo unitario (USD)', tipo: 'numero', requerido: true, min: 0, paso: 0.0001, ayuda: 'Recalcula el costo promedio ponderado' },
    { nombre: 'codigoLote', etiqueta: 'Código de lote del proveedor', tipo: 'texto' },
    { nombre: 'vencimiento', etiqueta: 'Vencimiento', tipo: 'fecha' },
    { nombre: 'proveedor', etiqueta: 'Proveedor', tipo: 'texto' },
    { nombre: 'factura', etiqueta: 'Factura del proveedor', tipo: 'texto' },
  ]);

  readonly columnasStock: Columna[] = [
    { campo: 'sku', titulo: 'SKU' },
    { campo: 'nombre', titulo: 'Producto' },
    { campo: 'tipo', titulo: 'Tipo', tipo: 'etiqueta', ocultarEnMovil: true },
    { campo: 'fisico', titulo: 'Físico', tipo: 'numero' },
    { campo: 'reservado', titulo: 'Reservado', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'disponible', titulo: 'Disponible', tipo: 'numero' },
    { campo: 'stockMinimo', titulo: 'Mínimo', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'valor', titulo: 'Valor', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'estado', titulo: 'Estado', tipo: 'insignia' },
  ];
  readonly columnasLotes: Columna[] = [
    { campo: 'codigo', titulo: 'Lote' },
    { campo: 'producto.nombre', titulo: 'Producto' },
    { campo: 'bodega.nombre', titulo: 'Bodega', ocultarEnMovil: true },
    { campo: 'cantidad', titulo: 'Cantidad', tipo: 'numero' },
    { campo: 'reservado', titulo: 'Reservado', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'vencimiento', titulo: 'Vence', tipo: 'fecha' },
    { campo: 'liberado', titulo: 'Calidad', valor: (l: LoteProducto) => (l.bloqueado ? 'Bloqueado' : l.liberado ? 'Liberado' : 'Pendiente') },
  ];
  readonly columnasVencer: Columna[] = [
    { campo: 'codigo', titulo: 'Lote' },
    { campo: 'producto.nombre', titulo: 'Producto' },
    { campo: 'bodega.codigo', titulo: 'Bodega' },
    { campo: 'cantidad', titulo: 'Cantidad', tipo: 'numero' },
    { campo: 'vencimiento', titulo: 'Vence', tipo: 'fecha' },
    { campo: 'tramo', titulo: 'Tramo', valor: (l: LoteProducto) => (l.tramo === 'VENCIDO' ? 'VENCIDO' : `≤ ${l.tramo} días`) },
  ];
  readonly columnasMov: Columna[] = [
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fechaHora' },
    { campo: 'tipo', titulo: 'Movimiento', tipo: 'etiqueta' },
    { campo: 'producto.nombre', titulo: 'Producto' },
    { campo: 'codigoLote', titulo: 'Lote', ocultarEnMovil: true },
    { campo: 'cantidad', titulo: 'Cantidad', tipo: 'numero', valor: (m: Movimiento) => m.cantidad * m.signo },
    { campo: 'costoUnitario', titulo: 'Costo', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'documento.numero', titulo: 'Documento', valor: (m: Movimiento) => (m.documento ? `${texto(m.documento.tipo)} ${m.documento.numero ?? ''}` : '—'), ocultarEnMovil: true },
    { campo: 'usuario', titulo: 'Usuario', ocultarEnMovil: true },
  ];
  readonly columnasKardex: Columna[] = [
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fechaHora' },
    { campo: 'tipo', titulo: 'Movimiento', tipo: 'etiqueta' },
    { campo: 'codigoLote', titulo: 'Lote' },
    { campo: 'entrada', titulo: 'Entrada', tipo: 'numero', valor: (m: Movimiento) => (m.signo > 0 ? m.cantidad : null) },
    { campo: 'salida', titulo: 'Salida', tipo: 'numero', valor: (m: Movimiento) => (m.signo < 0 ? m.cantidad : null) },
    { campo: 'saldoProducto', titulo: 'Saldo', tipo: 'numero' },
    { campo: 'costoUnitario', titulo: 'Costo unit.', tipo: 'dinero' },
    { campo: 'documento.numero', titulo: 'Documento', valor: (m: Movimiento) => (m.documento ? `${texto(m.documento.tipo)} ${m.documento.numero ?? ''}` : '—') },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly numero = numero;
  readonly texto = texto;

  constructor() {
    this.cargarStock();
    this.catalogo.bodegas().subscribe((b) => this.bodegas.set(b));
    this.catalogo.productos({ todos: true }).subscribe((p) => this.productos.set(p));
    this.catalogo.porVencer().subscribe((l) => this.porVencer.set(l));
  }

  cargarStock() {
    this.catalogo.stock().subscribe((s) => this.stock.set(s));
    this.catalogo.valorizado().subscribe((v) => this.valorizado.set(v));
  }

  // cambiar(): cada pestaña carga sus datos solo cuando se abre (así la página abre rápido).
  cambiar(p: Pestana) {
    this.pestana.set(p);
    if (p === 'lotes') this.cargarLotes();
    if (p === 'movimientos') this.catalogo.movimientos().subscribe((m) => this.movimientos.set(m));
    if (p === 'vencer') this.catalogo.porVencer().subscribe((l) => this.porVencer.set(l));
  }

  cargarLotes() {
    this.catalogo.lotes({ bodega: this.bodegaLotes() }).subscribe((l) => this.lotes.set(l));
  }

  verKardex(productoId: string) {
    this.productoKardex.set(productoId);
    this.pestana.set('kardex');
    if (productoId) this.catalogo.kardex(productoId).subscribe((k) => this.kardex.set(k));
  }

  descargarKardex() {
    if (this.productoKardex()) this.archivos.descargar('informes/kardex', 'kardex.xlsx', { producto: this.productoKardex(), formato: 'xlsx' });
  }

  prepararAccion(tipo: 'transferir' | 'ajustar' | 'baja', lote: LoteProducto) {
    this.accion.set({ tipo, lote });
    this.cantidad.set(tipo === 'ajustar' ? lote.cantidad : lote.cantidad - lote.reservado);
    this.destino.set('');
    this.motivo.set('');
  }

  confirmarAccion() {
    const a = this.accion();
    if (!a) return;
    const peticion =
      a.tipo === 'transferir'
        ? this.catalogo.transferir({ loteId: a.lote._id, bodegaDestinoId: this.destino(), cantidad: this.cantidad() })
        : a.tipo === 'ajustar'
          ? this.catalogo.ajustar({ loteId: a.lote._id, cantidadContada: this.cantidad(), motivo: this.motivo() })
          : this.catalogo.baja({ loteId: a.lote._id, motivo: this.motivo() });
    ejecutar(peticion, {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: { transferir: 'Transferencia registrada', ajustar: 'Ajuste registrado en la auditoría', baja: 'Lote dado de baja' }[a.tipo],
      luego: () => {
        this.accion.set(null);
        this.cargarLotes();
        this.cargarStock();
        this.catalogo.porVencer().subscribe((l) => this.porVencer.set(l));
      },
    });
  }

  etiquetas(l: LoteProducto) {
    this.archivos.verPdf(`produccion/lotes/${l._id}/etiquetas`, `Etiquetas del lote ${l.codigo}`, `etiquetas-${l.codigo}.pdf`);
  }

  comprar(datos: Record<string, unknown>) {
    ejecutar(this.catalogo.entradaCompra(datos), { avisos: this.avisos, ocupado: this.ocupado, exito: 'Compra ingresada a bodega', luego: () => this.cargarStock() });
  }
}
