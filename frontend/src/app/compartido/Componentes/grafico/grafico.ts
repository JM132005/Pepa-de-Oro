// grafico.ts → componente ÚNICO de gráficos para todo el sistema (paneles, proyecciones, clima...).
// Recibe la descripción del gráfico que manda la API ({ tipo, categorias, series }) y la traduce
// a la configuración de ECharts. Así TODOS los gráficos se ven iguales y se programan una sola vez.
//
// ECharts (Apache) es una librería de gráficos para el navegador. Se importan solo las piezas que se
// usan (echarts/core + tipos de gráfico) para que la aplicación pese menos.

import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, effect, input, viewChild } from '@angular/core';
import * as echarts from 'echarts/core';
import { BarChart, FunnelChart, GaugeChart, HeatmapChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import { Grafico as DatosGrafico } from '../../Entidades/analitica';
import { dinero, numero } from '../../Utils/formato';

echarts.use([BarChart, LineChart, PieChart, ScatterChart, HeatmapChart, FunnelChart, GaugeChart, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, MarkLineComponent, CanvasRenderer]);

// Paleta categórica de la marca, VALIDADA con el script de accesibilidad (daltonismo y contraste):
// cacao, azul, ámbar, aguamarina, violeta, rojo, verde, rosa — siempre en este orden, nunca al azar.
const SERIES_CLARO = ['#9a5523', '#2a78d6', '#eda100', '#1baf7a', '#6250d6', '#e34948', '#008300', '#e87ba4'];
const SERIES_OSCURO = ['#b06a33', '#3987e5', '#c98500', '#199e70', '#9085e9', '#e66767', '#008300', '#d55181'];
// Rampa secuencial (un solo tono, de claro a oscuro) para el mapa de calor.
const RAMPA_CACAO = ['#f7ecd0', '#e8c78f', '#d39a5a', '#b06a33', '#7a3f17', '#3b2314'];

function oscuro(): boolean {
  const forzado = document.documentElement.getAttribute('data-theme');
  if (forzado) return forzado === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

// formatear(): cómo se muestran los valores en ejes y tooltips según el tipo de dato.
function formatear(v: number, formato?: string): string {
  if (v === null || v === undefined || isNaN(v)) return '—';
  if (formato === 'dinero') return dinero(v);
  if (formato === 'porcentaje') return `${numero(v, 1)} %`;
  if (formato === 'kg') return `${numero(v, 0)} kg`;
  return numero(v);
}

// compacto(): ejes con números cortos (12 500 → 12,5 k).
function compacto(v: number, formato?: string): string {
  const abs = Math.abs(v);
  const corto = abs >= 1_000_000 ? `${numero(v / 1_000_000, 1)} M` : abs >= 1000 ? `${numero(v / 1000, 1)} k` : numero(v, 1);
  return formato === 'dinero' ? `$${corto}` : formato === 'porcentaje' ? `${corto} %` : corto;
}

@Component({
  selector: 'app-grafico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="grafico">
      @if (titulo()) {
        <figcaption>{{ titulo() }}</figcaption>
      }
      <div #lienzo class="lienzo" [style.height.px]="alto()" role="img" [attr.aria-label]="titulo()"></div>
    </figure>
  `,
  styles: `
    .grafico { margin: 0; }
    figcaption { font-weight: 600; font-size: 0.9rem; margin-bottom: 0.4rem; color: var(--texto); }
    .lienzo { width: 100%; }
  `,
})
export class GraficoComponent implements OnDestroy {
  readonly datos = input.required<DatosGrafico>();
  readonly alto = input(280);
  readonly titulo = input<string | undefined>(undefined);
  private readonly lienzo = viewChild.required<ElementRef<HTMLDivElement>>('lienzo');
  private grafico?: echarts.ECharts;
  private observador?: ResizeObserver;

  constructor() {
    // afterNextRender: espera a que el <div> exista en la página antes de crear el gráfico.
    afterNextRender(() => {
      this.grafico = echarts.init(this.lienzo().nativeElement, undefined, { renderer: 'canvas' });
      this.dibujar();
      // ResizeObserver: si cambia el ancho (celular girado, menú plegado), el gráfico se reacomoda.
      this.observador = new ResizeObserver(() => this.grafico?.resize());
      this.observador.observe(this.lienzo().nativeElement);
    });
    // effect(): cada vez que cambian los datos, se vuelve a dibujar.
    effect(() => {
      this.datos();
      this.dibujar();
    });
  }

  ngOnDestroy() {
    this.observador?.disconnect();
    this.grafico?.dispose();
  }

  private dibujar() {
    if (!this.grafico) return;
    this.grafico.setOption(this.opciones(this.datos()), true);
  }

  // opciones(): traduce nuestro formato al de ECharts. Reglas de diseño: barras finas con esquinas
  // redondeadas, líneas de 2 px, cuadrícula tenue, leyenda cuando hay 2 o más series, tooltip siempre.
  private opciones(d: DatosGrafico): EChartsCoreOption {
    const esOscuro = oscuro();
    const colores = esOscuro ? SERIES_OSCURO : SERIES_CLARO;
    const texto = esOscuro ? '#c7b49f' : '#6b5a48';
    const tenue = esOscuro ? '#3d2d21' : '#ece4d8';
    const superficie = esOscuro ? '#21170f' : '#ffffff';
    const f = d.formato;
    const base = {
      color: colores,
      textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: texto },
      animationDuration: 400,
      tooltip: { trigger: 'axis', confine: true, backgroundColor: superficie, borderColor: tenue, textStyle: { color: esOscuro ? '#f1e8dc' : '#2b211b' }, valueFormatter: (v: number) => formatear(v, f) },
      legend: d.series.length > 1 ? { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: texto } } : undefined,
      grid: { left: 8, right: 12, top: d.series.length > 1 ? 32 : 12, bottom: 8, containLabel: true },
    };
    const ejeCategorias = { type: 'category', data: d.categorias, axisLine: { lineStyle: { color: tenue } }, axisTick: { show: false }, axisLabel: { color: texto, hideOverlap: true } };
    const ejeValores = { type: 'value', splitLine: { lineStyle: { color: tenue } }, axisLabel: { color: texto, formatter: (v: number) => compacto(v, f) } };
    const barra = (nombre: string, datos: unknown[], extra: Record<string, unknown> = {}) => ({ name: nombre, type: 'bar', data: datos, barMaxWidth: 28, itemStyle: { borderRadius: [4, 4, 0, 0] }, emphasis: { focus: 'series' }, ...extra });

    switch (d.tipo) {
      case 'linea':
        return { ...base, xAxis: { ...ejeCategorias, boundaryGap: false }, yAxis: ejeValores, series: d.series.map((s, i) => ({ name: s.nombre, type: 'line', data: s.datos, smooth: 0.25, symbolSize: 6, showSymbol: (d.categorias?.length ?? 0) < 40, lineStyle: { width: 2, type: i === 1 && /anterior/i.test(s.nombre) ? 'dashed' : 'solid' } })) };
      case 'barras':
        return { ...base, xAxis: { ...ejeCategorias, axisLabel: { ...ejeCategorias.axisLabel, rotate: (d.categorias?.length ?? 0) > 8 ? 35 : 0 } }, yAxis: ejeValores, series: d.series.map((s) => barra(s.nombre, s.datos)) };
      case 'horizontal':
        // Barras horizontales: el más grande arriba (se invierte el eje de categorías).
        return { ...base, grid: { ...base.grid, left: 8 }, yAxis: { ...ejeCategorias, inverse: true, axisLabel: { color: texto, width: 150, overflow: 'truncate' } }, xAxis: ejeValores, series: d.series.map((s) => barra(s.nombre, s.datos, { itemStyle: { borderRadius: [0, 4, 4, 0] } })) };
      case 'barras_apiladas':
      case 'apiladas_100': {
        const al100 = d.tipo === 'apiladas_100';
        const totales = (d.categorias ?? []).map((_, i) => d.series.reduce((t, s) => t + Number(s.datos[i] ?? 0), 0));
        return {
          ...base,
          tooltip: { ...base.tooltip, valueFormatter: (v: number) => (al100 ? `${numero(v, 1)} %` : formatear(v, f)) },
          xAxis: ejeCategorias,
          yAxis: { ...ejeValores, max: al100 ? 100 : undefined, axisLabel: { color: texto, formatter: (v: number) => (al100 ? `${v} %` : compacto(v, f)) } },
          // Separación de 2 px del color de la superficie entre segmentos apilados.
          series: d.series.map((s, k) => barra(s.nombre, al100 ? s.datos.map((v, i) => (totales[i] ? Math.round((Number(v) / totales[i]) * 1000) / 10 : 0)) : s.datos, { stack: 'total', itemStyle: { borderColor: superficie, borderWidth: 1, borderRadius: k === d.series.length - 1 ? [4, 4, 0, 0] : 0 } })),
        };
      }
      case 'circular':
        return {
          ...base,
          tooltip: { trigger: 'item', confine: true, valueFormatter: (v: number) => formatear(v, f) },
          legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { color: texto } },
          series: [{ type: 'pie', radius: ['45%', '72%'], center: ['50%', '45%'], itemStyle: { borderColor: superficie, borderWidth: 2, borderRadius: 4 }, label: { show: (d.categorias?.length ?? 0) <= 5, color: texto, formatter: '{d} %' }, data: (d.categorias ?? []).map((c, i) => ({ name: c, value: d.series[0]?.datos[i] ?? 0 })) }],
        };
      case 'dispersion':
        return {
          ...base,
          tooltip: { trigger: 'item', formatter: (p: { seriesName: string; value: number[] }) => `${p.seriesName}<br>Humedad ${numero(p.value[0], 1)} % · Fermentación ${numero(p.value[1], 1)} %` },
          legend: d.series.length <= 6 ? base.legend : undefined,
          xAxis: { type: 'value', name: 'Humedad %', nameLocation: 'middle', nameGap: 24, scale: true, splitLine: { lineStyle: { color: tenue } }, axisLabel: { color: texto } },
          yAxis: { type: 'value', name: 'Fermentados %', scale: true, splitLine: { lineStyle: { color: tenue } }, axisLabel: { color: texto } },
          // Cada productor u hacienda es un punto; con muchos, todos del mismo color (la identidad la da el tooltip).
          series: d.series.map((s, i) => ({ name: s.nombre, type: 'scatter', data: s.datos, symbolSize: 11, itemStyle: { color: d.series.length > 6 ? colores[0] : colores[i % colores.length], borderColor: superficie, borderWidth: 2, opacity: 0.85 } })),
        };
      case 'calor': {
        const valores = (d.series[0]?.datos ?? []) as number[][];
        const max = Math.max(1, ...valores.map((v) => v[2]));
        return {
          ...base,
          tooltip: { trigger: 'item', formatter: (p: { value: number[] }) => `${d.ejeY?.[p.value[1]]} · ${d.categorias?.[p.value[0]]}<br><b>${numero(p.value[2], 1)} %</b> de incidencia` },
          grid: { left: 8, right: 12, top: 8, bottom: 48, containLabel: true },
          xAxis: { type: 'category', data: d.categorias, splitArea: { show: false }, axisLabel: { color: texto } },
          yAxis: { type: 'category', data: d.ejeY, axisLabel: { color: texto } },
          visualMap: { min: 0, max, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, itemHeight: 120, inRange: { color: RAMPA_CACAO }, textStyle: { color: texto } },
          series: [{ type: 'heatmap', data: valores, itemStyle: { borderColor: superficie, borderWidth: 2, borderRadius: 3 }, label: { show: valores.length <= 60, color: '#2b211b', fontSize: 10, formatter: (p: { value: number[] }) => (p.value[2] ? numero(p.value[2], 0) : '') } }],
        };
      }
      case 'embudo':
        return {
          ...base,
          tooltip: { trigger: 'item' },
          legend: undefined,
          series: [{ type: 'funnel', left: '10%', width: '80%', sort: 'none', gap: 2, label: { color: '#fff', formatter: '{b}: {c}' }, itemStyle: { borderColor: superficie, borderWidth: 1 }, data: (d.categorias ?? []).map((c, i) => ({ name: c, value: d.series[0]?.datos[i] ?? 0 })) }],
        };
      case 'medidor':
        return {
          ...base,
          tooltip: undefined,
          legend: undefined,
          series: [{ type: 'gauge', startAngle: 200, endAngle: -20, min: 0, max: 100, progress: { show: true, width: 14, itemStyle: { color: colores[0] } }, axisLine: { lineStyle: { width: 14, color: [[1, tenue]] } }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, pointer: { show: false }, detail: { valueAnimation: true, formatter: '{value} %', color: esOscuro ? '#f1e8dc' : '#2b211b', fontSize: 26, fontWeight: 700, offsetCenter: [0, '10%'] }, data: [{ value: Number(d.series[0]?.datos[0] ?? 0) }] }],
        };
      case 'banda': {
        // Pronóstico: historia (línea), pronóstico (línea punteada) y banda mínimo–máximo sombreada.
        const [historia, pronostico, minimo, maximo] = d.series;
        return {
          ...base,
          xAxis: { ...ejeCategorias, boundaryGap: false },
          yAxis: ejeValores,
          series: [
            { name: historia.nombre, type: 'line', data: historia.datos, lineStyle: { width: 2 }, symbolSize: 5 },
            { name: pronostico.nombre, type: 'line', data: pronostico.datos, lineStyle: { width: 2, type: 'dashed' }, symbolSize: 7 },
            { name: 'Mínimo', type: 'line', data: minimo.datos, lineStyle: { opacity: 0 }, stack: 'banda', symbol: 'none', tooltip: { show: false } },
            { name: 'Banda de error (95 %)', type: 'line', data: maximo.datos.map((v, i) => (v === null || minimo.datos[i] === null ? null : Number(v) - Number(minimo.datos[i]))), lineStyle: { opacity: 0 }, areaStyle: { color: colores[1], opacity: 0.15 }, stack: 'banda', symbol: 'none' },
          ],
          legend: { ...base.legend, data: [historia.nombre, pronostico.nombre, 'Banda de error (95 %)'] },
        };
      }
    }
    return base;
  }
}
