// operaciones.service.ts → producción, activos, alquileres, viajes y mantenimiento.

import { Injectable, inject } from '@angular/core';
import { ApiService, Filtros } from './api.service';
import { Activo, Alquiler, FichaActivo, IndicadorTaller, OrdenMantenimiento, OrdenProduccion, Receta, TareaPlan, Verificacion, Viaje } from '../Entidades/operaciones';

@Injectable({ providedIn: 'root' })
export class OperacionesService {
  private readonly api = inject(ApiService);

  // ─── Producción ───
  recetas() {
    return this.api.get<Receta[]>('recetas');
  }
  receta(id: string) {
    return this.api.get<Receta>(`recetas/${id}`);
  }
  actualizarReceta(id: string, datos: Partial<Receta> | Record<string, unknown>) {
    return this.api.patch<Receta>(`recetas/${id}`, datos);
  }
  ordenes(f?: Filtros) {
    return this.api.get<OrdenProduccion[]>('produccion/ordenes', f);
  }
  orden(id: string) {
    return this.api.get<OrdenProduccion>(`produccion/ordenes/${id}`);
  }
  tablero(desde?: string) {
    return this.api.get<{ desde: string; hasta: string; maquinas: Activo[]; ordenes: OrdenProduccion[] }>('produccion/tablero', { desde });
  }
  verificar(producto: string, cantidad: number) {
    return this.api.get<Verificacion>('produccion/verificar', { producto, cantidad });
  }
  crearOrden(datos: { producto: string; cantidadPlanificada: number; fechaProgramada: string; maquina?: string; observaciones?: string }) {
    return this.api.post<OrdenProduccion>('produccion/ordenes', datos);
  }
  iniciarOrden(id: string) {
    return this.api.post<OrdenProduccion>(`produccion/ordenes/${id}/iniciar`);
  }
  cerrarOrden(id: string, datos: Record<string, unknown>) {
    return this.api.post<OrdenProduccion>(`produccion/ordenes/${id}/cerrar`, datos);
  }
  anularOrden(id: string) {
    return this.api.post<OrdenProduccion>(`produccion/ordenes/${id}/anular`);
  }
  simular(producto: string, cantidad: number) {
    return this.api.post<Record<string, unknown>>('produccion/simular', { producto, cantidad });
  }

  // ─── Activos y alquileres ───
  activos(f?: Filtros) {
    return this.api.get<Activo[]>('activos', f);
  }
  activo(id: string) {
    return this.api.get<FichaActivo>(`activos/${id}`);
  }
  crearActivo(datos: Partial<Activo>) {
    return this.api.post<Activo>('activos', datos);
  }
  actualizarActivo(id: string, datos: Partial<Activo>) {
    return this.api.patch<Activo>(`activos/${id}`, datos);
  }
  bajaActivo(id: string, motivo: string) {
    return this.api.post<Activo>(`activos/${id}/baja`, { motivo });
  }
  alquileres(f?: Filtros) {
    return this.api.get<Alquiler[]>('alquileres', f);
  }
  crearAlquiler(datos: Record<string, unknown>) {
    return this.api.post<Alquiler>('alquileres', datos);
  }
  entregarAlquiler(id: string, datos: Record<string, unknown>) {
    return this.api.post<Alquiler>(`alquileres/${id}/entregar`, datos);
  }
  devolverAlquiler(id: string, datos: Record<string, unknown>) {
    return this.api.post<Alquiler>(`alquileres/${id}/devolver`, datos);
  }
  cancelarAlquiler(id: string) {
    return this.api.post<Alquiler>(`alquileres/${id}/cancelar`);
  }

  // ─── Logística ───
  viajes(f?: Filtros) {
    return this.api.get<Viaje[]>('viajes', f);
  }
  costosFlota() {
    return this.api.get<{ camion: string; viajes: number; km: number; costoPorKm: number; ingresos: number }[]>('viajes/costos');
  }
  crearViaje(datos: Record<string, unknown>) {
    return this.api.post<Viaje>('viajes', datos);
  }
  iniciarViaje(id: string, kmSalida: number) {
    return this.api.post<Viaje>(`viajes/${id}/iniciar`, { kmSalida });
  }
  completarViaje(id: string, datos: Record<string, unknown>) {
    return this.api.post<Viaje>(`viajes/${id}/completar`, datos);
  }
  cancelarViaje(id: string) {
    return this.api.post<Viaje>(`viajes/${id}/cancelar`);
  }

  // ─── Mantenimiento ───
  ordenesMantenimiento(f?: Filtros) {
    return this.api.get<OrdenMantenimiento[]>('mantenimiento/ordenes', f);
  }
  planPreventivo() {
    return this.api.get<TareaPlan[]>('mantenimiento/plan');
  }
  indicadoresTaller(dias = 90) {
    return this.api.get<IndicadorTaller[]>('mantenimiento/indicadores', { dias });
  }
  generarPreventivos() {
    return this.api.post<{ creadas: number }>('mantenimiento/generar-preventivos');
  }
  reportarFalla(datos: { activo: string; descripcion: string; prioridad?: string }) {
    return this.api.post<OrdenMantenimiento>('mantenimiento/fallas', datos);
  }
  servicioCliente(datos: Record<string, unknown>) {
    return this.api.post<OrdenMantenimiento>('mantenimiento/servicios', datos);
  }
  accionOrden(id: string, accion: 'iniciar' | 'esperar-repuesto' | 'cancelar', cuerpo: unknown = {}) {
    return this.api.post<OrdenMantenimiento>(`mantenimiento/ordenes/${id}/${accion}`, cuerpo);
  }
  asignarOrden(id: string, datos: Record<string, unknown>) {
    return this.api.post<OrdenMantenimiento>(`mantenimiento/ordenes/${id}/asignar`, datos);
  }
  presupuesto(id: string, total: number, aprobado: boolean) {
    return this.api.post<OrdenMantenimiento>(`mantenimiento/ordenes/${id}/presupuesto`, { total, aprobado });
  }
  repuesto(id: string, producto: string, cantidad: number) {
    return this.api.post<OrdenMantenimiento>(`mantenimiento/ordenes/${id}/repuestos`, { producto, cantidad });
  }
  terminarOrden(id: string, datos: Record<string, unknown>) {
    return this.api.post<OrdenMantenimiento>(`mantenimiento/ordenes/${id}/terminar`, datos);
  }
}
