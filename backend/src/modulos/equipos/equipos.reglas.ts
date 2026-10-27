// equipos.reglas.ts → reglas PURAS de activos (maquinaria y vehículos) y alquileres.

import { diasEntre, redondear, seCruzan } from '../../comun/utilidades.js';

export interface Rango {
  desde: Date;
  hasta: Date;
  etiqueta: string; // "alquiler AL-0004" o "mantenimiento OM-0012"
}

// ─── RN-23: un activo no se alquila si las fechas cruzan otro alquiler o un mantenimiento ───
export function verificarDisponibilidad(desde: Date, hasta: Date, ocupados: Rango[]): string | null {
  if (new Date(hasta) < new Date(desde)) return 'La fecha de devolución no puede ser antes de la de entrega';
  const choque = ocupados.find((o) => seCruzan(desde, hasta, o.desde, o.hasta));
  return choque
    ? `RN-23: el activo está ocupado por ${choque.etiqueta} del ${new Date(choque.desde).toLocaleDateString('es-EC')} al ${new Date(choque.hasta).toLocaleDateString('es-EC')}`
    : null;
}

// ─── RN-24: un activo en mantenimiento o con documentos vencidos no se usa, alquila ni asigna ───
export function verificarActivoUsable(
  activo: { codigo: string; estado: string; documentos?: { tipo: string; vence: Date }[] },
  hoy = new Date(),
): string | null {
  if (activo.estado === 'EN_MANTENIMIENTO') return `RN-24: ${activo.codigo} está en mantenimiento`;
  if (['VENDIDO', 'BAJA'].includes(activo.estado)) return `${activo.codigo} ya no pertenece a la flota (${activo.estado.toLowerCase()})`;
  const vencido = (activo.documentos ?? []).find((d) => new Date(d.vence) < hoy);
  if (vencido) return `RN-24: ${activo.codigo} tiene ${vencido.tipo.replace('_', ' ').toLowerCase()} vencido(a) desde el ${new Date(vencido.vence).toLocaleDateString('es-EC')}`;
  return null;
}

// documentosPorVencer(): documentos que vencen en los próximos N días (para la campana de alertas).
export function documentosPorVencer(documentos: { tipo: string; vence: Date }[], dias = 30, hoy = new Date()) {
  return documentos.filter((d) => {
    const faltan = diasEntre(hoy, d.vence);
    return faltan >= 0 && faltan <= dias;
  });
}

// ─── Cobro de un alquiler ───
// Tarifa por día (o por hora si se alquila por horas). Al devolver tarde se cobran los días extra;
// los daños se suman y la garantía se devuelve menos lo que se deba.
export function calcularAlquiler(d: {
  desde: Date;
  hasta: Date; // fecha pactada
  devolucion?: Date; // fecha real
  tarifaDia: number;
  conOperador: boolean;
  tarifaOperadorDia: number;
  garantia: number;
  danos?: number;
}) {
  const diasPactados = Math.max(1, diasEntre(d.desde, d.hasta) + 1); // del 1 al 3 son 3 días
  const diasReales = d.devolucion ? Math.max(1, diasEntre(d.desde, d.devolucion) + 1) : diasPactados;
  const diasExtra = Math.max(0, diasReales - diasPactados);
  const porDia = d.tarifaDia + (d.conOperador ? d.tarifaOperadorDia : 0);
  const subtotal = redondear(diasReales * porDia);
  const danos = redondear(d.danos ?? 0);
  const devolverGarantia = redondear(Math.max(0, d.garantia - danos));
  return { diasPactados, diasReales, diasExtra, porDia, subtotal, danos, devolverGarantia, totalFacturar: redondear(subtotal + Math.max(0, danos - d.garantia)) };
}

// utilizacion(): % de días que el activo estuvo alquilado o en uso en un período.
export function utilizacion(diasOcupado: number, diasPeriodo: number): number {
  return diasPeriodo > 0 ? redondear(Math.min(100, (diasOcupado / diasPeriodo) * 100), 1) : 0;
}

// conviene vender(): si el mantenimiento acumulado del último año pasa del 30 % del valor actual.
export function convieneVender(costoMantenimientoAnual: number, valorActual: number): boolean {
  return valorActual > 0 && costoMantenimientoAnual / valorActual > 0.3;
}
