// poscosecha.reglas.spec.ts → pruebas TDD de fermentación y secado.

import { verificarCapacidad, puedeAvanzar, verificarFinFermentacion, fermentacionVencida, verificarFinSecado, mermaPct, verificarMezcla, volteoAtrasado } from './poscosecha.reglas.js';

const d = (t: string) => new Date(`${t}T08:00:00`);

describe('RN-05 · capacidad de fermentadores y tendales', () => {
  it('rechaza meter 600 kg en un fermentador de 1 000 kg que ya tiene 500', () => {
    expect(verificarCapacidad(1000, 500, 600, 'F-01')).toContain('RN-05');
  });
  it('acepta si cabe justo', () => {
    expect(verificarCapacidad(1000, 500, 500, 'F-01')).toBeNull();
  });
});

describe('Recorrido del lote', () => {
  it('no se salta de RECIBIDO a SECANDO', () => {
    expect(puedeAvanzar('RECIBIDO', 'SECANDO')).toBe(false);
  });
  it('avanza paso a paso y el grano seco salta a SECO', () => {
    expect(puedeAvanzar('RECIBIDO', 'FERMENTANDO')).toBe(true);
    expect(puedeAvanzar('RECIBIDO', 'SECO', true)).toBe(true);
  });
  it('un lote almacenado o rechazado ya no cambia', () => {
    expect(puedeAvanzar('ALMACENADO', 'RECHAZADO')).toBe(false);
  });
});

describe('Fermentación', () => {
  it('CCN-51 no puede cerrar a los 3 días', () => {
    expect(verificarFinFermentacion('CCN51', d('2026-10-01'), d('2026-10-04'))).not.toBeNull();
    expect(verificarFinFermentacion('CCN51', d('2026-10-01'), d('2026-10-07'))).toBeNull();
  });
  it('alerta si pasa de 7 días sin cerrar', () => {
    expect(fermentacionVencida('CCN51', d('2026-10-01'), d('2026-10-10'))).toBe(true);
  });
  it('volteo atrasado después de 54 horas', () => {
    expect(volteoAtrasado(d('2026-10-01'), d('2026-10-04'))).toBe(true);
    expect(volteoAtrasado(d('2026-10-01'), d('2026-10-02'))).toBe(false);
  });
});

describe('Secado y merma', () => {
  it('el cacao no termina de secar con 9 % de humedad', () => {
    expect(verificarFinSecado('CACAO', 9)).not.toBeNull();
    expect(verificarFinSecado('CACAO', 6.8)).toBeNull();
  });
  it('merma de 1 000 kg en baba que quedan en 370 kg secos = 63 %', () => {
    expect(mermaPct(1000, 370)).toBe(63);
  });
  it('solo combina lotes de la misma variedad', () => {
    const a = { codigo: 'L-1', cultivo: 'CACAO', variedad: 'CCN51', estado: 'SECO' };
    expect(verificarMezcla([a, { ...a, codigo: 'L-2', variedad: 'NACIONAL' }])).toContain('L-2');
    expect(verificarMezcla([a, { ...a, codigo: 'L-2' }])).toBeNull();
  });
});
