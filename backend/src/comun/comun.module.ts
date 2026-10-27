// comun.module.ts → módulo GLOBAL con servicios que usan muchos módulos a la vez:
//   ContadoresService → números correlativos (facturas, lotes, órdenes)
//   CorreoService     → envío de correos con Nodemailer (Gmail)
//   PdfService        → motor de PDF (facturas, contratos, informes)
// @Global(): basta importarlo UNA vez en app.module.ts y cualquier servicio puede inyectarlos.

import { Global, Module } from '@nestjs/common';
import { ContadoresService } from './servicios/contadores.service.js';
import { CorreoService } from './servicios/correo.service.js';
import { PdfService } from './servicios/pdf.service.js';

@Global()
@Module({
  providers: [ContadoresService, CorreoService, PdfService],
  exports: [ContadoresService, CorreoService, PdfService],
})
export class ComunModule {}
