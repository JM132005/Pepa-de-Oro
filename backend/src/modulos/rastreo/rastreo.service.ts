// rastreo.service.ts → "Rastrea tu cacao": TRAZABILIDAD HACIA ATRÁS.
//
// Desde el código impreso en la etiqueta (PT-20261019-03) se recorre la cadena al revés:
//   lote de producto → orden de producción → lotes consumidos (pasta, nibs...) → lote de grano
//   → hacienda y parcela (propio) o productor (comprado), con su fermentación, secado y calidad.
// Es RECURSIVO: un chocolate consume pasta, la pasta consumió nibs y los nibs consumieron grano.

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoteProducto } from '../inventario/esquemas/lote-producto.esquema.js';
import { LoteGrano } from '../poscosecha/esquemas/lote-grano.esquema.js';
import { OrdenProduccion } from '../produccion/esquemas/orden-produccion.esquema.js';
import { Producto } from '../productos/esquemas/producto.esquema.js';
import { Hacienda } from '../campo/esquemas/hacienda.esquema.js';
import { eventoPublico, nombreProductorPublico, type OrigenPublico } from './rastreo.vista.js';

export interface Etapa {
  fecha: Date;
  titulo: string;
  detalle: string;
  lote: string;
}

@Injectable()
export class RastreoService {
  constructor(
    @InjectModel(LoteProducto.name) private readonly lotes: Model<LoteProducto>,
    @InjectModel(LoteGrano.name) private readonly lotesGrano: Model<LoteGrano>,
    @InjectModel(OrdenProduccion.name) private readonly ordenes: Model<OrdenProduccion>,
    @InjectModel(Producto.name) private readonly productos: Model<Producto>,
    @InjectModel(Hacienda.name) private readonly haciendas: Model<Hacienda>,
  ) {}

  async rastrear(codigoEntrada: string) {
    const codigo = codigoEntrada.trim().toUpperCase();
    const etapas: Etapa[] = [];
    const origenes: OrigenPublico[] = [];
    const calidades: { lote: string; grado: string; fermentados?: number; notas?: string[]; puntaje?: number }[] = [];
    const visitados = new Set<string>();

    // agregarLoteGrano(): historia de un lote de grano y su origen (incluye lotes combinados).
    const agregarLoteGrano = async (lg: LoteGrano) => {
      if (visitados.has(lg.codigo)) return;
      visitados.add(lg.codigo);
      for (const h of lg.historial) etapas.push({ fecha: h.fecha, lote: lg.codigo, ...eventoPublico(h.evento, h.detalle) });
      if (lg.calidad) calidades.push({ lote: lg.codigo, grado: lg.calidad.grado, fermentados: lg.calidad.bienFermentados, notas: lg.calidad.cata?.notas, puntaje: lg.calidad.cata?.puntaje });
      if (lg.lotesOrigen?.length) {
        const hijos = await this.lotesGrano.find({ codigo: { $in: lg.lotesOrigen } }).lean().exec();
        for (const h of hijos) await agregarLoteGrano(h);
        return;
      }
      if (lg.origen === 'PROPIO' && lg.hacienda) {
        const hacienda = await this.haciendas.findById(lg.hacienda.id).lean().exec();
        origenes.push({ tipo: 'HACIENDA_PROPIA', nombre: `Hacienda ${lg.hacienda.nombre}`, canton: hacienda?.canton, variedad: lg.variedad, parcela: lg.parcela?.codigo, ubicacion: hacienda?.ubicacion, codigoLote: lg.codigo });
      } else {
        origenes.push({ tipo: 'PRODUCTOR_ASOCIADO', nombre: nombreProductorPublico(lg.productor?.canton), canton: lg.productor?.canton, variedad: lg.variedad, codigoLote: lg.codigo });
      }
    };

    // agregarLoteProducto(): si salió de una orden, baja a lo que esa orden consumió.
    const agregarLoteProducto = async (codigoLote: string, profundidad = 0): Promise<void> => {
      if (visitados.has(codigoLote) || profundidad > 6) return;
      visitados.add(codigoLote);
      const lp = await this.lotes.findOne({ codigo: codigoLote }).populate('producto', 'nombre').lean().exec();
      if (!lp) return;
      const nombre = (lp.producto as unknown as Producto)?.nombre;
      if (lp.origen?.loteGrano) {
        const lg = await this.lotesGrano.findById(lp.origen.loteGrano).lean().exec();
        if (lg) await agregarLoteGrano(lg);
        return;
      }
      if (lp.origen?.ordenProduccion) {
        const orden = await this.ordenes.findById(lp.origen.ordenProduccion).lean().exec();
        if (!orden) return;
        etapas.push({ fecha: orden.fechaCierre ?? lp.fechaElaboracion ?? new Date(), lote: codigoLote, titulo: profundidad === 0 ? 'Elaboración y empaque' : 'Transformación', detalle: `${nombre} · orden ${orden.codigo}${lp.tipoEmpaque ? ` · empaque ${lp.tipoEmpaque}` : ''}` });
        const codigos = [...new Set(orden.consumos.map((c) => c.codigo))];
        for (const c of codigos) await agregarLoteProducto(c, profundidad + 1);
      }
    };

    // ¿Qué código escribió el visitante?
    const loteProducto = await this.lotes.findOne({ codigo }).populate('producto').lean().exec();
    const loteGrano = loteProducto ? null : await this.lotesGrano.findOne({ codigo }).lean().exec();
    if (!loteProducto && !loteGrano) throw new NotFoundException(`No encontramos el lote ${codigo}. Revisa el código impreso en la etiqueta.`);

    let producto: { nombre: string; imagen?: string; descripcion?: string } | null = null;
    let fechas: { elaboracion?: Date; vencimiento?: Date } = {};
    if (loteProducto) {
      const p = loteProducto.producto as unknown as Producto;
      producto = { nombre: p.nombre, imagen: p.imagen, descripcion: p.descripcion };
      fechas = { elaboracion: loteProducto.fechaElaboracion, vencimiento: loteProducto.vencimiento };
      await agregarLoteProducto(codigo);
    } else {
      producto = { nombre: `${loteGrano!.cultivo === 'CACAO' ? 'Cacao' : 'Café'} ${loteGrano!.variedad} en grano` };
      await agregarLoteGrano(loteGrano!);
    }

    etapas.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    return {
      codigo,
      tipo: loteProducto ? 'PRODUCTO' : 'GRANO',
      producto,
      fechas,
      origenes,
      calidad: calidades,
      etapas,
      liberado: loteProducto ? loteProducto.liberado : loteGrano!.estado === 'ALMACENADO',
    };
  }
}
