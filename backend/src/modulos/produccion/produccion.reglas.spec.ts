// produccion.reglas.spec.ts → pruebas TDD de producción (RN-08, RN-09, RN-10).

import { requerimientos, faltantes, verificarInicio, verificarGranoAprobado, mermaProceso, costoUnitario, fechaVencimiento, explotarReceta, cumplimiento, type Receta } from './produccion.reglas.js';

const barra70: Receta = {
  productoId: 'CH70',
  cantidadBase: 100,
  componentes: [
    { productoId: 'PASTA', nombre: 'Pasta de cacao', cantidad: 3.5, unidad: 'KG' },
    { productoId: 'AZUCAR', nombre: 'Azúcar', cantidad: 1.5, unidad: 'KG' },
    { productoId: 'ENV', nombre: 'Envoltura', cantidad: 100, unidad: 'UNIDAD' },
  ],
  horasMaquina: 2,
  manoObraHoras: 4,
};

describe('Requerimientos de una orden', () => {
  it('250 barras necesitan 8,75 kg de pasta y 250 envolturas', () => {
    const r = requerimientos(barra70, 250);
    expect(r.find((x) => x.productoId === 'PASTA')?.requerido).toBe(8.75);
    expect(r.find((x) => x.productoId === 'ENV')?.requerido).toBe(250);
  });
});

describe('RN-09 · no se inicia sin insumos', () => {
  it('dice qué falta y cuánto', () => {
    const f = faltantes(requerimientos(barra70, 250), { PASTA: 5, AZUCAR: 10, ENV: 1000 });
    expect(f).toHaveLength(1);
    expect(verificarInicio(f)).toContain('Pasta de cacao: faltan 3.75 kg');
  });
  it('con todo disponible se puede iniciar', () => {
    expect(verificarInicio(faltantes(requerimientos(barra70, 100), { PASTA: 5, AZUCAR: 5, ENV: 100 }))).toBeNull();
  });
});

describe('RN-08 · solo grano aprobado', () => {
  it('rechaza un lote de grano sin liberar', () => {
    expect(verificarGranoAprobado([{ codigo: 'L-2026-0004', tipo: 'GRANO', liberado: false }])).toContain('RN-08');
    expect(verificarGranoAprobado([{ codigo: 'L-2026-0004', tipo: 'GRANO', liberado: true, grado: 'PREMIUM' }])).toBeNull();
  });
});

describe('RN-10 · cierre de la orden', () => {
  it('merma, costo unitario y vencimiento', () => {
    expect(mermaProceso(250, 245)).toBe(2);
    expect(costoUnitario({ costoMateriales: 300, manoObraHoras: 10, costoHoraManoObra: 3, horasMaquina: 5, costoHoraMaquina: 4, unidadesBuenas: 245 }).costoUnitario).toBe(1.4286);
    expect(() => costoUnitario({ costoMateriales: 1, manoObraHoras: 0, costoHoraManoObra: 0, horasMaquina: 0, costoHoraMaquina: 0, unidadesBuenas: 0 })).toThrow();
    expect(fechaVencimiento(new Date('2026-10-19T12:00:00'), 365).getFullYear()).toBe(2027);
  });
});

describe('Simulador: explota recetas hasta el grano', () => {
  it('2 000 barras → pasta → nibs → grano', () => {
    const recetas: Record<string, Receta> = {
      CH70: barra70,
      PASTA: { productoId: 'PASTA', cantidadBase: 1, componentes: [{ productoId: 'NIBS', nombre: 'Nibs', cantidad: 1.02, unidad: 'KG' }], horasMaquina: 0.1, manoObraHoras: 0.05 },
      NIBS: { productoId: 'NIBS', cantidadBase: 0.8, componentes: [{ productoId: 'GRANO', nombre: 'Grano', cantidad: 1, unidad: 'KG' }], horasMaquina: 0.05, manoObraHoras: 0.05 },
    };
    const r = explotarReceta('CH70', 2000, recetas);
    expect(r.materiales.GRANO).toBe(89.25); // 70 kg pasta × 1,02 ÷ 0,8
    expect(r.materiales.AZUCAR).toBe(30);
    expect(r.horas.maquina).toBeGreaterThan(40);
  });
  it('cumplimiento de órdenes', () => {
    const f = new Date('2026-10-10T12:00:00');
    expect(cumplimiento([{ estado: 'TERMINADA', fechaProgramada: f, fechaCierre: f }, { estado: 'EN_PROCESO', fechaProgramada: f }])).toBe(50);
  });
});
