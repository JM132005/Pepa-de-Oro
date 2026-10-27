// reloj.ts → "reloj de mentira" para el seed.
//
// El seed simula 12 meses de trabajo de la empresa en pocos minutos. Para que cada factura, cosecha o
// movimiento quede con SU fecha (y no con la de hoy), se reemplaza la clase Date de JavaScript por una
// que devuelve la hora que el simulador quiera ("son las 10:30 del 14 de marzo de 2026").
// Solo se usa al generar los datos de prueba; la aplicación real nunca carga este archivo.

const DateReal = Date;
let base = DateReal.now();
let marcaReal = DateReal.now();

// ahoraSimulado(): la hora fijada + lo que haya pasado de verdad desde que se fijó (el reloj sigue corriendo).
function ahoraSimulado() {
  return base + (DateReal.now() - marcaReal);
}

// DateFalsa: igual que Date, salvo que "new Date()" sin argumentos y "Date.now()" dan la hora simulada.
class DateFalsa extends DateReal {
  constructor(...args: unknown[]) {
    if (args.length === 0) super(ahoraSimulado());
    // @ts-expect-error: se pasan los mismos argumentos que recibiría Date
    else super(...args);
  }
  static now() {
    return ahoraSimulado();
  }
}

// Mongoose reconoce el tipo de un campo por el NOMBRE de la clase: la falsa también se llama "Date".
Object.defineProperty(DateFalsa, 'name', { value: 'Date' });

export function instalarReloj() {
  globalThis.Date = DateFalsa as unknown as DateConstructor;
}

export function fijarReloj(fecha: Date) {
  base = fecha.getTime();
  marcaReal = DateReal.now();
}

export function horaReal() {
  return new DateReal();
}
