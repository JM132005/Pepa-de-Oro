// app.module.ts → módulo RAÍZ: conecta la base de datos, la seguridad global y todos los módulos.
// Analogía: es el "tablero eléctrico" de la planta; cada módulo es un breaker que se enciende aquí.

import { Module } from '@nestjs/common';
// APP_GUARD / APP_INTERCEPTOR: registran guards e interceptores que se aplican a TODAS las rutas.
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
// ConfigModule: carga las variables del archivo .env en process.env.
import { ConfigModule } from '@nestjs/config';
// MongooseModule: conecta NestJS con MongoDB mediante la librería Mongoose.
import { MongooseModule } from '@nestjs/mongoose';
// ScheduleModule: tareas programadas (cron), por ejemplo el informe gerencial del día 1.
import { ScheduleModule } from '@nestjs/schedule';
import mongoose from 'mongoose';
import { JwtGuard } from './comun/guards/jwt.guard.js';
import { RolesGuard } from './comun/guards/roles.guard.js';
import { ComunModule } from './comun/comun.module.js';
import { BaseDatosModule } from './base-datos.module.js';
import { AuditoriaInterceptor } from './modulos/auditoria/auditoria.interceptor.js';
// ── Módulos del negocio ──
import { SaludModule } from './modulos/salud/salud.module.js';
import { AuthModule } from './modulos/auth/auth.module.js';
import { UsuariosModule } from './modulos/usuarios/usuarios.module.js';
import { ConfiguracionModule } from './modulos/configuracion/configuracion.module.js';
import { AuditoriaModule } from './modulos/auditoria/auditoria.module.js';
import { InventarioModule } from './modulos/inventario/inventario.module.js';
import { ProductosModule } from './modulos/productos/productos.module.js';
import { VentasModule } from './modulos/ventas/ventas.module.js';
import { FacturacionModule } from './modulos/facturacion/facturacion.module.js';
import { CampoModule } from './modulos/campo/campo.module.js';
import { AcopioModule } from './modulos/acopio/acopio.module.js';
import { PoscosechaModule } from './modulos/poscosecha/poscosecha.module.js';
import { CalidadModule } from './modulos/calidad/calidad.module.js';
import { ProduccionModule } from './modulos/produccion/produccion.module.js';
import { EquiposModule } from './modulos/equipos/equipos.module.js';
import { LogisticaModule } from './modulos/logistica/logistica.module.js';
import { MantenimientoModule } from './modulos/mantenimiento/mantenimiento.module.js';
import { WebModule } from './modulos/web/web.module.js';
import { RastreoModule } from './modulos/rastreo/rastreo.module.js';
import { AnaliticaModule } from './modulos/analitica/analitica.module.js';

// Con esto, dentro de enTransaccion() todas las consultas usan la sesión de la transacción solas.
mongoose.set('transactionAsyncLocalStorage', true);

@Module({
  imports: [
    // isGlobal: las variables .env quedan disponibles en todo el proyecto.
    ConfigModule.forRoot({ isGlobal: true }),
    // forRootAsync + useFactory: lee MONGO_URI DESPUÉS de cargar el .env (no antes).
    MongooseModule.forRootAsync({
      useFactory: () => ({ uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/pepadeoro' }),
    }),
    // Tareas programadas (cron). El seed las apaga (SIN_CRON=true) porque adelanta el reloj.
    ...(process.env.SIN_CRON === 'true' ? [] : [ScheduleModule.forRoot()]),
    BaseDatosModule, // registra las colecciones
    ComunModule, // contadores, correo, PDF
    AuditoriaModule, // bitácora
    ConfiguracionModule, // parámetros de la empresa
    SaludModule, // GET /api/salud
    AuthModule, // login
    UsuariosModule, // personal y roles
    InventarioModule, // bodegas, lotes, kardex
    ProductosModule, // catálogo y precios
    VentasModule, // clientes, cotizaciones, pedidos, caja
    FacturacionModule, // facturas, notas de crédito, PDF y correo
    CampoModule, // haciendas, parcelas, labores, cosechas
    AcopioModule, // productores, precio del día, liquidaciones
    PoscosechaModule, // fermentación y secado
    CalidadModule, // grados, certificados, liberación de lotes
    ProduccionModule, // recetas, órdenes, costos, etiquetas
    EquiposModule, // activos, venta y alquiler
    LogisticaModule, // flota, viajes, guías de remisión
    MantenimientoModule, // preventivos, correctivos, servicios a clientes
    WebModule, // página pública: catálogo con stock en vivo, solicitudes, contenido
    RastreoModule, // "Rastrea tu cacao" (público)
    AnaliticaModule, // KPIs, alertas, proyecciones e informes
  ],
  // El orden importa: primero se valida el token, luego el rol.
  providers: [
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor },
  ],
})
export class AppModule {}
