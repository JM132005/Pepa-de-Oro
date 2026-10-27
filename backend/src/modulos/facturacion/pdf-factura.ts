// pdf-factura.ts → plantilla del RIDE (Representación Impresa del Documento Electrónico) de la factura
// y de la nota de crédito, con la estructura que pide el SRI. SIMULADA: no tiene autorización real.

import type { PdfService, EmpresaPdf } from '../../comun/servicios/pdf.service.js';
import { COLORES } from '../../comun/servicios/pdf.service.js';
import { dinero, fechaCorta } from '../../comun/utilidades.js';
import { FORMAS_PAGO } from '../../comun/constantes.js';
import { totalEnLetras } from './facturacion.reglas.js';
import type { Factura } from './esquemas/factura.esquema.js';

export async function pdfFactura(pdf: PdfService, empresa: EmpresaPdf, f: Factura, urlWeb: string): Promise<Buffer> {
  const esNc = f.tipoComprobante === '04';
  const titulo = esNc ? 'NOTA DE CRÉDITO' : 'FACTURA';
  const doc = pdf.crear(`${titulo} ${f.numero}`);
  await pdf.encabezado(doc, empresa, titulo, f.numero, {
    claveAcceso: f.claveAcceso,
    lineas: [
      `Fecha de emisión: ${fechaCorta(f.fechaEmision)}`,
      'Ambiente: PRUEBAS · Emisión: NORMAL',
      'DOCUMENTO SIMULADO — NO AUTORIZADO POR EL SRI',
    ],
  });

  pdf.cuadroDatos(doc, esNc ? 'Datos del cliente y comprobante modificado' : 'Datos del adquirente', [
    ['Razón social / Nombres', f.cliente.nombre],
    ['Identificación', `${f.cliente.identificacion}`],
    ['Dirección', f.cliente.direccion ?? ''],
    ['Teléfono', f.cliente.telefono ?? ''],
    ...(esNc
      ? ([
          ['Comprobante que se modifica', `FACTURA ${f.facturaModificada?.numero ?? ''}`],
          ['Fecha del comprobante', fechaCorta(f.facturaModificada?.fecha)],
          ['Razón de la modificación', f.motivo ?? ''],
        ] as [string, string][])
      : ([
          ['Guía de remisión', ''],
          ['Canal', f.canal],
        ] as [string, string][])),
  ]);

  pdf.tabla(
    doc,
    [
      { titulo: 'Cód. principal', ancho: 68 },
      { titulo: 'Cant.', ancho: 40, alinear: 'right' },
      { titulo: 'Descripción', ancho: 190 },
      { titulo: 'P. unitario', ancho: 58, alinear: 'right' },
      { titulo: 'Descuento', ancho: 52, alinear: 'right' },
      { titulo: 'IVA', ancho: 32, alinear: 'center' },
      { titulo: 'P. total', ancho: 75, alinear: 'right' },
    ],
    f.items.map((i) => [
      i.codigo,
      i.cantidad,
      `${i.descripcion}${i.lotes?.length ? `\nLote: ${i.lotes.map((l) => l.codigo).join(', ')}` : ''}`,
      dinero(i.precioUnitario),
      dinero(i.descuento),
      `${i.tarifaIva}%`,
      dinero(i.subtotal),
    ]),
  );

  // Columna izquierda: información adicional y formas de pago. Derecha: totales.
  const yBloque = doc.y;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORES.cacao).text('Información adicional', 40, yBloque);
  doc.font('Helvetica').fontSize(8).fillColor(COLORES.texto);
  const adicional = [
    `Correo: ${f.cliente.correo ?? '—'}`,
    `Vendedor: ${f.vendedor?.nombre ?? '—'}`,
    f.creditoDias > 0 ? `Crédito: ${f.creditoDias} días · vence el ${fechaCorta(f.vence)}` : 'Pago: contado',
    f.observaciones ? `Observaciones: ${f.observaciones}` : '',
  ].filter(Boolean);
  for (const linea of adicional) doc.text(linea, 40, doc.y + 1, { width: 290 });
  if (f.pagos.length) {
    doc.moveDown(0.4).font('Helvetica-Bold').fillColor(COLORES.cacao).text('Formas de pago', 40);
    doc.font('Helvetica').fillColor(COLORES.texto);
    for (const p of f.pagos) doc.text(`${p.codigo} · ${FORMAS_PAGO[p.codigo as keyof typeof FORMAS_PAGO] ?? p.nombre}: ${dinero(p.monto)}`, 40, doc.y + 1, { width: 290 });
    if (f.cambio > 0) doc.text(`Recibido ${dinero(f.recibido)} · Cambio ${dinero(f.cambio)}`, 40, doc.y + 1);
  }
  const yIzquierda = doc.y;

  doc.y = yBloque;
  pdf.totales(doc, [
    [`Subtotal ${f.tarifaIvaVigente} %`, dinero(f.subtotalIva)],
    ['Subtotal 0 %', dinero(f.subtotal0)],
    ['Subtotal sin impuestos', dinero(f.subtotalSinImpuestos)],
    ['Total descuento', dinero(f.descuento)],
    [`IVA ${f.tarifaIvaVigente} %`, dinero(f.iva)],
    ['VALOR TOTAL', dinero(f.total)],
  ]);
  doc.y = Math.max(doc.y, yIzquierda) + 6;
  pdf.parrafo(doc, `SON: ${totalEnLetras(f.total)}`, { negrita: true, tam: 8 });

  // QR para rastrear el origen del primer lote de producto vendido.
  const primerLote = f.items.flatMap((i) => i.lotes ?? [])[0];
  if (primerLote && !esNc) {
    pdf.saltoSiHaceFalta(doc, 90);
    const y = doc.y + 4;
    await pdf.qr(doc, `${urlWeb}/rastreo?codigo=${primerLote.codigo}`, 40, y, 64);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORES.cacao).text('Rastrea tu cacao', 112, y + 8);
    doc.font('Helvetica').fontSize(8).fillColor(COLORES.texto).text(`Escanea el código o ingresa el lote ${primerLote.codigo} en ${urlWeb}/rastreo para ver de qué hacienda o productor salió.`, 112, doc.y + 2, { width: 380 });
    doc.y = y + 70;
  }
  return pdf.terminar(doc);
}
