// catalogo.service.ts → productos, precios, bodegas e inventario (rutas /api/productos, /api/bodegas, /api/inventario).

import { Injectable, inject } from '@angular/core';
import { ApiService, Filtros } from './api.service';
import { Bodega, LoteProducto, Movimiento, Producto, ResumenStock } from '../Entidades/catalogo';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly api = inject(ApiService);

  productos(f?: Filtros) {
    return this.api.get<Producto[]>('productos', f);
  }
  producto(id: string) {
    return this.api.get<Producto>(`productos/${id}`);
  }
  // precio(): aplica RN-16 (menor, mayor, escala o lista) para una cantidad y tipo de cliente.
  precio(id: string, cantidad: number, tipoCliente: string) {
    return this.api.get<{ precio: number; regla: string; tarifaIva: number }>(`productos/${id}/precio`, { cantidad, tipoCliente });
  }
  crearProducto(datos: Partial<Producto>) {
    return this.api.post<Producto>('productos', datos);
  }
  actualizarProducto(id: string, datos: Partial<Producto>) {
    return this.api.patch<Producto>(`productos/${id}`, datos);
  }

  // ─── Inventario ───
  bodegas() {
    return this.api.get<Bodega[]>('bodegas');
  }
  stock() {
    return this.api.get<ResumenStock[]>('inventario/stock');
  }
  lotes(f?: Filtros) {
    return this.api.get<LoteProducto[]>('inventario/lotes', f);
  }
  kardex(productoId: string, f?: Filtros) {
    return this.api.get<Movimiento[]>(`inventario/kardex/${productoId}`, f);
  }
  movimientos() {
    return this.api.get<Movimiento[]>('inventario/movimientos');
  }
  porVencer() {
    return this.api.get<LoteProducto[]>('inventario/por-vencer');
  }
  valorizado() {
    return this.api.get<{ total: number; porBodega: Record<string, number>; porFamilia: Record<string, number> }>('inventario/valorizado');
  }
  entradaCompra(datos: Record<string, unknown>) {
    return this.api.post('inventario/entradas', datos);
  }
  transferir(datos: { loteId: string; bodegaDestinoId: string; cantidad: number }) {
    return this.api.post('inventario/transferencias', datos);
  }
  ajustar(datos: { loteId: string; cantidadContada: number; motivo: string }) {
    return this.api.post('inventario/ajustes', datos);
  }
  baja(datos: { loteId: string; motivo: string }) {
    return this.api.post('inventario/bajas', datos);
  }
}
