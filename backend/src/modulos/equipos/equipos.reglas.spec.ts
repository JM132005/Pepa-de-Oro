// equipos.reglas.spec.ts → pruebas TDD de activos y alquileres (RN-23, RN-24).

import { verificarDisponibilidad, verificarActivoUsable, calcularAlquiler, utilizacion, documentosPorVencer, convieneVender } from './equipos.reglas.js';

const d = (t: string) => new Date(`${t}T12:00:00`);

describe('RN-23 · fechas que se cruzan', () => {
  const ocupados = [{ desde: d('2026-10-20'), hasta: d('2026-10-25'), etiqueta: 'alquiler AL-0004' }];
  it('rechaza un alquiler que se cruza con otro', () => {
    expect(verificarDisponibilidad(d('2026-10-24'), d('2026-10-28'), ocupados)).toContain('AL-0004');
  });
  it('acepta si empieza después', () => {
    expect(verificarDisponibilidad(d('2026-10-26'), d('2026-10-28'), ocupados)).toBeNull();
  });
  it('rechaza devolución antes de la entrega', () => {
    expect(verificarDisponibilidad(d('2026-10-28'), d('2026-10-26'), [])).not.toBeNull();
  });
});

describe('RN-24 · activo usable', () => {
  it('en mantenimiento no se usa', () => {
    expect(verificarActivoUsable({ codigo: 'CAM-02', estado: 'EN_MANTENIMIENTO' })).toContain('RN-24');
  });
  it('con SOAT vencido no se usa', () => {
    expect(verificarActivoUsable({ codigo: 'CAM-02', estado: 'DISPONIBLE', documentos: [{ tipo: 'SOAT', vence: d('2026-09-30') }] }, d('2026-10-19'))).toContain('soat');
  });
  it('disponible y al día sí se usa', () => {
    expect(verificarActivoUsable({ codigo: 'CAM-02', estado: 'DISPONIBLE', documentos: [{ tipo: 'SOAT', vence: d('2027-01-30') }] }, d('2026-10-19'))).toBeNull();
  });
});

describe('Cobro del alquiler', () => {
  it('3 días pactados, devuelto 1 día tarde y con operador', () => {
    const r = calcularAlquiler({ desde: d('2026-10-01'), hasta: d('2026-10-03'), devolucion: d('2026-10-04'), tarifaDia: 80, conOperador: true, tarifaOperadorDia: 25, garantia: 200, danos: 50 });
    expect(r.diasExtra).toBe(1);
    expect(r.subtotal).toBe(420);
    expect(r.devolverGarantia).toBe(150);
  });
  it('utilización, documentos por vencer y cuándo conviene vender', () => {
    expect(utilizacion(15, 30)).toBe(50);
    expect(documentosPorVencer([{ tipo: 'SOAT', vence: d('2026-11-01') }], 30, d('2026-10-19'))).toHaveLength(1);
    expect(convieneVender(4000, 10000)).toBe(true);
  });
});
