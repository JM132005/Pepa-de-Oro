// validadores.ts → validadores para formularios reactivos de Angular.
// Son la MISMA regla RN-02 del backend: el formulario avisa antes de enviar, y la API vuelve a revisar.

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function cedulaValida(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30) || Number(cedula[2]) >= 6) return false;
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const suma = coef.reduce((s, c, i) => {
    const p = Number(cedula[i]) * c;
    return s + (p > 9 ? p - 9 : p);
  }, 0);
  return (10 - (suma % 10)) % 10 === Number(cedula[9]);
}

export function rucValido(ruc: string): boolean {
  if (!/^\d{13}$/.test(ruc) || ruc.slice(10) === '000') return false;
  const tercero = Number(ruc[2]);
  if (tercero < 6) return cedulaValida(ruc.slice(0, 10));
  const coef = tercero === 9 ? [4, 3, 2, 7, 6, 5, 4, 3, 2] : tercero === 6 ? [3, 2, 7, 6, 5, 4, 3, 2] : null;
  if (!coef) return false;
  const resto = coef.reduce((s, c, i) => s + c * Number(ruc[i]), 0) % 11;
  return (resto === 0 ? 0 : 11 - resto) === Number(ruc[coef.length]);
}

// identificacionValidador(): ValidatorFn = función que Angular llama cada vez que cambia el campo.
// Devuelve null si está bien, o un objeto con el error.
export function identificacionValidador(obtenerTipo: () => string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '').trim();
    if (!valor) return null;
    const tipo = obtenerTipo();
    const ok = tipo === 'CEDULA' ? cedulaValida(valor) : tipo === 'RUC' ? rucValido(valor) : tipo === 'CONSUMIDOR_FINAL' ? valor === '9999999999999' : valor.length >= 5;
    return ok ? null : { identificacion: 'RN-02: revisa el número (dígito verificador)' };
  };
}
