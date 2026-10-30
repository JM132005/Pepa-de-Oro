// pdf-liquidacion.ts → PDF de la liquidación de compra que se entrega al productor.

import type { PdfService, EmpresaPdf } from '../../comun/servicios/pdf.service.js';
import { dinero, fechaCorta } from '../../comun/utilidades.js';
import type { Liquidacion } from './esquemas/liquidacion.esquema.js';

export async function pdfLiquidacion(pdf: PdfService, empresa: EmpresaPdf, l: Liquidacion): Promise<Buffer> {
  const doc = pdf.crear(`Liquidación ${l.numero}`);
  await pdf.encabezado(doc, empresa, 'LIQUIDACIÓN DE COMPRA', l.numero, {
    claveAcceso: l.claveAcceso,
    lineas: [`Fecha: ${fechaCorta(l.fecha)}`, 'Bienes y servicios — DOCUMENTO SIMULADO'],
  });
  pdf.cuadroDatos(doc, 'Proveedor (productor)', [
    ['Nombre', l.productor.nombre],
    ['Cédula', l.productor.cedula],
    ['Cantón', l.productor.canton],
    ['Lote asignado', l.codigoLote ?? ''],
    ['Producto', `${l.cultivo === 'CACAO' ? 'Cacao' : 'Café'} ${l.variedad} en ${l.estadoEntrega.toLowerCase()}`],
    ['Humedad medida', `${l.humedad} %`],
  ]);
  pdf.subtitulo(doc, 'Pesaje y descuentos');
  pdf.tabla(
    doc,
    [
      { titulo: 'Concepto', ancho: 330 },
      { titulo: 'Kilogramos', ancho: 90, alinear: 'right' },
      { titulo: 'Quintales', ancho: 95, alinear: 'right' },
    ],
    [
      ['Peso bruto en báscula', l.kgBrutos, (l.kgBrutos / 45.36).toFixed(2)],
      ['(−) Tara de sacos', l.taraKg, ''],
      ['= Peso neto', l.kgNetos, (l.kgNetos / 45.36).toFixed(2)],
      [`(−) Descuento por humedad (RN-04: exceso sobre 7 %)`, l.descuentoHumedadKg, ''],
      [`(−) Descuento por impurezas (${l.impurezasPct} %)`, l.descuentoImpurezasKg, ''],
      ['= Peso a pagar', l.kgPagables, l.quintales.toFixed(2)],
    ],
  );
  pdf.subtitulo(doc, 'Valores');
  pdf.totales(
    doc,
    [
      [`${l.quintales.toFixed(2)} qq × ${dinero(l.precioQq)}`, dinero(l.subtotal)],
      ...l.bonos.map((b) => [`(+) ${b.concepto}`, dinero(b.monto)] as [string, string]),
      ['(−) Retención en la fuente', dinero(l.retencion)],
      ['(−) Anticipo descontado', dinero(l.anticipoDescontado)],
      ['TOTAL A PAGAR', dinero(l.totalPagar)],
    ],
    300,
  );
  if (l.pagos.length) {
    pdf.subtitulo(doc, 'Pagos registrados');
    pdf.tabla(
      doc,
      [
        { titulo: 'Fecha', ancho: 100 },
        { titulo: 'Forma', ancho: 120 },
        { titulo: 'Referencia', ancho: 175 },
        { titulo: 'Monto', ancho: 120, alinear: 'right' },
      ],
      l.pagos.map((p) => [fechaCorta(p.fecha), p.forma, p.referencia ?? '', dinero(p.monto)]),
    );
    pdf.parrafo(doc, `Saldo pendiente: ${dinero(l.saldo)}`, { negrita: true });
  }
  pdf.parrafo(doc, 'Declaro haber entregado el producto descrito y estar conforme con el pesaje, la medición de humedad y los descuentos aplicados.');
  pdf.firmas(doc, [`${l.productor.nombre}\nC.I. ${l.productor.cedula}`, `Responsable de acopio\n${l.usuario}`]);
  return pdf.terminar(doc);
}
