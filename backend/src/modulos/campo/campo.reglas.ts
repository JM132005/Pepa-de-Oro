// campo.reglas.ts → reglas PURAS del módulo de campo (haciendas propias).
// "Pura" = recibe datos y devuelve un resultado, sin consultar la base. Por eso se prueban en milisegundos.

import { diasEntre, redondear, sumarDias } from '../../comun/utilidades.js';

// ─── RN-01: no se cosecha una parcela en período de carencia de un agroquímico ───
// El período de carencia son los días que deben pasar entre fumigar y cosechar para que
// no queden residuos del químico en el grano. Ejemplo: fungicida con 14 días de carencia
// aplicado el 01/10 → no se puede cosechar hasta el 15/10.
export interface AplicacionAgroquimico {
  fecha: Date;
  producto: string;
  diasCarencia: number;
}

// finCarencia(): fecha desde la cual YA se puede cosechar (la mayor de todas las aplicaciones).
export function finCarencia(aplicaciones: AplicacionAgroquimico[]): Date | null {
  if (!aplicaciones.length) return null;
  return aplicaciones
    .map((a) => sumarDias(a.fecha, a.diasCarencia))
    .reduce((mayor, f) => (f > mayor ? f : mayor));
}

// verificarCarencia(): devuelve el motivo del bloqueo o null si se puede cosechar.
export function verificarCarencia(aplicaciones: AplicacionAgroquimico[], fechaCosecha: Date): string | null {
  const bloqueadas = aplicaciones.filter((a) => sumarDias(a.fecha, a.diasCarencia) > new Date(fechaCosecha));
  if (!bloqueadas.length) return null;
  const fin = finCarencia(bloqueadas)!;
  const nombres = bloqueadas.map((a) => a.producto).join(', ');
  return `RN-01: la parcela está en período de carencia por ${nombres}; se puede cosechar desde el ${fin.toLocaleDateString('es-EC')}`;
}

// ─── Edad y etapa productiva de una parcela ───
// El cacao empieza a producir hacia el 3.er año y se estabiliza hacia el 5.º; el café, hacia el 3.º.
export function etapaProductiva(anioSiembra: number, cultivo: 'CACAO' | 'CAFE', anioActual = new Date().getFullYear()) {
  const edad = anioActual - anioSiembra;
  if (edad < 3) return { edad, etapa: 'CRECIMIENTO', factorProduccion: 0 };
  if (cultivo === 'CACAO' && edad < 5) return { edad, etapa: 'INICIO_PRODUCCION', factorProduccion: 0.5 };
  if (edad > 25) return { edad, etapa: 'DECLINACION', factorProduccion: 0.6 }; // conviene renovar
  return { edad, etapa: 'PLENA_PRODUCCION', factorProduccion: 1 };
}

// ─── Plan de labores: ¿qué labor está atrasada? ───
export interface TareaPlan {
  tipo: string;
  cadaDias: number;
  ultimaFecha?: Date;
}

// laboresAtrasadas(): una labor está atrasada si pasaron más días que su frecuencia desde la última vez.
export function laboresAtrasadas(plan: TareaPlan[], hoy = new Date()) {
  return plan
    .map((t) => {
      const proxima = t.ultimaFecha ? sumarDias(t.ultimaFecha, t.cadaDias) : hoy;
      return { ...t, proxima, diasAtraso: Math.max(0, diasEntre(proxima, hoy)) };
    })
    .filter((t) => t.diasAtraso > 0 || !t.ultimaFecha);
}

// ─── KPIs de campo ───

// rendimientoKgHa(): kg secos producidos por cada hectárea en producción.
export function rendimientoKgHa(kgSecos: number, hectareas: number): number {
  return hectareas > 0 ? redondear(kgSecos / hectareas, 1) : 0;
}

// costoPorKg(): (jornales + insumos) ÷ kg secos. Si no hubo cosecha, el costo por kg no se puede calcular (null).
export function costoPorKg(costoJornales: number, costoInsumos: number, kgSecos: number): number | null {
  return kgSecos > 0 ? redondear((costoJornales + costoInsumos) / kgSecos, 2) : null;
}

// incidencia(): % de mazorcas afectadas en un monitoreo sanitario.
export function incidencia(afectadas: number, evaluadas: number): number {
  return evaluadas > 0 ? redondear((afectadas / evaluadas) * 100, 1) : 0;
}
