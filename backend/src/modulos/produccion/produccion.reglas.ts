// produccion.reglas.ts → reglas PURAS de recetas y órdenes de producción.

import { redondear, sumarDias } from '../../comun/utilidades.js';

// Receta (lista de materiales o "BOM", Bill Of Materials): qué se necesita para producir "cantidadBase" unidades.
// Ejemplo: 100 barras de 50 g de chocolate 70 % necesitan 3,5 kg de pasta, 1,5 kg de azúcar, 100 envolturas...
export interface ComponenteReceta {
  productoId: string;
  nombre: string;
  cantidad: number; // por "cantidadBase" unidades de salida
  unidad: string;
}
export interface Receta {
  productoId: string; // lo que sale
  cantidadBase: number;
  componentes: ComponenteReceta[];
  horasMaquina: number; // por "cantidadBase"
  manoObraHoras: number;
}

// requerimientos(): cuánto de cada componente hace falta para producir "cantidad" unidades.
// Es una regla de tres: si 100 barras usan 3,5 kg, 250 barras usan 3,5 × 250 ÷ 100 = 8,75 kg.
export function requerimientos(receta: Receta, cantidad: number) {
  const factor = cantidad / receta.cantidadBase;
  return receta.componentes.map((c) => ({ ...c, requerido: redondear(c.cantidad * factor, 3) }));
}

// ─── RN-09: una orden no inicia sin insumos suficientes ───
// disponibles: { productoId → cantidad disponible en bodega }
export function faltantes(req: ReturnType<typeof requerimientos>, disponibles: Record<string, number>) {
  return req
    .map((r) => ({ ...r, disponible: disponibles[r.productoId] ?? 0, falta: redondear(r.requerido - (disponibles[r.productoId] ?? 0), 3) }))
    .filter((r) => r.falta > 0);
}

export function verificarInicio(faltan: ReturnType<typeof faltantes>): string | null {
  if (!faltan.length) return null;
  const detalle = faltan.map((f) => `${f.nombre}: faltan ${f.falta} ${f.unidad.toLowerCase()}`).join('; ');
  return `RN-09: no se puede iniciar la orden. ${detalle}`;
}

// ─── RN-08: solo grano aprobado entra a producción ───
export function verificarGranoAprobado(lotes: { codigo: string; tipo: string; liberado: boolean; grado?: string }[]): string | null {
  const malo = lotes.find((l) => l.tipo === 'GRANO' && (!l.liberado || l.grado === 'RECHAZO'));
  return malo ? `RN-08: el lote ${malo.codigo} no está aprobado por Calidad y no puede entrar a producción` : null;
}

// ─── RN-10: al cerrar, se descuenta lo realmente consumido y se suma lo producido ───
// mermaProceso(): diferencia entre lo planificado y lo real, en %.
export function mermaProceso(planificado: number, real: number): number {
  return planificado > 0 ? redondear(((planificado - real) / planificado) * 100, 1) : 0;
}

// costoUnitario(): (materiales + mano de obra + máquina) ÷ unidades BUENAS.
export function costoUnitario(d: { costoMateriales: number; manoObraHoras: number; costoHoraManoObra: number; horasMaquina: number; costoHoraMaquina: number; unidadesBuenas: number }) {
  if (d.unidadesBuenas <= 0) throw new Error('RN-10: para cerrar la orden debe haber unidades buenas');
  const total = d.costoMateriales + d.manoObraHoras * d.costoHoraManoObra + d.horasMaquina * d.costoHoraMaquina;
  return { costoTotal: redondear(total), costoUnitario: redondear(total / d.unidadesBuenas, 4) };
}

// vencimiento(): fecha de elaboración + vida útil (chocolate 365 días, café molido 180...).
export function fechaVencimiento(elaboracion: Date, vidaUtilDias: number): Date {
  return sumarDias(elaboracion, vidaUtilDias);
}

// rendimientoConversion(): kg de producto ÷ kg de grano consumido (ej: 0,8 kg de nibs por kg de grano).
export function rendimientoConversion(kgProducto: number, kgGrano: number): number {
  return kgGrano > 0 ? redondear(kgProducto / kgGrano, 3) : 0;
}

// explotarReceta(): baja por TODAS las recetas hasta llegar a materias primas.
// Chocolate 70 % → pasta de cacao → nibs → cacao en grano. Lo usa el simulador "¿qué pasa si?" y el plan de materia prima.
// Es una función RECURSIVA: se llama a sí misma para cada componente que también tiene receta.
export function explotarReceta(
  productoId: string,
  cantidad: number,
  recetas: Record<string, Receta>,
  acumulado: Record<string, number> = {},
  horas = { maquina: 0, manoObra: 0 },
  profundidad = 0,
) {
  const receta = recetas[productoId];
  if (!receta || profundidad > 6) {
    acumulado[productoId] = redondear((acumulado[productoId] ?? 0) + cantidad, 3);
    return { materiales: acumulado, horas };
  }
  const factor = cantidad / receta.cantidadBase;
  horas.maquina = redondear(horas.maquina + receta.horasMaquina * factor, 2);
  horas.manoObra = redondear(horas.manoObra + receta.manoObraHoras * factor, 2);
  for (const c of receta.componentes) explotarReceta(c.productoId, c.cantidad * factor, recetas, acumulado, horas, profundidad + 1);
  return { materiales: acumulado, horas };
}

// cumplimiento(): órdenes cerradas a tiempo ÷ programadas.
export function cumplimiento(ordenes: { estado: string; fechaProgramada: Date; fechaCierre?: Date | null }[]): number {
  const programadas = ordenes.filter((o) => o.estado !== 'ANULADA');
  if (!programadas.length) return 0;
  const aTiempo = programadas.filter((o) => o.estado === 'TERMINADA' && o.fechaCierre && new Date(o.fechaCierre) <= sumarDias(o.fechaProgramada, 1));
  return redondear((aTiempo.length / programadas.length) * 100, 1);
}
