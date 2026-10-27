// pdf-cotizacion.ts → plantilla PDF de la cotización (usa el motor común PdfService).

import type { PdfService, EmpresaPdf } from '../../comun/servicios/pdf.service.js';
import { dinero, fechaCorta } from '../../comun/utilidades.js';
import type { Cotizacion } from './esquemas/cotizacion.esquema.js';
import type { Cliente } from './esquemas/cliente.esquema.js';

export async function pdfCotizacion(pdf: PdfService, empresa: EmpresaPdf, cot: Cotizacion, cliente: Cliente): Promise<Buffer> {
  const doc = pdf.crear(`Cotización ${cot.numero}`);
  await pdf.encabezado(doc, empresa, 'COTIZACIÓN', cot.numero, {
    lineas: [`Fecha: ${fechaCorta(cot.fecha)}`, `Válida hasta: ${fechaCorta(cot.vence)} (${cot.diasValidez} días)`],
  });
  pdf.cuadroDatos(doc, 'Cliente', [
    ['Razón social', cliente.nombre],
    ['Identificación', cliente.identificacion],
    ['Dirección', cliente.direccion ?? ''],
    ['Teléfono', cliente.telefono ?? ''],
    ['Correo', cliente.correo ?? ''],
    ['Vendedor', cot.vendedor?.nombre ?? ''],
  ]);
  pdf.tabla(
    doc,
    [
      { titulo: 'Código', ancho: 70 },
      { titulo: 'Descripción', ancho: 195 },
      { titulo: 'Cant.', ancho: 45, alinear: 'right' },
      { titulo: 'P. unit.', ancho: 55, alinear: 'right' },
      { titulo: 'Desc.', ancho: 45, alinear: 'right' },
      { titulo: 'IVA', ancho: 35, alinear: 'center' },
      { titulo: 'Subtotal', ancho: 70, alinear: 'right' },
    ],
    cot.items.map((i) => [i.codigo, `${i.descripcion}${i.reglaPrecio ? `\n(${i.reglaPrecio})` : ''}`, i.cantidad, dinero(i.precioUnitario), dinero(i.descuento), `${i.tarifaIva}%`, dinero(i.subtotal)]),
  );
  pdf.totales(doc, [
    ['Subtotal 15 %', dinero(cot.totales.subtotalIva)],
    ['Subtotal 0 %', dinero(cot.totales.subtotal0)],
    ['Descuento', dinero(cot.totales.descuento)],
    ['IVA 15 %', dinero(cot.totales.iva)],
    ['TOTAL', dinero(cot.totales.total)],
  ]);
  pdf.subtitulo(doc, 'Condiciones');
  pdf.parrafo(doc, cot.condiciones ?? 'Precios en dólares de los Estados Unidos. Entrega en bodega El Guabo o despacho con nuestra flota (flete según destino). Forma de pago: contado o crédito aprobado.');
  pdf.parrafo(doc, 'Los precios y el stock se confirman al momento de aceptar la cotización. Para aceptarla, responda este correo o comuníquese con su asesor.');
  if (cot.observaciones) pdf.parrafo(doc, `Observaciones: ${cot.observaciones}`);
  return pdf.terminar(doc);
}
