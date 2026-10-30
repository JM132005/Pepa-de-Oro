// main.ts → punto de entrada del backend. Es lo primero que se ejecuta con "npm run start:dev".

// NestFactory: "fábrica" que crea la aplicación a partir del módulo raíz.
import { NestFactory } from '@nestjs/core';
// ValidationPipe: valida automáticamente los datos que llegan contra los DTO.
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

// bootstrap(): función asíncrona que arranca el servidor.
async function bootstrap() {
  // Instancia de la aplicación creada desde el módulo raíz.
  const app = await NestFactory.create(AppModule);

  // Prefijo global: todas las rutas quedan como /api/... (ej: /api/auth/login).
  app.setGlobalPrefix('api');

  // CORS: permite que Angular (puerto 4200) llame a esta API (puerto 3000).
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
  });

  // Validación global:
  //   whitelist → borra campos que no estén en el DTO (evita que inyecten "rol: ADMIN").
  //   transform → convierte tipos automáticamente (ej: "5" → 5).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const puerto = process.env.PORT ?? 3000;
  await app.listen(puerto);
  console.log(`🍫 Pepa de Oro API en http://localhost:${puerto}/api/salud`);
}
await bootstrap();
