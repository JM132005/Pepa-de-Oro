// lote-grano.ts → HOJA DE VIDA de un lote de grano: de dónde vino (parcela o productor), la fermentación
// (volteos y temperaturas), el secado (mediciones de humedad), la evaluación de Calidad (prueba de corte y
// grado), la no conformidad si fue rechazado y el certificado de calidad en PDF.

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcopioService } from '../../../compartido/Servicios/acopio.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { LoteGrano } from '../../../compartido/Entidades/acopio';
import { Grafico } from '../../../compartido/Entidades/analitica';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { Cargando } from '../../../compartido/Componentes/cargando/cargando';
import { GraficoComponent } from '../../../compartido/Componentes/grafico/grafico';
import { dinero, fecha, fechaHora, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';

@Component({
  selector: 'app-lote-grano',
  imports: [RouterLink, Icono, Insignia, Cargando, GraficoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lote-grano.html',
})
export class LoteGranoDetalle {
  private readonly acopio = inject(AcopioService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);

  readonly id = input.required<string>();
  readonly lote = signal<LoteGrano | null>(null);

  // Curva de humedad durante el secado (línea).
  readonly graficoHumedad = computed<Grafico | null>(() => {
    const m = this.lote()?.secado?.mediciones ?? [];
    if (!m.length) return null;
    return { id: 'humedad', titulo: 'Humedad durante el secado (%)', tipo: 'linea', formato: 'porcentaje', categorias: m.map((x) => fechaHora(x.fecha).slice(0, 10)), series: [{ nombre: 'Humedad', datos: m.map((x) => x.humedad) }] };
  });
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly fechaHora = fechaHora;
  readonly numero = numero;
  readonly texto = texto;

  constructor() {
    effect(() => {
      this.acopio.lote(this.id()).subscribe({ next: (l) => this.lote.set(l), error: (e) => this.avisos.error(e) });
    });
  }

  certificado(l: LoteGrano) {
    this.archivos.verPdf(`calidad/lotes-grano/${l._id}/certificado`, `Certificado de calidad ${l.codigo}`, `certificado-${l.codigo}.pdf`);
  }
}
