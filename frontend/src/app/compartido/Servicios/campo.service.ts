// campo.service.ts → haciendas, parcelas, trabajadores, labores, sanidad, clima y cosechas.

import { Injectable, inject } from '@angular/core';
import { ApiService, Filtros } from './api.service';
import { Clima, Cosecha, FichaParcela, Hacienda, Labor, Monitoreo, Parcela, Trabajador } from '../Entidades/campo';

@Injectable({ providedIn: 'root' })
export class CampoService {
  private readonly api = inject(ApiService);

  haciendas() {
    return this.api.get<Hacienda[]>('haciendas');
  }
  actualizarHacienda(id: string, datos: Partial<Hacienda>) {
    return this.api.patch<Hacienda>(`haciendas/${id}`, datos);
  }
  parcelas(hacienda?: string) {
    return this.api.get<Parcela[]>('parcelas', { hacienda });
  }
  parcela(id: string) {
    return this.api.get<FichaParcela>(`parcelas/${id}`);
  }
  crearParcela(datos: Partial<Parcela>) {
    return this.api.post<Parcela>('parcelas', datos);
  }
  actualizarParcela(id: string, datos: Partial<Parcela>) {
    return this.api.patch<Parcela>(`parcelas/${id}`, datos);
  }
  trabajadores(cargo?: string) {
    return this.api.get<Trabajador[]>('trabajadores', { cargo });
  }
  crearTrabajador(datos: Partial<Trabajador>) {
    return this.api.post<Trabajador>('trabajadores', datos);
  }
  actualizarTrabajador(id: string, datos: Partial<Trabajador>) {
    return this.api.patch<Trabajador>(`trabajadores/${id}`, datos);
  }
  agenda() {
    return this.api.get<{ parcela: { _id: string; codigo: string; hacienda?: string }; atrasadas: { tipo: string; diasAtraso: number }[]; bloqueo: string | null }[]>('campo/agenda');
  }
  labores(f?: Filtros) {
    return this.api.get<Labor[]>('labores', f);
  }
  registrarLabor(datos: Record<string, unknown>) {
    return this.api.post<Labor>('labores', datos);
  }
  monitoreos(parcela?: string) {
    return this.api.get<Monitoreo[]>('sanidad', { parcela });
  }
  registrarMonitoreo(datos: Record<string, unknown>) {
    return this.api.post<Monitoreo>('sanidad', datos);
  }
  clima(hacienda?: string, dias = 90) {
    return this.api.get<Clima[]>('clima', { hacienda, dias });
  }
  registrarClima(datos: Record<string, unknown>) {
    return this.api.post<Clima>('clima', datos);
  }
  cosechas(f?: Filtros) {
    return this.api.get<Cosecha[]>('cosechas', f);
  }
  registrarCosecha(datos: Record<string, unknown>) {
    return this.api.post<{ cosecha: Cosecha; lote: { codigo: string } }>('cosechas', datos);
  }
}
