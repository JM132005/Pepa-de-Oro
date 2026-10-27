// produccion.dto.ts → recetas y órdenes de producción.

import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsMongoId, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ComponenteDto {
  @IsMongoId() producto: string;
  @IsNumber() @Min(0.0001) cantidad: number;
}

export class CrearRecetaDto {
  @IsMongoId() producto: string;
  @IsOptional() @IsString() nombre?: string;
  @IsNumber() @Min(0.001) cantidadBase: number;
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => ComponenteDto) componentes: ComponenteDto[];
  @IsOptional() @IsArray() @IsString({ each: true }) pasos?: string[];
  @IsOptional() @IsNumber() horasMaquina?: number;
  @IsOptional() @IsNumber() manoObraHoras?: number;
  @IsOptional() @IsArray() tiposMaquina?: string[];
  @IsOptional() @IsNumber() rendimientoEsperado?: number;
  @IsOptional() @IsBoolean() activa?: boolean;
}
export class ActualizarRecetaDto extends PartialType(CrearRecetaDto) {}

export class CrearOrdenDto {
  @IsMongoId() producto: string;
  @IsNumber() @Min(0.001) cantidadPlanificada: number;
  @IsDateString() fechaProgramada: string;
  @IsOptional() @IsMongoId() maquina?: string;
  @IsOptional() @IsString() observaciones?: string;
}

// Lo real al cerrar: cuánto salió bueno y (opcional) cuánto se consumió de verdad de cada insumo.
class ConsumoRealDto {
  @IsMongoId() producto: string;
  @IsNumber() @Min(0) cantidad: number;
}
export class CerrarOrdenDto {
  @IsNumber() @Min(0) cantidadProducida: number;
  @IsNumber() @Min(0) cantidadBuena: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ConsumoRealDto) consumoReal?: ConsumoRealDto[];
  @IsOptional() @IsNumber() horasMaquina?: number;
  @IsOptional() @IsNumber() manoObraHoras?: number;
  @IsOptional() @IsString() tipoEmpaque?: string;
  @IsOptional() @IsString() observaciones?: string;
}

export class SimularDto {
  @IsMongoId() producto: string;
  @IsNumber() @Min(1) cantidad: number;
}
