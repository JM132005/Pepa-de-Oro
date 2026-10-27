// campo.reglas.spec.ts → pruebas TDD de las reglas del campo.

import { verificarCarencia, finCarencia, etapaProductiva, laboresAtrasadas, costoPorKg, rendimientoKgHa, incidencia } from './campo.reglas.js';

const d = (t: string) => new Date(`${t}T12:00:00`);

describe('RN-01 · período de carencia', () => {
  const aplicaciones = [{ fecha: d('2026-10-01'), producto: 'Fungicida cúprico', diasCarencia: 14 }];

  it('bloquea la cosecha dentro del período de carencia', () => {
    expect(verificarCarencia(aplicaciones, d('2026-10-10'))).toContain('RN-01');
  });
  it('permite cosechar cuando ya pasó la carencia', () => {
    expect(verificarCarencia(aplicaciones, d('2026-10-16'))).toBeNull();
  });
  it('con varias aplicaciones manda la que termina más tarde', () => {
    const varias = [...aplicaciones, { fecha: d('2026-10-05'), producto: 'Insecticida', diasCarencia: 21 }];
    expect(finCarencia(varias)?.toISOString().slice(0, 10)).toBe('2026-10-26');
  });
  it('sin aplicaciones no hay bloqueo', () => {
    expect(verificarCarencia([], d('2026-10-10'))).toBeNull();
  });
});

describe('Etapa productiva', () => {
  it('cacao de 2 años aún no produce y de 4 está iniciando', () => {
    expect(etapaProductiva(2024, 'CACAO', 2026).etapa).toBe('CRECIMIENTO');
    expect(etapaProductiva(2022, 'CACAO', 2026).factorProduccion).toBe(0.5);
  });
});

describe('Plan de labores', () => {
  it('marca atrasada una poda que tocaba hace 10 días', () => {
    const plan = [{ tipo: 'PODA', cadaDias: 180, ultimaFecha: d('2026-04-12') }];
    expect(laboresAtrasadas(plan, d('2026-10-19'))[0].diasAtraso).toBe(10);
  });
});

describe('KPIs de campo', () => {
  it('costo por kg y rendimiento', () => {
    expect(costoPorKg(600, 400, 500)).toBe(2);
    expect(costoPorKg(600, 400, 0)).toBeNull();
    expect(rendimientoKgHa(9000, 12)).toBe(750);
    expect(incidencia(12, 200)).toBe(6);
  });
});
