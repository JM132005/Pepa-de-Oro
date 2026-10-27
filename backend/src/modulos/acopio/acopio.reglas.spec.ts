// acopio.reglas.spec.ts → pruebas TDD de la compra a productores.

import { verificarProductorActivo, descuentoHumedadKg, calcularLiquidacion, estadoPago, bajaTresSeguidas } from './acopio.reglas.js';

describe('RN-03 · productor inactivo', () => {
  it('rechaza la entrega de un productor inactivo', () => {
    expect(verificarProductorActivo({ activo: false, nombre: 'Luis' })).toContain('RN-03');
  });
  it('acepta un productor activo', () => {
    expect(verificarProductorActivo({ activo: true, nombre: 'Luis' })).toBeNull();
  });
});

describe('RN-04 · descuento por humedad sobre el exceso a 7 %', () => {
  it('1 000 kg secos al 10 % descuentan 32,26 kg', () => {
    expect(descuentoHumedadKg(1000, 10, 'SECO')).toBe(32.26);
  });
  it('al 7 % o menos no hay descuento', () => {
    expect(descuentoHumedadKg(1000, 7, 'SECO')).toBe(0);
  });
  it('el cacao en baba no lleva descuento por humedad', () => {
    expect(descuentoHumedadKg(1000, 55, 'BABA')).toBe(0);
  });
});

describe('Liquidación de compra', () => {
  const base = {
    kgBrutos: 470,
    taraKg: 6.4,
    humedad: 8,
    impurezasPct: 1,
    estado: 'SECO',
    precioQq: 230,
    organico: true,
    bonoOrganicoQq: 10,
    retencionPct: 1,
    saldoAnticipo: 100,
  };
  it('calcula kg pagables, bono, retención y descuenta el anticipo', () => {
    const r = calcularLiquidacion(base);
    expect(r.kgNetos).toBe(463.6);
    expect(r.descuentoHumedadKg).toBe(4.98);
    expect(r.kgPagables).toBeCloseTo(454.03, 2);
    expect(r.anticipoDescontado).toBe(100);
    expect(r.totalPagar).toBeGreaterThan(2000);
  });
  it('el anticipo nunca deja el pago en negativo', () => {
    const r = calcularLiquidacion({ ...base, saldoAnticipo: 999_999 });
    expect(r.totalPagar).toBe(0);
  });
  it('no acepta kg brutos menores que la tara', () => {
    expect(() => calcularLiquidacion({ ...base, kgBrutos: 5 })).toThrow();
  });
});

describe('Pagos y tendencias', () => {
  it('estado de pago', () => {
    expect(estadoPago(100, 0)).toBe('PENDIENTE');
    expect(estadoPago(100, 40)).toBe('PARCIAL');
    expect(estadoPago(100, 100)).toBe('PAGADA');
  });
  it('alerta si la calidad baja tres entregas seguidas', () => {
    expect(bajaTresSeguidas([80, 78, 74, 70])).toBe(true);
    expect(bajaTresSeguidas([80, 78, 79, 70])).toBe(false);
  });
});
