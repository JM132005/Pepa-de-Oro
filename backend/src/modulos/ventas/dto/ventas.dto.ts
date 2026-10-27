// ventas.dto.ts → validación de clientes, cotizaciones, pedidos, caja y líneas de venta.

import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TIPOS_CLIENTE, TIPOS_IDENTIFICACION, TIPOS_ITEM } from '../../../comun/constantes.js';

// ─── Clientes ───
export class CrearClienteDto {
  @IsIn(TIPOS_IDENTIFICACION) tipoIdentificacion: string;
  @IsString() identificacion: string; // RN-02 se valida en el servicio
  @IsString() nombre: string;
  @IsOptional() @IsString() nombreComercial?: string;
  @IsOptional() @IsEmail({}, { message: 'El correo no es válido' }) correo?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() ciudad?: string;
  @IsOptional() @IsString() pais?: string;
  @IsIn(TIPOS_CLIENTE) tipoCliente: string;
  @IsOptional() @IsNumber() @Min(0) creditoDias?: number;
  @IsOptional() @IsNumber() @Min(0) cupo?: number;
  @IsOptional() @IsMongoId() vendedor?: string;
  @IsOptional() @IsString() notas?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
export class ActualizarClienteDto extends PartialType(CrearClienteDto) {}

// ─── Una línea que envía el frontend (el servicio completa precio, IVA y costo) ───
export class ItemEntradaDto {
  @IsIn(TIPOS_ITEM) tipo: string;
  @IsOptional() @IsMongoId() refId?: string; // producto, activo, alquiler u orden de mantenimiento
  @IsOptional() @IsString() descripcion?: string; // obligatoria para SERVICIO
  @IsNumber() @Min(0.001) cantidad: number;
  @IsOptional() @IsNumber() @Min(0) precioUnitario?: number; // si no viene, se aplica RN-16
  @IsOptional() @IsNumber() @Min(0) @Max(100) descuentoPct?: number; // RN-17
  @IsOptional() @IsIn([0, 5, 15]) tarifaIva?: number; // servicios: transporte 0 %, mantenimiento 15 %
}

// ─── Cotización ───
export class CrearCotizacionDto {
  @IsMongoId() cliente: string;
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => ItemEntradaDto) items: ItemEntradaDto[];
  @IsOptional() @IsNumber() @Min(1) diasValidez?: number;
  @IsOptional() @IsIn(['MAYORISTA', 'EXPORTACION', 'MOSTRADOR']) canal?: string;
  @IsOptional() @IsString() condiciones?: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsOptional() @IsMongoId() solicitud?: string;
}

// ─── Pedido ───
export class CrearPedidoDto {
  @IsMongoId() cliente: string;
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => ItemEntradaDto) items: ItemEntradaDto[];
  @IsOptional() @IsIn(['MAYORISTA', 'EXPORTACION']) canal?: string;
  @IsOptional() @IsNumber() @Min(0) creditoDias?: number;
  @IsOptional() @IsObject() entrega?: { direccion?: string; fechaEstimada?: string; contacto?: string };
  @IsOptional() @IsObject() exportacion?: Record<string, string>;
  @IsOptional() @IsString() observaciones?: string;
}

export class ConvertirCotizacionDto {
  @IsOptional() @IsNumber() @Min(0) creditoDias?: number;
  @IsOptional() @IsObject() entrega?: { direccion?: string; fechaEstimada?: string; contacto?: string };
  @IsOptional() @IsObject() exportacion?: Record<string, string>;
}

// ─── Caja ───
export class AbrirCajaDto {
  @IsNumber() @Min(0) montoInicial: number;
}
export class CerrarCajaDto {
  @IsNumber() @Min(0) contado: number;
  @IsOptional() @IsString() observaciones?: string;
}

export class FechaOpcionalDto {
  @IsOptional() @IsDateString() fecha?: string;
}
