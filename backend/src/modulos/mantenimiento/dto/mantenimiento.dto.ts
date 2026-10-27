// mantenimiento.dto.ts → órdenes del taller.

import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class ReportarFallaDto {
  @IsMongoId() activo: string;
  @IsString() @MinLength(5) descripcion: string;
  @IsOptional() @IsIn(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']) prioridad?: string;
}

class EquipoClienteDto {
  @IsString() descripcion: string;
  @IsOptional() @IsString() marca?: string;
  @IsOptional() @IsString() modelo?: string;
  @IsOptional() @IsString() serie?: string;
}

// Servicio pagado de mantenimiento a la maquinaria de un cliente.
export class ServicioClienteDto {
  @IsMongoId() cliente: string;
  @ValidateNested() @Type(() => EquipoClienteDto) equipoCliente: EquipoClienteDto;
  @IsString() @MinLength(5) falla: string;
  @IsOptional() @IsDateString() programada?: string;
}

export class AsignarDto {
  @IsOptional() @IsMongoId() tecnicoId?: string;
  @IsOptional() @IsString() tecnicoNombre?: string;
  @IsOptional() @IsDateString() programada?: string;
}

export class RepuestoDto {
  @IsMongoId() producto: string;
  @IsNumber() @Min(0.001) cantidad: number;
}

class ChecklistDto {
  @IsString() tarea: string;
  @IsBoolean() hecha: boolean;
}

export class TerminarOrdenDto {
  @IsNumber() @Min(0) horasManoObra: number;
  @IsOptional() @IsNumber() @Min(0) usoAlCerrar?: number; // horómetro u odómetro
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ChecklistDto) checklist?: ChecklistDto[];
  @IsOptional() @IsString() observaciones?: string;
}

export class PresupuestoDto {
  @IsNumber() @Min(0) total: number;
  @IsOptional() @IsBoolean() aprobado?: boolean;
}
