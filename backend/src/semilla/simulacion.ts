// simulacion.ts → genera la HISTORIA de Pepa de Oro: día por día, durante los últimos meses, la empresa
// cosecha, compra, fermenta, seca, evalúa, produce, vende, cobra, alquila, transporta y repara.
//
// Lo importante: NO inserta datos "a mano". Llama a los MISMOS servicios que usa el sistema (los que
// atiende la API), así que todas las reglas de negocio (RN-01 a RN-26) se aplican también aquí y los
// números cuadran: el stock es la suma de los movimientos, cada factura tiene su secuencial, etc.
// Por eso el seed también sirve como una gran prueba de integración.

import type { INestApplicationContext } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { fijarReloj } from './reloj.js';
import { crearAzar, generarCedula, generarRucSociedad, nombreCompleto, ACTIVOS, BODEGAS, CANTONES_CACAO, CANTONES_CAFE, CLIENTES_EMPRESA, CONTENIDO_WEB, CONTRASENA_DEMO, HACIENDAS, PARCELAS, PRODUCTOS, RECETAS, USUARIOS, APELLIDOS, NOMBRES, type Azar } from './datos.js';
import { CONFIGURACION_INICIAL } from '../modulos/configuracion/configuracion.valores.js';
import type { UsuarioToken } from '../comun/usuario-token.js';
import { crearSlug, diasEntre, redondear, sumarDias } from '../comun/utilidades.js';
import { temporada } from '../modulos/analitica/proyecciones.reglas.js';
import { etapaProductiva } from '../modulos/campo/campo.reglas.js';
// Servicios del sistema
import { InventarioService } from '../modulos/inventario/inventario.service.js';
import { CampoService } from '../modulos/campo/campo.service.js';
import { AcopioService } from '../modulos/acopio/acopio.service.js';
import { PoscosechaService } from '../modulos/poscosecha/poscosecha.service.js';
import { CalidadService } from '../modulos/calidad/calidad.service.js';
import { ProduccionService } from '../modulos/produccion/produccion.service.js';
import { ClientesService } from '../modulos/ventas/clientes.service.js';
import { CotizacionesService } from '../modulos/ventas/cotizaciones.service.js';
import { PedidosService } from '../modulos/ventas/pedidos.service.js';
import { CajaService } from '../modulos/ventas/caja.service.js';
import { FacturacionService } from '../modulos/facturacion/facturacion.service.js';
import { EquiposService } from '../modulos/equipos/equipos.service.js';
import { LogisticaService } from '../modulos/logistica/logistica.service.js';
import { MantenimientoService } from '../modulos/mantenimiento/mantenimiento.service.js';
import { WebService } from '../modulos/web/web.service.js';
import { LineasService } from '../modulos/ventas/lineas.service.js';

// Demanda diaria promedio en la tienda (unidades). Guía la venta de mostrador y la planificación.
const DEMANDA_TIENDA: Record<string, number> = {
  'CH70-NAT-50': 5, 'CH70-MAR-50': 3.5, 'CH70-CAF-50': 2, 'CH70-SAL-50': 1.6, 'CH55-NAT-50': 2.6, 'CH85-NAT-50': 1.2, 'CHL-NAT-50': 2.6, 'CH70-NAT-C12': 0.25,
  'BOM-SUR-9': 1, 'BOM-SUR-16': 0.5, 'COB-70-1K': 0.6, 'COB-55-5K': 0.08, 'NIBS-250': 1.2, 'NIBS-1K': 0.25, 'PASTA-1K': 0.5, 'MANT-500': 0.25,
  'COCOA-250': 1.2, 'COCOA-1K': 0.25, 'CAF-MED-G250': 1.6, 'CAF-MED-M250': 2.4, 'CAF-OSC-M500': 0.8, 'CAF-MED-G1K': 0.25, 'MOC-400': 0.8, 'CHT-400': 1.2, 'CHT-1K': 0.3,
};
// Orden en que se planifica la producción: primero los semielaborados que alimentan a los demás.
const SEMIELABORADOS = ['SEM-NIBS', 'SEM-PASTA', 'SEM-MANTECA', 'SEM-COCOA', 'SEM-CAFE'];

type Id = string;
interface Contexto {
  app: INestApplicationContext;
  az: Azar;
  u: Record<string, UsuarioToken>; // usuarios por rol
  sku: Record<string, Id>; // SKU → _id
  activo: Record<string, Id>; // código → _id
  bodega: Record<string, Id>; // tipo → _id
  parcelas: { _id: Id; codigo: string; cultivo: string; variedad: string; hectareas: number; estado: string; anioSiembra: number; hacienda: Id }[];
  trabajadores: { _id: Id; cargo: string; hacienda?: Id }[];
  clientesEmpresa: { _id: Id; tipoCliente: string; nombre: string; creditoDias: number }[];
  consumidores: Id[];
  precios: Record<string, number>; // "CACAO-CCN51-SECO" → USD/qq
  ultimaCosecha: Record<string, Date>;
  errores: Record<string, number>; // operación → cuántas veces una regla la rechazó (es normal)
  conteo: Record<string, number>;
}

// hora(): fija el reloj simulado a un día y hora.
function hora(dia: Date, h: number, m = 0) {
  const d = new Date(dia);
  d.setHours(h, m, 0, 0);
  fijarReloj(d);
  return d;
}

// intentar(): ejecuta una operación; si una regla de negocio la rechaza (stock insuficiente, carencia...),
// se cuenta y la simulación sigue, igual que en la vida real.
async function intentar<T>(ctx: Contexto, nombre: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const r = await fn();
    ctx.conteo[nombre] = (ctx.conteo[nombre] ?? 0) + 1;
    return r;
  } catch (e) {
    ctx.errores[nombre] = (ctx.errores[nombre] ?? 0) + 1;
    if (process.env.SEMILLA_DETALLE === 'true') console.warn(`  ⚠ ${nombre}: ${(e as Error).message}`);
    return null;
  }
}

const modelo = <T = Record<string, unknown>>(app: INestApplicationContext, nombre: string) => app.get<Model<T>>(getModelToken(nombre));

// ═════════════════════════════════ 1. DATOS BASE ═════════════════════════════════
export async function cargarBase(app: INestApplicationContext, inicio: Date): Promise<Contexto> {
  const az = crearAzar(2011);
  const conexion = app.get<Connection>(getConnectionToken());
  hora(sumarDias(inicio, -1), 8);
  const db = conexion.db!;
  const fecha = new Date();

  // Configuración, contenido web y usuarios
  const config = { ...CONFIGURACION_INICIAL, empresa: { ...CONFIGURACION_INICIAL.empresa, urlWeb: process.env.FRONTEND_URL ?? 'http://localhost:4200' } };
  await db.collection('configuracion').insertOne({ ...config, createdAt: fecha, updatedAt: fecha } as never);
  await db.collection('contenido_web').insertMany(CONTENIDO_WEB.map((c) => ({ ...c, createdAt: fecha, updatedAt: fecha })));
  const hash = await bcrypt.hash(CONTRASENA_DEMO, 10);
  const usuarios = USUARIOS.map((x) => ({ ...x, contrasenaHash: hash, activo: true, createdAt: fecha, updatedAt: fecha }));
  const resU = await db.collection('usuarios').insertMany(usuarios);
  const u: Record<string, UsuarioToken> = {};
  usuarios.forEach((x, i) => {
    const token = { sub: String(resU.insertedIds[i]), correo: x.correo, nombre: x.nombre, roles: x.roles as UsuarioToken['roles'] };
    if (!u[x.roles[0]]) u[x.roles[0]] = token;
    if (x.correo === 'caja@pepadeoro.ec') u.CAJA = token;
  });

  // Bodegas, productos y activos (con el modelo de Mongoose para que apliquen los valores por defecto)
  const Bodega = modelo(app, 'Bodega');
  const bodegas = await Bodega.insertMany(BODEGAS.map((b) => ({ ...b, activa: true })));
  const bodega = Object.fromEntries(bodegas.map((b) => [b.get('tipo') as string, String(b._id)]));
  const Producto = modelo(app, 'Producto');
  const prods = await Producto.insertMany(
    PRODUCTOS.map((x) => ({ ...x, slug: crearSlug(x.productoBase), historialPrecios: [{ fecha, usuario: 'Ana Lucía Ramírez', precioMenor: x.precioMenor, precioMayor: x.precioMayor }] })),
  );
  const sku = Object.fromEntries(prods.map((x) => [x.get('sku') as string, String(x._id)]));
  const Activo = modelo(app, 'Activo');
  const activos = await Activo.insertMany(
    ACTIVOS.map((a) => ({
      ...a,
      // El plan arranca con la última revisión hace poco (con el uso actual), para que los preventivos se repartan.
      planMantenimiento: ((a.planMantenimiento as { tarea: string; cadaDias: number; cadaUso: number }[]) ?? []).map((t) => ({ ...t, ultimaFecha: sumarDias(inicio, -az.entero(5, 60)), ultimoUso: Number(a.horometro ?? a.odometro ?? 0) - az.entero(0, Math.max(1, Math.round((t.cadaUso || 10) / 3))) })),
    })),
  );
  const activo = Object.fromEntries(activos.map((x) => [x.get('codigo') as string, String(x._id)]));

  // Haciendas, parcelas y trabajadores
  const Hacienda = modelo(app, 'Hacienda');
  const hs = await Hacienda.insertMany(HACIENDAS.map((h) => ({ ...h, activa: true })));
  const hId = Object.fromEntries(hs.map((h) => [h.get('codigo') as string, String(h._id)]));
  const Parcela = modelo(app, 'Parcela');
  const ps = await Parcela.insertMany(PARCELAS.map((p) => ({ ...p, hacienda: hId[p.hacienda], plantas: Math.round(p.hectareas * p.densidad), planLabores: p.planLabores.map((t) => ({ ...t, ultimaFecha: sumarDias(inicio, -az.entero(1, t.cadaDias)) })) })));
  const Trabajador = modelo(app, 'Trabajador');
  const trabajadores: Record<string, unknown>[] = [];
  for (const [codigo, n] of [['LE', 10], ['SJ', 7], ['AZ', 6]] as const) {
    for (let i = 0; i < n; i++) trabajadores.push({ cedula: generarCedula(az), nombre: nombreCompleto(az), cargo: i === 0 ? 'CAPATAZ' : 'JORNALERO', hacienda: hId[codigo], jornalDiario: i === 0 ? 30 : 25, activo: true });
  }
  const choferes = [
    { nombre: 'Byron Tapia Correa', licenciaTipo: 'E', licenciaVence: '2028-04-12' },
    { nombre: 'Wilson Apolo Granda', licenciaTipo: 'E', licenciaVence: '2027-09-30' },
    { nombre: 'Hugo Ochoa Pineda', licenciaTipo: 'D', licenciaVence: '2026-11-08' }, // vence pronto → alerta
    { nombre: 'Darwin Román Vera', licenciaTipo: 'C', licenciaVence: '2027-06-15' },
  ];
  for (const c of choferes) trabajadores.push({ cedula: generarCedula(az), ...c, cargo: 'CHOFER', jornalDiario: 32, activo: true });
  for (let i = 0; i < 3; i++) trabajadores.push({ cedula: generarCedula(az), nombre: nombreCompleto(az), cargo: 'TECNICO', jornalDiario: 35, activo: true });
  for (let i = 0; i < 6; i++) trabajadores.push({ cedula: generarCedula(az), nombre: nombreCompleto(az), cargo: 'OPERARIO_PLANTA', jornalDiario: 28, activo: true });
  const ts = await Trabajador.insertMany(trabajadores);

  // Productores (120): 95 de cacao en la costa y 25 de café en la altura.
  const Productor = modelo(app, 'Productor');
  const productores = [];
  for (let i = 0; i < 120; i++) {
    const cafe = i >= 95;
    const certificaciones = az.probable(0.18) ? [{ tipo: 'ORGANICO', codigo: `ORG-${az.entero(1000, 9999)}`, vence: sumarDias(inicio, az.entero(200, 900)) }] : az.probable(0.1) ? [{ tipo: 'COMERCIO_JUSTO', codigo: `FT-${az.entero(10000, 99999)}`, vence: sumarDias(inicio, az.entero(200, 900)) }] : [];
    productores.push({
      cedula: generarCedula(az),
      nombre: nombreCompleto(az),
      telefono: `09${az.entero(10000000, 99999999)}`,
      finca: `Finca ${az.elegir(['San', 'Santa', 'La', 'El'])} ${az.elegir(['Rosa', 'María', 'Esperanza', 'Paraíso', 'Carmen', 'Victoria', 'Lucía', 'Bonanza', 'Porvenir', 'Fortuna', 'Delicia', 'Primavera'])}`,
      canton: cafe ? az.elegir(CANTONES_CAFE) : az.elegir(CANTONES_CACAO),
      hectareas: az.decimal(1, 15, 1),
      cultivos: [cafe ? 'CAFE' : 'CACAO'],
      certificaciones,
      cuentaBancaria: az.probable(0.6) ? { banco: az.elegir(['Banco de Machala', 'Banco del Pacífico', 'Cooperativa Santa Rosa', 'BanEcuador']), tipo: 'AHORROS', numero: String(az.entero(1000000000, 9999999999)) } : undefined,
      activo: i % 40 !== 7, // unos pocos inactivos (RN-03)
      motivoInactivo: i % 40 === 7 ? 'Entregó cacao con impurezas en reiteradas ocasiones' : undefined,
      anticipos: [],
      saldoAnticipo: 0,
      calificacion: 0,
    });
  }
  await Productor.insertMany(productores);

  // Clientes: empresas (RUC válidos), exportadores y consumidores con cédula.
  const Cliente = modelo(app, 'Cliente');
  const empresas = await Cliente.insertMany(
    CLIENTES_EMPRESA.map((c, i) => ({
      ...c,
      tipoIdentificacion: c.tipoIdentificacion ?? 'RUC',
      identificacion: c.identificacion ?? generarRucSociedad(az),
      correo: `compras@${crearSlug(c.nombreComercial ?? c.nombre).split('-').slice(0, 2).join('')}.ejemplo.ec`,
      telefono: `07${az.entero(2000000, 2999999)}`,
      direccion: `${az.elegir(['Av.', 'Calle'])} ${az.elegir(['Bolívar', 'Rocafuerte', '25 de Junio', 'Las Palmeras', 'Sucre', 'Olmedo'])} ${az.entero(100, 2000)}, ${c.ciudad}`,
      vendedor: u.VENTAS.sub,
      activo: true,
      notas: i < 3 ? 'Cliente desde 2019' : undefined,
    })),
  );
  const consumidores = [];
  for (let i = 0; i < 60; i++) {
    const nombre = `${az.elegir(NOMBRES)} ${az.elegir(APELLIDOS)}`;
    consumidores.push({ tipoIdentificacion: 'CEDULA', identificacion: generarCedula(az), nombre, correo: `${crearSlug(nombre).replace('-', '.')}${az.entero(1, 99)}@correo.ejemplo.ec`, telefono: `09${az.entero(10000000, 99999999)}`, direccion: `${az.elegir(['Machala', 'El Guabo', 'Pasaje', 'Santa Rosa'])}`, tipoCliente: 'CONSUMIDOR', activo: true });
  }
  const cons = await Cliente.insertMany(consumidores);
  await Cliente.create({ tipoIdentificacion: 'CONSUMIDOR_FINAL', identificacion: '9999999999999', nombre: 'CONSUMIDOR FINAL', tipoCliente: 'CONSUMIDOR', activo: true });

  // Stock inicial: insumos y repuestos (compra de arranque) y un poco de grano/semielaborado del período anterior.
  const inventario = app.get(InventarioService);
  for (const x of PRODUCTOS.filter((p) => ['INSUMO', 'REPUESTO'].includes(p.tipo))) {
    const tipoBodega = x.familia === 'INSUMOS_CAMPO' ? 'INSUMOS_CAMPO' : x.familia === 'REPUESTOS' ? 'REPUESTOS' : 'INSUMOS_PLANTA';
    await inventario.entrada({ productoId: sku[x.sku], bodegaId: bodega[tipoBodega], cantidad: Number(x.stockMinimo ?? 10) * 4, costoUnitario: Number(x.costoReferencia ?? x.precioMenor), tipo: 'ENTRADA_COMPRA', codigoLote: `INI-${x.sku}`, origen: { tipo: 'COMPRA' }, documento: { tipo: 'COMPRA', numero: 'Inventario inicial' }, usuario: 'Rosa Jaramillo', motivo: 'Inventario inicial' });
  }
  const iniciales: [string, number, number, string][] = [
    ['CAC-NAC-EXP', 900, 5.2, 'MATERIA_PRIMA'],
    ['CAC-CCN-EXP', 1500, 4.8, 'MATERIA_PRIMA'],
    ['CAF-ARA-EXP', 300, 7.6, 'MATERIA_PRIMA'],
    ['SEM-NIBS', 120, 6.9, 'PRODUCTO_TERMINADO'],
    ['SEM-PASTA', 160, 7.3, 'PRODUCTO_TERMINADO'],
    ['SEM-MANTECA', 20, 16.5, 'PRODUCTO_TERMINADO'],
    ['SEM-COCOA', 30, 7.8, 'PRODUCTO_TERMINADO'],
    ['SEM-CAFE', 50, 9.8, 'PRODUCTO_TERMINADO'],
  ];
  for (const [s, cant, costo, b] of iniciales) {
    await inventario.entrada({ productoId: sku[s], bodegaId: bodega[b], cantidad: cant, costoUnitario: costo, tipo: 'ENTRADA_AJUSTE', codigoLote: `INI-${s}`, fechaElaboracion: sumarDias(inicio, -20), liberado: true, grado: s.startsWith('CA') ? 'EXPORTACION' : undefined, origen: { tipo: 'AJUSTE' }, documento: { tipo: 'INVENTARIO_INICIAL' }, usuario: 'Rosa Jaramillo', motivo: 'Saldo inicial del período anterior' });
  }

  // Recetas (con el servicio de producción, que completa nombres y unidades).
  const produccion = app.get(ProduccionService);
  for (const [salida, base, componentes, horasMaquina, manoObraHoras, tipoMaquina, pasos] of RECETAS) {
    await produccion.crearReceta({ producto: sku[salida], cantidadBase: base, componentes: componentes.map(([c, cant]) => ({ producto: sku[c], cantidad: cant })), horasMaquina, manoObraHoras, tiposMaquina: [tipoMaquina], pasos, rendimientoEsperado: 98 });
  }
  // Stock inicial de producto terminado (lo que quedó del mes anterior) en planta y tienda.
  for (const [s, diaria] of Object.entries(DEMANDA_TIENDA)) {
    if (s === 'CHB-NAT-50') continue;
    const prod = PRODUCTOS.find((x) => x.sku === s)!;
    const costo = redondear(prod.precioMenor * 0.32, 4);
    for (const [b, dias] of [['PRODUCTO_TERMINADO', 20], ['TIENDA', 10]] as const) {
      await inventario.entrada({ productoId: sku[s], bodegaId: bodega[b], cantidad: Math.ceil(diaria * dias * (b === 'PRODUCTO_TERMINADO' ? 1.8 : 1)), costoUnitario: costo, tipo: 'ENTRADA_AJUSTE', codigoLote: `INI-${s}`, fechaElaboracion: sumarDias(inicio, -15), liberado: true, origen: { tipo: 'AJUSTE' }, documento: { tipo: 'INVENTARIO_INICIAL' }, usuario: 'Rosa Jaramillo', motivo: 'Saldo inicial del período anterior' });
    }
  }

  return {
    app,
    az,
    u,
    sku,
    activo,
    bodega,
    parcelas: ps.map((p) => ({ _id: String(p._id), codigo: p.get('codigo') as string, cultivo: p.get('cultivo') as string, variedad: p.get('variedad') as string, hectareas: p.get('hectareas') as number, estado: p.get('estado') as string, anioSiembra: p.get('anioSiembra') as number, hacienda: String(p.get('hacienda')) })),
    trabajadores: ts.map((t) => ({ _id: String(t._id), cargo: t.get('cargo') as string, hacienda: t.get('hacienda') ? String(t.get('hacienda')) : undefined })),
    clientesEmpresa: empresas.map((c) => ({ _id: String(c._id), tipoCliente: c.get('tipoCliente') as string, nombre: c.get('nombre') as string, creditoDias: c.get('creditoDias') as number })),
    consumidores: cons.map((c) => String(c._id)),
    precios: {
      'CACAO-CCN51-SECO': 230, 'CACAO-CCN51-BABA': 78, 'CACAO-NACIONAL-SECO': 255, 'CACAO-NACIONAL-BABA': 86,
      'CAFE-ARABICA-ORO': 360, 'CAFE-ARABICA-CEREZA': 62,
    },
    ultimaCosecha: {},
    errores: {},
    conteo: {},
  };
}

// ═════════════════════════════════ 2. UN DÍA DE TRABAJO ═════════════════════════════════
export async function simularDia(ctx: Contexto, dia: Date, esHoy: boolean, horaLimite: number) {
  const { app, az, u } = ctx;
  const diaSemana = dia.getDay(); // 0 domingo … 6 sábado
  const mes = dia.getMonth() + 1;
  const temp = temporada(mes);
  const hasta = (h: number) => !esHoy || h < horaLimite; // en el día de hoy solo se simula hasta la hora actual
  const acopio = app.get(AcopioService);
  const campo = app.get(CampoService);
  const poscosecha = app.get(PoscosechaService);
  const calidad = app.get(CalidadService);
  const produccion = app.get(ProduccionService);
  const inventario = app.get(InventarioService);
  const facturacion = app.get(FacturacionService);
  const caja = app.get(CajaService);
  const cotizaciones = app.get(CotizacionesService);
  const pedidos = app.get(PedidosService);
  const equipos = app.get(EquiposService);
  const logistica = app.get(LogisticaService);
  const mantenimiento = app.get(MantenimientoService);
  const web = app.get(WebService);
  const clientes = app.get(ClientesService);

  // ── 06:00 Precio del día (los lunes cambia un poco: "camina" al azar) y preventivos ──
  if (!hasta(6)) return;
  hora(dia, 6);
  if (diaSemana === 1 || Object.keys(ctx.conteo).length === 0) {
    for (const clave of Object.keys(ctx.precios)) {
      ctx.precios[clave] = redondear(ctx.precios[clave] * (1 + az.decimal(-0.035, 0.04, 4)), 2);
      const [cultivo, variedad, estado] = clave.split('-');
      await intentar(ctx, 'precio-dia', () => acopio.registrarPrecio({ cultivo, variedad, estado, precioQq: ctx.precios[clave], precioReferencia: clave.includes('SECO') ? redondear(ctx.precios[clave] * 1.08, 2) : undefined }, u.ACOPIO));
    }
  }
  await intentar(ctx, 'preventivos', () => mantenimiento.generarPreventivos());

  // ── 06:30 Clima de las haciendas ──
  hora(dia, 6, 30);
  const Hacienda = modelo(app, 'Hacienda');
  const haciendas = await Hacienda.find().lean().exec();
  for (const h of haciendas) {
    const lluvia = temp === 'ALTA' ? (az.probable(0.55) ? az.decimal(2, 45, 1) : 0) : az.probable(0.2) ? az.decimal(0.5, 12, 1) : 0;
    const altura = (h.altitudMsnm as number) > 800;
    await intentar(ctx, 'clima', () => campo.registrarClima({ hacienda: String(h._id), fecha: new Date().toISOString(), lluviaMm: lluvia, temperaturaMax: altura ? az.decimal(21, 26, 1) : az.decimal(28, 33, 1), temperaturaMin: altura ? az.decimal(12, 15, 1) : az.decimal(20, 23, 1), humedadRelativa: az.entero(70, 92) }));
  }

  if (diaSemana === 0) return; // domingo: descanso (solo clima y precios)

  // ── 07:00 Cosechas en las haciendas propias ──
  if (!hasta(7)) return;
  hora(dia, 7);
  for (const p of ctx.parcelas.filter((x) => x.estado === 'PRODUCCION')) {
    const esCafe = p.cultivo === 'CAFE';
    if (esCafe && (mes < 5 || mes > 9)) continue; // el café de altura se cosecha de mayo a septiembre
    const intervalo = esCafe ? 10 : temp === 'ALTA' ? 14 : temp === 'MEDIA' ? 18 : 24;
    const ultima = ctx.ultimaCosecha[p.codigo];
    if (ultima && diasEntre(ultima, dia) < intervalo) continue;
    if (!ultima && az.probable(0.7)) continue; // la primera vez se reparten en distintos días
    const factorTemp = { ALTA: 1.4, MEDIA: 1, BAJA: 0.6 }[temp];
    const porHa = esCafe ? 330 : p.variedad === 'CCN51' ? 180 : 80;
    const edad = etapaProductiva(p.anioSiembra, p.cultivo as 'CACAO').factorProduccion || 0.3;
    const kg = redondear(p.hectareas * porHa * factorTemp * edad * az.decimal(0.75, 1.25));
    const cuadrilla = ctx.trabajadores.filter((t) => t.hacienda === p.hacienda && t.cargo === 'JORNALERO').slice(0, az.entero(3, 6)).map((t) => ({ trabajador: t._id, jornales: az.elegir([1, 1, 1.5, 2]) }));
    // La cosecha se registra por TANDAS que quepan en un fermentador (RN-05: cacao hasta 1 000 kg, café hasta
    // 600 kg en F-05/F-06). Sin esto, una cosecha de 2 400 kg no entraba en ningún cajón y quedaba "Recibida" para siempre.
    const maxTanda = esCafe ? 560 : 950;
    const tandas = Math.ceil(kg / maxTanda);
    let r = null;
    for (let t = 0; t < tandas; t++) {
      const kgTanda = redondear(kg / tandas);
      const res = await intentar(ctx, 'cosecha', () => campo.registrarCosecha({ parcela: p._id, kg: kgTanda, mazorcas: esCafe ? 0 : Math.round(kgTanda * az.decimal(1.9, 2.4)), cuadrilla }, u.AGRONOMO));
      r = r ?? res;
    }
    if (r) ctx.ultimaCosecha[p.codigo] = dia;
    else ctx.ultimaCosecha[p.codigo] = sumarDias(dia, -intervalo + 2); // bloqueada por carencia: se intenta en 2 días
  }

  // ── 07:30 Labores del plan (fertilización, poda, deshierbe, control sanitario) ──
  hora(dia, 7, 30);
  const Parcela = modelo(app, 'Parcela');
  for (const p of await Parcela.find({ estado: { $in: ['PRODUCCION', 'DESARROLLO'] } }).lean().exec()) {
    for (const t of (p.planLabores as { tipo: string; cadaDias: number; ultimaFecha?: Date }[]).filter((x) => x.tipo !== 'COSECHA')) {
      const vence = t.ultimaFecha ? sumarDias(t.ultimaFecha, t.cadaDias) : dia;
      // Casi siempre se hace a tiempo (±3 días); a veces se atrasa (así el panel muestra labores atrasadas).
      if (vence > sumarDias(dia, az.entero(0, 3)) || az.probable(0.08)) continue;
      const cuadrilla = ctx.trabajadores.filter((x) => x.hacienda === String(p.hacienda) && x.cargo === 'JORNALERO').slice(0, az.entero(2, 4)).map((x) => ({ trabajador: x._id, jornales: az.elegir([0.5, 1, 1]) }));
      const ha = p.hectareas as number;
      const insumos = t.tipo === 'FERTILIZACION' ? [{ producto: ctx.sku[az.probable(0.5) ? 'CAM-NPK' : 'CAM-ORGANICO'], cantidad: redondear(ha * (az.probable(0.5) ? 50 : 200)) }] : [];
      // Control sanitario: casi siempre manual (retirar mazorcas enfermas); a veces con fungicida cúprico (carencia 14 días, RN-01).
      const conQuimico = t.tipo === 'CONTROL_SANITARIO' && az.probable(0.18);
      const tipo = conQuimico ? 'FUMIGACION' : t.tipo;
      if (conQuimico) insumos.push({ producto: ctx.sku['CAM-CUPRICO'], cantidad: redondear(ha * 1.5) });
      const labor = await intentar(ctx, 'labor', () => campo.registrarLabor({ parcela: String(p._id), tipo, cuadrilla, insumos, agroquimico: conQuimico ? { producto: 'Fungicida cúprico', dosis: '3 g/L', diasCarencia: 14 } : undefined }, u.AGRONOMO));
      if (labor && conQuimico) {
        // La fumigación también cuenta como el control sanitario del plan.
        const plan = (p.planLabores as { tipo: string; ultimaFecha?: Date }[]).map((x) => (x.tipo === 'CONTROL_SANITARIO' ? { ...x, ultimaFecha: new Date() } : x));
        await Parcela.updateOne({ _id: p._id }, { $set: { planLabores: plan } }).exec();
      }
    }
    // Monitoreo sanitario: la primera semana de cada mes.
    if (dia.getDate() <= 6 && diaSemana === 2) {
      const plaga = (p.cultivo as string) === 'CAFE' ? az.elegir(['BROCA', 'ROYA', 'NINGUNA']) : az.pesado([['MONILIA', 45], ['MAZORCA_NEGRA', 25], ['ESCOBA_DE_BRUJA', 20], ['NINGUNA', 10]] as [string, number][]);
      const evaluadas = az.entero(150, 250);
      const factor = temp === 'ALTA' ? 1.6 : 1;
      await intentar(ctx, 'sanidad', () => campo.registrarMonitoreo({ parcela: String(p._id), plaga, evaluadas, afectadas: plaga === 'NINGUNA' ? 0 : Math.round(evaluadas * az.decimal(0.01, 0.09) * factor), accion: 'Retiro y entierro de mazorcas afectadas' }, u.AGRONOMO));
    }
  }

  // ── 08:00 Acopio: entregas de productores en la báscula ──
  if (!hasta(8)) return;
  hora(dia, 8, az.entero(0, 50));
  const Productor = modelo(app, 'Productor');
  const prodsCacao = await Productor.find({ cultivos: 'CACAO' }).select('_id activo').lean().exec();
  const prodsCafe = await Productor.find({ cultivos: 'CAFE' }).select('_id activo').lean().exec();
  const entregas = { ALTA: az.entero(2, 4), MEDIA: az.entero(1, 3), BAJA: az.entero(0, 2) }[temp];
  for (let i = 0; i < entregas; i++) {
    const p = az.elegir(prodsCacao);
    const variedad = az.probable(0.62) ? 'CCN51' : 'NACIONAL';
    const seco = az.probable(0.4);
    await intentar(ctx, 'recepcion', () =>
      acopio.recibir(
        {
          productorId: String(p._id),
          cultivo: 'CACAO',
          variedad,
          estadoEntrega: seco ? 'SECO' : 'BABA',
          kgBrutos: seco ? az.entero(80, 480) : az.entero(220, 880),
          taraKg: seco ? az.decimal(1, 6, 1) : az.decimal(3, 10, 1),
          humedad: seco ? az.pesado([[az.decimal(6, 7, 1), 70], [az.decimal(7.1, 10, 1), 30]] as [number, number][]) : az.decimal(52, 60, 1),
          impurezasPct: az.pesado([[0, 60], [az.decimal(0.5, 2, 1), 40]] as [number, number][]),
          precioQq: ctx.precios[`CACAO-${variedad}-${seco ? 'SECO' : 'BABA'}`],
        },
        u.ACOPIO,
      ),
    );
  }
  if (mes >= 5 && mes <= 10 && az.probable(0.5)) {
    const p = az.elegir(prodsCafe);
    const oro = az.probable(0.45);
    await intentar(ctx, 'recepcion-cafe', () => acopio.recibir({ productorId: String(p._id), cultivo: 'CAFE', variedad: 'ARABICA', estadoEntrega: oro ? 'ORO' : 'CEREZA', kgBrutos: oro ? az.entero(50, 260) : az.entero(150, 600), taraKg: az.decimal(1, 4, 1), humedad: oro ? az.decimal(10, 12, 1) : az.decimal(58, 64, 1), impurezasPct: 0, precioQq: ctx.precios[`CAFE-ARABICA-${oro ? 'ORO' : 'CEREZA'}`] }, u.ACOPIO));
  }
  // Anticipos esporádicos antes de la temporada alta.
  if ((mes === 2 || mes === 3) && az.probable(0.15)) await intentar(ctx, 'anticipo', () => acopio.anticipo(String(az.elegir(prodsCacao)._id), az.elegir([50, 100, 150, 200]), 'Anticipo para fertilización', u.ACOPIO));
  // Pagos a productores: la mayoría en 0 a 4 días.
  const Liquidacion = modelo(app, 'Liquidacion');
  for (const l of await Liquidacion.find({ saldo: { $gt: 0.005 }, fecha: { $lt: sumarDias(dia, -az.entero(0, 4)) } }).limit(12).lean().exec()) {
    if (az.probable(0.12) && diasEntre(l.fecha as Date, dia) < 10) continue; // unos pocos se atrasan
    await intentar(ctx, 'pago-productor', () => acopio.pagar(String(l._id), { monto: l.saldo as number, forma: az.probable(0.6) ? 'TRANSFERENCIA' : 'EFECTIVO', referencia: `TR-${az.entero(100000, 999999)}` }, u.ACOPIO));
  }

  // ── 09:00 Poscosecha: fermentación, volteos, secado ──
  if (!hasta(9)) return;
  hora(dia, 9);
  await avanzarPoscosecha(ctx, dia, poscosecha);

  // ── 09:30 Calidad: grano seco y producto terminado ──
  hora(dia, 9, 30);
  await evaluarCalidad(ctx, dia, calidad);

  // ── 10:00 Bodega: compras de insumos que están bajo el mínimo ──
  hora(dia, 10);
  for (const b of await inventario.bajoMinimo()) {
    if (!['INSUMO', 'REPUESTO'].includes(b.tipo)) continue;
    const prod = PRODUCTOS.find((x) => x.sku === b.sku)!;
    const tipoBodega = prod.familia === 'INSUMOS_CAMPO' ? 'INSUMOS_CAMPO' : prod.familia === 'REPUESTOS' ? 'REPUESTOS' : 'INSUMOS_PLANTA';
    await intentar(ctx, 'compra-insumo', () => inventario.entrada({ productoId: b.productoId, bodegaId: ctx.bodega[tipoBodega], cantidad: Math.max(1, b.stockMinimo * 3), costoUnitario: redondear(Number(prod.costoReferencia ?? prod.precioMenor) * az.decimal(0.95, 1.08)), tipo: 'ENTRADA_COMPRA', origen: { tipo: 'COMPRA' }, documento: { tipo: 'COMPRA', numero: `FC-${az.entero(1000, 9999)}` }, usuario: u.BODEGA.nombre, motivo: `Compra a ${az.elegir(['Agripac', 'Ecuaquímica', 'Distribuidora El Oro', 'Empaques del Sur', 'Repuestos Machala'])}` }));
  }

  // ── 10:15 Los viernes, la gerente da de baja los lotes VENCIDOS (RN-14: no se venden; RN-15: lo autoriza el gerente).
  // Así el inventario no arrastra producto vencido y la bitácora de auditoría registra cada baja.
  if (diaSemana === 5) {
    hora(dia, 10, 15);
    for (const l of (await inventario.porVencer()).filter((x) => x.tramo === 'VENCIDO')) {
      await intentar(ctx, 'baja-vencido', () => inventario.darDeBaja(String(l._id), 'Producto vencido: se retira de la venta (RN-14)', u.GERENTE));
    }
  }

  // ── 10:30 Producción (lunes a viernes) ──
  if (diaSemana >= 1 && diaSemana <= 5 && hasta(11)) {
    hora(dia, 10, 30);
    await planificarProduccion(ctx, dia, esHoy, horaLimite, produccion, inventario);
  }

  // ── 11:30 Transferencias a la tienda ──
  if (!hasta(12)) return;
  hora(dia, 11, 30);
  await abastecerTienda(ctx, inventario);

  // ── 08:45–19:00 Tienda de Machala (lunes a sábado) ──
  await ventaMostrador(ctx, dia, esHoy, horaLimite, caja, facturacion);

  // ── 12:00 Ventas por mayor: cotizaciones, pedidos, despachos, facturas y cobros ──
  if (!hasta(13)) return;
  hora(dia, 12);
  await ventasMayoristas(ctx, dia, cotizaciones, pedidos, facturacion, logistica, clientes);

  // ── 13:00 Equipos, alquileres y fletes ──
  if (!hasta(14)) return;
  hora(dia, 13);
  await equiposYFletes(ctx, dia, equipos, logistica, facturacion);

  // ── 14:00 Taller ──
  if (!hasta(15)) return;
  hora(dia, 14);
  await taller(ctx, dia, mantenimiento, facturacion);

  // ── 15:00 Solicitudes desde la web ──
  if (!hasta(16)) return;
  hora(dia, 15, az.entero(0, 59));
  if (az.probable(0.3)) await solicitudWeb(ctx, web);
}

// ─────────────────────────── Poscosecha ───────────────────────────
async function avanzarPoscosecha(ctx: Contexto, dia: Date, poscosecha: PoscosechaService) {
  const { az, u } = ctx;
  const LoteGrano = modelo(ctx.app, 'LoteGrano');
  const enProceso = await LoteGrano.find({ estado: { $in: ['RECIBIDO', 'FERMENTANDO', 'SECANDO'] } }).sort({ fechaRecepcion: 1 }).lean().exec();
  for (const l of enProceso) {
    const id = String(l._id);
    const cafe = l.cultivo === 'CAFE';
    if (l.estado === 'RECIBIDO') {
      // Busca un fermentador con espacio. El café prefiere los pequeños (F-05 y F-06); si están ocupados usa
      // cualquiera, porque la cereza despulpada no puede esperar más de un día sin fermentar.
      const ocup = await poscosecha.ocupacion();
      const cabe = (o: (typeof ocup)[number]) => o.tipo === 'FERMENTADOR' && o.libreKg >= (l.kgEntrada as number);
      const libre = cafe ? (ocup.find((o) => cabe(o) && ['F-05', 'F-06'].includes(o.codigo)) ?? ocup.find(cabe)) : ocup.find(cabe);
      if (libre) await intentar(ctx, 'fermentar', () => poscosecha.iniciarFermentacion(id, String(libre._id), u.ACOPIO));
    } else if (l.estado === 'FERMENTANDO') {
      const f = l.fermentacion as { inicio: Date; volteos: { fecha: Date }[] };
      const dias = diasEntre(f.inicio, dia);
      const objetivo = cafe ? 1 : l.variedad === 'CCN51' ? az.entero(5, 7) : az.entero(4, 6);
      if (dias >= objetivo) {
        const ocup = await poscosecha.ocupacion();
        const metodo = az.probable(0.7) ? 'TENDAL' : 'SECADORA';
        const destino = ocup.find((o) => o.tipo === metodo && o.libreKg >= (l.kgEntrada as number) && o.estado !== 'EN_MANTENIMIENTO') ?? ocup.find((o) => ['TENDAL', 'SECADORA'].includes(o.tipo) && o.libreKg >= (l.kgEntrada as number) && o.estado !== 'EN_MANTENIMIENTO');
        if (destino) await intentar(ctx, 'secar', () => poscosecha.iniciarSecado(id, destino.tipo, String(destino._id), u.ACOPIO));
      } else if (dias > 0 && dias % 2 === 0 && !f.volteos.some((v) => diasEntre(v.fecha, dia) === 0)) {
        await intentar(ctx, 'volteo', () => poscosecha.registrarVolteo(id, az.decimal(42, 49, 1), u.ACOPIO));
      }
    } else if (l.estado === 'SECANDO') {
      const s = l.secado as { inicio: Date; metodo: string; mediciones: unknown[] };
      const dias = diasEntre(s.inicio, dia);
      const necesarios = s.metodo === 'SECADORA' ? 2 : cafe ? az.entero(6, 9) : az.entero(4, 7);
      if (dias >= necesarios) {
        const factor = l.estadoEntrega === 'BABA' ? az.decimal(0.34, 0.4, 3) : l.estadoEntrega === 'CEREZA' ? az.decimal(0.18, 0.22, 3) : az.decimal(0.95, 0.99, 3);
        const humedad = cafe ? az.decimal(10.5, 12, 1) : az.pesado([[az.decimal(6, 7, 1), 95], [az.decimal(7.2, 7.8, 1), 5]] as [number, number][]); // a veces aún está húmedo → espera
        await intentar(ctx, 'terminar-secado', () => poscosecha.terminarSecado(id, redondear((l.kgEntrada as number) * factor), humedad, u.ACOPIO));
      } else if (dias >= 1 && s.mediciones.length < 2) {
        await intentar(ctx, 'humedad', () => poscosecha.medirHumedad(id, cafe ? az.decimal(20, 40, 1) : az.decimal(12, 30, 1), u.ACOPIO));
      }
    }
  }
}

// ─────────────────────────── Calidad ───────────────────────────
async function evaluarCalidad(ctx: Contexto, dia: Date, calidad: CalidadService) {
  const { az, u } = ctx;
  const LoteGrano = modelo(ctx.app, 'LoteGrano');
  const secos = await LoteGrano.find({ estado: 'SECO', updatedAt: { $lt: sumarDias(dia, -0.5) } }).limit(8).lean().exec();
  for (const l of secos) {
    if (l.cultivo === 'CAFE') {
      await intentar(ctx, 'calidad-cafe', () => calidad.evaluarGrano(String(l._id), { humedad: az.decimal(10.6, 12, 1), defectos300g: az.pesado([[az.entero(1, 5), 25], [az.entero(6, 23), 60], [az.entero(24, 60), 15]] as [number, number][]), puntajeTaza: az.decimal(79, 87, 1) }, u.CALIDAD));
      continue;
    }
    // Prueba de corte: el propio fermenta mejor; algunos productores no tanto.
    const base = l.origen === 'PROPIO' ? az.entero(74, 88) : az.entero(56, 86);
    const malo = az.probable(0.04);
    const mohosos = malo ? az.entero(5, 8) : az.entero(0, 2);
    const insectados = az.entero(0, 1);
    const germinados = az.entero(0, 1);
    const pizarrosos = Math.max(0, Math.min(18, az.entero(1, 100 - base > 30 ? 14 : 8)));
    let violetas = 100 - base - mohosos - insectados - germinados - pizarrosos;
    let bienFermentados = base;
    if (violetas < 0) {
      bienFermentados += violetas;
      violetas = 0;
    }
    const prueba = { bienFermentados, violetas, pizarrosos, mohosos, insectados, germinados, humedad: az.decimal(6, 7, 1), peso100Granos: az.entero(l.variedad === 'CCN51' ? 125 : 108, l.variedad === 'CCN51' ? 160 : 140), impurezas: az.decimal(0, 1, 1) };
    const r = await intentar(ctx, 'calidad-cacao', () => calidad.evaluarGrano(String(l._id), prueba, u.CALIDAD));
    if (r && l.variedad === 'NACIONAL' && az.probable(0.35)) await intentar(ctx, 'cata', () => calidad.catar(String(l._id), { notas: [az.elegir(['floral', 'frutal', 'nuez', 'caramelo']), az.elegir(['cacao', 'frutos rojos', 'cítrico', 'madera'])], puntaje: az.entero(6, 9) }, u.CALIDAD));
  }
  // No conformidades: se decide el destino a los pocos días.
  for (const l of await LoteGrano.find({ 'noConformidad.cerrada': false, 'noConformidad.fecha': { $lt: sumarDias(dia, -az.entero(2, 5)) } }).limit(3).lean().exec()) {
    await intentar(ctx, 'no-conformidad', () => calidad.cerrarNoConformidad(String(l._id), az.pesado([['DEVOLUCION', 40], ['DESCARTE', 40], ['REPROCESO', 20]] as [string, number][]), 'Decisión del comité de calidad', u.CALIDAD));
  }
  // Producto terminado sin liberar (RN-11): casi todo pasa; muy pocos lotes salen con sellado defectuoso.
  const inventario = ctx.app.get(InventarioService);
  for (const lote of (await inventario.listarLotes({ pendientesCalidad: true })).slice(0, 10)) {
    const p = lote.producto as unknown as { pesoNetoG: number };
    const ok = az.probable(0.97);
    await intentar(ctx, 'liberar-pt', () => calidad.controlProductoTerminado(String(lote._id), { pesoPromedioG: redondear((p.pesoNetoG || 100) * az.decimal(0.985, 1.02)), selladoOk: ok, etiquetaOk: true, temperaturaTemplado: az.decimal(29, 31.5, 1), tipoEmpaque: 'Funda trilaminada' }, u.CALIDAD));
  }
}

// ─────────────────────────── Producción ───────────────────────────
// La planta planifica como un MRP sencillo (MRP = "Material Requirements Planning", planificación de materiales):
//   1. Calcula cuánto se CONSUME de cada producto por día (promedio de las últimas 3 semanas de movimientos).
//   2. Si lo que queda alcanza para menos de "días de reorden", produce hasta cubrir los "días de cobertura".
//   3. Antes de crear la orden calcula cuántas tandas (múltiplos de la receta) PERMITE el stock de insumos.
//      Si no alcanza ni para una tanda, NO crea la orden: anota que falta el semielaborado para producirlo primero.
// Antes (versión anterior) la orden se creaba siempre por el total y, si faltaba algo, se anulaba: la pasta pedía más
// nibs de los que había, los nibs estaban "sobre su objetivo" y nunca se reponían → casi ninguna orden se cerraba.

// Días de stock que se buscan tener (cobertura) y nivel en el que se vuelve a producir (reorden).
const PLAN = {
  terminado: { cobertura: 21, reorden: 9, maxTandas: 6, maxOrdenesDia: 5 },
  semielaborado: { cobertura: 14, reorden: 7, maxTandas: 4, maxOrdenesDia: 3 },
};
// Piso de stock de cada semielaborado (kg) aunque el consumo reciente sea bajo: es el "colchón" de la planta.
const PISO_SEMI: Record<string, number> = { 'SEM-NIBS': 120, 'SEM-PASTA': 150, 'SEM-MANTECA': 25, 'SEM-COCOA': 30, 'SEM-CAFE': 50 };
// Bodegas de donde la planta toma insumos (la tienda NO: lo que está en la tienda es para vender).
const BODEGAS_PLANTA = ['MATERIA_PRIMA', 'INSUMOS_PLANTA', 'PRODUCTO_TERMINADO'];
// Ventas por mayor estimadas por día (además de la tienda): ≈ 3 cotizaciones por semana, 83 % aceptadas, 4 líneas.
// Cada línea elige un producto según su peso en DEMANDA_TIENDA; las barras salen de a ~42 unidades y el resto de a ~12.
const TOTAL_DEMANDA = Object.values(DEMANDA_TIENDA).reduce((s, d) => s + d, 0);
const mayoristaDiaria = (s: string) => ((3 * 0.83 * 4) / 7) * (DEMANDA_TIENDA[s] / TOTAL_DEMANDA) * (s.endsWith('-50') ? 42 : 12);

// consumoDiario(): promedio por día de lo que SALIÓ de cada producto (ventas + consumo de producción) en N días.
async function consumoDiario(ctx: Contexto, dias: number): Promise<Record<string, number>> {
  const Movimiento = modelo(ctx.app, 'Movimiento');
  const filas = await Movimiento.aggregate<{ _id: unknown; total: number }>([
    { $match: { tipo: { $in: ['SALIDA_VENTA', 'SALIDA_PRODUCCION'] }, fecha: { $gte: sumarDias(new Date(), -dias) } } },
    { $group: { _id: '$producto', total: { $sum: '$cantidad' } } },
  ]).exec();
  return Object.fromEntries(filas.map((f) => [String(f._id), f.total / dias]));
}

// stockPlanta(): lo que la planta puede usar YA de cada producto (lotes liberados, sin bloqueo, sin vencer, no reservados).
async function stockPlanta(ctx: Contexto): Promise<Record<string, number>> {
  const bodegas = BODEGAS_PLANTA.map((t) => ctx.bodega[t]).filter(Boolean);
  const LoteProducto = modelo(ctx.app, 'LoteProducto');
  const ahora = new Date();
  const lotes = await LoteProducto.find({ bodega: { $in: bodegas }, cantidad: { $gt: 0 }, liberado: true, bloqueado: { $ne: true }, $or: [{ vencimiento: null }, { vencimiento: { $exists: false } }, { vencimiento: { $gt: ahora } }] })
    .select('producto cantidad reservado')
    .lean()
    .exec();
  const mapa: Record<string, number> = {};
  for (const l of lotes) mapa[String(l.producto)] = (mapa[String(l.producto)] ?? 0) + Math.max(0, (l.cantidad as number) - ((l.reservado as number) ?? 0));
  return mapa;
}

// tandasPosibles(): cuántas tandas de la receta alcanzan con el stock de la planta (el componente más escaso manda).
function tandasPosibles(ctx: Contexto, receta: (typeof RECETAS)[number], stock: Record<string, number>) {
  return Math.min(...receta[2].map(([componente, cantidad]) => Math.floor((stock[ctx.sku[componente]] ?? 0) / cantidad)));
}

async function planificarProduccion(ctx: Contexto, dia: Date, esHoy: boolean, horaLimite: number, produccion: ProduccionService, inventario: InventarioService) {
  const { az, u, sku } = ctx;
  const OrdenProduccion = modelo(ctx.app, 'OrdenProduccion');
  // Hoy (último día del seed): si todavía no son las 16:00, las órdenes quedan EN PROCESO (se ven en el tablero).
  const cerrarHoy = !esHoy || horaLimite > 16;
  let minuto = 0; // separa la hora de cada orden (10:30, 10:35, 10:40…)

  // ejecutar(): inicia una orden y, al final de la tarde, la cierra con lo producido. Si algo falla, la anula
  // (así nunca queda una orden "colgada" EN PROCESO reteniendo insumos ni una máquina marcada EN USO).
  const ejecutar = async (ordenId: string, s: string, cantidad: number, anularSiNoInicia = true) => {
    hora(dia, 10, 30 + minuto);
    const iniciada = await intentar(ctx, 'orden-iniciar', () => produccion.iniciar(ordenId, u.PRODUCCION));
    if (!iniciada) {
      if (anularSiNoInicia) await intentar(ctx, 'orden-anular', () => produccion.anular(ordenId));
      return false;
    }
    if (!cerrarHoy) return true;
    hora(dia, 16, minuto);
    minuto += 5;
    const producidas = Math.ceil(cantidad * az.decimal(0.98, 1, 3));
    const buenas = Math.min(producidas, Math.floor(cantidad * az.decimal(0.95, 1, 3))); // las buenas nunca superan a las producidas
    const cerrada = await intentar(ctx, 'orden-cerrar', () => produccion.cerrar(ordenId, { cantidadProducida: producidas, cantidadBuena: buenas, tipoEmpaque: s.startsWith('SEM') ? 'Saco interno' : 'Funda trilaminada' }, u.PRODUCCION));
    if (!cerrada) await intentar(ctx, 'orden-anular', () => produccion.anular(ordenId));
    return Boolean(cerrada);
  };

  // 1) Primero se ejecutan las órdenes que quedaron PLANIFICADAS para hoy (o atrasadas).
  const pendientes = await OrdenProduccion.find({ estado: 'PLANIFICADA', fechaProgramada: { $lt: sumarDias(dia, 1) } }).populate('producto', 'sku').lean().exec();
  for (const o of pendientes) {
    const s = (o.producto as unknown as { sku: string }).sku;
    const receta = RECETAS.find((r) => r[0] === s)!;
    const lotes = (o.cantidadPlanificada as number) / receta[1];
    const atrasada = diasEntre(o.fechaProgramada as Date, dia) >= 3;
    if (tandasPosibles(ctx, receta, await stockPlanta(ctx)) >= lotes) {
      // Se le asigna una máquina libre de ese tipo (la que tenía puede haber entrado a mantenimiento).
      await OrdenProduccion.updateOne({ _id: o._id }, { $set: { maquina: (await maquinaPara(ctx, receta[5])) ?? null } }).exec();
      await ejecutar(String(o._id), s, o.cantidadPlanificada as number, atrasada);
    }
    // Si lleva 3 días atrasada y aún no hay insumos, el jefe de planta la anula y se replanifica.
    else if (atrasada) await intentar(ctx, 'orden-anular', () => produccion.anular(String(o._id)));
  }

  // 2) Planificación del día: semielaborados (en orden de la cadena) y luego terminados (el más urgente primero).
  const consumo = await consumoDiario(ctx, 21);
  const enPlanta = async () => await stockPlanta(ctx);
  const resumen = await inventario.resumenStock();
  // fisico − reservado: incluye lotes recién producidos que Calidad aún no libera (así no se produce dos veces).
  const existencia = (s: string) => {
    const r = resumen.find((x) => x.sku === s);
    return r ? r.fisico - r.reservado : 0;
  };
  const faltaSemi = new Set<string>(); // semielaborados que algún terminado necesitó y no había

  const planificar = async (s: string, tipo: 'terminado' | 'semielaborado', objetivo: number) => {
    const receta = RECETAS.find((r) => r[0] === s)!;
    const necesita = Math.max(0, objetivo - existencia(s));
    const tandasNecesarias = Math.min(PLAN[tipo].maxTandas, Math.ceil(necesita / receta[1]));
    if (tandasNecesarias <= 0) return false;
    const stock = await enPlanta();
    const posibles = tandasPosibles(ctx, receta, stock);
    if (posibles <= 0) {
      // Anota qué semielaborado faltó para reponerlo (aunque esté sobre su piso).
      for (const [c, cant] of receta[2]) if (c.startsWith('SEM-') && (stock[sku[c]] ?? 0) < cant) faltaSemi.add(c);
      ctx.errores['orden-sin-insumos'] = (ctx.errores['orden-sin-insumos'] ?? 0) + 1;
      return false;
    }
    const cantidad = Math.min(tandasNecesarias, posibles) * receta[1];
    hora(dia, 10, 30 + minuto);
    const orden = await intentar(ctx, 'orden-crear', () => produccion.crearOrden({ producto: sku[s], cantidadPlanificada: cantidad, fechaProgramada: new Date().toISOString(), maquina: undefined }, u.PRODUCCION));
    if (!orden) return false;
    // Se asigna una máquina del tipo de la receta que esté disponible (RN-24: si está en mantenimiento no se usa).
    const maquina = await maquinaPara(ctx, receta[5]);
    if (maquina) await OrdenProduccion.updateOne({ _id: orden._id }, { $set: { maquina } }).exec();
    return ejecutar(String(orden._id), s, cantidad);
  };

  // 2a) Semielaborados: objetivo = máx(piso, consumo × días de cobertura) cuando bajan del nivel de reorden.
  const objetivoSemi = (s: string) => Math.max(PISO_SEMI[s], (consumo[sku[s]] ?? 0) * PLAN.semielaborado.cobertura);
  const reordenSemi = (s: string) => Math.max(PISO_SEMI[s] * 0.6, (consumo[sku[s]] ?? 0) * PLAN.semielaborado.reorden);
  let semis = 0;
  for (const s of SEMIELABORADOS) {
    if (semis >= PLAN.semielaborado.maxOrdenesDia) break;
    if (existencia(s) < reordenSemi(s) && (await planificar(s, 'semielaborado', objetivoSemi(s)))) semis++;
  }

  // 2b) Terminados: demanda = máx(lo consumido en 3 semanas, lo esperado en tienda + mayoristas).
  const demanda = (s: string) => Math.max(consumo[sku[s]] ?? 0, DEMANDA_TIENDA[s] + mayoristaDiaria(s));
  const urgentes = Object.keys(DEMANDA_TIENDA)
    .filter((s) => s !== 'CHB-NAT-50' && RECETAS.some((r) => r[0] === s)) // el chocolate blanco está "próximamente"
    .map((s) => ({ s, dias: existencia(s) / demanda(s) }))
    .filter((x) => x.dias < PLAN.terminado.reorden)
    .sort((a, b) => a.dias - b.dias); // primero el que se acaba antes
  let terminados = 0;
  for (const { s } of urgentes) {
    if (terminados >= PLAN.terminado.maxOrdenesDia) break;
    if (await planificar(s, 'terminado', demanda(s) * PLAN.terminado.cobertura)) terminados++;
  }

  // 2c) Si a algún terminado le faltó un semielaborado, se produce ese semielaborado ahora (para mañana).
  for (const s of SEMIELABORADOS.filter((x) => faltaSemi.has(x))) {
    if (semis >= PLAN.semielaborado.maxOrdenesDia + 1) break;
    if (await planificar(s, 'semielaborado', objetivoSemi(s) + PISO_SEMI[s])) semis++;
  }

  // 3) Una orden queda PLANIFICADA para mañana (así el tablero de planificación siempre muestra algo por venir).
  if (az.probable(0.35)) {
    const s = az.pesado(Object.entries(DEMANDA_TIENDA).filter(([x]) => x !== 'CHB-NAT-50') as [string, number][]);
    const receta = RECETAS.find((r) => r[0] === s);
    if (receta) await intentar(ctx, 'orden-planificada', () => produccion.crearOrden({ producto: sku[s], cantidadPlanificada: receta[1], fechaProgramada: sumarDias(dia, 1).toISOString(), maquina: undefined }, u.PRODUCCION));
  }
}

// maquinaPara(): una máquina del tipo pedido que no esté en mantenimiento.
async function maquinaPara(ctx: Contexto, tipo: string): Promise<string | undefined> {
  const Activo = modelo(ctx.app, 'Activo');
  const m = await Activo.findOne({ tipo, estado: 'DISPONIBLE' }).lean().exec();
  return m ? String(m._id) : undefined;
}

// ─────────────────────────── Tienda ───────────────────────────
// abastecerTienda(): si a la tienda le queda menos de una semana de un producto, bodega le lleva ~15 días,
// tomando de VARIOS lotes liberados si hace falta (primero el que vence antes: FEFO, RN-13).
async function abastecerTienda(ctx: Contexto, inventario: InventarioService) {
  const lotesPt = await inventario.listarLotes({ bodega: ctx.bodega.PRODUCTO_TERMINADO });
  const lotesTienda = await inventario.listarLotes({ bodega: ctx.bodega.TIENDA });
  const idDe = (l: { producto: unknown }) => String((l.producto as { _id: string })._id ?? l.producto);
  for (const [s, diaria] of Object.entries(DEMANDA_TIENDA)) {
    const id = ctx.sku[s];
    const enTienda = lotesTienda.filter((l) => idDe(l) === id).reduce((t, l) => t + l.cantidad - (l.reservado ?? 0), 0);
    if (enTienda >= diaria * 7) continue;
    let falta = Math.ceil(diaria * 15 - enTienda);
    const candidatos = lotesPt.filter((l) => idDe(l) === id && l.liberado && !l.bloqueado && l.cantidad - l.reservado > 0).sort((a, b) => +new Date(a.vencimiento ?? 0) - +new Date(b.vencimiento ?? 0));
    for (const lote of candidatos) {
      if (falta <= 0) break;
      const cantidad = Math.min(lote.cantidad - lote.reservado, falta);
      if (cantidad > 0 && (await intentar(ctx, 'transferencia', () => inventario.transferir(String(lote._id), ctx.bodega.TIENDA, cantidad, ctx.u.BODEGA)))) falta -= cantidad;
    }
  }
}

async function ventaMostrador(ctx: Contexto, dia: Date, esHoy: boolean, horaLimite: number, caja: CajaService, facturacion: FacturacionService) {
  const { az, u } = ctx;
  const lineasServicio = ctx.app.get(LineasService);
  const diaSemana = dia.getDay();
  if (diaSemana === 0) return;
  const mes = dia.getMonth() + 1;
  hora(dia, 8, 45);
  const turno = await intentar(ctx, 'abrir-caja', () => caja.abrir(50, u.CAJA));
  if (!turno) return;
  // Más ventas en diciembre (Navidad), febrero (San Valentín) y los sábados.
  const factor = (mes === 12 ? 1.7 : mes === 2 ? 1.3 : mes === 5 ? 1.15 : 1) * (diaSemana === 6 ? 1.4 : 1);
  const ventas = Math.round(az.entero(5, 10) * factor);
  const productos = Object.entries(DEMANDA_TIENDA).filter(([s]) => s !== 'CHB-NAT-50');
  for (let i = 0; i < ventas; i++) {
    const h = 9 + Math.floor((i / ventas) * 10);
    if (esHoy && h >= horaLimite) break;
    hora(dia, h, az.entero(0, 59));
    const lineas = az.entero(1, 3);
    const items: { tipo: string; refId: string; cantidad: number }[] = [];
    for (let j = 0; j < lineas; j++) {
      const [s] = az.pesado(productos.map((p) => [p, p[1]] as [[string, number], number]));
      if (items.some((x) => x.refId === ctx.sku[s])) continue;
      items.push({ tipo: 'PRODUCTO', refId: ctx.sku[s], cantidad: az.pesado([[1, 60], [2, 28], [3, 8], [6, 4]] as [number, number][]) });
    }
    const forma = az.pesado([['01', 58], ['19', 17], ['16', 10], ['20', 15]] as [string, number][]);
    const identificado = az.probable(0.3);
    // vender(): primero se calcula el total (como la pantalla de caja) y luego se cobra con la forma elegida.
    const vender = async (cliente?: string) => {
      const { totales } = await lineasServicio.armar(items, 'CONSUMIDOR', u.CAJA, 'MOSTRADOR');
      const recibido = forma === '01' ? Math.ceil(totales.total / 5) * 5 + az.elegir([0, 0, 5, 10]) : undefined;
      return facturacion.emitir({ clienteId: cliente, items, canal: 'MOSTRADOR', pagos: [{ codigo: forma, monto: totales.total }], recibido, enviarCorreo: false }, u.CAJA);
    };
    // Si pasa de $50 sin datos (RN-19), la cajera pide la cédula y vuelve a facturar.
    const f = await intentar(ctx, 'venta-mostrador', () => vender(identificado ? az.elegir(ctx.consumidores) : undefined));
    if (!f && !identificado) await intentar(ctx, 'venta-mostrador-con-cedula', () => vender(az.elegir(ctx.consumidores)));
  }
  if (esHoy && horaLimite < 19) return; // hoy la caja sigue abierta
  hora(dia, 19, 5);
  const actual = await caja.actual(u.CAJA);
  const efectivo = redondear(50 + (actual?.ventasPorFormaPago?.['01'] ?? 0));
  await intentar(ctx, 'cerrar-caja', () => caja.cerrar(redondear(efectivo + az.pesado([[0, 85], [-1.5, 6], [0.5, 5], [-5, 4]] as [number, number][])), undefined, u.CAJA));
}

// ─────────────────────────── Ventas por mayor y exportación ───────────────────────────
async function ventasMayoristas(ctx: Contexto, dia: Date, cotizaciones: CotizacionesService, pedidos: PedidosService, facturacion: FacturacionService, logistica: LogisticaService, clientes: ClientesService) {
  const { az, u, sku } = ctx;
  const diaSemana = dia.getDay();
  const Cotizacion = modelo(ctx.app, 'Cotizacion');
  const Pedido = modelo(ctx.app, 'Pedido');
  const Factura = modelo(ctx.app, 'Factura');
  const nacionales = ctx.clientesEmpresa.filter((c) => c.tipoCliente !== 'EXPORTADOR');
  const exportadores = ctx.clientesEmpresa.filter((c) => c.tipoCliente === 'EXPORTADOR');

  // Nuevas cotizaciones (martes y jueves).
  if (diaSemana === 2 || diaSemana === 4) {
    for (let i = 0; i < az.entero(1, 2); i++) {
      const cliente = az.elegir(nacionales);
      const n = az.entero(2, 6);
      const elegidos = new Set<string>();
      while (elegidos.size < n) elegidos.add(az.pesado(Object.entries(DEMANDA_TIENDA).filter(([s]) => s !== 'CHB-NAT-50').map(([s, d]) => [s, d] as [string, number])));
      const items = [...elegidos].map((s) => ({ tipo: 'PRODUCTO', refId: sku[s], cantidad: s.endsWith('-50') ? az.elegir([24, 36, 48, 60]) : az.elegir([6, 10, 12, 20]), descuentoPct: az.probable(0.3) ? az.elegir([2, 3, 5]) : 0 }));
      const cot = await intentar(ctx, 'cotizacion', () => cotizaciones.crear({ cliente: cliente._id, items, condiciones: cliente.creditoDias ? `Crédito ${cliente.creditoDias} días` : 'Contado' }, u.VENTAS));
      if (cot) await intentar(ctx, 'cotizacion-enviar', () => cotizaciones.enviar(String(cot._id)));
    }
  }
  // Exportación: la primera semana del mes, si hay grano suficiente.
  if (dia.getDate() >= 3 && dia.getDate() <= 9 && diaSemana === 3) {
    const inventario = ctx.app.get(InventarioService);
    const stock = await inventario.resumenStock({ productoIds: [sku['CAC-CCN-EXP'], sku['CAC-NAC-PRE'], sku['CAF-ARA-PRE']] });
    const ccn = stock.find((s) => s.sku === 'CAC-CCN-EXP')?.disponible ?? 0;
    const sacos = Math.min(110, Math.floor((ccn - 600) / 69)); // máximo 7 590 kg: cabe en el CAM-01 de 8 t (RN-25)
    if (sacos >= 30) {
      const items = [{ tipo: 'PRODUCTO', refId: sku['CAC-CCN-EXP'], cantidad: sacos * 69 }];
      const pre = stock.find((s) => s.sku === 'CAC-NAC-PRE')?.disponible ?? 0;
      if (pre > 300 && sacos * 69 + 276 <= 7800) items.push({ tipo: 'PRODUCTO', refId: sku['CAC-NAC-PRE'], cantidad: 276 });
      const exportador = az.elegir(exportadores);
      const cot = await intentar(ctx, 'cotizacion-export', () => cotizaciones.crear({ cliente: exportador._id, items, canal: 'EXPORTACION', condiciones: 'FOB Puerto Bolívar · pago a 45 días' }, u.VENTAS));
      if (cot) await intentar(ctx, 'cotizacion-enviar', () => cotizaciones.enviar(String(cot._id)));
    }
  }
  // Respuestas de los clientes a las cotizaciones enviadas.
  for (const c of await Cotizacion.find({ estado: 'ENVIADA', fecha: { $lt: sumarDias(dia, -az.entero(1, 4)) } }).limit(6).lean().exec()) {
    const cliente = ctx.clientesEmpresa.find((x) => x._id === String(c.cliente));
    const decision = az.pesado([['ACEPTA', c.canal === 'EXPORTACION' ? 90 : 62], ['RECHAZA', 13], ['ESPERA', 25]] as [string, number][]);
    if (decision === 'ACEPTA') await intentar(ctx, 'pedido', () => cotizaciones.aceptar(String(c._id), { creditoDias: cliente?.creditoDias ?? 0, entrega: { direccion: 'Bodega del cliente', fechaEstimada: sumarDias(dia, 2).toISOString() }, exportacion: c.canal === 'EXPORTACION' ? { naviera: az.elegir(['Maersk', 'MSC', 'CMA CGM']), puertoDestino: az.elegir(['Rotterdam', 'Le Havre', 'Hamburgo', 'Filadelfia']), contenedor: `MSKU${az.entero(1000000, 9999999)}` } : undefined }, u.VENTAS));
    else if (decision === 'RECHAZA') await intentar(ctx, 'cotizacion-rechazar', () => cotizaciones.rechazar(String(c._id), 'El cliente consiguió otro proveedor'));
  }
  // Bodega prepara los pedidos confirmados.
  for (const p of await Pedido.find({ estado: 'CONFIRMADO' }).limit(6).lean().exec()) await intentar(ctx, 'preparar', () => pedidos.cambiarEstado(String(p._id), 'PREPARANDO', u.BODEGA));
  // Logística entrega lo preparado ayer y se factura.
  for (const p of await Pedido.find({ estado: 'PREPARANDO', updatedAt: { $lt: sumarDias(dia, -0.5) } }).populate('cliente', 'nombre ciudad').limit(4).lean().exec()) {
    const peso = redondear((p.items as { cantidad: number; unidad?: string; codigo: string }[]).reduce((s, i) => s + (i.unidad === 'KG' ? i.cantidad : i.cantidad * 0.12), 0));
    const exporta = p.canal === 'EXPORTACION';
    const camion = exporta ? 'CAM-01' : peso > 1800 ? 'CAM-03' : 'FUR-01';
    const chofer = ctx.trabajadores.filter((t) => t.cargo === 'CHOFER')[az.entero(0, 3)];
    hora(dia, 12, 30);
    const cliente = p.cliente as unknown as { nombre: string; ciudad?: string };
    const viaje = await intentar(ctx, 'viaje-entrega', () =>
      logistica.crear({ tipo: exporta ? 'EXPORTACION' : 'ENTREGA_VENTA', camion: ctx.activo[camion], chofer: chofer._id, origen: 'Planta El Guabo', destino: exporta ? 'Puerto Bolívar' : `${cliente.nombre} (${cliente.ciudad ?? 'Machala'})`, salida: new Date().toISOString(), llegadaEstimada: sumarDias(new Date(), 0.2).toISOString(), kmEstimados: exporta ? 32 : az.entero(15, 240), carga: { descripcion: `Pedido ${p.numero}`, pesoKg: Math.max(1, peso), bultos: exporta ? Math.ceil(peso / 69) : az.entero(4, 30) }, pedido: String(p._id) }, u.LOGISTICA),
    );
    if (!viaje) continue;
    const km0 = Number((await modelo(ctx.app, 'Activo').findById(ctx.activo[camion]).lean().exec())?.odometro ?? 0);
    await intentar(ctx, 'viaje-iniciar', () => logistica.iniciar(String(viaje._id), km0));
    hora(dia, 16, 30);
    const km = viaje.kmEstimados * 2;
    await intentar(ctx, 'viaje-completar', () => logistica.completar(String(viaje._id), { kmLlegada: km0 + km, combustible: redondear(km * az.decimal(0.12, 0.2)), peajes: km > 100 ? 2 : 0, viaticos: km > 200 ? 15 : 0 }));
    await intentar(ctx, 'despachar', () => pedidos.cambiarEstado(String(p._id), 'DESPACHADO', u.LOGISTICA));
    await intentar(ctx, 'factura-pedido', () => facturacion.emitir({ pedidoId: String(p._id), creditoDias: p.creditoDias as number, pagos: (p.creditoDias as number) > 0 ? undefined : [{ codigo: '20', monto: (p.totales as { total: number }).total }], enviarCorreo: true }, u.VENTAS));
  }
  // Cobros de facturas a crédito: casi todos pagan cerca del vencimiento; algunos se atrasan.
  hora(dia, 17, 30);
  for (const f of await Factura.find({ tipoComprobante: '01', estado: { $ne: 'ANULADA' }, saldo: { $gt: 0.005 }, vence: { $lt: sumarDias(dia, az.entero(-3, 5)) } }).limit(8).lean().exec()) {
    if (az.probable(0.18)) continue; // moroso: no paga hoy
    const parcial = az.probable(0.2);
    const monto = parcial ? redondear((f.saldo as number) * 0.5) : (f.saldo as number);
    await intentar(ctx, 'abono', () => facturacion.abonar(String(f._id), { monto, formaPago: '20', referencia: `TR-${az.entero(100000, 999999)}` }, u.VENTAS));
  }
  // Muy de vez en cuando, una devolución (nota de crédito) la hace la gerente.
  if (az.probable(0.01)) {
    const f = await Factura.findOne({ tipoComprobante: '01', canal: 'MAYORISTA', estado: { $ne: 'ANULADA' }, totalNotasCredito: 0 }).sort({ fechaEmision: -1 }).lean().exec();
    if (f) await intentar(ctx, 'nota-credito', () => facturacion.notaCredito(String(f._id), { motivo: 'Producto con empaque dañado en el transporte', lineas: [{ indice: 0, cantidad: Math.max(1, Math.floor(((f.items as { cantidad: number }[])[0].cantidad as number) / 6)) }], devolverStock: false }, u.GERENTE));
  }
  void clientes;
}

// ─────────────────────────── Equipos, alquileres y fletes ───────────────────────────
async function equiposYFletes(ctx: Contexto, dia: Date, equipos: EquiposService, logistica: LogisticaService, facturacion: FacturacionService) {
  const { az, u } = ctx;
  const Alquiler = modelo(ctx.app, 'Alquiler');
  const fincas = ctx.clientesEmpresa.filter((c) => ['Hacienda Bananera Los Ángeles S.A.', 'Finca Cacaotera El Porvenir Cía. Ltda.', 'Asociación de Cafetaleros de Piñas'].includes(c.nombre));
  // Nuevas reservas de alquiler.
  if (az.probable(0.14)) {
    const codigo = az.elegir(['MAQ-001', 'MAQ-002', 'MAQ-003', 'MAQ-004', 'MAQ-005', 'MAQ-006', 'MAQ-007']);
    const desde = sumarDias(dia, az.entero(1, 6));
    await intentar(ctx, 'alquiler', () => equipos.crearAlquiler({ activo: ctx.activo[codigo], cliente: az.elegir(fincas)._id, desde: desde.toISOString(), hasta: sumarDias(desde, az.entero(1, 6)).toISOString(), conOperador: codigo.startsWith('MAQ-00') && Number(codigo.slice(-1)) <= 2 && az.probable(0.5), lugarTrabajo: az.elegir(['Finca en El Guabo', 'Finca en Pasaje', 'Finca en Piñas']) }, u.VENTAS));
  }
  // Entregas del día.
  for (const a of await Alquiler.find({ estado: 'RESERVADO', desde: { $lte: dia } }).lean().exec()) {
    const activo = await modelo(ctx.app, 'Activo').findById(a.activo).lean().exec();
    await intentar(ctx, 'alquiler-entregar', () => equipos.entregar(String(a._id), { horometro: Number(activo?.horometro ?? 0), estadoEquipo: 'Buen estado, revisado por el taller' }));
  }
  // Devoluciones (a veces un día tarde) y su factura.
  for (const a of await Alquiler.find({ estado: 'ACTIVO', hasta: { $lte: dia } }).lean().exec()) {
    if (az.probable(0.2) && diasEntre(a.hasta as Date, dia) === 0) continue; // se atrasa un día
    const entrega = (a.entrega as { horometro: number }) ?? { horometro: 0 };
    const dias = Math.max(1, diasEntre(a.desde as Date, dia) + 1);
    const devuelto = await intentar(ctx, 'alquiler-devolver', () => equipos.devolver(String(a._id), { horometro: entrega.horometro + dias * az.entero(4, 8), danos: az.probable(0.08) ? az.elegir([40, 80, 120]) : 0, observaciones: 'Devuelto en la planta' }));
    if (devuelto) await intentar(ctx, 'factura-alquiler', () => facturacion.emitir({ clienteId: String(a.cliente), items: [{ tipo: 'ALQUILER', refId: String(a._id), cantidad: 1 }], canal: 'MAYORISTA', pagos: undefined, creditoDias: 0, enviarCorreo: true }, u.VENTAS));
  }
  // Recolección en fincas (miércoles y sábados) y fletes a terceros.
  if ([3, 6].includes(dia.getDay()) || az.probable(0.12)) {
    const flete = ![3, 6].includes(dia.getDay());
    const camion = flete ? az.elegir(['CAM-01', 'CAM-02']) : 'CAM-02';
    const chofer = ctx.trabajadores.filter((t) => t.cargo === 'CHOFER')[az.entero(0, 3)];
    const cliente = flete ? az.elegir(fincas) : null;
    const km = flete ? az.entero(30, 160) : az.entero(40, 90);
    const peso = flete ? az.entero(2000, 4800) : az.entero(600, 3000);
    hora(dia, 13, 15);
    const viaje = await intentar(ctx, flete ? 'flete' : 'recoleccion', () =>
      logistica.crear({ tipo: flete ? 'FLETE_CLIENTE' : 'RECOLECCION_ACOPIO', camion: ctx.activo[camion], chofer: chofer._id, origen: flete ? `Finca de ${cliente!.nombre}` : 'Planta El Guabo', destino: flete ? az.elegir(['Puerto Bolívar', 'Guayaquil', 'Machala']) : az.elegir(['Recintos de El Guabo', 'Fincas de Pasaje', 'Santa Rosa']), salida: new Date().toISOString(), llegadaEstimada: sumarDias(new Date(), 0.25).toISOString(), kmEstimados: km, carga: { descripcion: flete ? az.elegir(['Banano en cajas', 'Cacao seco en sacos', 'Fertilizante']) : 'Cacao de productores', pesoKg: peso }, cliente: cliente?._id, tarifa: flete ? { modo: az.elegir(['POR_KM', 'POR_TONELADA', 'FIJA']), valor: az.elegir([1.2, 12, 90]) } : undefined }, u.LOGISTICA),
    );
    if (viaje) {
      const km0 = Number((await modelo(ctx.app, 'Activo').findById(ctx.activo[camion]).lean().exec())?.odometro ?? 0);
      await intentar(ctx, 'viaje-iniciar', () => logistica.iniciar(String(viaje._id), km0));
      hora(dia, 17, 45);
      const completo = await intentar(ctx, 'viaje-completar', () => logistica.completar(String(viaje._id), { kmLlegada: km0 + km * 2, combustible: redondear(km * 2 * az.decimal(0.12, 0.2)), peajes: km > 80 ? 2 : 0, viaticos: km > 120 ? 12 : 0 }));
      // El flete a terceros se factura como servicio de transporte (tarifa 0 %: transporte de carga, Art. 56 LRTI).
      if (completo && flete && completo.tarifa?.total) await intentar(ctx, 'factura-flete', () => facturacion.emitir({ clienteId: cliente!._id, items: [{ tipo: 'SERVICIO', descripcion: `Flete ${completo.origen} → ${completo.destino} (${completo.carga.pesoKg} kg) · viaje ${completo.codigo}`, cantidad: 1, precioUnitario: completo.tarifa!.total, tarifaIva: 0 }], canal: 'MAYORISTA', creditoDias: 0, pagos: [{ codigo: '20', monto: completo.tarifa!.total }], enviarCorreo: true }, u.VENTAS));
    }
  }
}

// ─────────────────────────── Taller ───────────────────────────
async function taller(ctx: Contexto, dia: Date, mantenimiento: MantenimientoService, facturacion: FacturacionService) {
  const { az, u, sku } = ctx;
  const Orden = modelo(ctx.app, 'OrdenMantenimiento');
  const Activo = modelo(ctx.app, 'Activo');
  // Correctivos: una falla cada ~3 semanas.
  if (az.probable(0.05)) {
    const codigo = az.elegir(['SEC-01', 'TOS-01', 'MOL-01', 'CAM-02', 'CAM-03', 'MAQ-001', 'MAQ-006', 'EMP-01', 'CON-01']);
    await intentar(ctx, 'falla', () => mantenimiento.reportarFalla({ activo: ctx.activo[codigo], descripcion: az.elegir(['Ruido anormal en rodamientos', 'No enciende el quemador', 'Pérdida de aceite', 'Banda rota', 'Sobrecalentamiento del motor', 'Frenos con desgaste']), prioridad: az.elegir(['ALTA', 'URGENTE', 'MEDIA']) }, u.PRODUCCION));
  }
  // Servicio a clientes: uno cada ~5 semanas.
  if (az.probable(0.03)) {
    const finca = az.elegir(ctx.clientesEmpresa.filter((c) => c.tipoCliente === 'MAYORISTA'));
    await intentar(ctx, 'servicio-cliente', () => mantenimiento.servicioCliente({ cliente: finca._id, equipoCliente: { descripcion: az.elegir(['Bomba de riego', 'Desbrozadora', 'Tractor pequeño', 'Secadora de cacao']), marca: az.elegir(['Honda', 'Stihl', 'Kubota', 'Yamaha']), serie: `S-${az.entero(10000, 99999)}` }, falla: 'Mantenimiento general y revisión' }, u.MANTENIMIENTO));
  }
  // Avanza las órdenes abiertas.
  for (const o of await Orden.find({ estado: { $in: ['ABIERTA', 'EN_PROCESO', 'ESPERANDO_REPUESTO'] } }).limit(8).lean().exec()) {
    const id = String(o._id);
    if (o.tipo === 'SERVICIO_CLIENTE' && !o.presupuesto) {
      await intentar(ctx, 'presupuesto', () => mantenimiento.presupuestar(id, { total: az.elegir([60, 85, 120, 180]), aprobado: true }));
      continue;
    }
    if (o.estado === 'ABIERTA' || o.estado === 'ESPERANDO_REPUESTO') {
      await intentar(ctx, 'om-asignar', () => mantenimiento.asignar(id, { tecnicoNombre: az.elegir(['Fernando Ruiz', 'Técnico Edison Vera', 'Técnico Klever Armijos']) }));
      await intentar(ctx, 'om-iniciar', () => mantenimiento.iniciar(id));
      continue;
    }
    // EN_PROCESO: repuestos y cierre.
    const activo = o.activo ? await Activo.findById(o.activo).lean().exec() : null;
    const vehiculo = activo && ['CAMION', 'FURGON', 'TRACTOR', 'GENERADOR', 'MONTACARGAS'].includes(activo.tipo as string);
    if (!(o.repuestos as unknown[]).length) {
      const repuestos = o.tipo === 'PREVENTIVO' && vehiculo ? [['REP-FILTRO-ACEITE', 1], ['REP-ACEITE', az.elegir([1, 2, 3])]] : o.tipo === 'CORRECTIVO' ? [[az.elegir(['REP-RODAMIENTO', 'REP-BANDA', 'REP-RESISTENCIA', 'REP-FRENOS', 'REP-GRASA']), 1]] : [['REP-GRASA', 0.5]];
      for (const [s, c] of repuestos) await intentar(ctx, 'om-repuesto', () => mantenimiento.agregarRepuesto(id, sku[s as string], c as number, u.MANTENIMIENTO));
    }
    if (az.probable(0.6)) {
      const uso = activo ? Number(['CAMION', 'FURGON'].includes(activo.tipo as string) ? activo.odometro : activo.horometro) : undefined;
      const fin = await intentar(ctx, 'om-terminar', () => mantenimiento.terminar(id, { horasManoObra: az.elegir([1, 2, 2.5, 3, 4, 6]), usoAlCerrar: uso, checklist: [{ tarea: (o.tarea as string) ?? 'Reparación', hecha: true }] }));
      if (fin && o.tipo === 'SERVICIO_CLIENTE') await intentar(ctx, 'factura-taller', () => facturacion.emitir({ clienteId: String(o.cliente), items: [{ tipo: 'SERVICIO', refId: id, cantidad: 1, tarifaIva: 15 }], canal: 'MAYORISTA', creditoDias: 0, enviarCorreo: true }, u.VENTAS));
    }
  }
}

// ─────────────────────────── Web ───────────────────────────
async function solicitudWeb(ctx: Contexto, web: WebService) {
  const { az, sku } = ctx;
  const nombre = `${az.elegir(NOMBRES)} ${az.elegir(APELLIDOS)}`;
  const correo = `${crearSlug(nombre).replace('-', '.')}@correo.ejemplo.ec`;
  const tipo = az.pesado([['COTIZACION', 50], ['CONTACTO', 20], ['ALQUILER', 15], ['SERVICIO', 10], ['AVISO_STOCK', 5]] as [string, number][]);
  const items = tipo === 'COTIZACION' ? [{ productoId: sku[az.elegir(['CH70-NAT-50', 'CH70-MAR-50', 'COB-70-1K', 'CAF-MED-G250', 'NIBS-1K', 'CAC-NAC-PRE'])], cantidad: az.elegir([12, 24, 50, 100]) }] : tipo === 'AVISO_STOCK' ? [{ productoId: sku['CHB-NAT-50'], cantidad: 1 }] : undefined;
  await intentar(ctx, 'solicitud-web', () =>
    web.crearSolicitud(
      {
        tipo,
        nombre,
        correo,
        telefono: `09${az.entero(10000000, 99999999)}`,
        ciudad: az.elegir(['Machala', 'Guayaquil', 'Cuenca', 'Loja', 'Quito']),
        mensaje: { COTIZACION: 'Quisiera precios por mayor para mi negocio.', CONTACTO: '¿Hacen envíos a Quito?', ALQUILER: 'Necesito el tractor una semana en mi finca.', SERVICIO: 'Necesito transporte de 5 t a Guayaquil.', AVISO_STOCK: 'Avísenme cuando llegue el chocolate blanco.' }[tipo],
        items,
        activoId: tipo === 'ALQUILER' ? ctx.activo['MAQ-001'] : undefined,
        desde: tipo === 'ALQUILER' ? sumarDias(new Date(), 5).toISOString() : undefined,
        hasta: tipo === 'ALQUILER' ? sumarDias(new Date(), 9).toISOString() : undefined,
        servicio: tipo === 'SERVICIO' ? 'TRANSPORTE' : undefined,
      },
      `190.152.${az.entero(1, 254)}.${az.entero(1, 254)}`,
    ),
  );
  // El vendedor atiende las solicitudes viejas.
  const Solicitud = modelo(ctx.app, 'SolicitudWeb');
  for (const s of await Solicitud.find({ estado: 'NUEVA', createdAt: { $lt: sumarDias(new Date(), -3) } }).limit(3).lean().exec()) {
    await Solicitud.updateOne({ _id: s._id }, { $set: { estado: az.probable(0.8) ? 'ATENDIDA' : 'DESCARTADA' }, $push: { notas: { fecha: new Date(), texto: 'Se contactó por WhatsApp', usuario: ctx.u.VENTAS.nombre } } }).exec();
  }
}
