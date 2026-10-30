// facturacion.reglas.ts → reglas PURAS de la factura con formato del SRI (simulada, no autorizada).

import { redondear, relleno } from '../../comun/utilidades.js';

// Una línea de la factura antes de calcular.
export interface LineaEntrada {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct?: number; // descuento manual en %
  tarifaIva: number; // 0 o 15
}

// calcularLinea(): se calcula LÍNEA POR LÍNEA con 2 decimales, igual que el SRI, para que todo cuadre.
export function calcularLinea(l: LineaEntrada) {
  const bruto = redondear(l.cantidad * l.precioUnitario);
  const descuento = redondear((bruto * (l.descuentoPct ?? 0)) / 100);
  const subtotal = redondear(bruto - descuento); // "precio total sin impuesto"
  const iva = redondear((subtotal * l.tarifaIva) / 100);
  return { ...l, descuento, subtotal, iva };
}

// calcularTotales(): suma las líneas separando la base 15 % y la base 0 %.
export function calcularTotales(lineas: LineaEntrada[]) {
  const calculadas = lineas.map(calcularLinea);
  const suma = (f: (x: ReturnType<typeof calcularLinea>) => number) => redondear(calculadas.reduce((s, x) => s + f(x), 0));
  const subtotalIva = suma((x) => (x.tarifaIva > 0 ? x.subtotal : 0));
  const subtotal0 = suma((x) => (x.tarifaIva === 0 ? x.subtotal : 0));
  const descuento = suma((x) => x.descuento);
  const iva = suma((x) => x.iva);
  return {
    lineas: calculadas,
    subtotalIva, // base gravada con 15 %
    subtotal0, // base tarifa 0 %
    subtotalSinImpuestos: redondear(subtotalIva + subtotal0),
    descuento,
    iva,
    total: redondear(subtotalIva + subtotal0 + iva),
  };
}

// ─── RN-19: consumidor final solo hasta 50 USD ───
export function verificarConsumidorFinal(tipoIdentificacion: string, total: number, limite = 50): string | null {
  if (tipoIdentificacion !== 'CONSUMIDOR_FINAL' || total <= limite) return null;
  return `RN-19: una venta a consumidor final no puede pasar de $${limite}; el total es $${total.toFixed(2)}. Registra los datos del cliente.`;
}

// ─── RN-20: el secuencial es único y correlativo ───
// numeroFactura(): 001-001-000000123 (establecimiento - punto de emisión - secuencial de 9 dígitos).
// La unicidad la garantiza el contador atómico de MongoDB + un índice único en "numero".
export function numeroComprobante(establecimiento: string, punto: string, secuencial: number): string {
  if (!Number.isInteger(secuencial) || secuencial < 1 || secuencial > 999_999_999) throw new Error('Secuencial fuera de rango');
  return `${establecimiento}-${punto}-${relleno(secuencial, 9)}`;
}

// ─── Clave de acceso de 49 dígitos (estructura de la ficha técnica del SRI) ───
//   fecha ddmmaaaa (8) + tipo de comprobante (2) + RUC (13) + ambiente (1) + serie (6)
//   + secuencial (9) + código numérico (8) + tipo de emisión (1) = 48 dígitos
//   + dígito verificador módulo 11 (1) = 49.
export function digitoModulo11(numero: string): number {
  // Se multiplica cada dígito, de DERECHA a IZQUIERDA, por 2, 3, 4, 5, 6, 7, 2, 3...
  let factor = 2;
  let suma = 0;
  for (let i = numero.length - 1; i >= 0; i--) {
    suma += Number(numero[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (suma % 11);
  if (dv === 11) return 0;
  if (dv === 10) return 1;
  return dv;
}

export function claveAcceso(d: {
  fecha: Date;
  tipoComprobante: string; // '01' factura, '04' nota de crédito, '03' liquidación de compra
  ruc: string;
  ambiente: string; // '1' pruebas
  establecimiento: string;
  puntoEmision: string;
  secuencial: number;
  codigoNumerico: string; // 8 dígitos que elige el emisor
}): string {
  const f = new Date(d.fecha);
  const fecha = `${relleno(f.getDate(), 2)}${relleno(f.getMonth() + 1, 2)}${f.getFullYear()}`;
  const base = `${fecha}${d.tipoComprobante}${d.ruc}${d.ambiente}${d.establecimiento}${d.puntoEmision}${relleno(d.secuencial, 9)}${d.codigoNumerico.padStart(8, '0').slice(0, 8)}1`;
  if (base.length !== 48 || !/^\d+$/.test(base)) throw new Error('La clave de acceso debe tener 48 dígitos antes del verificador');
  return base + digitoModulo11(base);
}

// ─── RN-21: una factura no se borra; se anula con nota de crédito ───
// verificarNotaCredito(): la NC no puede devolver más de lo que se facturó ni aplicarse a una anulada.
export function verificarNotaCredito(factura: { estado: string; total: number; totalNotasCredito: number }, montoNc: number): string | null {
  if (factura.estado === 'ANULADA') return 'RN-21: la factura ya está anulada';
  if (montoNc <= 0) return 'El valor de la nota de crédito debe ser mayor que cero';
  const saldoAnulable = redondear(factura.total - factura.totalNotasCredito);
  if (montoNc > saldoAnulable + 0.005) return `RN-21: la nota de crédito ($${montoNc}) supera lo que queda por anular ($${saldoAnulable})`;
  return null;
}

// totalEnLetras(): "CIENTO VEINTITRÉS CON 45/100 DÓLARES" (detalle que imprime una factura real).
export function totalEnLetras(valor: number): string {
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const menorMil = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    const c = Math.floor(n / 100);
    const r = n % 100;
    let texto = centenas[c];
    if (r) {
      let parte: string;
      if (r < 10) parte = unidades[r];
      else if (r < 20) parte = especiales[r - 10];
      else if (r < 30) parte = r === 20 ? 'VEINTE' : 'VEINTI' + unidades[r - 20];
      else parte = decenas[Math.floor(r / 10)] + (r % 10 ? ' Y ' + unidades[r % 10] : '');
      texto = (texto ? texto + ' ' : '') + parte;
    }
    return texto;
  };
  const entero = Math.floor(redondear(valor));
  const centavos = Math.round((redondear(valor) - entero) * 100);
  const miles = Math.floor(entero / 1000);
  const resto = entero % 1000;
  let texto = '';
  if (miles) texto = miles === 1 ? 'MIL' : `${menorMil(miles)} MIL`;
  if (resto) texto += (texto ? ' ' : '') + menorMil(resto);
  if (!texto) texto = 'CERO';
  return `${texto} CON ${relleno(centavos, 2)}/100 DÓLARES`;
}
