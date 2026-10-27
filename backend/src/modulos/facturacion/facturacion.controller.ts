// facturacion.controller.ts → rutas /api/facturas

import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { FacturacionService } from './facturacion.service.js';
import { AbonoDto, EmitirFacturaDto, NotaCreditoDto } from './dto/facturacion.dto.js';

@Roles('VENTAS') // todo el controlador: Ventas/Caja y Gerente
@Controller('facturas')
export class FacturacionController {
  constructor(private readonly servicio: FacturacionService) {}

  // GET /api/facturas?desde=2026-10-01&hasta=2026-10-31&q=Machala&estadoPago=PENDIENTE
  @Get()
  listar(@Query() filtros: { desde?: string; hasta?: string; q?: string; tipo?: string; estadoPago?: string; canal?: string }) {
    return this.servicio.listar(filtros);
  }

  @Get('por-cobrar')
  porCobrar() {
    return this.servicio.porCobrar();
  }

  @Get(':id')
  obtener(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.obtener(id);
  }

  // GET /api/facturas/:id/pdf → el navegador lo muestra dentro de la página (inline).
  // ?descargar=true → lo descarga como archivo (attachment).
  @Get(':id/pdf')
  async pdf(@Param('id', IdMongoPipe) id: string, @Query('descargar') descargar: string, @Res() res: Response) {
    const { factura, buffer } = await this.servicio.generarPdf(id);
    const nombre = `${factura.tipoComprobante === '04' ? 'NotaCredito' : 'Factura'}-${factura.numero}.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `${descargar === 'true' ? 'attachment' : 'inline'}; filename="${nombre}"` });
    res.send(buffer);
  }

  // POST /api/facturas → emite la factura, descuenta stock y la envía al correo del cliente.
  @Post()
  emitir(@Body() dto: EmitirFacturaDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.emitir(dto, u);
  }

  @Post(':id/reenviar')
  reenviar(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.enviarPorCorreo(id);
  }

  @Post(':id/abonos')
  abonar(@Param('id', IdMongoPipe) id: string, @Body() dto: AbonoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.abonar(id, dto, u);
  }

  // Anular o devolver = acción sensible: SOLO el gerente (RN-21).
  @Roles('GERENTE')
  @Post(':id/nota-credito')
  notaCredito(@Param('id', IdMongoPipe) id: string, @Body() dto: NotaCreditoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.notaCredito(id, dto, u);
  }
}
