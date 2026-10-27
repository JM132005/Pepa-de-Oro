// facturacion.reglas.spec.ts → pruebas TDD de la factura (RN-19, RN-20, RN-21 y clave de acceso).

import { calcularTotales, verificarConsumidorFinal, numeroComprobante, claveAcceso, digitoModulo11, verificarNotaCredito, totalEnLetras } from './facturacion.reglas.js';

describe('Totales línea por línea con IVA 15 % y 0 %', () => {
  const r = calcularTotales([
    { codigo: 'CH70', descripcion: 'Chocolate 70 %', cantidad: 3, precioUnitario: 3.5, tarifaIva: 15 },
    { codigo: 'CAC-EXP', descripcion: 'Cacao en grano', cantidad: 10, precioUnitario: 5.25, descuentoPct: 2, tarifaIva: 0 },
  ]);
  it('separa la base 15 % de la base 0 %', () => {
    expect(r.subtotalIva).toBe(10.5);
    expect(r.subtotal0).toBe(51.45); // 52,50 − 2 % = 51,45
  });
  it('el IVA es 15 % solo de la base gravada y el total cuadra', () => {
    expect(r.iva).toBe(1.58); // 10,50 × 0,15 = 1,575 → 1,58
    expect(r.total).toBe(63.53);
  });
});

describe('RN-19 · consumidor final hasta 50 USD', () => {
  it('bloquea consumidor final sobre 50 y deja pasar con cédula', () => {
    expect(verificarConsumidorFinal('CONSUMIDOR_FINAL', 63.53)).toContain('RN-19');
    expect(verificarConsumidorFinal('CONSUMIDOR_FINAL', 50)).toBeNull();
    expect(verificarConsumidorFinal('CEDULA', 500)).toBeNull();
  });
});

describe('RN-20 · numeración correlativa', () => {
  it('arma el número con 9 dígitos', () => {
    expect(numeroComprobante('001', '001', 123)).toBe('001-001-000000123');
  });
  it('rechaza secuenciales fuera de rango', () => {
    expect(() => numeroComprobante('001', '001', 0)).toThrow();
  });
});

describe('Clave de acceso de 49 dígitos (módulo 11)', () => {
  it('genera 49 dígitos y el último es el verificador', () => {
    const clave = claveAcceso({
      fecha: new Date('2026-10-19T10:00:00'),
      tipoComprobante: '01',
      ruc: '0791234557001',
      ambiente: '1',
      establecimiento: '001',
      puntoEmision: '001',
      secuencial: 123,
      codigoNumerico: '12345678',
    });
    expect(clave).toHaveLength(49);
    expect(clave.startsWith('19102026010791234557001100100100000012312345678')).toBe(true);
    expect(Number(clave[48])).toBe(digitoModulo11(clave.slice(0, 48)));
  });
  it('módulo 11 de un ejemplo conocido', () => {
    expect(digitoModulo11('41261533')).toBe(6);
  });
});

describe('RN-21 · se anula con nota de crédito, sin pasarse', () => {
  it('no deja anular más de lo facturado ni una factura ya anulada', () => {
    expect(verificarNotaCredito({ estado: 'EMITIDA', total: 100, totalNotasCredito: 30 }, 80)).toContain('RN-21');
    expect(verificarNotaCredito({ estado: 'ANULADA', total: 100, totalNotasCredito: 100 }, 1)).toContain('anulada');
    expect(verificarNotaCredito({ estado: 'EMITIDA', total: 100, totalNotasCredito: 30 }, 70)).toBeNull();
  });
});

describe('Total en letras', () => {
  it('escribe el total como en una factura real', () => {
    expect(totalEnLetras(123.45)).toBe('CIENTO VEINTITRES CON 45/100 DÓLARES');
    expect(totalEnLetras(1021)).toBe('MIL VEINTIUNO CON 00/100 DÓLARES');
  });
});
