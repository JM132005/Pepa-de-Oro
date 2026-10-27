// proyecciones.reglas.spec.ts → pruebas de los pronósticos.

import { regresionLineal, indicesEstacionales, pronosticar, puntoReorden, diasHastaAgotarse, cantidadSugerida, proyectarCosecha, temporada, flujoCaja, ventaBajoPronostico, siguienteMes } from './proyecciones.reglas.js';

describe('Regresión lineal', () => {
  it('una serie que sube 10 por mes tiene pendiente 10 y r² = 1', () => {
    const r = regresionLineal([100, 110, 120, 130]);
    expect(r.pendiente).toBeCloseTo(10);
    expect(r.intercepto).toBeCloseTo(100);
    expect(r.r2).toBe(1);
  });
});

describe('Estacionalidad y pronóstico', () => {
  // Dos años de ventas: diciembre siempre vende el doble.
  const serie = Array.from({ length: 24 }, (_, i) => {
    const mes = `${2025 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
    return { mes, valor: (i % 12) === 11 ? 2000 : 1000 };
  });
  it('diciembre tiene un índice mayor que 1', () => {
    expect(indicesEstacionales(serie)[11]).toBeGreaterThan(1.8);
  });
  it('pronostica 3 meses con banda mínima y máxima', () => {
    const p = pronosticar(serie, 3);
    expect(p.map((x) => x.mes)).toEqual(['2027-01', '2027-02', '2027-03']);
    expect(p[0].minimo).toBeLessThanOrEqual(p[0].valor);
    expect(p[0].maximo).toBeGreaterThanOrEqual(p[0].valor);
  });
  it('avanza meses cruzando el año', () => {
    expect(siguienteMes('2026-12')).toBe('2027-01');
  });
});

describe('Inventario', () => {
  it('punto de reorden, días hasta agotarse y cantidad sugerida', () => {
    expect(puntoReorden(20, 5, 3)).toBe(160);
    expect(diasHastaAgotarse(100, 20)).toBe(5);
    expect(diasHastaAgotarse(100, 0)).toBeNull();
    expect(cantidadSugerida(100, 20)).toBe(500);
  });
});

describe('Cosecha, caja y alertas', () => {
  it('las parcelas en renovación no producen', () => {
    const r = proyectarCosecha([{ codigo: 'A', hectareas: 10, estado: 'PRODUCCION', factorEdad: 1 }, { codigo: 'B', hectareas: 5, estado: 'RENOVACION', factorEdad: 1 }], 80);
    expect(r).toEqual([{ codigo: 'A', kg: 800 }]);
    expect(temporada(5)).toBe('ALTA');
  });
  it('flujo de caja por semana', () => {
    const hoy = new Date('2026-10-19T08:00:00');
    const f = flujoCaja([{ fecha: new Date('2026-10-21T08:00:00'), monto: 500 }], [{ fecha: new Date('2026-10-30T08:00:00'), monto: 200 }], 4, hoy);
    expect(f[0].entra).toBe(500);
    expect(f[1].sale).toBe(200);
  });
  it('alerta si vende 30 % menos que el pronóstico', () => {
    expect(ventaBajoPronostico(60, 100)).toBe(true);
    expect(ventaBajoPronostico(80, 100)).toBe(false);
  });
});
