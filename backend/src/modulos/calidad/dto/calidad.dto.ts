// calidad.dto.ts → mediciones de calidad de grano y de producto terminado.

import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { DESTINOS_RECHAZO } from '../../../comun/constantes.js';

// Prueba de corte de 100 granos (cacao) o muestra de 300 g (café). Todos los conteos son opcionales
// porque el café no lleva prueba de corte y el cacao no lleva puntaje de taza.
export class EvaluarGranoDto {
  @IsOptional() @IsNumber() @Min(0) @Max(100) bienFermentados?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) violetas?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) pizarrosos?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) mohosos?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) insectados?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) germinados?: number;
  @IsNumber() @Min(0) @Max(80) humedad: number;
  @IsOptional() @IsNumber() @Min(0) peso100Granos?: number;
  @IsOptional() @IsNumber() @Min(0) impurezas?: number;
  @IsOptional() @IsNumber() @Min(0) defectos300g?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) puntajeTaza?: number;
}

export class CataDto {
  @IsArray() @IsString({ each: true }) notas: string[]; // floral, frutal, nuez, chocolate...
  @IsNumber() @Min(1) @Max(10) puntaje: number;
  @IsOptional() @IsString() comentario?: string;
}

export class CerrarNoConformidadDto {
  @IsIn(DESTINOS_RECHAZO) destino: string;
  @IsOptional() @IsString() @MinLength(5) observacion?: string;
}

// Control de producto terminado (RN-11).
export class ControlProductoDto {
  @IsNumber() @Min(0) pesoPromedioG: number;
  @IsBoolean() selladoOk: boolean;
  @IsBoolean() etiquetaOk: boolean;
  @IsOptional() @IsNumber() temperaturaTemplado?: number;
  @IsOptional() @IsString() tipoEmpaque?: string;
}
