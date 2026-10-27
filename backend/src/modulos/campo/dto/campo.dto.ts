// campo.dto.ts → validación de haciendas, parcelas, trabajadores, labores, sanidad, clima y cosechas.

import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsBoolean, IsDateString, IsIn, IsMongoId, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CULTIVOS, ESTADOS_PARCELA, PLAGAS, TIPOS_LABOR, VARIEDADES } from '../../../comun/constantes.js';

export class CrearHaciendaDto {
  @IsString() codigo: string;
  @IsString() nombre: string;
  @IsString() canton: string;
  @IsOptional() @IsString() parroquia?: string;
  @IsOptional() @IsObject() ubicacion?: { lat: number; lng: number };
  @IsNumber() @Min(0) hectareasTotales: number;
  @IsOptional() @IsNumber() hectareasCultivadas?: number;
  @IsOptional() @IsNumber() altitudMsnm?: number;
  @IsOptional() @IsString() fuenteAgua?: string;
  @IsOptional() @IsString() responsable?: string;
  @IsOptional() @IsArray() cultivos?: string[];
  @IsOptional() @IsArray() certificaciones?: { tipo: string; codigo?: string; vence: string }[];
  @IsOptional() @IsString() registroAgrocalidad?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsString() imagen?: string;
  @IsOptional() @IsBoolean() activa?: boolean;
}
export class ActualizarHaciendaDto extends PartialType(CrearHaciendaDto) {}

class TareaPlanDto {
  @IsIn(TIPOS_LABOR) tipo: string;
  @IsNumber() @Min(1) cadaDias: number;
  @IsOptional() @IsDateString() ultimaFecha?: string;
}

export class CrearParcelaDto {
  @IsMongoId() hacienda: string;
  @IsString() codigo: string;
  @IsNumber() @Min(0.1) hectareas: number;
  @IsIn(CULTIVOS) cultivo: string;
  @IsIn(VARIEDADES) variedad: string;
  @IsOptional() @IsString() clon?: string;
  @IsNumber() @Min(1950) anioSiembra: number;
  @IsOptional() @IsNumber() densidad?: number;
  @IsOptional() @IsNumber() plantas?: number;
  @IsOptional() @IsIn(['MONOCULTIVO', 'SOMBRA_PLATANO', 'AGROFORESTAL']) sistema?: string;
  @IsOptional() @IsIn(['GOTEO', 'ASPERSION', 'GRAVEDAD', 'SECANO']) riego?: string;
  @IsOptional() @IsIn(ESTADOS_PARCELA) estado?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TareaPlanDto) planLabores?: TareaPlanDto[];
}
export class ActualizarParcelaDto extends PartialType(CrearParcelaDto) {}

export class CrearTrabajadorDto {
  @IsString() cedula: string;
  @IsString() nombre: string;
  @IsIn(['JORNALERO', 'CAPATAZ', 'CHOFER', 'TECNICO', 'OPERARIO_PLANTA']) cargo: string;
  @IsOptional() @IsMongoId() hacienda?: string;
  @IsOptional() @IsNumber() @Min(0) jornalDiario?: number;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() licenciaTipo?: string;
  @IsOptional() @IsDateString() licenciaVence?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
export class ActualizarTrabajadorDto extends PartialType(CrearTrabajadorDto) {}

// Una persona de la cuadrilla y sus jornales (1 = un día completo, 0,5 = medio día).
class CuadrillaDto {
  @IsMongoId() trabajador: string;
  @IsNumber() @Min(0.25) jornales: number;
}
class InsumoDto {
  @IsMongoId() producto: string;
  @IsNumber() @Min(0.001) cantidad: number;
}
class AgroquimicoDto {
  @IsString() producto: string;
  @IsOptional() @IsString() dosis?: string;
  @IsNumber() @Min(0) diasCarencia: number;
}

export class CrearLaborDto {
  @IsMongoId() parcela: string;
  @IsIn(TIPOS_LABOR) tipo: string;
  @IsOptional() @IsDateString() fecha?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CuadrillaDto) cuadrilla?: CuadrillaDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => InsumoDto) insumos?: InsumoDto[];
  @IsOptional() @ValidateNested() @Type(() => AgroquimicoDto) agroquimico?: AgroquimicoDto;
  @IsOptional() @IsString() observaciones?: string;
}

export class CrearMonitoreoDto {
  @IsMongoId() parcela: string;
  @IsIn(PLAGAS) plaga: string;
  @IsNumber() @Min(1) evaluadas: number;
  @IsNumber() @Min(0) afectadas: number;
  @IsOptional() @IsString() accion?: string;
  @IsOptional() @IsDateString() fecha?: string;
}

export class CrearClimaDto {
  @IsMongoId() hacienda: string;
  @IsDateString() fecha: string;
  @IsNumber() @Min(0) lluviaMm: number;
  @IsOptional() @IsNumber() temperaturaMax?: number;
  @IsOptional() @IsNumber() temperaturaMin?: number;
  @IsOptional() @IsNumber() humedadRelativa?: number;
}

export class CrearCosechaDto {
  @IsMongoId() parcela: string;
  @IsOptional() @IsDateString() fecha?: string;
  @IsOptional() @IsNumber() @Min(0) mazorcas?: number;
  @IsNumber() @Min(0.1) kg: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CuadrillaDto) cuadrilla?: CuadrillaDto[];
  @IsOptional() @IsString() observaciones?: string;
}
