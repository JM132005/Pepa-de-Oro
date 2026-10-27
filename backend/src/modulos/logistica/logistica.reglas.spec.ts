// logistica.reglas.spec.ts → pruebas TDD de viajes (RN-25).

import { verificarCarga, verificarChofer, tarifaFlete, costoPorKm, kmRecorridos } from './logistica.reglas.js';

const d = (t: string) => new Date(t);

describe('RN-25 · capacidad del camión', () => {
  it('un camión de 8 t no lleva 9 500 kg', () => {
    expect(verificarCarga(9500, 8000, 'CAM-02')).toContain('RN-25');
    expect(verificarCarga(7800, 8000, 'CAM-02')).toBeNull();
  });
});

describe('Chofer', () => {
  const chofer = { nombre: 'Byron', licenciaVence: d('2027-05-01T00:00:00') };
  it('no puede tener dos viajes a la misma hora', () => {
    const otro = [{ codigo: 'V-0007', salida: d('2026-10-20T08:00:00'), llegadaEstimada: d('2026-10-20T12:00:00') }];
    expect(verificarChofer(chofer, d('2026-10-20T10:00:00'), d('2026-10-20T14:00:00'), otro)).toContain('V-0007');
  });
  it('con licencia vencida no maneja', () => {
    expect(verificarChofer({ nombre: 'Byron', licenciaVence: d('2026-01-01T00:00:00') }, d('2026-10-20T10:00:00'), d('2026-10-20T14:00:00'), [])).toContain('licencia');
  });
});

describe('Fletes y costos', () => {
  it('tarifas y costo por km', () => {
    expect(tarifaFlete('POR_TONELADA', 12, 70, 7500)).toBe(90);
    expect(tarifaFlete('POR_KM', 1.2, 70, 7500)).toBe(84);
    expect(costoPorKm({ combustible: 45, peajes: 2, viaticos: 10 }, 120)).toBe(0.475);
    expect(() => kmRecorridos(100, 90)).toThrow();
  });
});
