// pdf-orden.ts → orden de trabajo / presupuesto del taller en PDF.

import type { PdfService, EmpresaPdf } from '../../comun/servicios/pdf.service.js';
import { dinero, fechaCorta } from '../../comun/utilidades.js';
import type { OrdenMantenimiento } from './esquemas/orden-mantenimiento.esquema.js';

export async function pdfOrdenMantenimiento(pdf: PdfService, empresa: EmpresaPdf, o: OrdenMantenimiento, equipo: string, cliente?: string): Promise<Buffer> {
  const doc = pdf.crear(`Orden ${o.codigo}`);
  const titulo = o.tipo === 'SERVICIO_CLIENTE' && !o.fin ? 'PRESUPUESTO DE TALLER' : 'ORDEN DE MANTENIMIENTO';
  await pdf.encabezado(doc, empresa, titulo, o.codigo, { lineas: [`Tipo: ${o.tipo.replace('_', ' ').toLowerCase()}`, `Estado: ${o.estado}`, `Prioridad: ${o.prioridad}`] });
  pdf.cuadroDatos(doc, 'Equipo', [
    ['Equipo', equipo],
    ['Cliente', cliente ?? 'Activo propio'],
    ['Técnico', o.tecnico?.nombre ?? 'Por asignar'],
    ['Programada', fechaCorta(o.programada)],
    ['Inicio', fechaCorta(o.inicio)],
    ['Fin', fechaCorta(o.fin)],
  ]);
  if (o.falla) pdf.parrafo(doc, `Falla reportada por ${o.falla.reportadoPor} el ${fechaCorta(o.falla.fecha)}: ${o.falla.descripcion}`);
  if (o.tarea) pdf.parrafo(doc, `Tarea preventiva: ${o.tarea}`);
  if (o.checklist.length) {
    pdf.subtitulo(doc, 'Trabajos realizados');
    pdf.tabla(doc, [{ titulo: 'Tarea', ancho: 430 }, { titulo: 'Hecha', ancho: 85, alinear: 'center' }], o.checklist.map((c) => [c.tarea, c.hecha ? 'Sí' : 'No']));
  }
  pdf.subtitulo(doc, 'Repuestos');
  pdf.tabla(
    doc,
    [
      { titulo: 'Repuesto', ancho: 280 },
      { titulo: 'Cant.', ancho: 60, alinear: 'right' },
      { titulo: 'Costo unit.', ancho: 85, alinear: 'right' },
      { titulo: 'Total', ancho: 90, alinear: 'right' },
    ],
    o.repuestos.length ? o.repuestos.map((r) => [r.nombre, r.cantidad, dinero(r.costoUnitario), dinero(r.cantidad * r.costoUnitario)]) : [['Sin repuestos', '', '', '']],
  );
  pdf.totales(doc, [
    ['Repuestos', dinero(o.costos?.costoRepuestos ?? 0)],
    [`Mano de obra (${o.horasManoObra} h × ${dinero(o.costoHora)})`, dinero(o.costos?.costoManoObra ?? 0)],
    [o.presupuesto ? 'PRESUPUESTO' : 'COSTO TOTAL', dinero(o.presupuesto?.total ?? o.costos?.costoTotal ?? 0)],
  ]);
  if (o.observaciones) pdf.parrafo(doc, `Observaciones: ${o.observaciones}`);
  pdf.firmas(doc, ['Técnico', o.cliente ? 'Cliente' : 'Jefe de taller']);
  return pdf.terminar(doc);
}
