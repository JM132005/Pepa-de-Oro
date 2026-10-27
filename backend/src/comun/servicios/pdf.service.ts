// pdf.service.ts → "motor de PDF" del sistema. Todas las plantillas (factura, cotización, liquidación,
// contrato, guía de remisión, certificado, informes...) usan estas mismas piezas para verse iguales.
//
// Librerías:
//   pdfkit  → dibuja el PDF por coordenadas (x, y en puntos; 1 punto = 1/72 de pulgada; hoja A4 = 595 × 842).
//   bwip-js → genera códigos de barras (Code 128) como imagen PNG; lo usamos para la clave de acceso.
//   qrcode  → genera códigos QR como imagen PNG; lo usamos para "Rastrea tu cacao".

import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';

// Tipo del documento que crea pdfkit (InstanceType toma el tipo de "lo que crea" una clase).
export type Pdf = InstanceType<typeof PDFDocument>;

// Una columna de tabla: título, ancho en puntos y alineación del texto.
export interface ColumnaPdf {
  titulo: string;
  ancho: number;
  alinear?: 'left' | 'right' | 'center';
}

// Datos de la empresa que van en el encabezado (salen de la colección "configuracion").
export interface EmpresaPdf {
  razonSocial: string;
  nombreComercial: string;
  ruc: string;
  direccionMatriz: string;
  direccionTienda?: string;
  telefono: string;
  correo: string;
  obligadoContabilidad?: string;
}

// Colores de la marca (marrón cacao y dorado).
export const COLORES = {
  cacao: '#3b2314',
  oro: '#c8962e',
  crema: '#f7f1e6',
  texto: '#2b2b2b',
  gris: '#6b5a48',
  linea: '#e0d4c0',
};

@Injectable()
export class PdfService {
  // crear(): nuevo PDF tamaño A4 con márgenes de 40 puntos.
  // bufferPages: true permite volver a cada página al final para numerarlas ("Página 1 de 3").
  crear(titulo: string): Pdf {
    return new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: titulo, Author: 'Pepa de Oro' } });
  }

  // terminar(): cierra el PDF y lo devuelve como Buffer (bytes en memoria) para enviarlo o adjuntarlo.
  // El PDF se genera por "pedazos" (eventos 'data'); se juntan todos al llegar el evento 'end'.
  terminar(doc: Pdf): Promise<Buffer> {
    return new Promise((resolver, rechazar) => {
      const pedazos: Buffer[] = [];
      doc.on('data', (p: Buffer) => pedazos.push(p));
      doc.on('end', () => resolver(Buffer.concat(pedazos)));
      doc.on('error', rechazar);
      this.numerarPaginas(doc);
      doc.end();
    });
  }

  // numerarPaginas(): escribe "Página N de M" y la leyenda académica al pie de cada hoja.
  private numerarPaginas(doc: Pdf) {
    const rango = doc.bufferedPageRange(); // { start, count }
    for (let i = rango.start; i < rango.start + rango.count; i++) {
      doc.switchToPage(i);
      const margenInferior = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // permite escribir dentro del margen sin crear otra página
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(COLORES.gris)
        .text(
          `Documento académico con datos ficticios — sin validez tributaria · Página ${i + 1} de ${rango.count}`,
          40,
          doc.page.height - 28,
          { width: doc.page.width - 80, align: 'center' },
        );
      doc.page.margins.bottom = margenInferior;
    }
  }

  // logo(): dibuja una mazorca de cacao estilizada con vectores (no necesita archivo de imagen).
  logo(doc: Pdf, x: number, y: number, tam = 46) {
    const e = tam / 46; // escala
    doc.save();
    doc.circle(x + 23 * e, y + 23 * e, 23 * e).fill(COLORES.cacao);
    // ellipse(x, y, radioX, radioY): la mazorca dorada
    doc.ellipse(x + 23 * e, y + 23 * e, 9 * e, 16 * e).fill(COLORES.oro);
    // líneas verticales que imitan los surcos de la mazorca
    doc.lineWidth(1.2 * e).strokeColor(COLORES.cacao);
    doc.moveTo(x + 23 * e, y + 8 * e).lineTo(x + 23 * e, y + 38 * e).stroke();
    doc.moveTo(x + 18 * e, y + 10 * e).quadraticCurveTo(x + 15 * e, y + 23 * e, x + 18 * e, y + 36 * e).stroke();
    doc.moveTo(x + 28 * e, y + 10 * e).quadraticCurveTo(x + 31 * e, y + 23 * e, x + 28 * e, y + 36 * e).stroke();
    doc.restore();
  }

  // encabezado(): bloque superior común. A la izquierda la empresa; a la derecha un recuadro con
  // el tipo de documento, su número y (si se envía) la clave de acceso con su código de barras.
  async encabezado(
    doc: Pdf,
    empresa: EmpresaPdf,
    titulo: string,
    numero: string,
    extra: { claveAcceso?: string; lineas?: string[] } = {},
  ) {
    const y0 = 40;
    this.logo(doc, 40, y0);
    doc.fillColor(COLORES.cacao).font('Helvetica-Bold').fontSize(15).text(empresa.nombreComercial, 94, y0 + 2, { width: 220 });
    doc.font('Helvetica').fontSize(8).fillColor(COLORES.texto);
    doc.text(empresa.razonSocial, 94, doc.y + 2, { width: 220 });
    doc.text(`Matriz: ${empresa.direccionMatriz}`, { width: 220 });
    if (empresa.direccionTienda) doc.text(`Tienda: ${empresa.direccionTienda}`, { width: 220 });
    doc.text(`Tel.: ${empresa.telefono} · ${empresa.correo}`, { width: 220 });
    doc.text(`Obligado a llevar contabilidad: ${empresa.obligadoContabilidad ?? 'SI'}`, { width: 220 });
    const yIzq = doc.y;

    // Recuadro derecho
    const xR = 320;
    const anchoR = 235;
    doc.roundedRect(xR, y0, anchoR, extra.claveAcceso ? 150 : 92, 6).lineWidth(1).strokeColor(COLORES.oro).stroke();
    doc.fillColor(COLORES.texto).font('Helvetica-Bold').fontSize(9).text(`R.U.C.: ${empresa.ruc}`, xR + 10, y0 + 8);
    doc.fillColor(COLORES.cacao).fontSize(13).text(titulo, xR + 10, doc.y + 3, { width: anchoR - 20 });
    doc.fillColor(COLORES.texto).font('Helvetica').fontSize(9).text(`No. ${numero}`, xR + 10, doc.y + 2);
    for (const linea of extra.lineas ?? []) doc.fontSize(7.5).text(linea, xR + 10, doc.y + 1, { width: anchoR - 20 });
    if (extra.claveAcceso) {
      doc.font('Helvetica-Bold').fontSize(7).text('CLAVE DE ACCESO / NÚMERO DE AUTORIZACIÓN', xR + 10, doc.y + 4);
      // toBuffer(): bwip-js dibuja el código de barras Code 128 y devuelve un PNG.
      const barras = await bwipjs.toBuffer({ bcid: 'code128', text: extra.claveAcceso, scale: 1, height: 8, includetext: false });
      doc.image(barras, xR + 10, doc.y + 2, { width: anchoR - 20, height: 26 });
      doc.font('Courier').fontSize(6.4).text(extra.claveAcceso, xR + 10, doc.y + 30, { width: anchoR - 20, align: 'center' });
    }
    doc.y = Math.max(yIzq, y0 + (extra.claveAcceso ? 155 : 97)) + 8;
    doc.x = 40;
  }

  // cuadroDatos(): recuadro con pares "Etiqueta: valor" en dos columnas (datos del cliente, del equipo...).
  cuadroDatos(doc: Pdf, titulo: string, pares: [string, string][]) {
    const x = 40;
    const ancho = 515;
    const filas = Math.ceil(pares.length / 2);
    const alto = 18 + filas * 13;
    const y = doc.y;
    this.saltoSiHaceFalta(doc, alto + 10);
    doc.rect(x, doc.y, ancho, alto).fill(COLORES.crema);
    doc.fillColor(COLORES.cacao).font('Helvetica-Bold').fontSize(8.5).text(titulo.toUpperCase(), x + 8, doc.y + 5);
    const yBase = doc.y + 3;
    pares.forEach(([etiqueta, valor], i) => {
      const col = i % 2;
      const fila = Math.floor(i / 2);
      const xc = x + 8 + col * 255;
      const yc = yBase + fila * 13;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORES.texto).text(`${etiqueta}: `, xc, yc, { continued: true, width: 245 });
      doc.font('Helvetica').text(valor || '—');
    });
    doc.y = Math.max(y, yBase) + filas * 13 + 8;
    doc.x = 40;
  }

  // tabla(): dibuja encabezado y filas; si no cabe en la página, crea otra y repite el encabezado.
  tabla(doc: Pdf, columnas: ColumnaPdf[], filas: (string | number)[][]) {
    const x0 = 40;
    const dibujarEncabezado = () => {
      const anchoTotal = columnas.reduce((s, c) => s + c.ancho, 0);
      doc.rect(x0, doc.y, anchoTotal, 16).fill(COLORES.cacao);
      let x = x0;
      const y = doc.y + 4;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
      for (const c of columnas) {
        doc.text(c.titulo, x + 3, y, { width: c.ancho - 6, align: c.alinear ?? 'left' });
        x += c.ancho;
      }
      doc.y = y + 12;
    };
    dibujarEncabezado();
    filas.forEach((fila, indice) => {
      // heightOfString(): cuánto alto ocupará el texto más largo de la fila (para filas de varias líneas).
      doc.font('Helvetica').fontSize(7.5);
      const alto = Math.max(
        14,
        ...fila.map((celda, i) => doc.heightOfString(String(celda ?? ''), { width: columnas[i].ancho - 6 }) + 5),
      );
      if (doc.y + alto > doc.page.height - 60) {
        doc.addPage();
        dibujarEncabezado();
      }
      const y = doc.y;
      if (indice % 2 === 1) doc.rect(x0, y, columnas.reduce((s, c) => s + c.ancho, 0), alto).fill('#fbf8f2');
      let x = x0;
      doc.fillColor(COLORES.texto);
      fila.forEach((celda, i) => {
        doc.text(String(celda ?? ''), x + 3, y + 3, { width: columnas[i].ancho - 6, align: columnas[i].alinear ?? 'left' });
        x += columnas[i].ancho;
      });
      doc.y = y + alto;
    });
    doc.moveTo(x0, doc.y).lineTo(x0 + columnas.reduce((s, c) => s + c.ancho, 0), doc.y).strokeColor(COLORES.linea).stroke();
    doc.y += 6;
    doc.x = 40;
  }

  // totales(): bloque a la derecha con "Subtotal 15 %: $..." etc. La última fila sale resaltada.
  totales(doc: Pdf, pares: [string, string][], xInicio = 355) {
    this.saltoSiHaceFalta(doc, pares.length * 14 + 10);
    const yInicio = doc.y;
    pares.forEach(([etiqueta, valor], i) => {
      const ultima = i === pares.length - 1;
      const y = yInicio + i * 14;
      if (ultima) doc.rect(xInicio, y - 2, 200, 16).fill(COLORES.cacao);
      doc
        .font(ultima ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8.5)
        .fillColor(ultima ? '#ffffff' : COLORES.texto)
        .text(etiqueta, xInicio + 6, y + 1, { width: 120 })
        .text(valor, xInicio + 120, y + 1, { width: 74, align: 'right' });
    });
    doc.y = yInicio + pares.length * 14 + 6;
    doc.x = 40;
  }

  // parrafo(): texto normal con ancho completo.
  parrafo(doc: Pdf, texto: string, opciones: { negrita?: boolean; tam?: number; color?: string } = {}) {
    this.saltoSiHaceFalta(doc, 30);
    doc
      .font(opciones.negrita ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(opciones.tam ?? 8.5)
      .fillColor(opciones.color ?? COLORES.texto)
      .text(texto, 40, doc.y, { width: 515, align: 'justify' });
    doc.moveDown(0.4);
  }

  // subtitulo(): título de sección con una línea dorada debajo.
  subtitulo(doc: Pdf, texto: string) {
    this.saltoSiHaceFalta(doc, 40);
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORES.cacao).text(texto, 40, doc.y);
    doc.moveTo(40, doc.y + 1).lineTo(555, doc.y + 1).strokeColor(COLORES.oro).lineWidth(1).stroke();
    doc.moveDown(0.5);
  }

  // qr(): dibuja un código QR que, al escanearlo con el celular, abre el texto/URL indicado.
  async qr(doc: Pdf, texto: string, x: number, y: number, tam = 70) {
    const png = await QRCode.toBuffer(texto, { margin: 1, width: tam * 3, color: { dark: COLORES.cacao } });
    doc.image(png, x, y, { width: tam, height: tam });
  }

  // firmas(): líneas para firmar al final de contratos, liquidaciones y guías.
  firmas(doc: Pdf, nombres: string[]) {
    this.saltoSiHaceFalta(doc, 80);
    doc.moveDown(3);
    const y = doc.y;
    const ancho = 515 / nombres.length;
    nombres.forEach((n, i) => {
      const x = 40 + i * ancho;
      doc.moveTo(x + 20, y).lineTo(x + ancho - 20, y).strokeColor(COLORES.gris).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(COLORES.texto).text(n, x + 20, y + 4, { width: ancho - 40, align: 'center' });
    });
    doc.y = y + 30;
    doc.x = 40;
  }

  // saltoSiHaceFalta(): si lo que viene no cabe, pasa a una nueva página.
  saltoSiHaceFalta(doc: Pdf, alto: number) {
    if (doc.y + alto > doc.page.height - 60) doc.addPage();
  }

  // informe(): PDF genérico para CUALQUIER informe (tabla con totales). Lo usa el módulo de analítica.
  async informe(
    empresa: EmpresaPdf,
    titulo: string,
    subtitulo: string,
    columnas: ColumnaPdf[],
    filas: (string | number)[][],
    resumen: [string, string][] = [],
  ): Promise<Buffer> {
    // Las tablas anchas se imprimen con la hoja acostada (landscape).
    const anchoTabla = columnas.reduce((s, c) => s + c.ancho, 0);
    const doc = anchoTabla > 515 ? new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true }) : this.crear(titulo);
    this.logo(doc, 40, 36, 34);
    doc.fillColor(COLORES.cacao).font('Helvetica-Bold').fontSize(14).text(titulo, 84, 38);
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORES.gris).text(`${empresa.nombreComercial} · RUC ${empresa.ruc} · ${subtitulo}`, 84, doc.y + 1);
    doc.text(`Generado el ${new Date().toLocaleString('es-EC')}`, 84, doc.y);
    doc.y = 84;
    if (resumen.length) this.cuadroDatos(doc, 'Resumen', resumen);
    this.tabla(doc, columnas, filas);
    return this.terminar(doc);
  }
}
