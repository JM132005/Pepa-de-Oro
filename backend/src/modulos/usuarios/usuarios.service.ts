// usuarios.service.ts → lógica de usuarios: crear (con contraseña cifrada), listar y actualizar.

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
// InjectModel: inyecta el "modelo" de Mongoose, el objeto que consulta la colección.
import { InjectModel } from '@nestjs/mongoose';
// isValidObjectId: dice si un texto tiene formato de _id de MongoDB.
import { Model, isValidObjectId } from 'mongoose';
// bcryptjs: librería que cifra contraseñas con "hash" (no se puede revertir).
import bcrypt from 'bcryptjs';
import { Usuario, UsuarioDocumento } from './esquemas/usuario.esquema.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto.js';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModelo: Model<UsuarioDocumento>,
  ) {}

  // Crea un usuario guardando SOLO el hash de la contraseña.
  async crear(dto: CrearUsuarioDto) {
    // exists(): devuelve algo si ya hay un documento con ese correo.
    if (await this.usuarioModelo.exists({ correo: dto.correo.toLowerCase() })) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }
    // hash(texto, 10): cifra la contraseña; 10 = "costo" (más alto = más seguro pero más lento).
    const contrasenaHash = await bcrypt.hash(dto.contrasena, 10);
    const creado = await this.usuarioModelo.create({ ...dto, contrasenaHash });
    // toObject(): convierte el documento en objeto simple; se quita el hash antes de responder.
    const { contrasenaHash: _oculto, ...sinHash } = creado.toObject();
    return sinHash;
  }

  // Lista todos los usuarios ordenados por nombre (el hash no sale por select:false).
  listar() {
    return this.usuarioModelo.find().sort({ nombre: 1 }).exec();
  }

  async actualizar(id: string, dto: ActualizarUsuarioDto) {
    // Si viene contraseña nueva, se guarda su hash (nunca el texto).
    const { contrasena, ...resto } = dto;
    const cambios: Record<string, unknown> = { ...resto };
    if (contrasena) cambios.contrasenaHash = await bcrypt.hash(contrasena, 10);
    // { returnDocument: 'after' } → devuelve el documento ya actualizado.
    const usuario = await this.usuarioModelo
      .findByIdAndUpdate(id, cambios, { returnDocument: 'after' })
      .exec();
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  // ¿Existe este usuario y sigue activo? Lo usa el JwtGuard en cada petición:
  // si se borró, se recargaron los datos de prueba o se desactivó, su token viejo deja de servir.
  async existeActivo(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false; // un id con formato inválido nunca existe
    return Boolean(await this.usuarioModelo.exists({ _id: id, activo: true }));
  }

  // Usado SOLO por el login: pide explícitamente el hash con select('+contrasenaHash').
  buscarParaLogin(correo: string) {
    return this.usuarioModelo
      .findOne({ correo: correo.toLowerCase() })
      .select('+contrasenaHash')
      .exec();
  }
}
