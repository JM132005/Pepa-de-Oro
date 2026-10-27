// logistica.dto.ts → viajes de la flota.

import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { TIPOS_VIAJE } from '../../../comun/constantes.js';

class CargaDto {
  @IsString() descripcion: string;
  @IsNumber() @Min(1) pesoKg: number;
  @IsOptional() @IsNumber() bultos?: number;
}
class TarifaDto {
  @IsIn(['POR_KM', 'POR_TONELADA', 'FIJA']) modo: string;
  @IsNumber() @Min(0) valor: number;
}

export class CrearViajeDto {
  @IsIn(TIPOS_VIAJE) tipo: string;
  @IsMongoId() camion: string;
  @IsMongoId() chofer: string;
  @IsString() origen: string;
  @IsString() destino: string;
  @IsDateString() salida: string;
  @IsDateString() llegadaEstimada: string;
  @IsOptional() @IsNumber() kmEstimados?: number;
  @ValidateNested() @Type(() => CargaDto) carga: CargaDto;
  @IsOptional() @IsMongoId() pedido?: string;
  @IsOptional() @IsMongoId() cliente?: string;
  @IsOptional() @ValidateNested() @Type(() => TarifaDto) tarifa?: TarifaDto;
  @IsOptional() @IsString() observaciones?: string;
}

export class IniciarViajeDto {
  @IsNumber() @Min(0) kmSalida: number;
}

export class CompletarViajeDto {
  @IsNumber() @Min(0) kmLlegada: number;
  @IsOptional() @IsNumber() @Min(0) combustible?: number;
  @IsOptional() @IsNumber() @Min(0) peajes?: number;
  @IsOptional() @IsNumber() @Min(0) viaticos?: number;
  @IsOptional() @IsString() observaciones?: string;
}
