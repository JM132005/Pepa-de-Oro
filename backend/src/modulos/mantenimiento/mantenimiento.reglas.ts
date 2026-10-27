// mantenimiento.reglas.ts → reglas PURAS del taller.

import { diasEntre, redondear, sumarDias } from '../../comun/utilidades.js';

// Una tarea del plan preventivo de un activo.
export interface TareaPreventiva {
  tarea: string; // "Cambio de aceite y filtros"
  cadaDias?: number; // por tiempo (cada 90 días)
  cadaUso?: number; // por uso (cada 250 horas o cada 10 000 km)
  ultimaFecha: Date;
  ultimoUso: number; // horómetro u odómetro cuando se hizo por última vez
}

// ─── RN-26: el preventivo se genera al cumplir tiempo o uso, lo que llegue primero ───
// Ejemplo: tractor con cambio de aceite cada 90 días o 250 horas. Si a los 60 días ya hizo 260 horas → toca.
export function estadoPreventivo(t: TareaPreventiva, usoActual: number, hoy = new Date(), diasAviso = 7) {
  const porTiempo = t.cadaDias ? sumarDias(t.ultimaFecha, t.cadaDias) : null;
  const diasRestantes = porTiempo ? diasEntre(hoy, porTiempo) : Infinity;
  const usoRestante = t.cadaUso ? t.ultimoUso + t.cadaUso - usoActual : Infinity;
  const vencida = diasRestantes <= 0 || usoRestante <= 0;
  // Se avisa 7 días antes o cuando falta menos del 5 % del uso.
  const proxima = !vencida && (diasRestantes <= diasAviso || (t.cadaUso ? usoRestante <= t.cadaUso * 0.05 : false));
  const motivo = vencida
    ? diasRestantes <= 0
      ? `se cumplieron los ${t.cadaDias} días`
      : `se cumplió el uso de ${t.cadaUso}`
    : null;
  return { vencida, proxima, diasRestantes: Number.isFinite(diasRestantes) ? diasRestantes : null, usoRestante: Number.isFinite(usoRestante) ? redondear(usoRestante) : null, motivo };
}

// ─── Indicadores del taller ───
// MTBF (Mean Time Between Failures): tiempo medio entre fallas = horas operando ÷ número de fallas.
//   Más alto = la máquina falla menos.
// MTTR (Mean Time To Repair): tiempo medio de reparación = horas reparando ÷ número de reparaciones.
//   Más bajo = el taller arregla más rápido.
// Disponibilidad = MTBF ÷ (MTBF + MTTR) × 100: % del tiempo que la máquina está lista para trabajar.
export function indicadoresTaller(horasPeriodo: number, reparaciones: { horas: number }[]) {
  const fallas = reparaciones.length;
  const horasReparando = reparaciones.reduce((s, r) => s + r.horas, 0);
  const horasOperando = Math.max(0, horasPeriodo - horasReparando);
  const mtbf = fallas ? redondear(horasOperando / fallas, 1) : horasOperando;
  const mttr = fallas ? redondear(horasReparando / fallas, 1) : 0;
  const disponibilidad = horasPeriodo > 0 ? redondear((horasOperando / horasPeriodo) * 100, 1) : 100;
  return { fallas, horasReparando: redondear(horasReparando, 1), mtbf, mttr, disponibilidad };
}

// costoOrden(): repuestos + mano de obra.
export function costoOrden(repuestos: { cantidad: number; costoUnitario: number }[], horasManoObra: number, costoHora: number) {
  const costoRepuestos = redondear(repuestos.reduce((s, r) => s + r.cantidad * r.costoUnitario, 0));
  const costoManoObra = redondear(horasManoObra * costoHora);
  return { costoRepuestos, costoManoObra, costoTotal: redondear(costoRepuestos + costoManoObra) };
}
