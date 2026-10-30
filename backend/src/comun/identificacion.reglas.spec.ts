// identificacion.reglas.spec.ts → RN-02 (TDD): estas pruebas se escribieron ANTES que la función.
// Primero fallaron (rojo), luego se escribió validarCedula/validarRuc hasta que pasaron (verde).

import { validarCedula, validarRuc, validarIdentificacion } from './identificacion.reglas.js';

describe('RN-02 · cédula y RUC con dígito verificador', () => {
  it('acepta una cédula válida de El Oro', () => {
    expect(validarCedula('0702345679')).toBe(true);
  });
  it('rechaza una cédula con el último dígito mal escrito', () => {
    expect(validarCedula('0702345675')).toBe(false);
  });
  it('rechaza cédulas con letras, de otro largo o de provincia inexistente', () => {
    expect(validarCedula('07023456A5')).toBe(false);
    expect(validarCedula('070234567')).toBe(false);
    expect(validarCedula('9902345679')).toBe(false);
  });
  it('acepta el RUC de una persona natural (cédula + 001)', () => {
    expect(validarRuc('0702345679001')).toBe(true);
  });
  it('acepta el RUC de sociedad de Pepa de Oro y rechaza uno alterado', () => {
    expect(validarRuc('0791234557001')).toBe(true);
    expect(validarRuc('0791234567001')).toBe(false);
  });
  it('consumidor final solo con 13 nueves', () => {
    expect(validarIdentificacion('CONSUMIDOR_FINAL', '9999999999999')).toBe(true);
    expect(validarIdentificacion('CONSUMIDOR_FINAL', '0702345675')).toBe(false);
  });
});
