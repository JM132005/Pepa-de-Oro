// proyecciones.ts → PROYECCIONES Y PRONÓSTICOS con métodos simples y explicables (proyecciones.reglas.ts):
//   · Ventas: regresión lineal sobre las ventas mensuales × índice de estacionalidad (dic. vende más),
//     con banda de error. También por producto.
//   · Punto de reorden y días hasta agotarse de cada producto (sugiere orden de producción o compra).
//   · Cosecha de los próximos 12 meses por parcela (según edad de las plantas y temporada).
//   · Plan de materia prima: lo que harán falta de grano, azúcar y empaques contra lo que hay.
//   · Flujo de caja de las próximas 4 semanas (solo gerente) y alertas de tendencia.
// Cada bloque se muestra solo si el rol puede verlo (la API también lo revisa).

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnaliticaService } from '../../../compartido/Servicios/analitica.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Grafico, Pronostico } from '../../../compartido/Entidades/analitica';
import { GraficoComponent } from '../../../compartido/Componentes/grafico/grafico';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { dinero, fecha, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';

type Serie = { mes: string; valor: number }[];

// banda(): arma el gráfico de pronóstico (historia + pronóstico + banda mínimo–máximo) que entiende <app-grafico>.
function banda(id: string, titulo: string, historia: Serie, pronostico: Pronostico[], formato: Grafico['formato']): Grafico {
  const categorias = [...historia.map((h) => h.mes), ...pronostico.map((p) => p.mes)];
  const n = historia.length;
  // El pronóstico arranca en el último mes real para que las dos líneas se unan.
  const ultimo = historia.at(-1)?.valor ?? null;
  return {
    id,
    titulo,
    tipo: 'banda',
    formato,
    categorias,
    series: [
      { nombre: 'Real', datos: [...historia.map((h) => h.valor), ...pronostico.map(() => null)] },
      { nombre: 'Pronóstico', datos: [...historia.map((_, i) => (i === n - 1 ? ultimo : null)), ...pronostico.map((p) => p.valor)] },
      { nombre: 'Mínimo', datos: [...historia.map(() => null), ...pronostico.map((p) => p.minimo)] },
      { nombre: 'Máximo', datos: [...historia.map(() => null), ...pronostico.map((p) => p.maximo)] },
    ],
  };
}

@Component({
  selector: 'app-proyecciones',
  imports: [FormsModule, GraficoComponent, Tabla],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './proyecciones.html',
})
export class Proyecciones {
  private readonly analitica = inject(AnaliticaService);
  readonly auth = inject(AuthService);

  // Qué bloques ve cada rol (los mismos @Roles del controlador de analítica).
  readonly ve = {
    ventas: this.auth.tieneRol('VENTAS', 'PRODUCCION'),
    reorden: this.auth.tieneRol('VENTAS', 'PRODUCCION', 'BODEGA'),
    cosecha: this.auth.tieneRol('AGRONOMO', 'PRODUCCION', 'ACOPIO'),
    materiaPrima: this.auth.tieneRol('PRODUCCION', 'ACOPIO', 'BODEGA'),
    flujo: this.auth.esGerente(),
    tendencias: this.auth.tieneRol('VENTAS', 'CALIDAD', 'ACOPIO', 'PRODUCCION'),
  };

  readonly ventas = signal<{ historia: Serie; pronostico: Pronostico[] } | null>(null);
  readonly productos = signal<{ productoId: string; nombre: string; unidad: string; historia: Serie; pronostico: Pronostico[] }[]>([]);
  readonly productoElegido = signal('');
  readonly reorden = signal<Record<string, unknown>[]>([]);
  readonly cosecha = signal<{ meses: string[]; temporadas: string[]; factorCacao: number; parcelas: { parcela: string; hacienda: string; cultivo: string; estado: string; etapa: string; kgFrescos: number[] }[]; totalFresco: number[]; totalSecoEstimado: number[] } | null>(null);
  readonly materiaPrima = signal<{ meses: number; granoPropioProyectadoKg: number; materiales: { nombre: string; unidad: string; tipo: string; necesita: number; disponible: number; faltaComprar: number }[] } | null>(null);
  readonly flujo = signal<{ semana: number; desde: string; entra: number; sale: number; neto: number }[]>([]);
  readonly tendencias = signal<{ tipo: string; mensaje: string }[]>([]);

  readonly graficoVentas = computed(() => {
    const v = this.ventas();
    return v ? banda('ventas', 'Ventas mensuales (sin IVA) y pronóstico de 3 meses', v.historia.slice(-15), v.pronostico, 'dinero') : null;
  });
  readonly r2 = computed(() => this.ventas()?.pronostico[0]?.r2 ?? null);
  readonly graficoProducto = computed(() => {
    const p = this.productos().find((x) => x.productoId === this.productoElegido()) ?? this.productos()[0];
    return p ? banda('producto', `${p.nombre} · unidades por mes`, p.historia, p.pronostico, 'numero') : null;
  });
  readonly graficoCosecha = computed<Grafico | null>(() => {
    const c = this.cosecha();
    if (!c) return null;
    // Una serie por hacienda (sumando sus parcelas) para que el gráfico se lea fácil.
    const haciendas = [...new Set(c.parcelas.map((p) => p.hacienda))];
    return {
      id: 'cosecha',
      titulo: 'Kg frescos proyectados por hacienda',
      tipo: 'barras_apiladas',
      formato: 'kg',
      categorias: c.meses.map((m, i) => `${m} ${c.temporadas[i] === 'ALTA' ? '▲' : ''}`),
      series: haciendas.map((h) => ({ nombre: h, datos: c.meses.map((_, i) => c.parcelas.filter((p) => p.hacienda === h).reduce((s, p) => s + (p.kgFrescos[i] ?? 0), 0)) })),
    };
  });
  readonly graficoFlujo = computed<Grafico | null>(() => {
    const f = this.flujo();
    if (!f.length) return null;
    return { id: 'flujo', titulo: 'Flujo de caja de las próximas 4 semanas', tipo: 'barras', formato: 'dinero', categorias: f.map((x) => `Sem. ${x.semana} (${fecha(x.desde).slice(0, 5)})`), series: [{ nombre: 'Cobros esperados', datos: f.map((x) => x.entra) }, { nombre: 'Pagos', datos: f.map((x) => x.sale) }, { nombre: 'Neto', datos: f.map((x) => x.neto) }] };
  });

  readonly columnasReorden: Columna[] = [
    { campo: 'nombre', titulo: 'Producto' },
    { campo: 'disponible', titulo: 'Disponible', tipo: 'numero' },
    { campo: 'ventaDiaria', titulo: 'Venta diaria', tipo: 'numero' },
    { campo: 'puntoReorden', titulo: 'Punto de reorden', tipo: 'numero' },
    { campo: 'diasHastaAgotarse', titulo: 'Días hasta agotarse', tipo: 'numero' },
    { campo: 'cantidadSugerida', titulo: 'Cantidad sugerida', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'sugerencia', titulo: 'Qué hacer', valor: (r: Record<string, unknown>) => (r['reponer'] ? texto(String(r['sugerencia'])) : '—') },
  ];
  readonly columnasMateria: Columna[] = [
    { campo: 'nombre', titulo: 'Material' },
    { campo: 'tipo', titulo: 'Tipo', tipo: 'etiqueta' },
    { campo: 'necesita', titulo: 'Necesita', tipo: 'numero' },
    { campo: 'disponible', titulo: 'Disponible', tipo: 'numero' },
    { campo: 'faltaComprar', titulo: 'Falta comprar', tipo: 'numero' },
    { campo: 'unidad', titulo: 'Unidad', tipo: 'etiqueta' },
  ];
  readonly dinero = dinero;
  readonly numero = numero;
  // sumar(): para usar con reduce() en la plantilla (suma de una lista de números).
  readonly sumar = (a: number, b: number) => a + b;

  constructor() {
    if (this.ve.ventas) {
      this.analitica.pronosticoVentas().subscribe({ next: (v) => this.ventas.set(v), error: () => undefined });
      this.analitica.pronosticoProductos().subscribe({ next: (p) => { this.productos.set(p); this.productoElegido.set(p[0]?.productoId ?? ''); }, error: () => undefined });
    }
    if (this.ve.reorden) this.analitica.reorden().subscribe({ next: (r) => this.reorden.set(r), error: () => undefined });
    if (this.ve.cosecha) this.analitica.cosecha().subscribe({ next: (c) => this.cosecha.set(c), error: () => undefined });
    if (this.ve.materiaPrima) this.analitica.materiaPrima().subscribe({ next: (m) => this.materiaPrima.set(m), error: () => undefined });
    if (this.ve.flujo) this.analitica.flujoCaja().subscribe({ next: (f) => this.flujo.set(f), error: () => undefined });
    if (this.ve.tendencias) this.analitica.tendencias().subscribe({ next: (t) => this.tendencias.set(t), error: () => undefined });
  }

  // totalSeco(): kg secos proyectados en todo el año (suma de la serie).
  totalSeco() {
    return (this.cosecha()?.totalSecoEstimado ?? []).reduce((s, x) => s + x, 0);
  }
}
