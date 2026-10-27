// proyecciones.reglas.ts → métodos SIMPLES y EXPLICABLES para pronosticar (no es "magia" ni caja negra).
// Se pueden defender en clase y más adelante cambiar por machine learning.

import { redondear } from '../../comun/utilidades.js';

// ─── Regresión lineal (mínimos cuadrados) ───
// Busca la recta y = a + b·x que mejor pasa por los puntos. x = número del mes (0, 1, 2...), y = ventas.
//   b (pendiente)  = cuánto sube o baja cada mes.
//   a (intercepto) = valor de partida.
//   r² = qué tan bien explica la recta los datos (1 = perfecto, 0 = nada).
export function regresionLineal(y: number[]) {
  const n = y.length;
  if (n < 2) return { pendiente: 0, intercepto: y[0] ?? 0, r2: 0 };
  const x = y.map((_, i) => i);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  const pendiente = sxx ? sxy / sxx : 0;
  const intercepto = my - pendiente * mx;
  const r2 = syy ? (sxy * sxy) / (sxx * syy) : 0;
  return { pendiente, intercepto, r2: redondear(r2, 3) };
}

// ─── Índice de estacionalidad por mes ───
// Si en diciembre se vende 40 % más que el promedio, su índice es 1,4. Se calcula con todos los
// diciembres de la historia. Meses sin datos quedan en 1 (neutro).
export function indicesEstacionales(serie: { mes: string; valor: number }[]): number[] {
  const promedioGeneral = serie.reduce((s, p) => s + p.valor, 0) / (serie.length || 1);
  const indices = Array.from({ length: 12 }, () => [] as number[]);
  for (const p of serie) indices[Number(p.mes.slice(5, 7)) - 1].push(p.valor);
  return indices.map((vals) => (vals.length && promedioGeneral ? redondear(vals.reduce((s, v) => s + v, 0) / vals.length / promedioGeneral, 3) : 1));
}

// siguienteMes(): "2026-12" → "2027-01".
export function siguienteMes(mes: string, pasos = 1): string {
  const [a, m] = mes.split('-').map(Number);
  const total = a * 12 + (m - 1) + pasos;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

// ─── Pronóstico = tendencia × estacionalidad, con banda de error ───
// 1. Se "quita" la estacionalidad (valor ÷ índice del mes) para ver la tendencia limpia.
// 2. Se ajusta la recta sobre esa serie limpia.
// 3. Se proyecta la recta y se vuelve a multiplicar por el índice del mes futuro.
// 4. La banda es ±1,96 × error típico de los residuos (≈ 95 % de confianza).
export function pronosticar(serie: { mes: string; valor: number }[], meses = 3) {
  if (!serie.length) return [];
  const indices = indicesEstacionales(serie);
  const limpia = serie.map((p) => p.valor / (indices[Number(p.mes.slice(5, 7)) - 1] || 1));
  const { pendiente, intercepto, r2 } = regresionLineal(limpia);
  const residuos = limpia.map((v, i) => v - (intercepto + pendiente * i));
  const error = Math.sqrt(residuos.reduce((s, r) => s + r * r, 0) / Math.max(1, serie.length - 2));
  const ultimo = serie[serie.length - 1].mes;
  return Array.from({ length: meses }, (_, k) => {
    const mes = siguienteMes(ultimo, k + 1);
    const indice = indices[Number(mes.slice(5, 7)) - 1] || 1;
    const base = intercepto + pendiente * (serie.length + k);
    const valor = Math.max(0, base * indice);
    return { mes, valor: redondear(valor), minimo: redondear(Math.max(0, (base - 1.96 * error) * indice)), maximo: redondear((base + 1.96 * error) * indice), r2 };
  });
}

// ─── Inventario: punto de reorden y días hasta agotarse ───
// Punto de reorden = venta diaria × días que tarda reponer + stock de seguridad.
// Ejemplo: vendo 20 barras/día, producir tarda 5 días y quiero 3 días de colchón → 20×5 + 20×3 = 160.
export function puntoReorden(ventaDiaria: number, diasReposicion: number, diasSeguridad = 3): number {
  return Math.ceil(ventaDiaria * diasReposicion + ventaDiaria * diasSeguridad);
}

export function diasHastaAgotarse(stockDisponible: number, ventaDiaria: number): number | null {
  return ventaDiaria > 0 ? Math.floor(stockDisponible / ventaDiaria) : null; // null = no se vende (no se agota)
}

// cantidadSugerida(): cuánto producir para cubrir 30 días más el stock de seguridad.
export function cantidadSugerida(stockDisponible: number, ventaDiaria: number, diasCobertura = 30): number {
  return Math.max(0, Math.ceil(ventaDiaria * diasCobertura - stockDisponible));
}

// ─── Cosecha proyectada ───
// kg = hectáreas × rendimiento histórico de ese mes por ha × factor de edad. Las parcelas en renovación no producen.
export function proyectarCosecha(
  parcelas: { codigo: string; hectareas: number; estado: string; factorEdad: number }[],
  rendimientoMesKgHa: number,
) {
  return parcelas
    .filter((p) => p.estado === 'PRODUCCION')
    .map((p) => ({ codigo: p.codigo, kg: redondear(p.hectareas * rendimientoMesKgHa * p.factorEdad) }));
}

// temporada(): en la costa ecuatoriana la cosecha alta del cacao va aproximadamente de abril a julio.
export function temporada(mes: number): 'ALTA' | 'MEDIA' | 'BAJA' {
  if (mes >= 4 && mes <= 7) return 'ALTA';
  if (mes === 3 || mes === 8 || mes === 12 || mes === 1) return 'MEDIA';
  return 'BAJA';
}

// ─── Flujo de caja de las próximas semanas ───
export function flujoCaja(cobros: { fecha: Date; monto: number }[], pagos: { fecha: Date; monto: number }[], semanas = 4, hoy = new Date()) {
  const inicio = new Date(hoy);
  inicio.setHours(0, 0, 0, 0);
  return Array.from({ length: semanas }, (_, s) => {
    const desde = new Date(inicio.getTime() + s * 7 * 86_400_000);
    const hasta = new Date(desde.getTime() + 7 * 86_400_000);
    const enSemana = (f: Date) => new Date(f) >= desde && new Date(f) < hasta;
    // La semana 1 también incluye lo atrasado (vencido antes de hoy).
    const cuenta = (lista: { fecha: Date; monto: number }[]) =>
      redondear(lista.filter((x) => enSemana(x.fecha) || (s === 0 && new Date(x.fecha) < desde)).reduce((t, x) => t + x.monto, 0));
    const entra = cuenta(cobros);
    const sale = cuenta(pagos);
    return { semana: s + 1, desde, entra, sale, neto: redondear(entra - sale) };
  });
}

// ventaBajoPronostico(): alerta si un producto vende 30 % menos que lo pronosticado.
export function ventaBajoPronostico(real: number, pronostico: number): boolean {
  return pronostico > 0 && real < pronostico * 0.7;
}
