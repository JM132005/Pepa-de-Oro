// poscosecha.service.ts → crea los lotes de grano y controla fermentación y secado.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoteGrano } from './esquemas/lote-grano.esquema.js';
import { Activo } from '../equipos/esquemas/activo.esquema.js';
import { ContadoresService } from '../../comun/servicios/contadores.service.js';
import { factorConversion, fermentacionVencida, mermaPct, puedeAvanzar, verificarCapacidad, verificarFinFermentacion, verificarFinSecado, verificarMezcla, volteoAtrasado } from './poscosecha.reglas.js';
import { verificarActivoUsable } from '../equipos/equipos.reglas.js';
import { redondear } from '../../comun/utilidades.js';
import type { EstadoLoteGrano, Variedad } from '../../comun/constantes.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';

// Datos para crear un lote (los envía acopio o campo).
export interface NuevoLote {
  origen: 'PROPIO' | 'COMPRA';
  cultivo: string;
  variedad: string;
  estadoEntrega: string;
  kgEntrada: number;
  humedadEntrada?: number;
  costoTotal?: number;
  productor?: { id: string; nombre: string; canton?: string };
  hacienda?: { id: string; nombre: string };
  parcela?: { id: string; codigo: string };
  cosecha?: string;
  liquidacion?: string;
  usuario: string;
  fecha?: Date;
}

@Injectable()
export class PoscosechaService {
  constructor(
    @InjectModel(LoteGrano.name) private readonly modelo: Model<LoteGrano>,
    @InjectModel(Activo.name) private readonly activos: Model<Activo>,
    private readonly contadores: ContadoresService,
  ) {}

  // ─── Consultas ───
  listar(f: { estado?: string; origen?: string; cultivo?: string }) {
    const q: Record<string, unknown> = {};
    if (f.estado) q.estado = { $in: f.estado.split(',') };
    if (f.origen) q.origen = f.origen;
    if (f.cultivo) q.cultivo = f.cultivo;
    return this.modelo.find(q).sort({ fechaRecepcion: -1 }).limit(300).lean().exec();
  }

  async obtener(id: string) {
    const l = await this.modelo.findById(id).lean().exec();
    if (!l) throw new NotFoundException('Lote no encontrado');
    return l;
  }

  // ocupacion(): kg dentro de cada fermentador/tendal/secadora en este momento (para RN-05 y el tablero).
  async ocupacion() {
    const activos = await this.activos.find({ tipo: { $in: ['FERMENTADOR', 'TENDAL', 'SECADORA'] } }).sort({ codigo: 1 }).lean().exec();
    const enProceso = await this.modelo.find({ estado: { $in: ['FERMENTANDO', 'SECANDO'] } }).lean().exec();
    return activos.map((a) => {
      const lotes = enProceso.filter((l) => String(l.estado === 'FERMENTANDO' ? l.fermentacion?.activo : l.secado?.activo) === String(a._id));
      const kg = redondear(lotes.reduce((s, l) => s + l.kgEntrada, 0));
      return { _id: a._id, codigo: a.codigo, nombre: a.nombre, tipo: a.tipo, estado: a.estado, capacidadKg: a.capacidadKg, ocupadoKg: kg, libreKg: redondear(a.capacidadKg - kg), lotes: lotes.map((l) => ({ _id: l._id, codigo: l.codigo, kg: l.kgEntrada, variedad: l.variedad })) };
    });
  }

  // alertas(): fermentaciones de más de 7 días o con el volteo atrasado (llegan a la campana).
  async alertas() {
    const fermentando = await this.modelo.find({ estado: 'FERMENTANDO' }).lean().exec();
    const alertas: { tipo: string; mensaje: string; ref: string }[] = [];
    for (const l of fermentando) {
      if (!l.fermentacion) continue;
      if (fermentacionVencida(l.variedad as Variedad, l.fermentacion.inicio)) alertas.push({ tipo: 'FERMENTACION_VENCIDA', mensaje: `${l.codigo} lleva más días de los recomendados fermentando`, ref: String(l._id) });
      const ultimo = l.fermentacion.volteos.at(-1)?.fecha ?? l.fermentacion.inicio;
      if (volteoAtrasado(ultimo)) alertas.push({ tipo: 'VOLTEO_ATRASADO', mensaje: `${l.codigo}: toca voltear la masa (cada 48 h)`, ref: String(l._id) });
    }
    return alertas;
  }

  // ─── Creación (desde acopio o cosecha) ───
  async crearLote(d: NuevoLote) {
    const fecha = d.fecha ?? new Date();
    const llegaSeco = ['SECO', 'ORO'].includes(d.estadoEntrega);
    return this.modelo.create({
      codigo: await this.contadores.codigoAnual('L', 4, fecha),
      origen: d.origen,
      cultivo: d.cultivo,
      variedad: d.variedad,
      estadoEntrega: d.estadoEntrega,
      fechaRecepcion: fecha,
      productor: d.productor,
      hacienda: d.hacienda,
      parcela: d.parcela,
      cosecha: d.cosecha,
      liquidacion: d.liquidacion,
      kgEntrada: d.kgEntrada,
      kgSeco: llegaSeco ? d.kgEntrada : 0,
      humedadEntrada: d.humedadEntrada ?? 0,
      costoTotal: d.costoTotal ?? 0,
      estado: llegaSeco ? 'SECO' : 'RECIBIDO',
      historial: [
        {
          fecha,
          evento: 'RECEPCION',
          detalle: `${d.kgEntrada} kg ${d.estadoEntrega.toLowerCase()} de ${d.productor?.nombre ?? d.hacienda?.nombre ?? ''}${d.parcela ? ` (parcela ${d.parcela.codigo})` : ''}`,
          usuario: d.usuario,
        },
      ],
    });
  }

  // vincular(): guarda referencias (liquidación, cosecha) creadas después del lote.
  async vincular(id: string, refs: { liquidacion?: string; cosecha?: string }) {
    await this.modelo.updateOne({ _id: id }, { $set: refs }).exec();
  }

  // cambiarEstado(): valida que no se salte pasos.
  private validarPaso(lote: LoteGrano, siguiente: EstadoLoteGrano) {
    if (!puedeAvanzar(lote.estado as EstadoLoteGrano, siguiente, ['SECO', 'ORO'].includes(lote.estadoEntrega))) {
      throw new BadRequestException(`El lote está ${lote.estado} y no puede pasar a ${siguiente}`);
    }
  }

  // ─── Fermentación ───
  async iniciarFermentacion(id: string, fermentadorId: string, usuario: UsuarioToken) {
    const lote = await this.obtener(id);
    this.validarPaso(lote, 'FERMENTANDO');
    const fermentador = await this.activos.findById(fermentadorId).lean().exec();
    if (!fermentador || fermentador.tipo !== 'FERMENTADOR') throw new BadRequestException('Elige un fermentador válido');
    const usable = verificarActivoUsable(fermentador);
    if (usable) throw new BadRequestException(usable);
    const ocup = (await this.ocupacion()).find((o) => String(o._id) === fermentadorId)!;
    const error = verificarCapacidad(fermentador.capacidadKg, ocup.ocupadoKg, lote.kgEntrada, fermentador.codigo); // RN-05
    if (error) throw new BadRequestException(error);
    return this.modelo
      .findByIdAndUpdate(
        id,
        {
          $set: { estado: 'FERMENTANDO', fermentacion: { activo: fermentadorId, codigo: fermentador.codigo, inicio: new Date(), volteos: [] } },
          $push: { historial: { fecha: new Date(), evento: 'FERMENTACION', detalle: `Entra al fermentador ${fermentador.codigo}`, usuario: usuario.nombre } },
        },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();
  }

  async registrarVolteo(id: string, temperatura: number | undefined, usuario: UsuarioToken) {
    const lote = await this.obtener(id);
    if (lote.estado !== 'FERMENTANDO') throw new BadRequestException('Solo se voltean lotes en fermentación');
    return this.modelo
      .findByIdAndUpdate(id, { $push: { 'fermentacion.volteos': { fecha: new Date(), temperatura, usuario: usuario.nombre } } }, { returnDocument: 'after' })
      .lean()
      .exec();
  }

  // ─── Secado ───
  async iniciarSecado(id: string, metodo: string, activoId: string, usuario: UsuarioToken, forzar = false) {
    const lote = await this.obtener(id);
    // El café natural o el cacao que no fermentó pueden ir directo a secar (RECIBIDO → SECANDO no se permite;
    // primero se registra la fermentación). Aquí se exige que venga de FERMENTANDO.
    this.validarPaso(lote, 'SECANDO');
    if (lote.fermentacion && !forzar) {
      const error = verificarFinFermentacion(lote.variedad as Variedad, lote.fermentacion.inicio, new Date());
      if (error) throw new BadRequestException(error);
    }
    const activo = await this.activos.findById(activoId).lean().exec();
    const tipoEsperado = metodo === 'TENDAL' ? 'TENDAL' : 'SECADORA';
    if (!activo || activo.tipo !== tipoEsperado) throw new BadRequestException(`Elige un activo de tipo ${tipoEsperado}`);
    const usable = verificarActivoUsable(activo); // RN-24: la secadora en mantenimiento no se usa
    if (usable) throw new BadRequestException(usable);
    const ocup = (await this.ocupacion()).find((o) => String(o._id) === activoId)!;
    const error = verificarCapacidad(activo.capacidadKg, ocup.ocupadoKg, lote.kgEntrada, activo.codigo); // RN-05
    if (error) throw new BadRequestException(error);
    return this.modelo
      .findByIdAndUpdate(
        id,
        {
          $set: { estado: 'SECANDO', 'fermentacion.fin': new Date(), secado: { metodo, activo: activoId, codigo: activo.codigo, inicio: new Date(), mediciones: [] } },
          $push: { historial: { fecha: new Date(), evento: 'SECADO', detalle: `Pasa a ${metodo.toLowerCase()} ${activo.codigo}`, usuario: usuario.nombre } },
        },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();
  }

  async medirHumedad(id: string, humedad: number, usuario: UsuarioToken) {
    const lote = await this.obtener(id);
    if (lote.estado !== 'SECANDO') throw new BadRequestException('Solo se mide humedad de lotes en secado');
    return this.modelo.findByIdAndUpdate(id, { $push: { 'secado.mediciones': { fecha: new Date(), humedad, usuario: usuario.nombre } } }, { returnDocument: 'after' }).lean().exec();
  }

  // terminarSecado(): solo con humedad ≤ 7 % (cacao) o ≤ 12 % (café). Calcula merma y factor de conversión.
  async terminarSecado(id: string, kgSeco: number, humedadFinal: number, usuario: UsuarioToken) {
    const lote = await this.obtener(id);
    this.validarPaso(lote, 'SECO');
    const error = verificarFinSecado(lote.cultivo as 'CACAO' | 'CAFE', humedadFinal);
    if (error) throw new BadRequestException(error);
    if (kgSeco > lote.kgEntrada) throw new BadRequestException('El peso seco no puede ser mayor que el de entrada');
    const merma = mermaPct(lote.kgEntrada, kgSeco);
    return this.modelo
      .findByIdAndUpdate(
        id,
        {
          $set: { estado: 'SECO', kgSeco, mermaPct: merma, factorConversion: factorConversion(lote.kgEntrada, kgSeco), costoKgSeco: kgSeco ? redondear(lote.costoTotal / kgSeco, 4) : 0, 'secado.fin': new Date() },
          $push: {
            'secado.mediciones': { fecha: new Date(), humedad: humedadFinal, usuario: usuario.nombre },
            historial: { fecha: new Date(), evento: 'SECO', detalle: `${kgSeco} kg secos al ${humedadFinal} % de humedad (merma ${merma} %)`, usuario: usuario.nombre },
          },
        },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();
  }

  // combinar(): junta lotes pequeños de la misma variedad en uno nuevo; la trazabilidad guarda de cuáles salió.
  async combinar(ids: string[], usuario: UsuarioToken) {
    const lotes = await this.modelo.find({ _id: { $in: ids } }).lean().exec();
    if (lotes.length !== ids.length) throw new NotFoundException('Algún lote no existe');
    const error = verificarMezcla(lotes);
    if (error) throw new BadRequestException(error);
    if (lotes.some((l) => !['RECIBIDO', 'SECO'].includes(l.estado))) throw new BadRequestException('Solo se combinan lotes recién recibidos o ya secos (antes de calidad)');
    const kg = redondear(lotes.reduce((s, l) => s + l.kgEntrada, 0));
    const kgSeco = redondear(lotes.reduce((s, l) => s + l.kgSeco, 0));
    const costo = redondear(lotes.reduce((s, l) => s + l.costoTotal, 0));
    const base = lotes[0];
    const nuevo = await this.modelo.create({
      codigo: await this.contadores.codigoAnual('L'),
      origen: lotes.every((l) => l.origen === 'PROPIO') ? 'PROPIO' : 'COMPRA',
      cultivo: base.cultivo,
      variedad: base.variedad,
      estadoEntrega: base.estadoEntrega,
      kgEntrada: kg,
      kgSeco,
      costoTotal: costo,
      costoKgSeco: kgSeco ? redondear(costo / kgSeco, 4) : 0,
      estado: base.estado,
      lotesOrigen: lotes.map((l) => l.codigo),
      productor: lotes.length && base.productor ? { id: base.productor.id, nombre: 'Varios productores' } : undefined,
      hacienda: base.hacienda,
      historial: [{ fecha: new Date(), evento: 'MEZCLA', detalle: `Lote combinado de ${lotes.map((l) => l.codigo).join(', ')}`, usuario: usuario.nombre }],
    });
    await this.modelo.updateMany({ _id: { $in: ids } }, { $set: { estado: 'COMBINADO', combinadoEn: nuevo.codigo }, $push: { historial: { fecha: new Date(), evento: 'MEZCLA', detalle: `Combinado en ${nuevo.codigo}`, usuario: usuario.nombre } } }).exec();
    return nuevo;
  }
}
