// inventario.reglas.ts → reglas PURAS del inventario.
// Idea central: el stock NO se escribe a mano. Cada entrada o salida es un MOVIMIENTO (kardex)
// y el stock de cada lote es el resultado de esos movimientos.

import { redondear, diasEntre } from '../../comun/utilidades.js';

// Un lote de producto en una bodega (lo mínimo que necesitan estas reglas).
export interface LoteStock {
  _id: string;
  codigo: string;
  cantidad: number; // físico
  reservado: number; // apartado por pedidos confirmados
  vencimiento?: Date | null;
  liberado: boolean; // RN-11
  bloqueado?: boolean; // no conformidad
}

// abajo3(): redondea HACIA ABAJO a 3 decimales. Las sumas y restas con decimales dejan restos como
// 762,2999999998; si se redondeara hacia arriba (762,300) se intentaría sacar más de lo que hay.
export function abajo3(valor: number): number {
  return Math.floor(valor * 1000 + 1e-6) / 1000;
}

// TOLERANCIA: diferencia mínima (media milésima) que se acepta al comparar cantidades con decimales en la base.
// abajo3() redondea 47,99999999999996 a 48; sin tolerancia, MongoDB diría que 47,99999999999996 < 48 y la salida fallaría.
export const TOLERANCIA = 0.0005;

// disponible(): lo que se puede vender = físico − reservado.
export function disponible(l: LoteStock): number {
  return abajo3(l.cantidad - (l.reservado ?? 0));
}

// ─── RN-14: un producto vencido no se vende ───
export function estaVencido(l: { vencimiento?: Date | null }, hoy = new Date()): boolean {
  return Boolean(l.vencimiento && new Date(l.vencimiento) < hoy);
}

// esVendible(): liberado por calidad, sin bloqueo y sin vencer.
export function esVendible(l: LoteStock, hoy = new Date()): boolean {
  return l.liberado && !l.bloqueado && !estaVencido(l, hoy);
}

// ─── RN-13: las salidas siguen FEFO — "First Expired, First Out" (primero lo que vence primero) ───
// Ejemplo: hay chocolate que vence en marzo y otro en junio → se vende primero el de marzo.
// Los lotes sin vencimiento (repuestos) van al final y, entre iguales, el más antiguo primero (FIFO).
export function ordenarFefo<T extends { vencimiento?: Date | null; codigo: string }>(lotes: T[]): T[] {
  // [...lotes] crea una copia para no desordenar el arreglo original.
  return [...lotes].sort((a, b) => {
    const va = a.vencimiento ? new Date(a.vencimiento).getTime() : Infinity;
    const vb = b.vencimiento ? new Date(b.vencimiento).getTime() : Infinity;
    return va - vb || a.codigo.localeCompare(b.codigo);
  });
}

// ─── RN-12: el stock nunca queda negativo ───
// asignarSalida(): decide de QUÉ lotes y CUÁNTO sacar de cada uno (FEFO). Si no alcanza, lanza error
// diciendo cuánto falta, y NO se mueve nada.
export function asignarSalida(
  lotes: LoteStock[],
  cantidad: number,
  opciones: { soloVendibles?: boolean; usarReservado?: boolean; hoy?: Date } = {},
): { loteId: string; codigo: string; cantidad: number }[] {
  if (cantidad <= 0) throw new Error('La cantidad debe ser mayor que cero');
  const hoy = opciones.hoy ?? new Date();
  const candidatos = ordenarFefo(
    lotes.filter((l) => (opciones.soloVendibles ? esVendible(l, hoy) : !estaVencido(l, hoy) && !l.bloqueado)),
  );
  const asignacion: { loteId: string; codigo: string; cantidad: number }[] = [];
  let falta = cantidad;
  for (const l of candidatos) {
    if (falta <= 0) break;
    const puede = opciones.usarReservado ? abajo3(l.cantidad) : disponible(l);
    if (puede <= 0) continue;
    const toma = abajo3(Math.min(puede, falta));
    asignacion.push({ loteId: l._id, codigo: l.codigo, cantidad: toma });
    falta = redondear(falta - toma, 3);
  }
  if (falta > 0) {
    const hay = redondear(cantidad - falta, 3);
    throw new Error(`RN-12: stock insuficiente: se piden ${cantidad} y hay ${hay} disponibles (faltan ${falta})`);
  }
  return asignacion;
}

// ─── RN-15: un ajuste de inventario exige motivo y aprobación del gerente ───
export function verificarAjuste(motivo: string | undefined, esGerente: boolean): string | null {
  if (!motivo || motivo.trim().length < 10) return 'RN-15: el ajuste necesita un motivo de al menos 10 caracteres';
  if (!esGerente) return 'RN-15: solo el gerente aprueba ajustes de inventario';
  return null;
}

// ─── Costo promedio ponderado ───
// Si tengo 100 kg a $2 y entran 50 kg a $3: (100×2 + 50×3) ÷ 150 = $2,33 por kg.
export function costoPromedio(stockActual: number, costoActual: number, cantidadEntra: number, costoEntra: number): number {
  const total = stockActual + cantidadEntra;
  if (total <= 0) return costoEntra;
  return redondear((stockActual * costoActual + cantidadEntra * costoEntra) / total, 4);
}

// ─── Estado que ve la web ───
export function estadoStock(disponibleTotal: number, stockMinimo: number, proximamente = false) {
  if (disponibleTotal <= 0) return proximamente ? 'PROXIMAMENTE' : 'AGOTADO';
  if (disponibleTotal <= stockMinimo) return 'ULTIMAS_UNIDADES';
  return 'DISPONIBLE';
}

// ─── Alertas de vencimiento (90, 60 y 30 días) ───
export function tramoVencimiento(vencimiento: Date | null | undefined, hoy = new Date()): 'VENCIDO' | 30 | 60 | 90 | null {
  if (!vencimiento) return null;
  const dias = diasEntre(hoy, vencimiento);
  if (dias < 0) return 'VENCIDO';
  if (dias <= 30) return 30;
  if (dias <= 60) return 60;
  if (dias <= 90) return 90;
  return null;
}

// ─── Unidades: conversión automática ───
export const FACTOR_A_KG: Record<string, number> = { KG: 1, QUINTAL: 45.36, SACO: 69 };
export function convertir(cantidad: number, de: string, a: string): number {
  if (!FACTOR_A_KG[de] || !FACTOR_A_KG[a]) throw new Error(`No se puede convertir de ${de} a ${a}`);
  return redondear((cantidad * FACTOR_A_KG[de]) / FACTOR_A_KG[a], 3);
}
