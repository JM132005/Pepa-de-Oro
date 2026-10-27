// formato.ts → funciones para MOSTRAR números y fechas como se acostumbra en Ecuador.
// Intl.NumberFormat y toLocaleString son herramientas del navegador para formatear según el idioma ('es-EC').

const DINERO = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const NUMERO = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 });

// dinero(1234.5) → "$1.234,50"
export function dinero(valor: number | null | undefined): string {
  return valor === null || valor === undefined || isNaN(valor) ? '—' : DINERO.format(valor).replace('US$', '$');
}

// numero(1234.567) → "1.234,57"
export function numero(valor: number | null | undefined, decimales = 2): string {
  if (valor === null || valor === undefined || isNaN(valor)) return '—';
  return decimales === 2 ? NUMERO.format(valor) : valor.toLocaleString('es-EC', { maximumFractionDigits: decimales });
}

export function kg(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : `${numero(valor, 1)} kg`;
}

export function porcentaje(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : `${numero(valor, 1)} %`;
}

// fecha('2026-10-19T15:00:00Z') → "19/10/2026"
export function fecha(valor: string | Date | null | undefined): string {
  if (!valor) return '—';
  return new Date(valor).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fechaHora(valor: string | Date | null | undefined): string {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// hace(): "hace 5 min", "hace 2 días" (para alertas y la hora del stock en vivo).
export function hace(valor: string | Date | null | undefined): string {
  if (!valor) return '';
  const segundos = Math.round((Date.now() - new Date(valor).getTime()) / 1000);
  if (segundos < 60) return 'hace un momento';
  if (segundos < 3600) return `hace ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `hace ${Math.floor(segundos / 3600)} h`;
  return `hace ${Math.floor(segundos / 86400)} días`;
}

// isoDia(): Date → "2026-10-19" (para los <input type="date">).
export function isoDia(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// redondear(): 2 decimales.
export function redondear(v: number, d = 2): number {
  return Math.round((v + Number.EPSILON) * 10 ** d) / 10 ** d;
}
