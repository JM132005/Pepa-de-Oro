// logistica.reglas.ts → reglas PURAS de viajes y fletes.

import { redondear, seCruzan } from '../../comun/utilidades.js';

// ─── RN-25: la carga de un viaje no supera la capacidad del camión ───
export function verificarCarga(pesoKg: number, capacidadKg: number, camion: string): string | null {
  if (pesoKg <= 0) return 'El peso de la carga debe ser mayor que cero';
  return pesoKg <= capacidadKg ? null : `RN-25: ${camion} carga hasta ${capacidadKg} kg y el viaje lleva ${pesoKg} kg`;
}

// Chofer: licencia vigente y no puede estar en dos viajes a la misma hora.
export function verificarChofer(
  chofer: { nombre: string; licenciaVence?: Date | null },
  salida: Date,
  llegadaEstimada: Date,
  otrosViajes: { codigo: string; salida: Date; llegadaEstimada: Date }[],
): string | null {
  if (!chofer.licenciaVence || new Date(chofer.licenciaVence) < new Date(salida)) return `La licencia de ${chofer.nombre} no está vigente para la fecha del viaje`;
  const choque = otrosViajes.find((v) => seCruzan(salida, llegadaEstimada, v.salida, v.llegadaEstimada));
  return choque ? `${chofer.nombre} ya tiene asignado el viaje ${choque.codigo} en ese horario` : null;
}

// tarifaFlete(): cómo se cobra un flete a terceros.
//   POR_KM → $/km × km · POR_TONELADA → $/t × toneladas · FIJA → tarifa de la ruta.
export function tarifaFlete(modo: 'POR_KM' | 'POR_TONELADA' | 'FIJA', valor: number, km: number, pesoKg: number): number {
  if (modo === 'POR_KM') return redondear(valor * km);
  if (modo === 'POR_TONELADA') return redondear(valor * (pesoKg / 1000));
  return redondear(valor);
}

// costoPorKm(): (combustible + peajes + viáticos) ÷ km recorridos.
export function costoPorKm(costos: { combustible: number; peajes: number; viaticos: number }, km: number): number {
  return km > 0 ? redondear((costos.combustible + costos.peajes + costos.viaticos) / km, 3) : 0;
}

// kmRecorridos(): odómetro de llegada − salida (no puede ser negativo).
export function kmRecorridos(kmSalida: number, kmLlegada: number): number {
  if (kmLlegada < kmSalida) throw new Error('El kilometraje de llegada no puede ser menor al de salida');
  return kmLlegada - kmSalida;
}
