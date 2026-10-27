// poscosecha.reglas.ts → reglas PURAS de fermentación y secado.
// Del buen fermentado y secado depende el sabor del chocolate y el peso final que se vende.

import { FLUJO_LOTE_GRANO, LIMITES, type EstadoLoteGrano, type Variedad } from '../../comun/constantes.js';
import { diasEntre, horasEntre, redondear } from '../../comun/utilidades.js';

// ─── RN-05: no se asigna a un fermentador o tendal más kg que su capacidad ───
// ocupadoKg = suma de los lotes que YA están dentro; nuevoKg = el lote que se quiere meter.
export function verificarCapacidad(capacidadKg: number, ocupadoKg: number, nuevoKg: number, nombre: string): string | null {
  const libre = capacidadKg - ocupadoKg;
  if (nuevoKg <= libre) return null;
  return `RN-05: ${nombre} tiene ${redondear(libre)} kg libres de ${capacidadKg} kg y el lote pesa ${nuevoKg} kg`;
}

// ─── Recorrido del lote: no se salta pasos ───
// RECIBIDO → FERMENTANDO → SECANDO → SECO → ALMACENADO. El grano que llega SECO salta directo a SECO.
export function puedeAvanzar(actual: EstadoLoteGrano, siguiente: EstadoLoteGrano, llegoSeco = false): boolean {
  if (['RECHAZADO', 'ALMACENADO', 'COMBINADO'].includes(actual)) return false; // estados finales
  if (siguiente === 'RECHAZADO') return true; // calidad puede rechazar en cualquier momento
  const i = FLUJO_LOTE_GRANO.indexOf(actual as (typeof FLUJO_LOTE_GRANO)[number]);
  const j = FLUJO_LOTE_GRANO.indexOf(siguiente as (typeof FLUJO_LOTE_GRANO)[number]);
  if (llegoSeco && actual === 'RECIBIDO' && siguiente === 'SECO') return true;
  return j === i + 1;
}

// ─── Fermentación: días mínimos por variedad y alerta si se pasa ───
export function verificarFinFermentacion(variedad: Variedad, inicio: Date, fin: Date): string | null {
  const dias = diasEntre(inicio, fin);
  const { min } = LIMITES.fermentacionDias[variedad];
  return dias >= min ? null : `La fermentación de ${variedad} dura al menos ${min} días (lleva ${dias})`;
}

// fermentacionVencida(): true si el lote lleva más días que el máximo sin cerrar → alerta en la campana.
export function fermentacionVencida(variedad: Variedad, inicio: Date, hoy = new Date()): boolean {
  return diasEntre(inicio, hoy) > LIMITES.fermentacionDias[variedad].max;
}

// volteoAtrasado(): la masa se voltea cada 48 h para que entre aire y la fermentación sea pareja.
export function volteoAtrasado(ultimoVolteoOInicio: Date, hoy = new Date()): boolean {
  return horasEntre(ultimoVolteoOInicio, hoy) > LIMITES.horasEntreVolteos + 6; // 6 h de tolerancia
}

// ─── Secado: termina solo cuando la humedad baja al límite ───
export function verificarFinSecado(cultivo: 'CACAO' | 'CAFE', humedadFinal: number): string | null {
  const max = cultivo === 'CACAO' ? LIMITES.humedadMaximaCacao : LIMITES.humedadMaximaCafe;
  return humedadFinal <= max ? null : `El secado no termina: humedad ${humedadFinal} % y el máximo es ${max} %`;
}

// ─── Merma: cuánto peso se perdió desde que entró hasta que quedó seco ───
export function mermaPct(kgEntrada: number, kgSalida: number): number {
  return kgEntrada > 0 ? redondear(((kgEntrada - kgSalida) / kgEntrada) * 100, 1) : 0;
}

// factorConversion(): kg secos por cada kg que entró (alimenta las proyecciones de cosecha).
export function factorConversion(kgEntrada: number, kgSeco: number): number {
  return kgEntrada > 0 ? redondear(kgSeco / kgEntrada, 3) : 0;
}

// ─── Mezclas: solo se juntan lotes del mismo cultivo, variedad y estado ───
export function verificarMezcla(lotes: { codigo: string; cultivo: string; variedad: string; estado: string }[]): string | null {
  if (lotes.length < 2) return 'Se necesitan al menos 2 lotes para combinar';
  const [primero] = lotes;
  const distinto = lotes.find((l) => l.cultivo !== primero.cultivo || l.variedad !== primero.variedad || l.estado !== primero.estado);
  return distinto ? `El lote ${distinto.codigo} no es de la misma variedad o etapa que ${primero.codigo}` : null;
}
