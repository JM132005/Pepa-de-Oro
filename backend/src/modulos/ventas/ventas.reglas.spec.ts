// ventas.reglas.spec.ts → pruebas TDD de ventas (RN-17, RN-18, RN-22).

import { verificarDescuento, verificarCredito, verificarConversion, tramoAntiguedad, estaVencida, cierreCaja, cambio, tasaCierre } from './ventas.reglas.js';

const topes = { VENTAS: 5, GERENTE: 100 };
const d = (t: string) => new Date(`${t}T12:00:00`);

describe('RN-17 · tope de descuento por rol', () => {
  it('una vendedora puede dar 5 % pero no 8 %', () => {
    expect(verificarDescuento(5, ['VENTAS'], topes)).toBeNull();
    expect(verificarDescuento(8, ['VENTAS'], topes)).toContain('RN-17');
  });
  it('el gerente puede dar 30 %', () => {
    expect(verificarDescuento(30, ['GERENTE'], topes)).toBeNull();
  });
});

describe('RN-18 · crédito', () => {
  const cliente = { creditoDias: 30, cupo: 2000, saldoPendiente: 1500, facturasVencidas: 0 };
  it('rechaza si la venta supera el cupo', () => {
    expect(verificarCredito(cliente, 600)).toContain('cupo');
  });
  it('rechaza si tiene facturas vencidas', () => {
    expect(verificarCredito({ ...cliente, facturasVencidas: 1 }, 10)).toContain('vencida');
  });
  it('rechaza crédito a un cliente de contado', () => {
    expect(verificarCredito({ ...cliente, creditoDias: 0 }, 10)).toContain('contado');
  });
  it('acepta dentro del cupo', () => {
    expect(verificarCredito(cliente, 400)).toBeNull();
  });
});

describe('RN-22 · cotización vencida', () => {
  it('a los 16 días ya no se convierte en pedido', () => {
    expect(verificarConversion({ estado: 'ENVIADA', fecha: d('2026-10-01'), diasValidez: 15 }, d('2026-10-17'))).toContain('RN-22');
    expect(verificarConversion({ estado: 'ENVIADA', fecha: d('2026-10-01'), diasValidez: 15 }, d('2026-10-10'))).toBeNull();
  });
});

describe('Cobranza y caja', () => {
  it('antigüedad y vencimiento', () => {
    expect(tramoAntiguedad(d('2026-08-01'), d('2026-10-19'))).toBe('+60');
    expect(estaVencida({ saldo: 10, vence: d('2026-10-01') }, d('2026-10-19'))).toBe(true);
    expect(estaVencida({ saldo: 0, vence: d('2026-10-01') }, d('2026-10-19'))).toBe(false);
  });
  it('cierre de caja, cambio y tasa de cierre', () => {
    expect(cierreCaja(50, 230.5, 279).diferencia).toBe(-1.5);
    expect(cambio(7.35, 10)).toBe(2.65);
    expect(() => cambio(10, 5)).toThrow();
    expect(tasaCierre(3, 4)).toBe(75);
  });
});
