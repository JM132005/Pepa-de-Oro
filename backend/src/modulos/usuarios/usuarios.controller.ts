// usuarios.controller.ts → rutas /api/usuarios

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../comun/decoradores/roles.decorator.js';
import { IdMongoPipe } from '../../comun/pipes/id-mongo.pipe.js';
import { UsuariosService } from './usuarios.service.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto.js';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // GET /api/usuarios → todos los usuarios logueados pueden ver la lista
  // (se necesita, por ejemplo, para elegir el técnico de una orden o el vendedor de un cliente).
  @Get()
  listar() {
    return this.usuariosService.listar();
  }

  // POST /api/usuarios → solo el GERENTE crea usuarios.
  @Roles('GERENTE')
  @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  // PATCH /api/usuarios/:id → solo el GERENTE cambia rol o desactiva.
  @Roles('GERENTE')
  @Patch(':id')
  actualizar(
    @Param('id', IdMongoPipe) id: string,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.usuariosService.actualizar(id, dto);
  }
}
