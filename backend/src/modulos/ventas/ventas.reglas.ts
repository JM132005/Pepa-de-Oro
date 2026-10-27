// ventas.reglas.ts → reglas PURAS de ventas: descuentos, crédito, cotizaciones y cobranza.

import { diasEntre, redondear, sumarDias } from '../../comun/utilidades.js';

// ─── RN-17: el descuento manual no supera el tope del rol ───
// topes: { VENTAS: 5, GERENTE: 100 } → una vendedora puede dar hasta 5 %; el gerente, lo que quiera.
// Si el usuario tiene varios roles, se usa el tope más alto.
export function topeDescuento(roles: string[], topes: Record<string, number>): number {
  return Math.max(0, ...roles.map((r) => topes[r] ?? 0));
}

export function verificarDescuento(descuentoPct: number, roles: string[], topes: Record<string, number>): string | null {
  const tope = topeDescuento(roles, topes);
  if (descuentoPct < 0 || descuentoPct > 100) return 'El descuento debe estar entre 0 y 100 %';
  return descuentoPct <= tope ? null : `RN-17: tu rol permite hasta ${tope} % de descuento; pediste ${descuentoPct} %. Solicita aprobación del gerente.`;
}

// ─── RN-18: no se vende a crédito si se supera el cupo o hay deuda vencida ───
export interface SituacionCredito {
  creditoDias: number; // 0 = solo contado
  cupo: number; // monto máximo que puede deber
  saldoPendiente: number; // lo que ya debe
  facturasVencidas: number; // cuántas facturas pasaron su fecha de pago
}

export function verificarCredito(c: SituacionCredito, totalNuevo: number): string | null {
  if (c.creditoDias <= 0) return 'RN-18: el cliente no tiene crédito aprobado; la venta debe ser de contado';
  if (c.facturasVencidas > 0) return `RN-18: el cliente tiene ${c.facturasVencidas} factura(s) vencida(s); primero debe ponerse al día`;
  const usado = redondear(c.saldoPendiente + totalNuevo);
  if (usado > c.cupo) return `RN-18: con esta venta debería $${usado} y su cupo es $${c.cupo}`;
  return null;
}

// ─── RN-22: una cotización vencida no se convierte en pedido ───
export function cotizacionVigente(fecha: Date, diasValidez: number, hoy = new Date()): boolean {
  return sumarDias(fecha, diasValidez) >= hoy;
}

export function verificarConversion(cot: { estado: string; fecha: Date; diasValidez: number }, hoy = new Date()): string | null {
  if (['RECHAZADA', 'VENCIDA'].includes(cot.estado)) return `La cotización está ${cot.estado.toLowerCase()}`;
  if (cot.estado === 'ACEPTADA') return 'La cotización ya se convirtió en pedido';
  if (!cotizacionVigente(cot.fecha, cot.diasValidez, hoy)) return 'RN-22: la cotización venció; haz una nueva con los precios de hoy';
  return null;
}

// ─── Cuentas por cobrar: antigüedad de la deuda ───
export function tramoAntiguedad(fechaEmision: Date, hoy = new Date()): '0-30' | '31-60' | '+60' {
  const dias = diasEntre(fechaEmision, hoy);
  if (dias <= 30) return '0-30';
  if (dias <= 60) return '31-60';
  return '+60';
}

// estaVencida(): una factura a crédito vence "creditoDias" después de emitida.
export function estaVencida(f: { saldo: number; vence?: Date | null }, hoy = new Date()): boolean {
  return f.saldo > 0.005 && Boolean(f.vence) && new Date(f.vence!) < hoy;
}

// ─── Caja: diferencia entre lo contado y lo esperado ───
export function cierreCaja(montoInicial: number, ventasEfectivo: number, contado: number) {
  const esperado = redondear(montoInicial + ventasEfectivo);
  return { esperado, contado: redondear(contado), diferencia: redondear(contado - esperado) };
}

// cambio(): vuelto que se le da al cliente que paga en efectivo.
export function cambio(total: number, recibido: number): number {
  if (recibido + 0.005 < total) throw new Error(`Falta dinero: total $${total}, recibido $${recibido}`);
  return redondear(recibido - total);
}

// tasaCierre(): cotizaciones aceptadas ÷ enviadas.
export function tasaCierre(aceptadas: number, enviadas: number): number {
  return enviadas ? redondear((aceptadas / enviadas) * 100, 1) : 0;
}
