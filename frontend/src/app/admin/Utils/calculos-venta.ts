// calculos-venta.ts → las MISMAS fórmulas del backend para que la pantalla muestre el total exacto antes de cobrar.
//   · precioUnitario(): RN-16 (lista por tipo de cliente → escala por volumen → por mayor → por menor).
//   · calcularLinea() y calcularTotales(): línea por línea con 2 decimales, como el SRI.
// El backend vuelve a calcular todo al emitir (la pantalla solo adelanta el resultado).
// Copia de: backend/src/modulos/productos/productos.reglas.ts y facturacion/facturacion.reglas.ts

import { Producto } from '../../compartido/Entidades/catalogo';
import { redondear } from '../../compartido/Utils/formato';

export interface LineaCalculo {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct?: number;
  tarifaIva: number;
}

// RN-16: qué precio aplica para esta cantidad y este tipo de cliente.
export function precioUnitario(p: Pick<Producto, 'listas' | 'escalas' | 'cantidadMinimaMayor' | 'precioMayor' | 'precioMenor'>, cantidad: number, tipoCliente = 'CONSUMIDOR') {
  if (p.listas?.[tipoCliente] !== undefined) return { precio: p.listas[tipoCliente], regla: `Lista ${tipoCliente}` };
  const escala = [...(p.escalas ?? [])].sort((a, b) => b.desde - a.desde).find((e) => cantidad >= e.desde);
  if (escala) return { precio: escala.precio, regla: `Escala desde ${escala.desde}` };
  const esMayorista = ['MAYORISTA', 'DISTRIBUIDOR', 'EXPORTADOR'].includes(tipoCliente);
  if (cantidad >= p.cantidadMinimaMayor || esMayorista) return { precio: p.precioMayor, regla: 'Precio por mayor' };
  return { precio: p.precioMenor, regla: 'Precio por menor' };
}

export function calcularLinea(l: LineaCalculo) {
  const bruto = redondear(l.cantidad * l.precioUnitario);
  const descuento = redondear((bruto * (l.descuentoPct ?? 0)) / 100);
  const subtotal = redondear(bruto - descuento);
  const iva = redondear((subtotal * l.tarifaIva) / 100);
  return { ...l, descuento, subtotal, iva };
}

export function calcularTotales(lineas: LineaCalculo[]) {
  const calculadas = lineas.map(calcularLinea);
  const suma = (f: (x: ReturnType<typeof calcularLinea>) => number) => redondear(calculadas.reduce((s, x) => s + f(x), 0));
  const subtotalIva = suma((x) => (x.tarifaIva > 0 ? x.subtotal : 0));
  const subtotal0 = suma((x) => (x.tarifaIva === 0 ? x.subtotal : 0));
  const descuento = suma((x) => x.descuento);
  const iva = suma((x) => x.iva);
  return { lineas: calculadas, subtotalIva, subtotal0, subtotalSinImpuestos: redondear(subtotalIva + subtotal0), descuento, iva, total: redondear(subtotalIva + subtotal0 + iva) };
}
