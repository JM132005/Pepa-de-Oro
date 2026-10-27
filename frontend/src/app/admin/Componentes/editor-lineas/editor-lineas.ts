// editor-lineas.ts → EDITOR DE LÍNEAS de una venta (lo usan la Caja, las Cotizaciones y los Pedidos).
// Permite buscar productos por nombre o SKU (o escanear el código de barras, que "escribe" el SKU + Enter),
// cambiar cantidades y descuentos, agregar servicios, y muestra el precio que aplica (RN-16) y los totales.
//
// Uso:  <app-editor-lineas [productos]="productos()" tipoCliente="CONSUMIDOR" [(lineas)]="lineas" />
// El padre convierte las líneas en items para la API con  aItems(lineas)  y saca el total con  totalesDe(...).

import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Producto } from '../../../compartido/Entidades/catalogo';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { dinero, numero } from '../../../compartido/Utils/formato';
import { calcularTotales, precioUnitario } from '../../Utils/calculos-venta';

// Una línea mientras se edita en pantalla.
export interface LineaEditor {
  tipo: 'PRODUCTO' | 'SERVICIO';
  producto?: Producto;
  descripcion?: string; // solo servicios
  cantidad: number;
  descuentoPct: number;
  precioManual?: number; // solo servicios (o si el gerente fija un precio)
  tarifaIva?: number; // solo servicios: 0 % transporte, 15 % el resto
}

// precioDe(): el precio unitario que tendrá la línea.
export function precioDe(l: LineaEditor, tipoCliente: string) {
  if (l.tipo === 'SERVICIO' || l.precioManual !== undefined) return { precio: l.precioManual ?? 0, regla: 'Precio manual' };
  return precioUnitario(l.producto!, l.cantidad, tipoCliente);
}

// totalesDe(): los totales exactos (mismas fórmulas del backend). En exportación el IVA es 0 %.
export function totalesDe(lineas: LineaEditor[], tipoCliente: string, canal = 'MOSTRADOR') {
  return calcularTotales(
    lineas.map((l) => ({
      codigo: l.producto?.sku ?? 'SERV',
      descripcion: l.producto?.nombre ?? l.descripcion ?? '',
      cantidad: l.cantidad,
      precioUnitario: precioDe(l, tipoCliente).precio,
      descuentoPct: l.descuentoPct,
      tarifaIva: canal === 'EXPORTACION' ? 0 : l.tipo === 'SERVICIO' ? (l.tarifaIva ?? 15) : l.producto!.tarifaIva,
    })),
  );
}

// aItems(): convierte las líneas en lo que espera la API (ItemEntradaDto del backend).
export function aItems(lineas: LineaEditor[]) {
  return lineas.map((l) =>
    l.tipo === 'PRODUCTO'
      ? { tipo: 'PRODUCTO' as const, refId: l.producto!._id, cantidad: l.cantidad, descuentoPct: l.descuentoPct || undefined }
      : { tipo: 'SERVICIO' as const, descripcion: l.descripcion, cantidad: l.cantidad, precioUnitario: l.precioManual ?? 0, tarifaIva: l.tarifaIva ?? 15, descuentoPct: l.descuentoPct || undefined },
  );
}

@Component({
  selector: 'app-editor-lineas',
  imports: [FormsModule, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editor-lineas.html',
})
export class EditorLineas {
  readonly productos = input<Producto[]>([]);
  readonly tipoCliente = input('CONSUMIDOR');
  readonly canal = input('MOSTRADOR');
  readonly permitirServicios = input(false);
  // model(): valor de DOBLE VÍA. El padre escribe [(lineas)]="lineas" y ve los cambios al instante.
  readonly lineas = model<LineaEditor[]>([]);

  readonly busqueda = signal('');
  // coincidencias: hasta 8 productos que contienen el texto en el nombre o el SKU.
  readonly coincidencias = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (q.length < 2) return [];
    return this.productos()
      .filter((p) => p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q))
      .slice(0, 8);
  });
  readonly totales = computed(() => totalesDe(this.lineas(), this.tipoCliente(), this.canal()));
  readonly dinero = dinero;
  readonly numero = numero;

  // Enter en el buscador: si el texto es un SKU exacto (lector de código de barras) o hay una sola coincidencia, se agrega.
  alEnter() {
    const q = this.busqueda().trim().toLowerCase();
    const exacto = this.productos().find((p) => p.sku.toLowerCase() === q);
    const elegido = exacto ?? (this.coincidencias().length >= 1 ? this.coincidencias()[0] : undefined);
    if (elegido) this.agregar(elegido);
  }

  agregar(p: Producto) {
    // Si ya está en la venta, suma 1 a la cantidad en vez de repetir la línea.
    const existe = this.lineas().find((l) => l.producto?._id === p._id);
    if (existe) this.cambiar(existe, { cantidad: existe.cantidad + 1 });
    else this.lineas.update((ls) => [...ls, { tipo: 'PRODUCTO', producto: p, cantidad: p.unidad === 'KG' && p.tipo === 'GRANO' ? p.cantidadMinimaMayor || 69 : 1, descuentoPct: 0 }]);
    this.busqueda.set('');
  }

  agregarServicio() {
    this.lineas.update((ls) => [...ls, { tipo: 'SERVICIO', descripcion: '', cantidad: 1, descuentoPct: 0, precioManual: 0, tarifaIva: 15 }]);
  }

  // cambiar(): reemplaza la línea por una copia con los cambios (los signals necesitan objetos nuevos).
  cambiar(l: LineaEditor, cambios: Partial<LineaEditor>) {
    this.lineas.update((ls) => ls.map((x) => (x === l ? { ...x, ...cambios } : x)));
  }

  quitar(l: LineaEditor) {
    this.lineas.update((ls) => ls.filter((x) => x !== l));
  }

  precio(l: LineaEditor) {
    return precioDe(l, this.tipoCliente());
  }

  // subtotalLinea(): lo que cuesta esa línea sin IVA (para mostrar en la tabla).
  subtotalLinea(i: number) {
    return this.totales().lineas[i]?.subtotal ?? 0;
  }
}
