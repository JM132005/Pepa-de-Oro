// acopio.dto.ts → validación de productores, precios del día, recepciones, pagos y anticipos.

import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsBoolean, IsDateString, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { CULTIVOS, ESTADOS_ENTREGA, VARIEDADES } from '../../../comun/constantes.js';

class CertificacionDto {
  @IsString() tipo: string; // ORGANICO, COMERCIO_JUSTO, RAINFOREST
  @IsOptional() @IsString() codigo?: string;
  @IsDateString() vence: string;
}

class CuentaDto {
  @IsString() banco: string;
  @IsIn(['AHORROS', 'CORRIENTE']) tipo: string;
  @IsString() numero: string;
}

export class CrearProductorDto {
  @IsString() cedula: string;
  @IsString() nombre: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() finca?: string;
  @IsString() canton: string;
  @IsOptional() @IsString() parroquia?: string;
  @IsOptional() @IsNumber() hectareas?: number;
  @IsOptional() @IsArray() @IsIn(CULTIVOS, { each: true }) cultivos?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CertificacionDto) certificaciones?: CertificacionDto[];
  @IsOptional() @ValidateNested() @Type(() => CuentaDto) cuentaBancaria?: CuentaDto;
  @IsOptional() @IsBoolean() activo?: boolean;
  @IsOptional() @IsString() motivoInactivo?: string;
}
export class ActualizarProductorDto extends PartialType(CrearProductorDto) {}

export class PrecioDiaDto {
  @IsIn(CULTIVOS) cultivo: string;
  @IsIn(VARIEDADES) variedad: string;
  @IsIn(ESTADOS_ENTREGA) estado: string;
  @IsNumber() @Min(0) precioQq: number;
  @IsOptional() @IsNumber() precioReferencia?: number;
}

// Recepción en la báscula del centro de acopio.
export class RecepcionDto {
  @IsMongoId() productorId: string;
  @IsIn(CULTIVOS) cultivo: string;
  @IsIn(VARIEDADES) variedad: string;
  @IsIn(ESTADOS_ENTREGA) estadoEntrega: string;
  @IsNumber() @Min(1) kgBrutos: number;
  @IsOptional() @IsNumber() @Min(0) taraKg?: number;
  @IsNumber() @Min(0) @Max(80) humedad: number;
  @IsOptional() @IsNumber() @Min(0) @Max(30) impurezasPct?: number;
  @IsOptional() @IsNumber() @Min(0) precioQq?: number; // si no viene, se usa el precio del día
  @IsOptional() @IsBoolean() descontarAnticipo?: boolean;
  @IsOptional() @IsString() observaciones?: string;
}

export class PagoProductorDto {
  @IsNumber() @Min(0.01) monto: number;
  @IsIn(['EFECTIVO', 'TRANSFERENCIA']) forma: string;
  @IsOptional() @IsString() referencia?: string;
}

export class AnticipoDto {
  @IsNumber() @Min(1) monto: number;
  @IsOptional() @IsString() motivo?: string;
}
