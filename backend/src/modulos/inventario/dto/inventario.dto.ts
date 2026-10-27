// inventario.dto.ts → datos que llegan a las rutas de inventario.
// Un DTO (Data Transfer Object) es la "forma" de los datos de una petición. Cada decorador es una regla:
// si no se cumple, NestJS responde 400 con el mensaje, ANTES de llegar al servicio.

import { IsDateString, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { TIPOS_BODEGA } from '../../../comun/constantes.js';

export class CrearBodegaDto {
  @IsString() codigo: string;
  @IsString() nombre: string;
  @IsIn(TIPOS_BODEGA) tipo: string;
  @IsOptional() @IsString() ubicacion?: string;
  @IsOptional() @IsString() responsable?: string;
}

// Entrada manual: compra de insumos o repuestos a un proveedor.
export class EntradaCompraDto {
  @IsMongoId() productoId: string; // IsMongoId: formato válido de _id de MongoDB
  @IsMongoId() bodegaId: string;
  @IsNumber() @Min(0.001) cantidad: number;
  @IsNumber() @Min(0) costoUnitario: number;
  @IsOptional() @IsString() codigoLote?: string;
  @IsOptional() @IsDateString() vencimiento?: string; // texto con fecha ISO: "2027-03-01"
  @IsOptional() @IsString() proveedor?: string;
  @IsOptional() @IsString() factura?: string; // número de la factura del proveedor
}

export class TransferenciaDto {
  @IsMongoId() loteId: string;
  @IsMongoId() bodegaDestinoId: string;
  @IsNumber() @Min(0.001) cantidad: number;
}

// RN-15: el ajuste exige motivo (y el servicio exige que sea el gerente).
export class AjusteDto {
  @IsMongoId() loteId: string;
  @IsNumber() @Min(0) cantidadContada: number;
  @IsString() @MinLength(10, { message: 'RN-15: el motivo debe tener al menos 10 caracteres' }) motivo: string;
}

export class BajaDto {
  @IsMongoId() loteId: string;
  @IsString() @MinLength(10) motivo: string;
}
