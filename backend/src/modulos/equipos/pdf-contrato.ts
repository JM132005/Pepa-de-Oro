// pdf-contrato.ts → contrato de alquiler de maquinaria en PDF.

import type { PdfService, EmpresaPdf } from '../../comun/servicios/pdf.service.js';
import { dinero, fechaCorta } from '../../comun/utilidades.js';
import type { Activo } from './esquemas/activo.esquema.js';
import type { Alquiler } from './esquemas/alquiler.esquema.js';
import type { Cliente } from '../ventas/esquemas/cliente.esquema.js';
import { calcularAlquiler } from './equipos.reglas.js';

export async function pdfContrato(pdf: PdfService, empresa: EmpresaPdf, al: Alquiler, activo: Activo, cliente: Cliente): Promise<Buffer> {
  const doc = pdf.crear(`Contrato ${al.codigo}`);
  await pdf.encabezado(doc, empresa, 'CONTRATO DE ALQUILER', al.codigo, { lineas: [`Emitido: ${fechaCorta(new Date())}`, `Estado: ${al.estado}`] });
  const c = calcularAlquiler({ desde: al.desde, hasta: al.hasta, devolucion: al.devolucion?.fecha, tarifaDia: al.tarifaDia, conOperador: al.conOperador, tarifaOperadorDia: al.tarifaOperadorDia, garantia: al.garantia, danos: al.devolucion?.danos });
  pdf.cuadroDatos(doc, 'Arrendatario', [
    ['Nombre / razón social', cliente.nombre],
    ['Identificación', cliente.identificacion],
    ['Dirección', cliente.direccion ?? ''],
    ['Teléfono', cliente.telefono ?? ''],
  ]);
  pdf.cuadroDatos(doc, 'Equipo', [
    ['Activo', `${activo.codigo} · ${activo.nombre}`],
    ['Marca / modelo / año', `${activo.marca ?? ''} ${activo.modelo ?? ''} ${activo.anio ?? ''}`],
    ['Serie / placa', activo.placa ?? activo.serie ?? ''],
    ['Horómetro al entregar', String(al.entrega?.horometro ?? activo.horometro)],
    ['Lugar de trabajo', al.lugarTrabajo ?? ''],
    ['Operador', al.conOperador ? 'Incluido' : 'Por cuenta del arrendatario'],
  ]);
  pdf.tabla(
    doc,
    [
      { titulo: 'Concepto', ancho: 330 },
      { titulo: 'Valor', ancho: 185, alinear: 'right' },
    ],
    [
      ['Desde', fechaCorta(al.desde)],
      ['Hasta (pactado)', fechaCorta(al.hasta)],
      ['Días pactados', c.diasPactados],
      ['Tarifa por día (equipo)', dinero(al.tarifaDia)],
      ['Tarifa por día (operador)', al.conOperador ? dinero(al.tarifaOperadorDia) : '—'],
      ['Valor estimado (sin IVA)', dinero(c.diasPactados * c.porDia)],
      ['Garantía (depósito reembolsable)', dinero(al.garantia)],
    ],
  );
  pdf.subtitulo(doc, 'Condiciones');
  const condiciones = [
    '1. El arrendatario recibe el equipo en el estado descrito en el acta de entrega y se obliga a devolverlo en igual estado, salvo el desgaste normal por uso.',
    '2. Los días adicionales a los pactados se cobran a la misma tarifa diaria. El IVA (15 %) se agrega en la factura.',
    '3. Los daños causados por mal uso se descuentan de la garantía; si la superan, la diferencia se factura.',
    '4. El mantenimiento preventivo programado lo realiza exclusivamente el taller de Pepa de Oro.',
    '5. El equipo no puede subarrendarse ni trasladarse fuera del lugar de trabajo indicado sin autorización escrita.',
    al.condiciones ? `6. ${al.condiciones}` : '',
  ].filter(Boolean);
  for (const t of condiciones) pdf.parrafo(doc, t);
  if (al.entrega) pdf.parrafo(doc, `Acta de entrega (${fechaCorta(al.entrega.fecha)}): ${al.entrega.estadoEquipo}. ${al.entrega.observaciones ?? ''}`);
  if (al.devolucion) pdf.parrafo(doc, `Devolución (${fechaCorta(al.devolucion.fecha)}): horómetro ${al.devolucion.horometro}, daños ${dinero(al.devolucion.danos)}, días extra ${c.diasExtra}, garantía a devolver ${dinero(c.devolverGarantia)}.`);
  pdf.firmas(doc, [`${empresa.nombreComercial}\nArrendador`, `${cliente.nombre}\nArrendatario`]);
  return pdf.terminar(doc);
}
