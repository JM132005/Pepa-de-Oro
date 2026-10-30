// productos.controller.ts → rutas /api/productos (catálogo interno).

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import { ProductosService } from './productos.service.js';
import { ActualizarProductoDto, CrearProductoDto } from './dto/producto.dto.js';

@Controller('productos')
export class ProductosController {
  constructor(private readonly servicio: ProductosService) {}

  // GET /api/productos?q=choco&familia=CHOCOLATES&tipo=TERMINADO,GRANO
  @Get()
  listar(@Query('q') q?: string, @Query('familia') familia?: string, @Query('tipo') tipo?: string, @Query('todos') todos?: string) {
    return this.servicio.buscar({ q, familia, tipo, incluirInactivos: todos === 'true' });
  }

  @Get(':id')
  detalle(@Param('id', IdMongoPipe) id: string) {
    return this.servicio.detalle(id);
  }

  // GET /api/productos/:id/precio?cantidad=24&tipoCliente=MAYORISTA → aplica RN-16
  @Get(':id/precio')
  precio(@Param('id', IdMongoPipe) id: string, @Query('cantidad') cantidad = '1', @Query('tipoCliente') tipo = 'CONSUMIDOR') {
    return this.servicio.cotizarPrecio(id, Number(cantidad), tipo);
  }

  // Cambiar precios y crear productos es acción del gerente (matriz de permisos).
  @Roles('GERENTE')
  @Post()
  crear(@Body() dto: CrearProductoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.crearProducto(dto, u);
  }

  @Roles('GERENTE')
  @Patch(':id')
  actualizar(@Param('id', IdMongoPipe) id: string, @Body() dto: ActualizarProductoDto, @UsuarioActual() u: UsuarioToken) {
    return this.servicio.actualizarProducto(id, dto, u);
  }
}
