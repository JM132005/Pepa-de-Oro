// ejecutar.ts → comando "npm run seed": BORRA la base de desarrollo y la llena con datos ficticios.
//
//   1. Instala el reloj simulado (antes de cargar NestJS, para que todo use la hora simulada).
//   2. Arranca la aplicación SIN servidor HTTP (createApplicationContext): solo los servicios.
//   3. Carga los datos base (empresa, personal, catálogo, haciendas, clientes, productores, máquinas).
//   4. Simula día por día los últimos N meses (por defecto 12) usando los mismos servicios de la API.
//
// Opciones:  npm run seed -- --meses=6      (menos historia, termina más rápido)
//            SEMILLA_DETALLE=true npm run seed   (muestra cada regla que rechazó una operación)

// Las variables se fijan ANTES de importar la app: zona horaria de Ecuador, sin cron y sin enviar correos.
process.env.TZ ??= 'America/Guayaquil';
process.env.SIN_CRON = 'true';
process.env.CORREO_MODO = 'apagado';
process.env.MONGO_TRANSACCIONES = 'false';

import { instalarReloj, fijarReloj, horaReal } from './reloj.js';
instalarReloj();

// import() dinámico: estos módulos se cargan DESPUÉS de instalar el reloj (los import normales se cargarían antes).
const { NestFactory } = await import('@nestjs/core');
const { getConnectionToken } = await import('@nestjs/mongoose');
const { AppModule } = await import('../app.module.js');
const { cargarBase, simularDia } = await import('./simulacion.js');
const { USUARIOS, CONTRASENA_DEMO } = await import('./datos.js');
type Conexion = import('mongoose').Connection;

const argMeses = process.argv.find((a) => a.startsWith('--meses='));
const meses = Number(argMeses?.split('=')[1] ?? process.env.SEMILLA_MESES ?? 12);

const hoy = horaReal();
const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - meses, 1, 6, 0, 0);
console.log(`🌱 Pepa de Oro — generando ${meses} meses de datos ficticios (${inicio.toLocaleDateString('es-EC')} → hoy)`);
console.log('   ⚠️  Se BORRA la base configurada en MONGO_URI y se crea de nuevo.');

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
const conexion = app.get<Conexion>(getConnectionToken());
console.log(`   Base: ${conexion.name} en ${conexion.host}:${conexion.port}`);
await conexion.dropDatabase();
// Se recrean los índices (únicos, compuestos) y la colección time series del clima.
for (const m of Object.values(conexion.models)) await m.syncIndexes().catch(() => undefined);
await (app.get((await import('../modulos/campo/campo.service.js')).CampoService)).prepararColecciones();

const ctx = await cargarBase(app, inicio);
const DateReal = Object.getPrototypeOf(Date) as DateConstructor; // la clase original (padre de DateFalsa)
const t0 = DateReal.now();
for (let dia = new DateReal(inicio); dia <= hoy; dia = new DateReal(dia.getTime() + 86_400_000)) {
  const esHoy = dia.toDateString() === hoy.toDateString();
  await simularDia(ctx, dia, esHoy, esHoy ? hoy.getHours() : 24);
  if (dia.getDate() === 1 || dia.getDate() === 16) {
    const ventas = ctx.conteo['venta-mostrador'] ?? 0;
    console.log(`   ${dia.toLocaleDateString('es-EC')} · ${Math.round((DateReal.now() - t0) / 1000)} s · ventas mostrador ${ventas} · lotes ${(ctx.conteo['recepcion'] ?? 0) + (ctx.conteo['cosecha'] ?? 0)} · órdenes ${ctx.conteo['orden-cerrar'] ?? 0}`);
  }
}
fijarReloj(horaReal());

console.log('\n✅ Datos generados. Operaciones realizadas:');
console.table(ctx.conteo);
console.log('ℹ️  Operaciones que una regla de negocio rechazó (es normal: la simulación lo intenta y el sistema dice que no):');
console.table(ctx.errores);
const colecciones = await conexion.db!.listCollections().toArray();
const tabla: Record<string, number> = {};
for (const c of colecciones.sort((a, b) => a.name.localeCompare(b.name))) tabla[c.name] = await conexion.db!.collection(c.name).countDocuments();
console.log(`📦 ${colecciones.length} colecciones:`);
console.table(tabla);
console.log(`\n🔐 Usuarios de prueba (contraseña de todos: ${CONTRASENA_DEMO}):`);
console.table(USUARIOS.map((x) => ({ correo: x.correo, roles: x.roles.join(' + '), nombre: x.nombre })));
await app.close();
process.exit(0);
