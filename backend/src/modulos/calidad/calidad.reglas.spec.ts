// calidad.reglas.spec.ts → pruebas TDD de calidad (RN-06, RN-07 y RN-11).

import { calcularGradoCacao, calcularGradoCafe, validarPruebaCorte, puedeEvaluar, evaluarProductoTerminado, puedeVenderse } from './calidad.reglas.js';
import { CONFIGURACION_INICIAL } from '../configuracion/configuracion.valores.js';

const tabla = CONFIGURACION_INICIAL.calidad.gradosCacao;
const excelente = { bienFermentados: 82, violetas: 10, pizarrosos: 3, mohosos: 1, insectados: 1, germinados: 0, humedad: 6.8, peso100Granos: 128 };

describe('RN-06 · el sistema calcula el grado', () => {
  it('un lote excelente es PREMIUM', () => {
    expect(calcularGradoCacao(excelente, tabla).grado).toBe('PREMIUM');
  });
  it('con 70 % fermentados baja a EXPORTACION', () => {
    expect(calcularGradoCacao({ ...excelente, bienFermentados: 70, violetas: 22 - 10, pizarrosos: 8, mohosos: 1, insectados: 1 }, tabla).grado).toBe('EXPORTACION');
  });
  it('con 6 % de mohosos es RECHAZO y dice por qué', () => {
    const r = calcularGradoCacao({ ...excelente, bienFermentados: 77, mohosos: 6 }, tabla);
    expect(r.grado).toBe('RECHAZO');
    expect(r.motivos.join()).toContain('mohosos');
  });
  it('la prueba de corte debe sumar 100 granos', () => {
    expect(validarPruebaCorte(excelente)).not.toBeNull(); // 82+10+3+1+1 = 97
    expect(validarPruebaCorte({ ...excelente, bienFermentados: 85 })).toBeNull();
  });
  it('café de taza 85 con pocos defectos es PREMIUM; con humedad 13 % es RECHAZO', () => {
    const t = CONFIGURACION_INICIAL.calidad.gradosCafe;
    expect(calcularGradoCafe({ defectos300g: 3, puntajeTaza: 85, humedad: 11 }, t).grado).toBe('PREMIUM');
    expect(calcularGradoCafe({ defectos300g: 3, puntajeTaza: 85, humedad: 13 }, t).grado).toBe('RECHAZO');
  });
});

describe('RN-07 · solo Calidad y Gerencia evalúan', () => {
  it('Calidad y Gerente sí; Ventas no', () => {
    expect(puedeEvaluar({ sub: '1', correo: '', nombre: '', roles: ['CALIDAD'] })).toBe(true);
    expect(puedeEvaluar({ sub: '1', correo: '', nombre: '', roles: ['GERENTE'] })).toBe(true);
    expect(puedeEvaluar({ sub: '1', correo: '', nombre: '', roles: ['VENTAS'] })).toBe(false);
  });
});

describe('RN-11 · producto terminado se libera solo si pasa el control', () => {
  it('barra de 50 g con 49,2 g promedio, bien sellada y templada a 30 °C → liberada', () => {
    expect(evaluarProductoTerminado({ pesoNominalG: 50, pesoPromedioG: 49.2, selladoOk: true, etiquetaOk: true, temperaturaTemplado: 30 }).liberado).toBe(true);
  });
  it('mal sellada o con peso bajo → no se libera', () => {
    const r = evaluarProductoTerminado({ pesoNominalG: 50, pesoPromedioG: 47, selladoOk: false, etiquetaOk: true });
    expect(r.liberado).toBe(false);
    expect(r.motivos).toHaveLength(2);
  });
  it('un lote no liberado o bloqueado no se vende', () => {
    expect(puedeVenderse({ liberado: false })).toBe(false);
    expect(puedeVenderse({ liberado: true, bloqueado: true })).toBe(false);
    expect(puedeVenderse({ liberado: true })).toBe(true);
  });
});
