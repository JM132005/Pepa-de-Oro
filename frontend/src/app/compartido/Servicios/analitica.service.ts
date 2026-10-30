// analitica.service.ts → paneles de KPIs, alertas (campana), proyecciones e informes.

import { Injectable, inject } from '@angular/core';
import { ApiService, Filtros } from './api.service';
import { Alerta, Informe, InformeCatalogo, Panel, Pronostico } from '../Entidades/analitica';

@Injectable({ providedIn: 'root' })
export class AnaliticaService {
  private readonly api = inject(ApiService);

  panel(area: string, desde?: string, hasta?: string) {
    return this.api.get<Panel>(`analitica/paneles/${area}`, { desde, hasta });
  }
  alertas() {
    return this.api.get<Alerta[]>('analitica/alertas');
  }
  pronosticoVentas() {
    return this.api.get<{ historia: { mes: string; valor: number }[]; pronostico: Pronostico[] }>('analitica/proyecciones/ventas');
  }
  pronosticoProductos() {
    return this.api.get<{ productoId: string; nombre: string; unidad: string; historia: { mes: string; valor: number }[]; pronostico: Pronostico[] }[]>('analitica/proyecciones/productos');
  }
  reorden() {
    return this.api.get<Record<string, unknown>[]>('analitica/proyecciones/reorden');
  }
  cosecha() {
    return this.api.get<{ meses: string[]; temporadas: string[]; factorCacao: number; parcelas: { parcela: string; hacienda: string; cultivo: string; estado: string; etapa: string; kgFrescos: number[] }[]; totalFresco: number[]; totalSecoEstimado: number[] }>('analitica/proyecciones/cosecha');
  }
  materiaPrima() {
    return this.api.get<{ meses: number; granoPropioProyectadoKg: number; materiales: { nombre: string; unidad: string; tipo: string; necesita: number; disponible: number; faltaComprar: number }[] }>('analitica/proyecciones/materia-prima');
  }
  flujoCaja() {
    return this.api.get<{ semana: number; desde: string; entra: number; sale: number; neto: number }[]>('analitica/proyecciones/flujo-caja');
  }
  tendencias() {
    return this.api.get<{ tipo: string; mensaje: string }[]>('analitica/proyecciones/tendencias');
  }
  informes() {
    return this.api.get<InformeCatalogo[]>('informes');
  }
  informe(id: string, f?: Filtros) {
    return this.api.get<Informe>(`informes/${id}`, f);
  }
  enviarGerencial() {
    return this.api.post<{ enviados: number }>('informes/gerencial/enviar');
  }
}
