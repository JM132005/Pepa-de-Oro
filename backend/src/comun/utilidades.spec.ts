// utilidades.spec.ts → pruebas de las funciones pequeñas que usa todo el sistema.

import { redondear, seCruzan, crearSlug, diasEntre, sumarDias, porcentaje, claveMes } from './utilidades.js';

describe('utilidades', () => {
  it('redondea a 2 decimales como el SRI (1.005 → 1.01)', () => {
    expect(redondear(1.005)).toBe(1.01);
    expect(redondear(2.344)).toBe(2.34);
  });
  it('detecta rangos de fechas que se cruzan (base de RN-23)', () => {
    const d = (t: string) => new Date(t);
    expect(seCruzan(d('2026-10-01'), d('2026-10-05'), d('2026-10-05'), d('2026-10-08'))).toBe(true);
    expect(seCruzan(d('2026-10-01'), d('2026-10-04'), d('2026-10-05'), d('2026-10-08'))).toBe(false);
  });
  it('crea slugs sin tildes ni símbolos', () => {
    expect(crearSlug('Chocolate 70 % Maracuyá')).toBe('chocolate-70-maracuya');
  });
  it('calcula días entre fechas y suma días', () => {
    const hoy = new Date('2026-10-19T12:00:00');
    expect(diasEntre(hoy, sumarDias(hoy, 10))).toBe(10);
  });
  it('porcentaje sin dividir para cero', () => {
    expect(porcentaje(1, 0)).toBe(0);
    expect(porcentaje(1, 4)).toBe(25);
  });
  it('agrupa por mes', () => {
    expect(claveMes(new Date('2026-03-15T12:00:00'))).toBe('2026-03');
  });
});
