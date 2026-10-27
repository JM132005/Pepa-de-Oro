// produccion.service.ts → recetas, órdenes de producción, costos, simulador y etiquetas.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { Model } from 'mongoose';
import { Receta } from './esquemas/receta.esquema.js';
import { OrdenProduccion } from './esquemas/orden-produccion.esquema.js';
import { Producto } from '../productos/esquemas/producto.esquema.js';
import { Activo } from '../equipos/esquemas/activo.esquema.js';
import { LoteProducto } from '../inventario/esquemas/lote-producto.esquema.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { ContadoresService } from '../../comun/servicios/contadores.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { PdfService } from '../../comun/servicios/pdf.service.js';
import { enTransaccion } from '../../comun/transaccion.js';
import { costoUnitario, explotarReceta, faltantes, mermaProceso, requerimientos, verificarInicio, type Receta as RecetaRegla } from './produccion.reglas.js';
import { verificarActivoUsable } from '../equipos/equipos.reglas.js';
import { margen } from '../productos/productos.reglas.js';
import { redondear, sumarDias } from '../../comun/utilidades.js';
import { pdfEtiquetas } from './pdf-etiqueta.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { CerrarOrdenDto, CrearOrdenDto, CrearRecetaDto, ActualizarRecetaDto } from './dto/produccion.dto.js';

// Costo de una hora de mano de obra en planta (jornal de $28 ÷ 8 h).
const COSTO_HORA_MANO_OBRA = 3.5;
// Bodegas de donde se toman los componentes, en orden.
const BODEGAS_PRODUCCION = ['MATERIA_PRIMA', 'INSUMOS_PLANTA', 'PRODUCTO_TERMINADO'];

@Injectable()
export class ProduccionService {
  constructor(
    @InjectConnection() private readonly conexion: Connection,
    @InjectModel(Receta.name) private readonly recetas: Model<Receta>,
    @InjectModel(OrdenProduccion.name) private readonly ordenes: Model<OrdenProduccion>,
    @InjectModel(Producto.name) private readonly productos: Model<Producto>,
    @InjectModel(Activo.name) private readonly activos: Model<Activo>,
    @InjectModel(LoteProducto.name) private readonly lotes: Model<LoteProducto>,
    private readonly inventario: InventarioService,
    private readonly contadores: ContadoresService,
    private readonly configuracion: ConfiguracionService,
    private readonly pdf: PdfService,
  ) {}

  // ─────────── Recetas ───────────
  listarRecetas() {
    return this.recetas.find().populate('producto', 'sku nombre unidad').sort({ nombre: 1 }).lean().exec();
  }

  async receta(id: string) {
    const r = await this.recetas.findById(id).populate('producto').lean().exec();
    if (!r) throw new NotFoundException('Receta no encontrada');
    return r;
  }

  // completarComponentes(): copia nombre y unidad de cada componente desde el catálogo.
  private async completarComponentes(componentes: { producto: string; cantidad: number }[]) {
    const lista = [];
    for (const c of componentes) {
      const p = await this.productos.findById(c.producto).lean().exec();
      if (!p) throw new NotFoundException('Componente no encontrado en el catálogo');
      lista.push({ producto: c.producto, nombre: p.nombre, cantidad: c.cantidad, unidad: p.unidad });
    }
    return lista;
  }

  async crearReceta(dto: CrearRecetaDto) {
    const producto = await this.productos.findById(dto.producto).lean().exec();
    if (!producto) throw new NotFoundException('Producto no encontrado');
    if (await this.recetas.exists({ producto: dto.producto })) throw new BadRequestException('Ese producto ya tiene receta; edítala');
    return this.recetas.create({ ...dto, nombre: dto.nombre ?? producto.nombre, componentes: await this.completarComponentes(dto.componentes) });
  }

  async actualizarReceta(id: string, dto: ActualizarRecetaDto) {
    const cambios: Record<string, unknown> = { ...dto };
    if (dto.componentes) cambios.componentes = await this.completarComponentes(dto.componentes);
    const r = await this.recetas.findByIdAndUpdate(id, cambios, { returnDocument: 'after' }).lean().exec();
    if (!r) throw new NotFoundException('Receta no encontrada');
    return r;
  }

  // comoRegla(): convierte la receta de la base al formato que usan las reglas puras.
  private comoRegla(r: Receta): RecetaRegla {
    return {
      productoId: String(r.producto),
      cantidadBase: r.cantidadBase,
      componentes: r.componentes.map((c) => ({ productoId: String(c.producto), nombre: c.nombre, cantidad: c.cantidad, unidad: c.unidad })),
      horasMaquina: r.horasMaquina,
      manoObraHoras: r.manoObraHoras,
    };
  }

  // ─────────── Verificación (RN-08 y RN-09) ───────────
  async verificar(productoId: string, cantidad: number) {
    const receta = await this.recetas.findOne({ producto: productoId, activa: true }).lean().exec();
    if (!receta) throw new BadRequestException('El producto no tiene receta activa');
    const req = requerimientos(this.comoRegla(receta), cantidad);
    // "disponible" solo cuenta lotes liberados y sin vencer → el grano no aprobado NO cuenta (RN-08).
    const stock = await this.inventario.resumenStock({ productoIds: req.map((r) => r.productoId) });
    const disponibles = Object.fromEntries(stock.map((s) => [s.productoId, s.disponible]));
    const faltan = faltantes(req, disponibles);
    return { receta, requerimientos: req.map((r) => ({ ...r, disponible: disponibles[r.productoId] ?? 0 })), faltantes: faltan, puedeIniciar: faltan.length === 0, mensaje: verificarInicio(faltan) };
  }

  // ─────────── Órdenes ───────────
  listarOrdenes(f: { estado?: string; desde?: string; hasta?: string }) {
    const q: Record<string, unknown> = {};
    if (f.estado) q.estado = { $in: f.estado.split(',') };
    if (f.desde || f.hasta) q.fechaProgramada = { ...(f.desde ? { $gte: new Date(f.desde) } : {}), ...(f.hasta ? { $lte: new Date(`${f.hasta}T23:59:59`) } : {}) };
    return this.ordenes.find(q).populate('producto', 'sku nombre unidad').populate('maquina', 'codigo nombre').sort({ fechaProgramada: -1 }).limit(300).lean().exec();
  }

  async orden(id: string) {
    const o = await this.ordenes.findById(id).populate('producto').populate('receta').populate('maquina', 'codigo nombre estado').lean().exec();
    if (!o) throw new NotFoundException('Orden no encontrada');
    return o;
  }

  private async validarMaquina(maquinaId?: string) {
    if (!maquinaId) return;
    const m = await this.activos.findById(maquinaId).lean().exec();
    if (!m) throw new NotFoundException('Máquina no encontrada');
    const error = verificarActivoUsable(m); // RN-24: una máquina en mantenimiento no se asigna
    if (error) throw new BadRequestException(error);
  }

  async crearOrden(dto: CrearOrdenDto, usuario: UsuarioToken) {
    const receta = await this.recetas.findOne({ producto: dto.producto, activa: true }).lean().exec();
    if (!receta) throw new BadRequestException('El producto no tiene receta activa');
    await this.validarMaquina(dto.maquina);
    const req = requerimientos(this.comoRegla(receta), dto.cantidadPlanificada);
    return this.ordenes.create({
      codigo: await this.contadores.codigoAnual('OP'),
      producto: dto.producto,
      receta: String(receta._id),
      cantidadPlanificada: dto.cantidadPlanificada,
      fechaProgramada: new Date(dto.fechaProgramada),
      maquina: dto.maquina,
      responsable: usuario.nombre,
      requerimientos: req.map((r) => ({ producto: r.productoId, nombre: r.nombre, unidad: r.unidad, requerido: r.requerido })),
      observaciones: dto.observaciones,
    });
  }

  // iniciar(): RN-09 + RN-08 y reserva de cada insumo (consumo planificado).
  async iniciar(id: string, usuario: UsuarioToken) {
    const orden = await this.ordenes.findById(id).lean().exec();
    if (!orden) throw new NotFoundException('Orden no encontrada');
    if (orden.estado !== 'PLANIFICADA') throw new BadRequestException(`La orden está ${orden.estado}`);
    await this.validarMaquina(orden.maquina ? String(orden.maquina) : undefined);
    const v = await this.verificar(String(orden.producto), orden.cantidadPlanificada);
    if (!v.puedeIniciar) throw new BadRequestException(v.mensaje);
    const reservas: OrdenProduccion['reservas'] = [];
    try {
      for (const r of orden.requerimientos) {
        const hechas = await this.inventario.reservar(r.producto, r.requerido, { soloVendibles: true, bodegasPreferidas: BODEGAS_PRODUCCION });
        reservas.push(...hechas.map((h) => ({ producto: r.producto, loteId: h.loteId, codigo: h.codigo, cantidad: h.cantidad, costoUnitario: h.costoUnitario })));
      }
    } catch (error) {
      await this.inventario.liberarReserva(reservas);
      throw error;
    }
    if (orden.maquina) await this.activos.updateOne({ _id: orden.maquina }, { $set: { estado: 'EN_USO' } }).exec();
    return this.ordenes.findByIdAndUpdate(id, { $set: { estado: 'EN_PROCESO', reservas, fechaInicio: new Date(), responsable: usuario.nombre } }, { returnDocument: 'after' }).lean().exec();
  }

  // cerrar(): RN-10 — se consume lo REAL, se calcula el costo y nace el lote de producto (sin liberar).
  async cerrar(id: string, dto: CerrarOrdenDto, usuario: UsuarioToken) {
    const orden = await this.ordenes.findById(id).lean().exec();
    if (!orden) throw new NotFoundException('Orden no encontrada');
    if (orden.estado !== 'EN_PROCESO') throw new BadRequestException('Solo se cierran órdenes en proceso');
    if (dto.cantidadBuena > dto.cantidadProducida) throw new BadRequestException('Las unidades buenas no pueden superar las producidas');
    const producto = await this.productos.findById(orden.producto).lean().exec();
    const receta = await this.recetas.findById(orden.receta).lean().exec();
    const maquina = orden.maquina ? await this.activos.findById(orden.maquina).lean().exec() : null;

    return enTransaccion(this.conexion, async () => {
      const documento = { tipo: 'ORDEN_PRODUCCION', numero: orden.codigo, id };
      const consumos: OrdenProduccion['consumos'] = [];
      for (const r of orden.requerimientos) {
        const real = dto.consumoReal?.find((c) => c.producto === r.producto)?.cantidad ?? r.requerido;
        const reservasProducto = orden.reservas.filter((x) => x.producto === r.producto);
        // 1) Se usa primero lo reservado (hasta lo consumido); 2) lo reservado que sobró se libera; 3) si faltó, sale más por FEFO.
        let porConsumir = real;
        const asignacion: { loteId: string; cantidad: number }[] = [];
        const sobrante: { loteId: string; cantidad: number }[] = [];
        for (const res of reservasProducto) {
          const toma = Math.min(res.cantidad, porConsumir);
          if (toma > 0) asignacion.push({ loteId: res.loteId, cantidad: redondear(toma, 3) });
          if (res.cantidad - toma > 0) sobrante.push({ loteId: res.loteId, cantidad: redondear(res.cantidad - toma, 3) });
          porConsumir = redondear(porConsumir - toma, 3);
        }
        if (sobrante.length) await this.inventario.liberarReserva(sobrante);
        const salidas = asignacion.length ? await this.inventario.salida({ productoId: r.producto, cantidad: real - porConsumir, tipo: 'SALIDA_PRODUCCION', asignacion, usarReservado: true, documento, usuario: usuario.nombre }) : [];
        if (porConsumir > 0) salidas.push(...(await this.inventario.salida({ productoId: r.producto, cantidad: porConsumir, tipo: 'SALIDA_PRODUCCION', soloVendibles: true, bodegasPreferidas: BODEGAS_PRODUCCION, documento, usuario: usuario.nombre })));
        consumos.push(...salidas.map((s) => ({ producto: r.producto, nombre: r.nombre, loteId: s.loteId, codigo: s.codigo, cantidad: s.cantidad, costoUnitario: s.costoUnitario })));
      }

      // Costo de producción (RN-10)
      const factor = orden.cantidadPlanificada / (receta?.cantidadBase || 1);
      const horasMaquina = dto.horasMaquina ?? redondear((receta?.horasMaquina ?? 0) * factor, 2);
      const manoObraHoras = dto.manoObraHoras ?? redondear((receta?.manoObraHoras ?? 0) * factor, 2);
      const costoMateriales = redondear(consumos.reduce((s, c) => s + c.cantidad * c.costoUnitario, 0));
      const costo = costoUnitario({ costoMateriales, manoObraHoras, costoHoraManoObra: COSTO_HORA_MANO_OBRA, horasMaquina, costoHoraMaquina: maquina?.costoHora ?? 0, unidadesBuenas: dto.cantidadBuena });

      // Nace el lote de producto terminado: PT-AAAAMMDD-NN, en la bodega de producto terminado, SIN liberar (RN-11).
      const codigo = await this.contadores.codigoDiario('PT');
      const bodega = await this.inventario.bodegaPorTipo('PRODUCTO_TERMINADO');
      const hoy = new Date();
      const vencimiento = producto!.vidaUtilDias > 0 ? sumarDias(hoy, producto!.vidaUtilDias) : undefined;
      const lote = await this.inventario.entrada({
        productoId: String(orden.producto),
        bodegaId: String(bodega._id),
        cantidad: dto.cantidadBuena,
        costoUnitario: costo.costoUnitario,
        tipo: 'ENTRADA_PRODUCCION',
        codigoLote: codigo,
        fechaElaboracion: hoy,
        vencimiento,
        // Los semielaborados (nibs, pasta) se usan dentro de la planta: no necesitan control de venta.
        liberado: producto!.tipo === 'SEMIELABORADO',
        origen: { tipo: 'PRODUCCION', ordenProduccion: id },
        documento,
        usuario: usuario.nombre,
      });
      if (dto.tipoEmpaque) await this.lotes.updateOne({ _id: lote._id }, { $set: { tipoEmpaque: dto.tipoEmpaque } }).exec();
      if (maquina) await this.activos.updateOne({ _id: maquina._id }, { $set: { estado: 'DISPONIBLE' }, $inc: { horometro: horasMaquina } }).exec();

      return this.ordenes
        .findByIdAndUpdate(
          id,
          {
            $set: {
              estado: 'TERMINADA',
              consumos,
              cantidadProducida: dto.cantidadProducida,
              cantidadBuena: dto.cantidadBuena,
              mermaPct: mermaProceso(orden.cantidadPlanificada, dto.cantidadBuena),
              horasMaquinaReales: horasMaquina,
              manoObraHorasReales: manoObraHoras,
              costos: { materiales: costoMateriales, manoObra: redondear(manoObraHoras * COSTO_HORA_MANO_OBRA), maquina: redondear(horasMaquina * (maquina?.costoHora ?? 0)), total: costo.costoTotal, unitario: costo.costoUnitario },
              loteProducto: { id: String(lote._id), codigo, vencimiento },
              fechaCierre: hoy,
              tipoEmpaque: dto.tipoEmpaque,
              observaciones: dto.observaciones ?? orden.observaciones,
            },
          },
          { returnDocument: 'after' },
        )
        .lean()
        .exec();
    });
  }

  async anular(id: string) {
    const orden = await this.ordenes.findById(id).lean().exec();
    if (!orden) throw new NotFoundException('Orden no encontrada');
    if (['TERMINADA', 'ANULADA'].includes(orden.estado)) throw new BadRequestException(`La orden está ${orden.estado}`);
    await this.inventario.liberarReserva(orden.reservas);
    if (orden.maquina && orden.estado === 'EN_PROCESO') await this.activos.updateOne({ _id: orden.maquina }, { $set: { estado: 'DISPONIBLE' } }).exec();
    return this.ordenes.findByIdAndUpdate(id, { $set: { estado: 'ANULADA', reservas: [] } }, { returnDocument: 'after' }).lean().exec();
  }

  // tablero(): órdenes de una semana agrupadas por máquina (planificación).
  async tablero(desde: Date) {
    const hasta = sumarDias(desde, 7);
    const ordenes = await this.ordenes.find({ fechaProgramada: { $gte: desde, $lt: hasta }, estado: { $ne: 'ANULADA' } }).populate('producto', 'nombre sku').populate('maquina', 'codigo nombre').sort({ fechaProgramada: 1 }).lean().exec();
    const maquinas = await this.activos.find({ tipo: { $in: ['TOSTADORA', 'DESCASCARILLADORA', 'MOLINO', 'PRENSA', 'CONCHADORA', 'TEMPLADORA', 'EMPACADORA'] } }).select('codigo nombre estado tipo').lean().exec();
    return { desde, hasta, maquinas, ordenes };
  }

  // ─────────── Simulador «¿qué pasa si?» ───────────
  // "Vender 2 000 barras de 70 %" → cuánto grano, cuántas horas de máquina, qué costo y qué margen.
  async simular(productoId: string, cantidad: number) {
    const producto = await this.productos.findById(productoId).lean().exec();
    if (!producto) throw new NotFoundException('Producto no encontrado');
    const todas = await this.recetas.find({ activa: true }).lean().exec();
    const mapa = Object.fromEntries(todas.map((r) => [String(r.producto), this.comoRegla(r)]));
    if (!mapa[productoId]) throw new BadRequestException('El producto no tiene receta');
    const { materiales, horas } = explotarReceta(productoId, cantidad, mapa);
    const ids = Object.keys(materiales);
    const prods = await this.productos.find({ _id: { $in: ids } }).lean().exec();
    const stock = await this.inventario.resumenStock({ productoIds: ids });
    const detalle = ids.map((pid) => {
      const p = prods.find((x) => String(x._id) === pid);
      const s = stock.find((x) => x.productoId === pid);
      const necesita = materiales[pid];
      return { productoId: pid, nombre: p?.nombre ?? pid, unidad: p?.unidad, necesita, disponible: s?.disponible ?? 0, falta: redondear(Math.max(0, necesita - (s?.disponible ?? 0)), 3), costo: redondear(necesita * (p?.costoPromedio ?? 0)) };
    });
    const costoMateriales = redondear(detalle.reduce((s, d) => s + d.costo, 0));
    const costoHoras = redondear(horas.manoObra * COSTO_HORA_MANO_OBRA + horas.maquina * 4);
    const costoTotal = redondear(costoMateriales + costoHoras);
    const ingreso = redondear(cantidad * producto.precioMenor);
    return { producto: producto.nombre, cantidad, materiales: detalle, horas, costoMateriales, costoHoras, costoTotal, costoUnitario: redondear(costoTotal / cantidad, 4), ingresoPorMenor: ingreso, margenPct: margen(producto.precioMenor, costoTotal / cantidad) };
  }

  // etiquetas(): PDF con 8 etiquetas del lote de producto terminado.
  async etiquetas(loteId: string) {
    const lote = await this.lotes.findById(loteId).populate('producto').lean().exec();
    if (!lote) throw new NotFoundException('Lote no encontrado');
    const config = await this.configuracion.obtener();
    return { lote, buffer: await pdfEtiquetas(this.pdf, config.empresa, lote.producto as unknown as Producto, lote, config.empresa.urlWeb) };
  }
}
