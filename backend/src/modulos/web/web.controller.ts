// web.controller.ts → rutas de la PÁGINA PÚBLICA (/api/publico/...) y de su administración.
// Las públicas llevan @Publico(): no piden token, solo LEEN catálogo, stock, contenido y equipos,
// y RECIBEN solicitudes. Nunca devuelven costos, clientes ni datos privados.

import { Body, Controller, Get, Ip, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Publico } from '../../comun/decoradores/publico.decorator.js';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { WebService } from './web.service.js';
import { ActualizarSolicitudDto, ContenidoDto, CrearSolicitudDto, SolicitudACotizacionDto } from './dto/web.dto.js';

@Controller()
export class WebController {
  constructor(private readonly servicio: WebService) {}

  // ─────────── PÚBLICO (sin login) ───────────
  @Publico()
  @Get('publico/empresa')
  empresa() {
    return this.servicio.empresa();
  }

  @Publico()
  @Get('publico/contenido/:clave')
  contenido(@Param('clave') clave: string) {
    return this.servicio.obtenerContenido(clave);
  }

  // GET /api/publico/productos?familia=CHOCOLATES&q=maracuya&precioMax=10
  @Publico()
  @Get('publico/productos')
  catalogo(@Query('familia') familia?: string, @Query('q') q?: string, @Query('sabor') sabor?: string, @Query('precioMax') precioMax?: string, @Query('destacados') destacados?: string) {
    return this.servicio.catalogo({ familia, q, sabor, precioMax: precioMax ? Number(precioMax) : undefined, destacados: destacados === 'true' });
  }

  @Publico()
  @Get('publico/productos/:slug')
  producto(@Param('slug') slug: string) {
    return this.servicio.productoPorSlug(slug);
  }

  // GET /api/publico/stock?ids=a,b,c → stock en vivo (la página lo consulta cada 20 s).
  @Publico()
  @Get('publico/stock')
  stock(@Query('ids') ids = '') {
    return this.servicio.stockEnVivo(ids.split(',').filter((x) => /^[a-f0-9]{24}$/i.test(x)).slice(0, 60));
  }

  @Publico()
  @Get('publico/equipos')
  equipos() {
    return this.servicio.equipos();
  }

  @Publico()
  @Get('publico/servicios')
  servicios() {
    return this.servicio.servicios();
  }

  // @Ip(): NestJS entrega la IP del visitante (para el límite anti-spam).
  @Publico()
  @Post('publico/solicitudes')
  solicitar(@Body() dto: CrearSolicitudDto, @Ip() ip: string) {
    return this.servicio.crearSolicitud(dto, ip);
  }

  // ─────────── ADMINISTRACIÓN (con login) ───────────
  @Roles('VENTAS')
  @Get('solicitudes')
  solicitudes(@Query('estado') estado?: string, @Query('tipo') tipo?: string) {
    return this.servicio.listarSolicitudes({ estado, tipo });
  }

  @Roles('VENTAS')
  @Patch('solicitudes/:id')
  actualizar(@Param('id', IdMongoPipe) id: string, @Body() dto: ActualizarSolicitudDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.actualizarSolicitud(id, dto, u);
  }

  @Roles('VENTAS')
  @Post('solicitudes/:id/cotizacion')
  aCotizacion(@Param('id', IdMongoPipe) id: string, @Body() dto: SolicitudACotizacionDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.aCotizacion(id, dto.clienteId, u);
  }

  @Roles('VENTAS')
  @Post('solicitudes/avisar-stock')
  avisar() {
    return this.servicio.avisarStock();
  }

  @Roles('GERENTE')
  @Get('contenido-web')
  listarContenido() {
    return this.servicio.listarContenido();
  }

  @Roles('GERENTE')
  @Put('contenido-web/:clave')
  guardar(@Param('clave') clave: string, @Body() dto: ContenidoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.guardarContenido(clave, dto.titulo, dto.datos, u);
  }
}
