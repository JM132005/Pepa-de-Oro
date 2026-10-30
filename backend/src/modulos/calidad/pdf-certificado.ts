// pdf-certificado.ts → certificado de calidad de un lote (para el mayorista o el exportador).

import type { PdfService, EmpresaPdf } from '../../comun/servicios/pdf.service.js';
import { fechaCorta } from '../../comun/utilidades.js';
import type { LoteGrano } from '../poscosecha/esquemas/lote-grano.esquema.js';

export async function pdfCertificado(pdf: PdfService, empresa: EmpresaPdf, lote: LoteGrano, urlWeb: string): Promise<Buffer> {
  const doc = pdf.crear(`Certificado ${lote.codigo}`);
  await pdf.encabezado(doc, empresa, 'CERTIFICADO DE CALIDAD', lote.codigo, {
    lineas: [`Fecha de análisis: ${fechaCorta(lote.calidad?.fecha)}`, `Analista: ${lote.calidad?.usuario ?? ''}`],
  });
  const c = lote.calidad!;
  pdf.cuadroDatos(doc, 'Identificación del lote', [
    ['Producto', `${lote.cultivo === 'CACAO' ? 'Cacao en grano' : 'Café verde'} ${lote.variedad}`],
    ['Origen', lote.origen === 'PROPIO' ? `${lote.hacienda?.nombre} · parcela ${lote.parcela?.codigo}` : `Productores de ${lote.productor?.canton ?? 'El Oro'}`],
    ['Peso seco', `${lote.kgSeco} kg (${(lote.kgSeco / 69).toFixed(1)} sacos de 69 kg)`],
    ['Fecha de recepción', fechaCorta(lote.fechaRecepcion)],
    ['Fermentación', lote.fermentacion ? `${lote.fermentacion.codigo} · ${lote.fermentacion.volteos.length} volteos` : 'No aplica'],
    ['Secado', lote.secado ? `${lote.secado.metodo.toLowerCase()} ${lote.secado.codigo}` : 'Recibido seco'],
  ]);
  pdf.subtitulo(doc, 'Resultados del análisis');
  const filas: (string | number)[][] =
    lote.cultivo === 'CACAO'
      ? [
          ['Granos bien fermentados', `${c.bienFermentados ?? '—'} %`],
          ['Granos violetas', `${c.violetas ?? '—'} %`],
          ['Granos pizarrosos', `${c.pizarrosos ?? '—'} %`],
          ['Granos mohosos', `${c.mohosos ?? '—'} %`],
          ['Dañados por insectos', `${c.insectados ?? '—'} %`],
          ['Germinados', `${c.germinados ?? '—'} %`],
          ['Humedad', `${c.humedad} %`],
          ['Peso de 100 granos', `${c.peso100Granos ?? '—'} g`],
        ]
      : [
          ['Defectos en 300 g', `${c.defectos300g ?? '—'}`],
          ['Puntaje de taza (SCA)', `${c.puntajeTaza ?? '—'}`],
          ['Humedad', `${c.humedad} %`],
        ];
  pdf.tabla(doc, [{ titulo: 'Parámetro', ancho: 330 }, { titulo: 'Resultado', ancho: 185, alinear: 'right' }], filas);
  pdf.cuadroDatos(doc, 'Dictamen', [
    ['Grado asignado (calculado por el sistema)', c.grado],
    ['Destino recomendado', c.destino],
    ...(c.cata ? ([['Notas de cata', `${c.cata.notas.join(', ')} · ${c.cata.puntaje}/10`]] as [string, string][]) : []),
  ]);
  pdf.parrafo(doc, 'Clasificación basada en límites configurables inspirados en la norma NTE INEN 176 (cacao en grano) y en la evaluación SCA (café). Documento académico con datos ficticios.');
  const y = doc.y + 6;
  await pdf.qr(doc, `${urlWeb}/rastreo?codigo=${lote.codigo}`, 40, y, 64);
  doc.fontSize(8).text(`Verifique el origen en ${urlWeb}/rastreo (código ${lote.codigo})`, 112, y + 24, { width: 380 });
  doc.y = y + 72;
  pdf.firmas(doc, ['Jefe de calidad', 'Gerencia']);
  return pdf.terminar(doc);
}
