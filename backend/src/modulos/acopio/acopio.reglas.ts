// acopio.reglas.ts → reglas PURAS de la compra de cacao y café a productores externos.

import { LIMITES } from '../../comun/constantes.js';
import { redondear } from '../../comun/utilidades.js';

// ─── RN-03: un productor inactivo no entrega lotes ───
// Un productor se desactiva, por ejemplo, si vendió cacao con piedras o si se retiró. No se le compra más.
export function verificarProductorActivo(productor: { activo: boolean; nombre: string }): string | null {
  return productor.activo ? null : `RN-03: el productor ${productor.nombre} está inactivo y no puede entregar lotes`;
}

// ─── RN-04: el descuento por humedad se aplica sobre el exceso a 7 % ───
// Si el cacao "seco" llega con 10 % de humedad, parte de lo que pesa es AGUA que se va a evaporar.
// Fórmula de merma por humedad (estándar en acopio):
//     kg a descontar = kg netos × (humedad − 7) ÷ (100 − 7)
// Ejemplo: 1 000 kg al 10 % → 1 000 × 3 ÷ 93 = 32,26 kg menos.
// Solo aplica al grano que se compra SECO; el cacao en BABA se compra fresco (lleva su propio precio).
export function descuentoHumedadKg(kgNetos: number, humedad: number, estado: string, referencia = 7): number {
  if (estado !== 'SECO' || humedad <= referencia) return 0;
  return redondear((kgNetos * (humedad - referencia)) / (100 - referencia), 2);
}

export interface EntradaLiquidacion {
  kgBrutos: number;
  taraKg: number; // peso de los sacos vacíos
  humedad: number;
  impurezasPct: number; // piedras, cáscaras, basura
  estado: string; // BABA, SECO, CEREZA...
  precioQq: number; // precio del día por quintal (45,36 kg)
  organico: boolean; // el productor tiene certificación orgánica vigente
  bonoOrganicoQq: number;
  retencionPct: number; // retención en la fuente del impuesto a la renta
  saldoAnticipo: number; // lo que el productor debe por anticipos
  humedadReferencia?: number;
}

// calcularLiquidacion(): todo el cálculo de cuánto se le paga al productor, paso a paso.
// Se guarda cada número en la liquidación para que el productor vea de dónde sale el total.
export function calcularLiquidacion(e: EntradaLiquidacion) {
  if (e.kgBrutos <= e.taraKg) throw new Error('Los kg brutos deben ser mayores que la tara');
  const kgNetos = redondear(e.kgBrutos - e.taraKg);
  const descHumedad = descuentoHumedadKg(kgNetos, e.humedad, e.estado, e.humedadReferencia ?? 7);
  const descImpurezas = redondear(((kgNetos - descHumedad) * e.impurezasPct) / 100);
  const kgPagables = redondear(kgNetos - descHumedad - descImpurezas);
  const quintales = kgPagables / LIMITES.kgPorQuintal;
  const precioKg = redondear(e.precioQq / LIMITES.kgPorQuintal, 4);
  const subtotal = redondear(quintales * e.precioQq);
  const bonoOrganico = e.organico ? redondear(quintales * e.bonoOrganicoQq) : 0;
  const retencion = redondear(((subtotal + bonoOrganico) * e.retencionPct) / 100);
  const bruto = redondear(subtotal + bonoOrganico - retencion);
  // El anticipo se descuenta hasta donde alcance (nunca deja el pago en negativo).
  const anticipoDescontado = redondear(Math.min(e.saldoAnticipo, bruto));
  const totalPagar = redondear(bruto - anticipoDescontado);
  // kg secos esperados: con el rendimiento típico (cacao en baba ≈ 37 % de su peso).
  const factor = LIMITES.rendimientoSecado[e.estado as keyof typeof LIMITES.rendimientoSecado] ?? 1;
  return {
    kgNetos,
    descuentoHumedadKg: descHumedad,
    descuentoImpurezasKg: descImpurezas,
    kgPagables,
    quintales: redondear(quintales, 2),
    precioKg,
    subtotal,
    bonoOrganico,
    retencion,
    anticipoDescontado,
    totalPagar,
    kgSecosEstimados: redondear(kgPagables * factor),
  };
}

// estadoPago(): según lo pagado frente al total.
export function estadoPago(total: number, pagado: number): 'PENDIENTE' | 'PARCIAL' | 'PAGADA' {
  if (pagado <= 0) return 'PENDIENTE';
  return pagado + 0.005 >= total ? 'PAGADA' : 'PARCIAL';
}

// tendenciaCalidad(): alerta si la calidad de un productor baja tres entregas seguidas
// (cada valor es el % de granos bien fermentados, de la más vieja a la más nueva).
export function bajaTresSeguidas(valores: number[]): boolean {
  if (valores.length < 4) return false;
  const ultimos = valores.slice(-4);
  return ultimos[1] < ultimos[0] && ultimos[2] < ultimos[1] && ultimos[3] < ultimos[2];
}
