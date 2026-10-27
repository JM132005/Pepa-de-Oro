// productos.reglas.spec.ts → pruebas TDD de precios (RN-16).

import { precioUnitario, margen, precioSugerido, precioGranoKg } from './productos.reglas.js';

const barra = { precioMenor: 3.5, precioMayor: 2.8, cantidadMinimaMayor: 24, escalas: [{ desde: 100, precio: 2.5 }] };

describe('RN-16 · precio por mayor desde la cantidad mínima', () => {
  it('10 barras a consumidor → precio por menor', () => {
    expect(precioUnitario(barra, 10).precio).toBe(3.5);
  });
  it('24 barras → precio por mayor', () => {
    expect(precioUnitario(barra, 24).precio).toBe(2.8);
  });
  it('120 barras → escala de 100 o más', () => {
    expect(precioUnitario(barra, 120).precio).toBe(2.5);
  });
  it('un distribuidor recibe precio por mayor aunque compre poco', () => {
    expect(precioUnitario(barra, 5, 'DISTRIBUIDOR').precio).toBe(2.8);
  });
  it('la lista del exportador manda sobre todo', () => {
    expect(precioUnitario({ ...barra, listas: { EXPORTADOR: 2.2 } }, 500, 'EXPORTADOR').precio).toBe(2.2);
  });
});

describe('Margen y precio sugerido', () => {
  it('calcula margen y precio para un margen objetivo', () => {
    expect(margen(3.5, 1.4)).toBe(60);
    expect(precioSugerido(2, 40)).toBe(3.33);
    expect(precioGranoKg(226.8, 10)).toBe(5.5);
  });
});
