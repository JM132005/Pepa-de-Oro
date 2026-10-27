// equipos.dto.ts → activos (máquinas y vehículos) y alquileres.

import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsBoolean, IsDateString, IsIn, IsMongoId, IsNumber, IsObject, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { DOCUMENTOS_ACTIVO, ESTADOS_EQUIPO, TIPOS_EQUIPO, USOS_EQUIPO } from '../../../comun/constantes.js';

class DocumentoDto {
  @IsIn(DOCUMENTOS_ACTIVO) tipo: string;
  @IsOptional() @IsString() numero?: string;
  @IsDateString() vence: string;
}
class TareaPlanDto {
  @IsString() tarea: string;
  @IsOptional() @IsNumber() cadaDias?: number;
  @IsOptional() @IsNumber() cadaUso?: number;
  @IsDateString() ultimaFecha: string;
  @IsNumber() ultimoUso: number;
}
class FichaDto {
  @IsString() etiqueta: string;
  @IsString() valor: string;
}

export class CrearActivoDto {
  @IsString() codigo: string;
  @IsString() nombre: string;
  @IsIn(TIPOS_EQUIPO) tipo: string;
  @IsOptional() @IsString() marca?: string;
  @IsOptional() @IsString() modelo?: string;
  @IsOptional() @IsNumber() anio?: number;
  @IsOptional() @IsString() serie?: string;
  @IsOptional() @IsString() placa?: string;
  @IsOptional() @IsString() capacidad?: string;
  @IsOptional() @IsNumber() capacidadKg?: number;
  @IsOptional() @IsArray() @IsIn(USOS_EQUIPO, { each: true }) usos?: string[];
  @IsOptional() @IsIn(ESTADOS_EQUIPO) estado?: string;
  @IsOptional() @IsBoolean() nuevo?: boolean;
  @IsOptional() @IsNumber() valorCompra?: number;
  @IsOptional() @IsNumber() valorActual?: number;
  @IsOptional() @IsNumber() precioVenta?: number;
  @IsOptional() @IsObject() tarifas?: { hora?: number; dia?: number; semana?: number; temporada?: number };
  @IsOptional() @IsNumber() tarifaOperadorDia?: number;
  @IsOptional() @IsNumber() garantia?: number;
  @IsOptional() @IsNumber() costoHora?: number;
  @IsOptional() @IsNumber() horometro?: number;
  @IsOptional() @IsNumber() odometro?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DocumentoDto) documentos?: DocumentoDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TareaPlanDto) planMantenimiento?: TareaPlanDto[];
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FichaDto) fichaTecnica?: FichaDto[];
  @IsOptional() @IsString() imagen?: string;
  @IsOptional() @IsBoolean() publicado?: boolean;
  @IsOptional() @IsString() ubicacion?: string;
}
export class ActualizarActivoDto extends PartialType(CrearActivoDto) {}

export class BajaActivoDto {
  @IsString() @MinLength(10) motivo: string;
}

export class CrearAlquilerDto {
  @IsMongoId() activo: string;
  @IsMongoId() cliente: string;
  @IsDateString() desde: string;
  @IsDateString() hasta: string;
  @IsOptional() @IsNumber() @Min(0) tarifaDia?: number; // si no viene, la del activo
  @IsOptional() @IsBoolean() conOperador?: boolean;
  @IsOptional() @IsString() lugarTrabajo?: string;
  @IsOptional() @IsString() condiciones?: string;
  @IsOptional() @IsMongoId() solicitud?: string;
}

export class EntregaDto {
  @IsOptional() @IsNumber() horometro?: number;
  @IsString() estadoEquipo: string; // "Buen estado, tanque lleno"
  @IsOptional() @IsString() observaciones?: string;
}

export class DevolucionDto {
  @IsOptional() @IsDateString() fecha?: string;
  @IsNumber() @Min(0) horometro: number;
  @IsOptional() @IsNumber() @Min(0) danos?: number;
  @IsOptional() @IsString() observaciones?: string;
}
