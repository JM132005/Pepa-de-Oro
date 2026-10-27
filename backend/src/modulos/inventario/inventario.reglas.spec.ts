// inventario.reglas.spec.ts → pruebas TDD del inventario (RN-12, RN-13, RN-14, RN-15).

import { asignarSalida, ordenarFefo, estaVencido, verificarAjuste, costoPromedio, estadoStock, tramoVencimiento, convertir, type LoteStock } from './inventario.reglas.js';

const hoy = new Date('2026-10-19T12:00:00');
const lote = (codigo: string, cantidad: number, vence: string | null, extra: Partial<LoteStock> = {}): LoteStock => ({
  _id: codigo,
  codigo,
  cantidad,
  reservado: 0,
  vencimiento: vence ? new Date(`${vence}T12:00:00`) : null,
  liberado: true,
  ...extra,
});

describe('RN-13 · FEFO: primero lo que vence primero', () => {
  it('ordena por vencimiento y deja al final lo que no vence', () => {
    const orden = ordenarFefo([lote('B', 1, '2027-06-01'), lote('C', 1, null), lote('A', 1, '2027-03-01')]);
    expect(orden.map((l) => l.codigo)).toEqual(['A', 'B', 'C']);
  });
  it('una venta de 15 toma 10 del lote que vence primero y 5 del siguiente', () => {
    const r = asignarSalida([lote('JUN', 20, '2027-06-01'), lote('MAR', 10, '2027-03-01')], 15, { hoy });
    expect(r).toEqual([
      { loteId: 'MAR', codigo: 'MAR', cantidad: 10 },
      { loteId: 'JUN', codigo: 'JUN', cantidad: 5 },
    ]);
  });
});

describe('RN-12 · el stock nunca queda negativo', () => {
  it('si no alcanza lanza error y dice cuánto falta', () => {
    expect(() => asignarSalida([lote('A', 4, null)], 10, { hoy })).toThrow(/faltan 6/);
  });
  it('lo reservado por pedidos no se puede vender a otro', () => {
    expect(() => asignarSalida([lote('A', 10, null, { reservado: 8 })], 5, { hoy })).toThrow(/RN-12/);
  });
});

describe('RN-14 · lo vencido no se vende', () => {
  it('detecta vencidos y los salta en la venta', () => {
    expect(estaVencido(lote('X', 5, '2026-10-01'), hoy)).toBe(true);
    expect(() => asignarSalida([lote('X', 5, '2026-10-01')], 1, { hoy, soloVendibles: true })).toThrow();
  });
  it('tampoco se vende lo no liberado por calidad', () => {
    expect(() => asignarSalida([lote('X', 5, null, { liberado: false })], 1, { hoy, soloVendibles: true })).toThrow();
  });
});

describe('RN-15 · ajustes con motivo y gerente', () => {
  it('exige motivo y rol gerente', () => {
    expect(verificarAjuste('', true)).toContain('RN-15');
    expect(verificarAjuste('Conteo físico de octubre', false)).toContain('gerente');
    expect(verificarAjuste('Conteo físico de octubre', true)).toBeNull();
  });
});

describe('Costo promedio, estado web, vencimientos y unidades', () => {
  it('costo promedio ponderado', () => {
    expect(costoPromedio(100, 2, 50, 3)).toBe(2.3333);
  });
  it('estados de stock para la web', () => {
    expect(estadoStock(0, 5)).toBe('AGOTADO');
    expect(estadoStock(3, 5)).toBe('ULTIMAS_UNIDADES');
    expect(estadoStock(30, 5)).toBe('DISPONIBLE');
  });
  it('tramos de vencimiento', () => {
    expect(tramoVencimiento(new Date('2026-11-10T12:00:00'), hoy)).toBe(30);
    expect(tramoVencimiento(new Date('2026-10-01T12:00:00'), hoy)).toBe('VENCIDO');
  });
  it('convierte quintales y sacos', () => {
    expect(convertir(1, 'SACO', 'KG')).toBe(69);
    expect(convertir(453.6, 'KG', 'QUINTAL')).toBe(10);
  });
});
