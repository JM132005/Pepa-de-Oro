// facturacion.dto.ts → datos para emitir facturas, notas de crédito y abonos.

import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { CANALES_VENTA, CODIGOS_FORMA_PAGO } from '../../../comun/constantes.js';
import { ItemEntradaDto } from '../../ventas/dto/ventas.dto.js';

// Un pago: forma (código SRI) y monto. Varias líneas = pago mixto (parte efectivo, parte tarjeta).
export class PagoDto {
  @IsIn(CODIGOS_FORMA_PAGO) codigo: string;
  @IsNumber() @Min(0.01) monto: number;
}

export class EmitirFacturaDto {
  // Sin cliente → CONSUMIDOR FINAL (solo hasta $50, RN-19).
  @IsOptional() @IsMongoId() clienteId?: string;
  // Desde un pedido (venta por mayor) o con items directos (caja).
  @IsOptional() @IsMongoId() pedidoId?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ItemEntradaDto) items?: ItemEntradaDto[];
  @IsOptional() @IsIn(CANALES_VENTA) canal?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PagoDto) pagos?: PagoDto[];
  @IsOptional() @IsNumber() @Min(0) recibido?: number; // efectivo que entrega el cliente (para el cambio)
  @IsOptional() @IsNumber() @Min(0) creditoDias?: number; // > 0 = venta a crédito (RN-18)
  @IsOptional() @IsString() observaciones?: string;
  @IsOptional() @IsBoolean() enviarCorreo?: boolean; // por defecto true
}

// Línea a devolver en una nota de crédito: índice de la línea en la factura y cantidad.
export class LineaNotaCreditoDto {
  @IsNumber() @Min(0) indice: number;
  @IsNumber() @Min(0.001) cantidad: number;
}

export class NotaCreditoDto {
  @IsString() @MinLength(10, { message: 'Explica el motivo (mínimo 10 caracteres)' }) motivo: string;
  // Sin líneas = anulación total de la factura.
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => LineaNotaCreditoDto) lineas?: LineaNotaCreditoDto[];
  @IsOptional() @IsBoolean() devolverStock?: boolean; // el producto vuelve a bodega si está en buen estado
}

export class AbonoDto {
  @IsNumber() @Min(0.01) monto: number;
  @IsIn(CODIGOS_FORMA_PAGO) formaPago: string;
  @IsOptional() @IsString() referencia?: string; // número de transferencia
}
