// web.dto.ts → formularios de la página pública y gestión de solicitudes.

import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsEmail, IsIn, IsMongoId, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { ESTADOS_SOLICITUD, TIPOS_SOLICITUD } from '../../../comun/constantes.js';

class ItemInteresDto {
  @IsMongoId() productoId: string;
  @IsNumber() @Min(1) cantidad: number;
}

export class CrearSolicitudDto {
  @IsIn(TIPOS_SOLICITUD) tipo: string;
  @IsString() @MinLength(3) @MaxLength(120) nombre: string;
  @IsEmail({}, { message: 'Escribe un correo válido' }) correo: string;
  @IsOptional() @IsString() @MaxLength(20) telefono?: string;
  @IsOptional() @IsString() @MaxLength(120) empresa?: string;
  @IsOptional() @IsString() @MaxLength(80) ciudad?: string;
  @IsOptional() @IsString() @MaxLength(2000) mensaje?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => ItemInteresDto) items?: ItemInteresDto[];
  @IsOptional() @IsMongoId() activoId?: string;
  @IsOptional() @IsDateString() desde?: string;
  @IsOptional() @IsDateString() hasta?: string;
  @IsOptional() @IsString() servicio?: string;
  // Campo trampa (honeypot): está oculto en el formulario. Una persona no lo ve ni lo llena;
  // un robot de spam sí lo llena → si trae algo, la solicitud se descarta en silencio.
  @IsOptional() @IsString() sitioWeb?: string;
}

export class ActualizarSolicitudDto {
  @IsOptional() @IsIn(ESTADOS_SOLICITUD) estado?: string;
  @IsOptional() @IsString() nota?: string;
  @IsOptional() @IsMongoId() asignadoId?: string;
}

export class SolicitudACotizacionDto {
  @IsMongoId() clienteId: string;
}

export class ContenidoDto {
  @IsString() titulo: string;
  @IsObject() datos: Record<string, unknown>;
}
