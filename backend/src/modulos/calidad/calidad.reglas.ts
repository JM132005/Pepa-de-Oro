// calidad.reglas.ts → reglas PURAS de calidad. El sistema calcula el grado: nadie lo escribe a mano.

import type { LimiteGradoCacao, LimiteGradoCafe } from '../configuracion/configuracion.esquema.js';
import { tieneRol, type UsuarioToken } from '../../comun/usuario-token.js';
import type { Grado } from '../../comun/constantes.js';

// Prueba de corte: se cortan 100 granos a lo largo y se cuentan por tipo.
export interface PruebaCorte {
  bienFermentados: number; // marrones: buen sabor a chocolate
  violetas: number; // fermentación incompleta
  pizarrosos: number; // grises, sin fermentar: amargos y astringentes
  mohosos: number; // con hongos: peligro para la salud
  insectados: number; // dañados por insectos
  germinados: number;
  humedad: number; // %
  peso100Granos: number; // gramos
}

// validarPruebaCorte(): los conteos deben sumar 100 granos.
export function validarPruebaCorte(p: PruebaCorte): string | null {
  const total = p.bienFermentados + p.violetas + p.pizarrosos + p.mohosos + p.insectados + p.germinados;
  return total === 100 ? null : `La prueba de corte debe sumar 100 granos (suma ${total})`;
}

// ─── RN-06: el grado de calidad lo calcula el sistema con la tabla de límites ───
// Se recorre la tabla desde el grado más exigente (PREMIUM) al menos exigente (NACIONAL);
// el primer grado cuyos límites se cumplen TODOS es el grado del lote. Si no cumple ninguno → RECHAZO.
// Devuelve también los motivos, para que el productor sepa qué mejorar.
export function calcularGradoCacao(p: PruebaCorte, tabla: LimiteGradoCacao[]): { grado: Grado; motivos: string[] } {
  let motivosUltimo: string[] = [];
  for (const g of tabla) {
    const motivos: string[] = [];
    if (p.bienFermentados < g.fermentadosMin) motivos.push(`fermentados ${p.bienFermentados} % < ${g.fermentadosMin} %`);
    if (p.violetas > g.violetasMax) motivos.push(`violetas ${p.violetas} % > ${g.violetasMax} %`);
    if (p.pizarrosos > g.pizarrososMax) motivos.push(`pizarrosos ${p.pizarrosos} % > ${g.pizarrososMax} %`);
    if (p.mohosos > g.mohososMax) motivos.push(`mohosos ${p.mohosos} % > ${g.mohososMax} %`);
    if (p.insectados + p.germinados > g.defectuososMax) motivos.push(`defectuosos ${p.insectados + p.germinados} % > ${g.defectuososMax} %`);
    if (p.humedad > g.humedadMax) motivos.push(`humedad ${p.humedad} % > ${g.humedadMax} %`);
    if (p.peso100Granos < g.peso100GranosMin) motivos.push(`peso de 100 granos ${p.peso100Granos} g < ${g.peso100GranosMin} g`);
    if (!motivos.length) return { grado: g.grado, motivos: [] };
    motivosUltimo = motivos;
  }
  return { grado: 'RECHAZO', motivos: motivosUltimo };
}

// Café: defectos en una muestra de 300 g, puntaje de taza (escala SCA de 0 a 100) y humedad.
export interface MuestraCafe {
  defectos300g: number;
  puntajeTaza: number;
  humedad: number;
}

export function calcularGradoCafe(m: MuestraCafe, tabla: LimiteGradoCafe[]): { grado: Grado; motivos: string[] } {
  let motivosUltimo: string[] = [];
  for (const g of tabla) {
    const motivos: string[] = [];
    if (m.defectos300g > g.defectosMax) motivos.push(`defectos ${m.defectos300g} > ${g.defectosMax}`);
    if (m.puntajeTaza < g.puntajeTazaMin) motivos.push(`taza ${m.puntajeTaza} < ${g.puntajeTazaMin}`);
    if (m.humedad > g.humedadMax) motivos.push(`humedad ${m.humedad} % > ${g.humedadMax} %`);
    if (!motivos.length) return { grado: g.grado, motivos: [] };
    motivosUltimo = motivos;
  }
  return { grado: 'RECHAZO', motivos: motivosUltimo };
}

// destinoSugerido(): qué hacer con el lote según su grado.
export function destinoSugerido(grado: Grado): string {
  return {
    PREMIUM: 'Exportación fina de aroma o chocolate de origen',
    EXPORTACION: 'Exportación en sacos de 69 kg',
    NACIONAL: 'Venta nacional o producción de cacao en polvo',
    RECHAZO: 'No conformidad: devolución, reproceso o descarte',
  }[grado];
}

// ─── RN-07: solo Calidad y Gerencia evalúan o rechazan lotes ───
export function puedeEvaluar(usuario: UsuarioToken | undefined): boolean {
  return tieneRol(usuario, 'CALIDAD');
}

// ─── RN-11: un lote de producto no se vende hasta que Calidad lo libere ───
// Control de producto terminado: peso neto dentro de tolerancia, sellado y etiqueta correctos.
export interface ControlProductoTerminado {
  pesoNominalG: number; // lo que dice la etiqueta (ej: 50 g)
  pesoPromedioG: number; // promedio de la muestra
  selladoOk: boolean;
  etiquetaOk: boolean;
  temperaturaTemplado?: number; // °C (solo chocolate): entre 27 y 32 queda brillante y "truena" al partir
}

export function evaluarProductoTerminado(c: ControlProductoTerminado): { liberado: boolean; motivos: string[] } {
  const motivos: string[] = [];
  // Tolerancia de peso del 3 % (inspirada en la norma de contenido neto de productos preenvasados).
  if (c.pesoPromedioG < c.pesoNominalG * 0.97) motivos.push(`peso promedio ${c.pesoPromedioG} g por debajo de ${c.pesoNominalG} g − 3 %`);
  if (!c.selladoOk) motivos.push('sellado defectuoso');
  if (!c.etiquetaOk) motivos.push('etiqueta incompleta');
  if (c.temperaturaTemplado !== undefined && (c.temperaturaTemplado < 27 || c.temperaturaTemplado > 32)) {
    motivos.push(`templado a ${c.temperaturaTemplado} °C fuera de 27–32 °C`);
  }
  return { liberado: motivos.length === 0, motivos };
}

// puedeVenderse(): lo usa inventario antes de cualquier venta (RN-11 + bloqueo por no conformidad).
export function puedeVenderse(lote: { liberado: boolean; bloqueado?: boolean }): boolean {
  return lote.liberado && !lote.bloqueado;
}
