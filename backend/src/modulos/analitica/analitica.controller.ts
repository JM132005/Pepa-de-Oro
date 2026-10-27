// analitica.controller.ts → rutas /api/analitica (paneles, alertas, proyecciones) y /api/informes.

import { Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { KpisService } from './kpis.service.js';
import { AlertasService } from './alertas.service.js';
import { ProyeccionesService } from './proyecciones.service.js';
import { InformesService, type FiltrosInforme } from './informes.service.js';

@Controller()
export class AnaliticaController {
  constructor(
    private readonly kpis: KpisService,
    private readonly alertas: AlertasService,
    private readonly proyecciones: ProyeccionesService,
    private readonly informes: InformesService,
  ) {}

  // GET /api/analitica/paneles/ventas?desde=2026-10-01&hasta=2026-10-31
  // El servicio revisa que el rol del usuario pueda ver ese panel.
  @Get('analitica/paneles/:area')
  panel(@Param('area') area: string, @Query('desde') desde: string | undefined, @Query('hasta') hasta: string | undefined, @UsuarioActual() u: UsuarioToken) {
    return this.kpis.panel(area, desde, hasta, u);
  }

  // GET /api/analitica/alertas → la campana (solo las alertas de mis roles).
  @Get('analitica/alertas')
  misAlertas(@UsuarioActual() u: UsuarioToken) {
    return this.alertas.paraUsuario(u);
  }

  // ─── Proyecciones (Gerente, Ventas y Producción) ───
  @Roles('VENTAS', 'PRODUCCION')
  @Get('analitica/proyecciones/ventas')
  ventas() {
    return Promise.all([this.proyecciones.serieVentas(24), this.proyecciones.pronosticoVentasTotales(3)]).then(([historia, pronostico]) => ({ historia, pronostico }));
  }

  @Roles('VENTAS', 'PRODUCCION')
  @Get('analitica/proyecciones/productos')
  productos() {
    return this.proyecciones.pronosticoProductos(8, 3);
  }

  @Roles('VENTAS', 'PRODUCCION', 'BODEGA')
  @Get('analitica/proyecciones/reorden')
  reorden() {
    return this.proyecciones.reorden();
  }

  @Roles('AGRONOMO', 'PRODUCCION', 'ACOPIO')
  @Get('analitica/proyecciones/cosecha')
  cosecha() {
    return this.proyecciones.cosechaProyectada(12);
  }

  @Roles('PRODUCCION', 'ACOPIO', 'BODEGA')
  @Get('analitica/proyecciones/materia-prima')
  materiaPrima() {
    return this.proyecciones.planMateriaPrima(3);
  }

  @Roles('GERENTE')
  @Get('analitica/proyecciones/flujo-caja')
  flujoCaja() {
    return this.proyecciones.flujoCaja(4);
  }

  @Roles('VENTAS', 'CALIDAD', 'ACOPIO', 'PRODUCCION')
  @Get('analitica/proyecciones/tendencias')
  tendencias() {
    return this.proyecciones.alertasTendencia();
  }

  // ─── Informes ───
  @Get('informes')
  catalogo(@UsuarioActual() u: UsuarioToken) {
    return this.informes.catalogo(u);
  }

  // GET /api/informes/ventas?desde=...&hasta=...&formato=pdf|xlsx|json
  @Get('informes/:id')
  async informe(@Param('id') id: string, @Query() q: FiltrosInforme & { formato?: string }, @UsuarioActual() u: UsuarioToken, @Res() res: Response) {
    const informe = await this.informes.generar(id, q, u);
    if (q.formato === 'pdf') {
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${id}.pdf"` });
      res.send(await this.informes.exportarPdf(informe));
    } else if (q.formato === 'xlsx') {
      res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${id}.xlsx"` });
      res.send(await this.informes.exportarExcel(informe));
    } else {
      res.json(informe);
    }
  }

  // Botón "Enviar ahora" del informe gerencial (además del envío automático del día 1).
  @Roles('GERENTE')
  @Post('informes/gerencial/enviar')
  enviarGerencial() {
    return this.informes.enviarGerencialMensual();
  }
}
