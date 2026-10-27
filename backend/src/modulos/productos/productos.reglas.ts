// productos.reglas.ts → reglas PURAS de precios del catálogo.

import { redondear } from '../../comun/utilidades.js';

// Escala por volumen: desde N unidades, cada una cuesta X.
export interface Escala {
  desde: number;
  precio: number;
}

export interface PreciosProducto {
  precioMenor: number;
  precioMayor: number;
  cantidadMinimaMayor: number;
  escalas?: Escala[];
  // listas de precio por tipo de cliente: { DISTRIBUIDOR: 2.10, EXPORTADOR: 1.95 }
  listas?: Record<string, number>;
}

// ─── RN-16: el precio por mayor se aplica desde la cantidad mínima ───
// Orden de prioridad (del más específico al más general):
//   1. La lista del tipo de cliente (un exportador tiene su precio pactado).
//   2. La escala por volumen más alta que alcance la cantidad.
//   3. El precio por mayor si la cantidad llega al mínimo o el cliente es mayorista.
//   4. El precio por menor.
export function precioUnitario(p: PreciosProducto, cantidad: number, tipoCliente = 'CONSUMIDOR'): { precio: number; regla: string } {
  if (p.listas?.[tipoCliente] !== undefined) return { precio: p.listas[tipoCliente], regla: `Lista ${tipoCliente}` };
  const escala = [...(p.escalas ?? [])].sort((a, b) => b.desde - a.desde).find((e) => cantidad >= e.desde);
  if (escala) return { precio: escala.precio, regla: `Escala desde ${escala.desde}` };
  const esMayorista = ['MAYORISTA', 'DISTRIBUIDOR', 'EXPORTADOR'].includes(tipoCliente);
  if (cantidad >= p.cantidadMinimaMayor || esMayorista) return { precio: p.precioMayor, regla: 'Precio por mayor' };
  return { precio: p.precioMenor, regla: 'Precio por menor' };
}

// margen(): (precio − costo) ÷ precio, en %.
export function margen(precio: number, costo: number): number {
  return precio > 0 ? redondear(((precio - costo) / precio) * 100, 1) : 0;
}

// precioSugerido(): precio para lograr un margen objetivo. costo 2 y margen 40 % → 2 ÷ 0,6 = 3,33.
export function precioSugerido(costo: number, margenObjetivoPct: number): number {
  return redondear(costo / (1 - margenObjetivoPct / 100));
}

// precioGranoDelDia(): el grano se vende al precio del día del quintal más un margen.
export function precioGranoKg(precioQqDia: number, margenPct: number): number {
  return redondear((precioQqDia / 45.36) * (1 + margenPct / 100), 4);
}
