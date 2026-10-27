// ventas.service.ts → clientes, cotizaciones, pedidos, caja y facturas.

import { Injectable, inject } from '@angular/core';
import { ApiService, Filtros } from './api.service';
import { Cliente, Cotizacion, EstadoCuenta, Factura, Pedido, TurnoCaja } from '../Entidades/ventas';

// Línea que se envía al crear cotizaciones, pedidos o facturas (el backend completa el resto).
export interface ItemEntrada {
  tipo: 'PRODUCTO' | 'SERVICIO' | 'EQUIPO' | 'ALQUILER';
  refId?: string;
  descripcion?: string;
  cantidad: number;
  precioUnitario?: number;
  descuentoPct?: number;
  tarifaIva?: number;
}

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly api = inject(ApiService);

  // ─── Clientes ───
  clientes(f?: Filtros) {
    return this.api.get<Cliente[]>('clientes', f);
  }
  cliente(id: string) {
    return this.api.get<Cliente>(`clientes/${id}`);
  }
  estadoCuenta(id: string) {
    return this.api.get<EstadoCuenta>(`clientes/${id}/estado-cuenta`);
  }
  crearCliente(datos: Partial<Cliente>) {
    return this.api.post<Cliente>('clientes', datos);
  }
  actualizarCliente(id: string, datos: Partial<Cliente>) {
    return this.api.patch<Cliente>(`clientes/${id}`, datos);
  }

  // ─── Cotizaciones ───
  cotizaciones(estado?: string) {
    return this.api.get<Cotizacion[]>('cotizaciones', { estado });
  }
  cotizacion(id: string) {
    return this.api.get<Cotizacion>(`cotizaciones/${id}`);
  }
  crearCotizacion(datos: { cliente: string; items: ItemEntrada[]; diasValidez?: number; canal?: string; condiciones?: string; observaciones?: string; solicitud?: string }) {
    return this.api.post<Cotizacion>('cotizaciones', datos);
  }
  enviarCotizacion(id: string) {
    return this.api.post<{ ok: boolean; destinatario: string; estado: string }>(`cotizaciones/${id}/enviar`);
  }
  aceptarCotizacion(id: string, datos: { creditoDias?: number; entrega?: Record<string, string>; exportacion?: Record<string, string> }) {
    return this.api.post<Pedido>(`cotizaciones/${id}/aceptar`, datos);
  }
  rechazarCotizacion(id: string, motivo: string) {
    return this.api.post(`cotizaciones/${id}/rechazar`, { motivo });
  }

  // ─── Pedidos ───
  pedidos(estado?: string) {
    return this.api.get<Pedido[]>('pedidos', { estado });
  }
  pedido(id: string) {
    return this.api.get<Pedido>(`pedidos/${id}`);
  }
  crearPedido(datos: Record<string, unknown>) {
    return this.api.post<Pedido>('pedidos', datos);
  }
  prepararPedido(id: string) {
    return this.api.post<Pedido>(`pedidos/${id}/preparar`);
  }
  despacharPedido(id: string) {
    return this.api.post<Pedido>(`pedidos/${id}/despachar`);
  }
  anularPedido(id: string) {
    return this.api.post(`pedidos/${id}/anular`);
  }

  // ─── Caja ───
  cajaActual() {
    return this.api.get<TurnoCaja | null>('caja/actual');
  }
  historialCaja() {
    return this.api.get<TurnoCaja[]>('caja/historial');
  }
  abrirCaja(montoInicial: number) {
    return this.api.post<TurnoCaja>('caja/abrir', { montoInicial });
  }
  cerrarCaja(contado: number, observaciones?: string) {
    return this.api.post<TurnoCaja>('caja/cerrar', { contado, observaciones });
  }

  // ─── Facturas ───
  facturas(f?: Filtros) {
    return this.api.get<Factura[]>('facturas', f);
  }
  porCobrar() {
    return this.api.get<Factura[]>('facturas/por-cobrar');
  }
  factura(id: string) {
    return this.api.get<Factura>(`facturas/${id}`);
  }
  emitirFactura(datos: { clienteId?: string; pedidoId?: string; items?: ItemEntrada[]; canal?: string; pagos?: { codigo: string; monto: number }[]; recibido?: number; creditoDias?: number; observaciones?: string; enviarCorreo?: boolean }) {
    return this.api.post<Factura>('facturas', datos);
  }
  reenviarFactura(id: string) {
    return this.api.post<{ ok: boolean; destinatario: string; estado: string; error?: string }>(`facturas/${id}/reenviar`);
  }
  abonar(id: string, datos: { monto: number; formaPago: string; referencia?: string }) {
    return this.api.post<Factura>(`facturas/${id}/abonos`, datos);
  }
  notaCredito(id: string, datos: { motivo: string; lineas?: { indice: number; cantidad: number }[]; devolverStock?: boolean }) {
    return this.api.post<Factura>(`facturas/${id}/nota-credito`, datos);
  }
}
