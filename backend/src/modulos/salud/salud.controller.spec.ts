// salud.controller.spec.ts → prueba unitaria del controlador de salud.

import { SaludController } from './salud.controller.js';

// describe(): agrupa pruebas. it(): una prueba. expect(): lo que esperamos.
describe('SaludController', () => {
  it('responde estado "ok"', () => {
    // new SaludController(): instancia directa, no necesita base de datos.
    expect(new SaludController().verificar().estado).toBe('ok');
  });
});
