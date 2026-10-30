// utilidades.ts → funciones pequeñas reutilizables en varios módulos.
// Son funciones PURAS (no tocan la base de datos), así que se prueban fácil (utilidades.spec.ts).

// mismoId(): compara dos ids aunque uno sea ObjectId y otro texto.
// En Mongo, ObjectId("abc") === "abc" da false, por eso se convierten ambos a String.
export function mismoId(a: unknown, b: unknown): boolean {
  return a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
}

// redondear(): redondea a 2 decimales "como el SRI" (mitad hacia arriba).
// Number.EPSILON corrige errores de coma flotante: 1.005 * 100 = 100.49999 → sin EPSILON daría 1.00.
export function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

// sumar(): suma un arreglo de números (reduce recorre el arreglo acumulando).
export function sumar(valores: number[]): number {
  return valores.reduce((acumulado, v) => acumulado + (v || 0), 0);
}

// promedio(): 0 si el arreglo está vacío (evita dividir para cero).
export function promedio(valores: number[]): number {
  return valores.length ? sumar(valores) / valores.length : 0;
}

// porcentaje(): parte ÷ total × 100, con 0 si el total es 0.
export function porcentaje(parte: number, total: number): number {
  return total ? redondear((parte / total) * 100, 1) : 0;
}

// ─── Fechas ───
const MS_DIA = 24 * 60 * 60 * 1000; // milisegundos que tiene un día

// sumarDias(): devuelve una NUEVA fecha (no modifica la original).
export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(new Date(fecha).getTime() + dias * MS_DIA);
}

// diasEntre(): días completos de "desde" a "hasta" (puede ser negativo).
export function diasEntre(desde: Date, hasta: Date): number {
  return Math.floor((new Date(hasta).getTime() - new Date(desde).getTime()) / MS_DIA);
}

// horasEntre(): horas (con decimales) entre dos fechas.
export function horasEntre(desde: Date, hasta: Date): number {
  return (new Date(hasta).getTime() - new Date(desde).getTime()) / (60 * 60 * 1000);
}

// inicioDelDia(): 2026-10-19 15:30 → 2026-10-19 00:00 (hora local).
export function inicioDelDia(fecha: Date = new Date()): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

// seCruzan(): ¿los rangos [a1, a2] y [b1, b2] se tocan? Base de RN-23 (alquileres).
// Dos rangos NO se cruzan solo si uno termina antes de que empiece el otro.
export function seCruzan(a1: Date, a2: Date, b1: Date, b2: Date): boolean {
  return new Date(a1) <= new Date(b2) && new Date(b1) <= new Date(a2);
}

// claveMes(): "2026-10" → sirve para agrupar ventas, cosechas o compras por mes.
export function claveMes(fecha: Date): string {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// fechaCorta(): 2026-10-19 → "19/10/2026" (formato que se imprime en los PDF).
export function fechaCorta(fecha: Date | string | undefined): string {
  if (!fecha) return '';
  const d = new Date(fecha);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// ─── Textos ───

// crearSlug(): "Chocolate 70 % Maracuyá" → "chocolate-70-maracuya" (para URLs de la web).
// normalize('NFD') separa la tilde de la letra y el replace borra las tildes.
export function crearSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// escaparRegex(): evita que un texto de búsqueda como "70%(" rompa una expresión regular.
export function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// dinero(): 1234.5 → "$1.234,50" (formato que se usa en PDF y correos).
export function dinero(valor: number): string {
  return '$' + redondear(valor).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// relleno(): 123 → "000000123" (secuenciales del SRI).
export function relleno(numero: number, largo: number): string {
  return String(numero).padStart(largo, '0');
}
