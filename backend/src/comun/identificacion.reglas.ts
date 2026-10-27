// identificacion.reglas.ts → RN-02: la cédula o el RUC deben pasar el dígito verificador.
//
// ¿Por qué? Un número mal digitado en una factura la hace inválida ante el SRI, y un productor
// registrado dos veces con cédulas parecidas descuadra los pagos. El último dígito de la cédula y del RUC
// se calcula con una fórmula a partir de los anteriores; si no coincide, el número está mal escrito.
//
// Ejemplo de cédula: 0703456789 → provincia 07 (El Oro), tercer dígito < 6 (persona natural).

// validarCedula(): algoritmo "módulo 10".
//   1. Los coeficientes son 2,1,2,1,2,1,2,1,2 para los 9 primeros dígitos.
//   2. Cada producto mayor a 9 se le resta 9.
//   3. Se suman; el verificador es lo que falta para llegar a la siguiente decena.
export function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false; // exactamente 10 números
  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false; // 30 = ecuatorianos en el exterior
  if (Number(cedula[2]) >= 6) return false; // 0-5 = persona natural
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let producto = Number(cedula[i]) * coeficientes[i];
    if (producto > 9) producto -= 9;
    suma += producto;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(cedula[9]);
}

// validarRuc(): 13 dígitos.
//   - Persona natural: cédula válida + "001".
//   - Sociedad privada (tercer dígito 9): módulo 11 con coeficientes 4,3,2,7,6,5,4,3,2.
//   - Entidad pública (tercer dígito 6): módulo 11 con coeficientes 3,2,7,6,5,4,3,2.
export function validarRuc(ruc: string): boolean {
  if (!/^\d{13}$/.test(ruc)) return false;
  if (ruc.slice(10) === '000') return false; // el establecimiento nunca es 000
  const tercero = Number(ruc[2]);
  if (tercero < 6) return validarCedula(ruc.slice(0, 10));
  const coeficientes = tercero === 9 ? [4, 3, 2, 7, 6, 5, 4, 3, 2] : tercero === 6 ? [3, 2, 7, 6, 5, 4, 3, 2] : null;
  if (!coeficientes) return false;
  const suma = coeficientes.reduce((s, c, i) => s + c * Number(ruc[i]), 0);
  const resto = suma % 11;
  const verificador = resto === 0 ? 0 : 11 - resto;
  return verificador === Number(ruc[coeficientes.length]);
}

// validarIdentificacion(): decide qué validar según el tipo elegido en el formulario.
export function validarIdentificacion(tipo: string, numero: string): boolean {
  switch (tipo) {
    case 'CEDULA':
      return validarCedula(numero);
    case 'RUC':
      return validarRuc(numero);
    case 'PASAPORTE':
      return /^[A-Z0-9]{5,20}$/i.test(numero); // pasaportes: letras y números
    case 'CONSUMIDOR_FINAL':
      return numero === '9999999999999';
    default:
      return false;
  }
}
