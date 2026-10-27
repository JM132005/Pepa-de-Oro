// actualizar-usuario.dto.ts → el GERENTE puede cambiar nombre, rol o desactivar a un usuario.

import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ROLES } from '../../../comun/constantes.js';

export class ActualizarUsuarioDto {
  @IsOptional() // si no se envía, no se valida ni se cambia
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsArray()
  @IsIn(ROLES, { each: true })
  roles?: string[];

  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsString() telefono?: string;

  // Si el gerente escribe una contraseña nueva, se cifra antes de guardar.
  @IsOptional() @IsString() @MinLength(8) contrasena?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
