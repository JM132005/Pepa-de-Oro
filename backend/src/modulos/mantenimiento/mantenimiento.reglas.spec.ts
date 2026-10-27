// mantenimiento.reglas.spec.ts → pruebas TDD del taller (RN-26, MTBF, MTTR).

import { estadoPreventivo, indicadoresTaller, costoOrden } from './mantenimiento.reglas.js';

const d = (t: string) => new Date(`${t}T12:00:00`);
const tarea = { tarea: 'Aceite y filtros', cadaDias: 90, cadaUso: 250, ultimaFecha: d('2026-08-20'), ultimoUso: 1000 };

describe('RN-26 · preventivo por tiempo o uso, lo que llegue primero', () => {
  it('vence por USO aunque no hayan pasado 90 días', () => {
    const r = estadoPreventivo(tarea, 1260, d('2026-10-19'));
    expect(r.vencida).toBe(true);
    expect(r.motivo).toContain('uso');
  });
  it('vence por TIEMPO aunque se haya usado poco', () => {
    expect(estadoPreventivo(tarea, 1100, d('2026-11-20')).vencida).toBe(true);
  });
  it('avisa 7 días antes', () => {
    const r = estadoPreventivo(tarea, 1100, d('2026-11-14'));
    expect(r.vencida).toBe(false);
    expect(r.proxima).toBe(true);
  });
});

describe('MTBF, MTTR y disponibilidad', () => {
  it('720 h en el mes con dos reparaciones de 10 y 14 h', () => {
    const r = indicadoresTaller(720, [{ horas: 10 }, { horas: 14 }]);
    expect(r.mtbf).toBe(348);
    expect(r.mttr).toBe(12);
    expect(r.disponibilidad).toBe(96.7);
  });
  it('costo de la orden', () => {
    expect(costoOrden([{ cantidad: 2, costoUnitario: 12.5 }], 3, 8).costoTotal).toBe(49);
  });
});
