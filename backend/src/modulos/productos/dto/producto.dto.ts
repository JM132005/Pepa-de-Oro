// producto.dto.ts → validación de los datos de un producto (variante) del catálogo.

import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CULTIVOS, FAMILIAS, GRADOS, TIPOS_PRODUCTO, UNIDADES, VARIEDADES } from '../../../comun/constantes.js';

// EscalaDto: una fila de la escala por volumen.
class EscalaDto {
  @IsNumber() @Min(1) desde: number;
  @IsNumber() @Min(0) precio: number;
}

export class CrearProductoDto {
  @IsString() sku: string;
  @IsString() nombre: string;
  @IsString() productoBase: string;
  @IsIn(FAMILIAS) familia: string;
  @IsIn(TIPOS_PRODUCTO) tipo: string;
  @IsOptional() @IsString() sabor?: string;
  @IsOptional() @IsString() presentacion?: string;
  @IsIn(UNIDADES) unidad: string;
  @IsOptional() @IsNumber() pesoNetoG?: number;
  @IsNumber() @Min(0) precioMenor: number;
  @IsNumber() @Min(0) precioMayor: number;
  @IsOptional() @IsNumber() @Min(1) cantidadMinimaMayor?: number;
  // ValidateNested + Type: valida CADA elemento del arreglo con las reglas de EscalaDto.
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EscalaDto) escalas?: EscalaDto[];
  @IsOptional() @IsObject() listas?: Record<string, number>;
  @IsIn([0, 5, 15]) tarifaIva: number;
  @IsOptional() @IsNumber() margenSobrePrecioDia?: number;
  @IsOptional() @IsNumber() stockMinimo?: number;
  @IsOptional() @IsNumber() diasReposicion?: number;
  @IsOptional() @IsNumber() vidaUtilDias?: number;
  @IsOptional() @IsIn(CULTIVOS) cultivo?: string;
  @IsOptional() @IsIn(VARIEDADES) variedad?: string;
  @IsOptional() @IsIn(GRADOS) grado?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) notasCata?: string[];
  @IsOptional() @IsString() origen?: string;
  @IsOptional() @IsString() ingredientes?: string;
  @IsOptional() @IsString() alergenos?: string;
  @IsOptional() @IsString() registroSanitario?: string;
  @IsOptional() @IsString() imagen?: string;
  @IsOptional() @IsBoolean() publicado?: boolean;
  @IsOptional() @IsBoolean() destacado?: boolean;
  @IsOptional() @IsBoolean() proximamente?: boolean;
  @IsOptional() @IsBoolean() activo?: boolean;
}

// PartialType: copia CrearProductoDto con TODOS los campos opcionales (para editar).
import { PartialType } from '@nestjs/mapped-types';
export class ActualizarProductoDto extends PartialType(CrearProductoDto) {}
