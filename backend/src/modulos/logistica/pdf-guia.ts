// pdf-guia.ts → GUÍA DE REMISIÓN (código SRI 06): documento que acompaña a la mercadería en el camión.

import type { PdfService, EmpresaPdf } from '../../comun/servicios/pdf.service.js';
import { fechaCorta } from '../../comun/utilidades.js';
import type { Viaje } from './esquemas/viaje.esquema.js';

export async function pdfGuia(pdf: PdfService, empresa: EmpresaPdf, v: Viaje, camion: { codigo: string; placa?: string; nombre: string }, chofer: { nombre: string; cedula: string }, destinatario?: { nombre: string; identificacion: string }): Promise<Buffer> {
  const doc = pdf.crear(`Guía ${v.guiaRemision}`);
  await pdf.encabezado(doc, empresa, 'GUÍA DE REMISIÓN', v.guiaRemision ?? v.codigo, { lineas: [`Viaje: ${v.codigo}`, 'DOCUMENTO SIMULADO'] });
  pdf.cuadroDatos(doc, 'Traslado', [
    ['Punto de partida', v.origen],
    ['Destino', v.destino],
    ['Fecha inicio traslado', fechaCorta(v.salida)],
    ['Fecha fin traslado', fechaCorta(v.llegadaEstimada)],
    ['Motivo', v.tipo.replace(/_/g, ' ').toLowerCase()],
    ['Destinatario', destinatario ? `${destinatario.nombre} (${destinatario.identificacion})` : empresa.razonSocial],
  ]);
  pdf.cuadroDatos(doc, 'Transportista', [
    ['Chofer', chofer.nombre],
    ['Cédula', chofer.cedula],
    ['Vehículo', `${camion.codigo} · ${camion.nombre}`],
    ['Placa', camion.placa ?? ''],
  ]);
  pdf.tabla(
    doc,
    [
      { titulo: 'Descripción de la carga', ancho: 330 },
      { titulo: 'Bultos', ancho: 80, alinear: 'right' },
      { titulo: 'Peso (kg)', ancho: 105, alinear: 'right' },
    ],
    [[v.carga.descripcion, v.carga.bultos ?? '', v.carga.pesoKg]],
  );
  pdf.firmas(doc, ['Despachado por', 'Chofer', 'Recibido por']);
  return pdf.terminar(doc);
}
