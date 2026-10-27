// calidad.service.ts → evalúa los lotes de grano (RN-06/07) y libera el producto terminado (RN-11).

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoteGrano } from '../poscosecha/esquemas/lote-grano.esquema.js';
import { Producto } from '../productos/esquemas/producto.esquema.js';
import { LoteProducto } from '../inventario/esquemas/lote-producto.esquema.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { AcopioService } from '../acopio/acopio.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { PdfService } from '../../comun/servicios/pdf.service.js';
import { calcularGradoCacao, calcularGradoCafe, destinoSugerido, evaluarProductoTerminado, puedeEvaluar, validarPruebaCorte } from './calidad.reglas.js';
import { pdfCertificado } from './pdf-certificado.js';
import type { Grado } from '../../comun/constantes.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { CataDto, ControlProductoDto, EvaluarGranoDto } from './dto/calidad.dto.js';

@Injectable()
export class CalidadService {
  constructor(
    @InjectModel(LoteGrano.name) private readonly lotesGrano: Model<LoteGrano>,
    @InjectModel(Producto.name) private readonly productos: Model<Producto>,
    @InjectModel(LoteProducto.name) private readonly lotesProducto: Model<LoteProducto>,
    private readonly inventario: InventarioService,
    private readonly acopio: AcopioService,
    private readonly configuracion: ConfiguracionService,
    private readonly pdf: PdfService,
  ) {}

  // pendientes(): lo que espera a Calidad: grano SECO sin evaluar y lotes de producción sin liberar.
  async pendientes() {
    const grano = await this.lotesGrano.find({ estado: 'SECO' }).sort({ fechaRecepcion: 1 }).lean().exec();
    const productoTerminado = await this.inventario.listarLotes({ pendientesCalidad: true });
    return { grano, productoTerminado };
  }

  // historial(): lotes evaluados (para el ranking y la tasa de rechazo).
  evaluados(limite = 200) {
    return this.lotesGrano.find({ 'calidad.grado': { $exists: true } }).sort({ 'calidad.fecha': -1 }).limit(limite).lean().exec();
  }

  noConformidades(abiertas = true) {
    return this.lotesGrano.find(abiertas ? { 'noConformidad.cerrada': false } : { noConformidad: { $exists: true } }).sort({ 'noConformidad.fecha': -1 }).lean().exec();
  }

  // productoGrano(): la variante de GRANO del catálogo que corresponde al lote (cultivo + variedad + grado).
  private async productoGrano(cultivo: string, variedad: string, grado: Grado) {
    const exacto = await this.productos.findOne({ tipo: 'GRANO', cultivo, variedad, grado }).lean().exec();
    if (exacto) return exacto;
    const parecido = await this.productos.findOne({ tipo: 'GRANO', cultivo, variedad }).lean().exec();
    if (!parecido) throw new BadRequestException(`No existe en el catálogo un producto de grano ${cultivo} ${variedad}; créalo primero`);
    return parecido;
  }

  // evaluarGrano(): calcula el grado; si aprueba, el grano entra a la bodega de materia prima.
  async evaluarGrano(id: string, dto: EvaluarGranoDto, usuario: UsuarioToken) {
    if (!puedeEvaluar(usuario)) throw new ForbiddenException('RN-07: solo Calidad y Gerencia evalúan lotes');
    const lote = await this.lotesGrano.findById(id).lean().exec();
    if (!lote) throw new NotFoundException('Lote no encontrado');
    if (lote.estado !== 'SECO') throw new BadRequestException(`Solo se evalúan lotes SECOS (este está ${lote.estado})`);
    const config = await this.configuracion.obtener();

    let resultado: { grado: Grado; motivos: string[] };
    if (lote.cultivo === 'CACAO') {
      const prueba = {
        bienFermentados: dto.bienFermentados ?? 0,
        violetas: dto.violetas ?? 0,
        pizarrosos: dto.pizarrosos ?? 0,
        mohosos: dto.mohosos ?? 0,
        insectados: dto.insectados ?? 0,
        germinados: dto.germinados ?? 0,
        humedad: dto.humedad,
        peso100Granos: dto.peso100Granos ?? 0,
      };
      const errorSuma = validarPruebaCorte(prueba);
      if (errorSuma) throw new BadRequestException(errorSuma);
      resultado = calcularGradoCacao(prueba, config.calidad.gradosCacao); // RN-06
    } else {
      resultado = calcularGradoCafe({ defectos300g: dto.defectos300g ?? 0, puntajeTaza: dto.puntajeTaza ?? 0, humedad: dto.humedad }, config.calidad.gradosCafe);
    }

    const calidad = { ...dto, fecha: new Date(), usuario: usuario.nombre, grado: resultado.grado, motivos: resultado.motivos, destino: destinoSugerido(resultado.grado) };
    const evento = { fecha: new Date(), evento: 'CALIDAD', detalle: `Grado ${resultado.grado}${resultado.motivos.length ? ` (${resultado.motivos.join('; ')})` : ''}`, usuario: usuario.nombre };

    if (resultado.grado === 'RECHAZO') {
      // No conformidad: el lote queda bloqueado hasta decidir devolución, reproceso o descarte.
      await this.lotesGrano.updateOne({ _id: id }, { $set: { estado: 'RECHAZADO', calidad, noConformidad: { causa: resultado.motivos.join('; '), fecha: new Date(), cerrada: false, usuario: usuario.nombre } }, $push: { historial: evento } }).exec();
    } else {
      // Aprobado → entra a bodega como producto GRANO, con su grado y costo por kg.
      const producto = await this.productoGrano(lote.cultivo, lote.variedad, resultado.grado);
      const bodega = await this.inventario.bodegaPorTipo('MATERIA_PRIMA');
      const loteStock = await this.inventario.entrada({
        productoId: String(producto._id),
        bodegaId: String(bodega._id),
        cantidad: lote.kgSeco,
        costoUnitario: lote.costoKgSeco,
        tipo: lote.origen === 'PROPIO' ? 'ENTRADA_COSECHA' : 'ENTRADA_ACOPIO',
        codigoLote: lote.codigo,
        fechaElaboracion: new Date(),
        liberado: true,
        grado: resultado.grado,
        origen: { tipo: lote.origen === 'PROPIO' ? 'COSECHA' : 'ACOPIO', loteGrano: id },
        documento: { tipo: 'LOTE_GRANO', numero: lote.codigo, id },
        usuario: usuario.nombre,
      });
      await this.lotesGrano.updateOne({ _id: id }, { $set: { estado: 'ALMACENADO', calidad, loteProducto: loteStock._id }, $push: { historial: [evento, { fecha: new Date(), evento: 'BODEGA', detalle: `${lote.kgSeco} kg a ${bodega.nombre} como ${producto.sku}`, usuario: usuario.nombre }] } }).exec();
      if (lote.origen === 'COMPRA' && lote.liquidacion && resultado.grado === 'PREMIUM') await this.acopio.bonoPremium(String(lote.liquidacion));
    }
    if (lote.productor?.id && dto.bienFermentados !== undefined) await this.acopio.actualizarCalificacion(lote.productor.id, dto.bienFermentados);
    return this.lotesGrano.findById(id).lean().exec();
  }

  async catar(id: string, dto: CataDto, usuario: UsuarioToken) {
    if (!puedeEvaluar(usuario)) throw new ForbiddenException('RN-07: solo Calidad y Gerencia catan');
    const r = await this.lotesGrano.findOneAndUpdate({ _id: id, 'calidad.grado': { $exists: true } }, { $set: { 'calidad.cata': dto } }, { returnDocument: 'after' }).lean().exec();
    if (!r) throw new BadRequestException('Primero evalúa el lote');
    return r;
  }

  // cerrarNoConformidad(): REPROCESO vuelve a secar; DEVOLUCIÓN o DESCARTE cierran el caso.
  async cerrarNoConformidad(id: string, destino: string, observacion: string | undefined, usuario: UsuarioToken) {
    const lote = await this.lotesGrano.findById(id).lean().exec();
    if (!lote?.noConformidad || lote.noConformidad.cerrada) throw new BadRequestException('El lote no tiene una no conformidad abierta');
    const set: Record<string, unknown> = { 'noConformidad.cerrada': true, 'noConformidad.destino': destino, 'noConformidad.cierre': new Date() };
    if (destino === 'REPROCESO') {
      set.estado = 'SECANDO';
      set['secado.fin'] = null;
    }
    await this.lotesGrano.updateOne({ _id: id }, { $set: set, $push: { historial: { fecha: new Date(), evento: 'NO_CONFORMIDAD', detalle: `Destino: ${destino}${observacion ? ` · ${observacion}` : ''}`, usuario: usuario.nombre } } }).exec();
    return this.lotesGrano.findById(id).lean().exec();
  }

  // controlProductoTerminado(): RN-11 — un lote de producción solo se vende si pasa el control.
  async controlProductoTerminado(loteProductoId: string, dto: ControlProductoDto, usuario: UsuarioToken) {
    if (!puedeEvaluar(usuario)) throw new ForbiddenException('RN-07: solo Calidad y Gerencia liberan lotes');
    const lote = await this.lotesProducto.findById(loteProductoId).populate('producto').lean().exec();
    if (!lote) throw new NotFoundException('Lote de producto no encontrado');
    const producto = lote.producto as unknown as Producto;
    const r = evaluarProductoTerminado({ pesoNominalG: producto.pesoNetoG || dto.pesoPromedioG, pesoPromedioG: dto.pesoPromedioG, selladoOk: dto.selladoOk, etiquetaOk: dto.etiquetaOk, temperaturaTemplado: dto.temperaturaTemplado });
    // El mismo código de lote puede estar en varias bodegas: se libera en todas.
    const todos = await this.lotesProducto.find({ producto: lote.producto, codigo: lote.codigo }).select('_id').lean().exec();
    for (const l of todos) {
      await this.inventario.cambiarLiberacion(String(l._id), {
        liberado: r.liberado,
        bloqueado: !r.liberado,
        motivoBloqueo: r.liberado ? undefined : r.motivos.join('; '),
        controlCalidad: { fecha: new Date(), usuario: usuario.nombre, pesoNominalG: producto.pesoNetoG, ...dto, liberado: r.liberado, motivos: r.motivos },
      });
    }
    if (dto.tipoEmpaque) await this.lotesProducto.updateMany({ codigo: lote.codigo }, { $set: { tipoEmpaque: dto.tipoEmpaque } }).exec();
    return { codigo: lote.codigo, ...r };
  }

  async certificado(id: string) {
    const lote = await this.lotesGrano.findById(id).lean().exec();
    if (!lote?.calidad) throw new BadRequestException('El lote aún no tiene análisis de calidad');
    const config = await this.configuracion.obtener();
    return { lote, buffer: await pdfCertificado(this.pdf, config.empresa, lote, config.empresa.urlWeb) };
  }
}
