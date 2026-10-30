// pdf-etiqueta.ts → hoja de etiquetas para imprimir y pegar en cada empaque del lote.
// Cada etiqueta lleva lo que exige el etiquetado de alimentos (nombre, contenido neto, ingredientes,
// alérgenos, lote, fechas, registro sanitario) y el QR de "Rastrea tu cacao".

import type { PdfService, EmpresaPdf } from '../../comun/servicios/pdf.service.js';
import { COLORES } from '../../comun/servicios/pdf.service.js';
import { fechaCorta } from '../../comun/utilidades.js';
import type { Producto } from '../productos/esquemas/producto.esquema.js';

export async function pdfEtiquetas(pdf: PdfService, empresa: EmpresaPdf, producto: Producto, lote: { codigo: string; fechaElaboracion?: Date; vencimiento?: Date }, urlWeb: string): Promise<Buffer> {
  const doc = pdf.crear(`Etiquetas ${lote.codigo}`);
  // 2 columnas × 4 filas = 8 etiquetas por hoja A4.
  const ancho = 250;
  const alto = 175;
  for (let i = 0; i < 8; i++) {
    const x = 40 + (i % 2) * (ancho + 15);
    const y = 40 + Math.floor(i / 2) * (alto + 12);
    doc.roundedRect(x, y, ancho, alto, 8).lineWidth(1).strokeColor(COLORES.oro).stroke();
    pdf.logo(doc, x + 10, y + 10, 30);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORES.cacao).text(producto.nombre, x + 46, y + 10, { width: ancho - 56 });
    doc.font('Helvetica').fontSize(7).fillColor(COLORES.texto).text(empresa.nombreComercial, x + 46, doc.y + 1, { width: ancho - 56 });
    let ly = y + 50;
    const linea = (t: string, negrita = false) => {
      doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.8).text(t, x + 10, ly, { width: ancho - 92 });
      ly = doc.y + 1.5;
    };
    linea(`Contenido neto: ${producto.pesoNetoG ? `${producto.pesoNetoG} g` : producto.presentacion ?? ''}`, true);
    if (producto.ingredientes) linea(`Ingredientes: ${producto.ingredientes}`);
    if (producto.alergenos) linea(`Alérgenos: ${producto.alergenos}`, true);
    linea(`Origen: ${producto.origen ?? 'El Oro, Ecuador'}`);
    linea(`Lote: ${lote.codigo}`, true);
    linea(`Elab.: ${fechaCorta(lote.fechaElaboracion)}   Vence: ${fechaCorta(lote.vencimiento)}`, true);
    linea(`Reg. San. ARCSA: ${producto.registroSanitario ?? 'en trámite'} (ficticio)`);
    linea('Conservar en lugar fresco y seco.');
    await pdf.qr(doc, `${urlWeb}/rastreo?codigo=${lote.codigo}`, x + ancho - 76, y + 92, 66);
    doc.font('Helvetica').fontSize(5.8).fillColor(COLORES.gris).text('Rastrea tu cacao', x + ancho - 76, y + 160, { width: 66, align: 'center' });
  }
  return pdf.terminar(doc);
}
