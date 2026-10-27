// web.service.ts → todo lo que alimenta la página pública: catálogo con precio y STOCK EN VIVO,
// equipos con disponibilidad, contenido editable y las solicitudes de los visitantes.
// La web lee la MISMA base que usa el personal: si bodega vende la última barra, la web lo muestra.

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { ContenidoWeb } from './esquemas/contenido-web.esquema.js';
import { SolicitudWeb } from './esquemas/solicitud-web.esquema.js';
import { Producto } from '../productos/esquemas/producto.esquema.js';
import { Activo } from '../equipos/esquemas/activo.esquema.js';
import { Alquiler } from '../equipos/esquemas/alquiler.esquema.js';
import { Hacienda } from '../campo/esquemas/hacienda.esquema.js';
import { Productor } from '../acopio/esquemas/productor.esquema.js';
import { Usuario } from '../usuarios/esquemas/usuario.esquema.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { AcopioService } from '../acopio/acopio.service.js';
import { CotizacionesService } from '../ventas/cotizaciones.service.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { ContadoresService } from '../../comun/servicios/contadores.service.js';
import { CorreoService } from '../../comun/servicios/correo.service.js';
import { escaparRegex, redondear } from '../../comun/utilidades.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { ActualizarSolicitudDto, CrearSolicitudDto } from './dto/web.dto.js';

// Etiquetas legibles para la web.
const NOMBRE_FAMILIA: Record<string, string> = {
  CACAO_GRANO: 'Cacao en grano',
  SEMIELABORADOS: 'Semielaborados',
  CHOCOLATES: 'Chocolates',
  BOMBONES: 'Bombones y coberturas',
  CAFE: 'Café',
  CAFE_CACAO: 'Café y cacao',
  BEBIDAS: 'Bebidas',
  CAFE_GRANO: 'Café en grano verde',
};

@Injectable()
export class WebService {
  private readonly logger = new Logger(WebService.name);
  // Límite anti-spam: cuántas solicitudes envió cada IP en el último minuto (en memoria).
  private readonly envios = new Map<string, number[]>();

  constructor(
    @InjectModel(ContenidoWeb.name) private readonly contenido: Model<ContenidoWeb>,
    @InjectModel(SolicitudWeb.name) private readonly solicitudes: Model<SolicitudWeb>,
    @InjectModel(Producto.name) private readonly productos: Model<Producto>,
    @InjectModel(Activo.name) private readonly activos: Model<Activo>,
    @InjectModel(Alquiler.name) private readonly alquileres: Model<Alquiler>,
    @InjectModel(Hacienda.name) private readonly haciendas: Model<Hacienda>,
    @InjectModel(Productor.name) private readonly productores: Model<Productor>,
    @InjectModel(Usuario.name) private readonly usuarios: Model<Usuario>,
    private readonly inventario: InventarioService,
    private readonly acopio: AcopioService,
    private readonly cotizaciones: CotizacionesService,
    private readonly configuracion: ConfiguracionService,
    private readonly contadores: ContadoresService,
    private readonly correo: CorreoService,
  ) {}

  // ─────────────────────────── PÚBLICO ───────────────────────────

  // empresa(): datos de contacto, cifras y haciendas para Inicio y Quiénes somos.
  async empresa() {
    const config = await this.configuracion.obtener();
    const haciendas = await this.haciendas.find({ activa: true }).select('nombre canton hectareasTotales hectareasCultivadas cultivos descripcion imagen ubicacion altitudMsnm certificaciones').sort({ codigo: 1 }).lean().exec();
    const productores = await this.productores.countDocuments({ activo: true }).exec();
    const e = config.empresa;
    return {
      nombreComercial: e.nombreComercial,
      razonSocial: e.razonSocial,
      direccionMatriz: e.direccionMatriz,
      direccionTienda: e.direccionTienda,
      telefono: e.telefono,
      whatsapp: e.whatsapp,
      correo: e.correo,
      horario: e.horario,
      haciendas,
      cifras: {
        hectareas: redondear(haciendas.reduce((s, h) => s + (h.hectareasCultivadas || h.hectareasTotales), 0), 0),
        productores,
        anios: new Date().getFullYear() - 2011,
        haciendas: haciendas.length,
      },
    };
  }

  // obtenerContenido(): una sección editable (inicio, nosotros, servicios, testimonios).
  async obtenerContenido(clave: string) {
    const c = await this.contenido.findOne({ clave }).lean().exec();
    if (!c) throw new NotFoundException('Sección no encontrada');
    return c;
  }

  // catalogo(): productos publicados agrupados por producto base, cada uno con sus variantes,
  // precio por menor y por mayor, IVA incluido y estado del stock.
  async catalogo(f: { familia?: string; q?: string; sabor?: string; precioMax?: number; destacados?: boolean }) {
    const filtro: Record<string, unknown> = { publicado: true, activo: true };
    if (f.familia) filtro.familia = f.familia;
    if (f.sabor) filtro.sabor = { $regex: escaparRegex(f.sabor), $options: 'i' };
    if (f.destacados) filtro.destacado = true;
    if (f.q) {
      const r = { $regex: escaparRegex(f.q), $options: 'i' };
      filtro.$or = [{ nombre: r }, { productoBase: r }, { descripcion: r }, { sabor: r }];
    }
    const productos = await this.productos.find(filtro).sort({ familia: 1, productoBase: 1, precioMenor: 1 }).lean().exec();
    const stock = await this.inventario.resumenStock({ productoIds: productos.map((p) => String(p._id)) });
    const porId = new Map(stock.map((s) => [s.productoId, s]));
    // Map por slug: junta las variantes del mismo producto.
    const grupos = new Map<string, Record<string, unknown> & { variantes: Record<string, unknown>[] }>();
    for (const p of productos) {
      const s = porId.get(String(p._id));
      const variante = {
        _id: p._id,
        sku: p.sku,
        nombre: p.nombre,
        sabor: p.sabor,
        presentacion: p.presentacion,
        unidad: p.unidad,
        pesoNetoG: p.pesoNetoG,
        precioMenor: p.precioMenor,
        precioMayor: p.precioMayor,
        cantidadMinimaMayor: p.cantidadMinimaMayor,
        escalas: p.escalas,
        tarifaIva: p.tarifaIva,
        precioMenorConIva: redondear(p.precioMenor * (1 + p.tarifaIva / 100)),
        disponible: s?.disponible ?? 0,
        estado: s?.estado ?? (p.proximamente ? 'PROXIMAMENTE' : 'AGOTADO'),
        // Para el grano: también en sacos de 69 kg y quintales.
        sacos: p.unidad === 'KG' ? Math.floor((s?.disponible ?? 0) / 69) : undefined,
        quintales: p.unidad === 'KG' ? redondear((s?.disponible ?? 0) / 45.36, 1) : undefined,
        imagen: p.imagen,
      };
      const g = grupos.get(p.slug) ?? {
        slug: p.slug,
        productoBase: p.productoBase,
        familia: p.familia,
        familiaNombre: NOMBRE_FAMILIA[p.familia] ?? p.familia,
        descripcion: p.descripcion,
        notasCata: p.notasCata,
        origen: p.origen,
        ingredientes: p.ingredientes,
        alergenos: p.alergenos,
        imagen: p.imagen,
        destacado: p.destacado,
        variantes: [],
      };
      g.variantes.push(variante);
      grupos.set(p.slug, g);
    }
    const lista = [...grupos.values()].map((g) => {
      const precios = g.variantes.map((v) => v.precioMenor as number);
      const estados = g.variantes.map((v) => v.estado as string);
      // El producto muestra el MEJOR estado de sus variantes.
      const estado = ['DISPONIBLE', 'ULTIMAS_UNIDADES', 'PROXIMAMENTE', 'AGOTADO'].find((e) => estados.includes(e)) ?? 'AGOTADO';
      return { ...g, desde: Math.min(...precios), estado, sabores: [...new Set(g.variantes.map((v) => v.sabor).filter(Boolean))] };
    });
    return f.precioMax ? lista.filter((g) => (g.desde as number) <= f.precioMax!) : lista;
  }

  async productoPorSlug(slug: string) {
    const [p] = (await this.catalogo({})).filter((g) => (g as { slug?: string }).slug === slug);
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  // stockEnVivo(): solo disponible y estado de varias variantes (la página lo pide cada 20 segundos).
  async stockEnVivo(ids: string[]) {
    const publicados = await this.productos.find({ _id: { $in: ids }, publicado: true }).select('_id').lean().exec();
    const stock = await this.inventario.resumenStock({ productoIds: publicados.map((p) => String(p._id)) });
    return { hora: new Date(), stock: stock.map((s) => ({ _id: s.productoId, disponible: s.disponible, estado: s.estado })) };
  }

  // equipos(): maquinaria y vehículos en venta o alquiler con su disponibilidad.
  async equipos() {
    const activos = await this.activos.find({ publicado: true, estado: { $nin: ['VENDIDO', 'BAJA'] }, usos: { $in: ['VENTA', 'ALQUILER'] } }).sort({ tipo: 1, codigo: 1 }).lean().exec();
    const alquileres = await this.alquileres.find({ activo: { $in: activos.map((a) => String(a._id)) }, estado: { $in: ['RESERVADO', 'ACTIVO'] }, hasta: { $gte: new Date() } }).select('activo desde hasta estado').sort({ desde: 1 }).lean().exec();
    return activos.map((a) => {
      const propios = alquileres.filter((x) => String(x.activo) === String(a._id));
      const activo = propios.find((x) => x.estado === 'ACTIVO');
      let disponibilidad = 'Disponible';
      if (a.estado === 'EN_MANTENIMIENTO') disponibilidad = 'En mantenimiento';
      else if (activo) disponibilidad = `Alquilado hasta el ${new Date(activo.hasta).toLocaleDateString('es-EC')}`;
      return {
        _id: a._id,
        codigo: a.codigo,
        nombre: a.nombre,
        tipo: a.tipo,
        marca: a.marca,
        modelo: a.modelo,
        anio: a.anio,
        capacidad: a.capacidad,
        nuevo: a.nuevo,
        horometro: ['CAMION', 'FURGON'].includes(a.tipo) ? undefined : a.horometro,
        odometro: ['CAMION', 'FURGON'].includes(a.tipo) ? a.odometro : undefined,
        enVenta: a.usos.includes('VENTA'),
        enAlquiler: a.usos.includes('ALQUILER'),
        precioVenta: a.usos.includes('VENTA') ? a.precioVenta : undefined,
        tarifas: a.usos.includes('ALQUILER') ? a.tarifas : undefined,
        tarifaOperadorDia: a.tarifaOperadorDia,
        garantia: a.garantia,
        descripcion: a.descripcion,
        fichaTecnica: a.fichaTecnica,
        imagen: a.imagen,
        disponibilidad,
        // Fechas ocupadas (sin datos del cliente) para el calendario.
        ocupado: propios.map((x) => ({ desde: x.desde, hasta: x.hasta })),
      };
    });
  }

  // servicios(): contenido editable + precio del día que se paga al productor.
  async servicios() {
    const contenido = await this.contenido.findOne({ clave: 'servicios' }).lean().exec();
    const precios = await this.acopio.preciosVigentes();
    return { contenido: contenido?.datos ?? {}, preciosDia: precios.map((p) => ({ cultivo: p.cultivo, variedad: p.variedad, estado: p.estado, precioQq: p.precioQq, fecha: p.fecha })) };
  }

  // ─── Solicitudes del visitante ───

  // limiteEnvios(): máximo 5 solicitudes por minuto desde la misma IP (anti-spam).
  private limiteEnvios(ip: string) {
    const ahora = Date.now();
    const recientes = (this.envios.get(ip) ?? []).filter((t) => ahora - t < 60_000);
    if (recientes.length >= 5) throw new BadRequestException('Has enviado varias solicitudes seguidas; espera un minuto');
    recientes.push(ahora);
    this.envios.set(ip, recientes);
  }

  // vendedorDeTurno(): asigna la solicitud al vendedor con MENOS solicitudes abiertas.
  private async vendedorDeTurno() {
    const vendedores = await this.usuarios.find({ roles: 'VENTAS', activo: true }).select('nombre').lean().exec();
    if (!vendedores.length) return undefined;
    const cargas = await Promise.all(vendedores.map(async (v) => ({ v, n: await this.solicitudes.countDocuments({ 'asignadoA.id': String(v._id), estado: { $in: ['NUEVA', 'EN_GESTION'] } }).exec() })));
    cargas.sort((a, b) => a.n - b.n);
    return { id: String(cargas[0].v._id), nombre: cargas[0].v.nombre };
  }

  async crearSolicitud(dto: CrearSolicitudDto, ip: string) {
    if (dto.sitioWeb) return { recibido: true }; // honeypot: robot → se descarta sin avisar
    this.limiteEnvios(ip);
    if (['COTIZACION', 'AVISO_STOCK'].includes(dto.tipo) && !dto.items?.length) throw new BadRequestException('Elige al menos un producto');
    if (dto.tipo === 'ALQUILER' && (!dto.activoId || !dto.desde || !dto.hasta)) throw new BadRequestException('Indica el equipo y las fechas del alquiler');
    const items = [];
    for (const i of dto.items ?? []) {
      const p = await this.productos.findOne({ _id: i.productoId, publicado: true }).lean().exec();
      if (p) items.push({ producto: String(p._id), sku: p.sku, nombre: p.nombre, cantidad: i.cantidad });
    }
    const solicitud = await this.solicitudes.create({
      numero: await this.contadores.codigoAnual('SOL'),
      tipo: dto.tipo,
      nombre: dto.nombre,
      correo: dto.correo,
      telefono: dto.telefono,
      empresa: dto.empresa,
      ciudad: dto.ciudad,
      mensaje: dto.mensaje,
      items,
      activo: dto.activoId,
      desde: dto.desde ? new Date(dto.desde) : undefined,
      hasta: dto.hasta ? new Date(dto.hasta) : undefined,
      servicio: dto.servicio,
      asignadoA: await this.vendedorDeTurno(),
      ip,
    });
    // Correo de confirmación al visitante.
    const lista = items.length ? `<ul>${items.map((i) => `<li>${i.cantidad} × ${i.nombre}</li>`).join('')}</ul>` : '';
    const textoTipo = dto.tipo === 'AVISO_STOCK' ? 'Te avisaremos apenas tengamos stock de:' : 'Recibimos tu solicitud. Un asesor te contactará en horario de atención.';
    void this.correo.enviar({
      para: dto.correo,
      asunto: `Solicitud ${solicitud.numero} recibida – Pepa de Oro`,
      html: this.correo.plantilla(`¡Gracias, ${dto.nombre}!`, `<p>${textoTipo}</p>${lista}<p>Número de solicitud: <b>${solicitud.numero}</b>.</p><p>Recuerda: en nuestra web no se compra en línea; la venta se cierra con tu asesor.</p>`),
    });
    return { recibido: true, numero: solicitud.numero };
  }

  // avisarStock(): cada 15 minutos revisa las solicitudes "avísame cuando llegue" y escribe al visitante
  // si alguno de sus productos ya tiene stock.
  @Cron('*/15 * * * *')
  async avisarStock() {
    const pendientes = await this.solicitudes.find({ tipo: 'AVISO_STOCK', avisado: false, estado: { $ne: 'DESCARTADA' } }).lean().exec();
    let avisados = 0;
    for (const s of pendientes) {
      const stock = await this.inventario.resumenStock({ productoIds: s.items.map((i) => String(i.producto)) });
      const llegaron = stock.filter((x) => x.disponible > 0);
      if (!llegaron.length) continue;
      await this.correo.enviar({
        para: s.correo,
        asunto: '¡Ya tenemos stock! – Pepa de Oro',
        html: this.correo.plantilla(`Hola ${s.nombre}`, `<p>Ya están disponibles:</p><ul>${llegaron.map((l) => `<li>${l.nombre}</li>`).join('')}</ul><p>Responde este correo o escríbenos por WhatsApp para cotizar.</p>`),
      });
      await this.solicitudes.updateOne({ _id: s._id }, { $set: { avisado: true, estado: 'ATENDIDA' } }).exec();
      avisados++;
    }
    if (avisados) this.logger.log(`📬 ${avisados} aviso(s) de stock enviados`);
    return { avisados };
  }

  // ─────────────────────────── ADMINISTRACIÓN ───────────────────────────

  listarSolicitudes(f: { estado?: string; tipo?: string }) {
    const q: Record<string, unknown> = {};
    if (f.estado) q.estado = { $in: f.estado.split(',') };
    if (f.tipo) q.tipo = f.tipo;
    return this.solicitudes.find(q).populate('activo', 'codigo nombre').sort({ createdAt: -1 }).limit(300).lean().exec();
  }

  async actualizarSolicitud(id: string, dto: ActualizarSolicitudDto, usuario: UsuarioToken) {
    const update: Record<string, unknown> = {};
    if (dto.estado) update.$set = { estado: dto.estado };
    if (dto.asignadoId) {
      const u = await this.usuarios.findById(dto.asignadoId).select('nombre').lean().exec();
      if (u) update.$set = { ...(update.$set as object), asignadoA: { id: dto.asignadoId, nombre: u.nombre } };
    }
    if (dto.nota) update.$push = { notas: { fecha: new Date(), texto: dto.nota, usuario: usuario.nombre } };
    const s = await this.solicitudes.findByIdAndUpdate(id, update, { returnDocument: 'after' }).lean().exec();
    if (!s) throw new NotFoundException('Solicitud no encontrada');
    return s;
  }

  // aCotizacion(): el vendedor elige (o crea) el cliente y la solicitud se vuelve cotización con los mismos productos.
  async aCotizacion(id: string, clienteId: string, usuario: UsuarioToken) {
    const s = await this.solicitudes.findById(id).lean().exec();
    if (!s) throw new NotFoundException('Solicitud no encontrada');
    if (!s.items.length) throw new BadRequestException('La solicitud no tiene productos');
    const cot = await this.cotizaciones.crear({ cliente: clienteId, solicitud: id, items: s.items.map((i) => ({ tipo: 'PRODUCTO', refId: String(i.producto), cantidad: i.cantidad })), observaciones: `Solicitud web ${s.numero}` }, usuario);
    await this.solicitudes.updateOne({ _id: id }, { $set: { estado: 'EN_GESTION', cotizacion: cot._id }, $push: { notas: { fecha: new Date(), texto: `Cotización ${cot.numero} creada`, usuario: usuario.nombre } } }).exec();
    return cot;
  }

  listarContenido() {
    return this.contenido.find().sort({ clave: 1 }).lean().exec();
  }

  async guardarContenido(clave: string, titulo: string, datos: Record<string, unknown>, usuario: UsuarioToken) {
    return this.contenido.findOneAndUpdate({ clave }, { $set: { titulo, datos, actualizadoPor: usuario.nombre } }, { upsert: true, returnDocument: 'after' }).lean().exec();
  }
}
