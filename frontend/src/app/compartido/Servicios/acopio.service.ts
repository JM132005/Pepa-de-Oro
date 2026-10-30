// acopio.service.ts → productores, precio del día, recepciones, liquidaciones, poscosecha y calidad.

import { Injectable, inject } from '@angular/core';
import { ApiService, Filtros } from './api.service';
import { Liquidacion, LoteGrano, OcupacionPoscosecha, PrecioDia, Productor } from '../Entidades/acopio';
import { LoteProducto } from '../Entidades/catalogo';

@Injectable({ providedIn: 'root' })
export class AcopioService {
  private readonly api = inject(ApiService);

  // ─── Productores ───
  productores(q?: string, activos?: boolean) {
    return this.api.get<Productor[]>('productores', { q, activos });
  }
  productor(id: string) {
    return this.api.get<Productor>(`productores/${id}`);
  }
  crearProductor(datos: Partial<Productor>) {
    return this.api.post<Productor>('productores', datos);
  }
  actualizarProductor(id: string, datos: Partial<Productor>) {
    return this.api.patch<Productor>(`productores/${id}`, datos);
  }
  anticipo(id: string, monto: number, motivo?: string) {
    return this.api.post<Productor>(`productores/${id}/anticipos`, { monto, motivo });
  }

  // ─── Precios ───
  precios() {
    return this.api.get<PrecioDia[]>('precios-dia');
  }
  historialPrecios(cultivo?: string) {
    return this.api.get<PrecioDia[]>('precios-dia/historial', { cultivo });
  }
  registrarPrecio(datos: Partial<PrecioDia>) {
    return this.api.post<PrecioDia>('precios-dia', datos);
  }

  // ─── Recepción y liquidaciones ───
  recibir(datos: Record<string, unknown>) {
    return this.api.post<{ liquidacion: Liquidacion; lote: LoteGrano; kgSecosEstimados: number }>('acopio/recepciones', datos);
  }
  liquidaciones(f?: Filtros) {
    return this.api.get<Liquidacion[]>('liquidaciones', f);
  }
  pagar(id: string, datos: { monto: number; forma: string; referencia?: string }) {
    return this.api.post<Liquidacion>(`liquidaciones/${id}/pagos`, datos);
  }

  // ─── Poscosecha ───
  lotes(f?: Filtros) {
    return this.api.get<LoteGrano[]>('lotes-grano', f);
  }
  lote(id: string) {
    return this.api.get<LoteGrano>(`lotes-grano/${id}`);
  }
  ocupacion() {
    return this.api.get<OcupacionPoscosecha[]>('lotes-grano/ocupacion');
  }
  fermentar(id: string, fermentadorId: string) {
    return this.api.post<LoteGrano>(`lotes-grano/${id}/fermentacion`, { fermentadorId });
  }
  voltear(id: string, temperatura?: number) {
    return this.api.post<LoteGrano>(`lotes-grano/${id}/volteos`, { temperatura });
  }
  secar(id: string, metodo: string, activoId: string) {
    return this.api.post<LoteGrano>(`lotes-grano/${id}/secado`, { metodo, activoId });
  }
  medirHumedad(id: string, humedad: number) {
    return this.api.post<LoteGrano>(`lotes-grano/${id}/humedad`, { humedad });
  }
  terminarSecado(id: string, kgSeco: number, humedadFinal: number) {
    return this.api.post<LoteGrano>(`lotes-grano/${id}/terminar-secado`, { kgSeco, humedadFinal });
  }
  combinar(lotes: string[]) {
    return this.api.post<LoteGrano>('lotes-grano/combinar', { lotes });
  }

  // ─── Calidad ───
  pendientesCalidad() {
    return this.api.get<{ grano: LoteGrano[]; productoTerminado: LoteProducto[] }>('calidad/pendientes');
  }
  evaluados() {
    return this.api.get<LoteGrano[]>('calidad/evaluados');
  }
  noConformidades(todas = false) {
    return this.api.get<LoteGrano[]>('calidad/no-conformidades', { todas });
  }
  evaluar(id: string, datos: Record<string, number>) {
    return this.api.post<LoteGrano>(`calidad/lotes-grano/${id}/evaluar`, datos);
  }
  catar(id: string, datos: { notas: string[]; puntaje: number }) {
    return this.api.post<LoteGrano>(`calidad/lotes-grano/${id}/cata`, datos);
  }
  cerrarNoConformidad(id: string, destino: string, observacion?: string) {
    return this.api.post<LoteGrano>(`calidad/lotes-grano/${id}/no-conformidad/cerrar`, { destino, observacion });
  }
  controlProducto(id: string, datos: Record<string, unknown>) {
    return this.api.post<{ codigo: string; liberado: boolean; motivos: string[] }>(`calidad/lotes-producto/${id}/control`, datos);
  }
}
