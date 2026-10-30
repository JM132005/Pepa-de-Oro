// poscosecha.dto.ts → datos de fermentación, secado y mezcla de lotes.

import { ArrayMinSize, IsArray, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { METODOS_SECADO } from '../../../comun/constantes.js';

export class IniciarFermentacionDto {
  @IsMongoId() fermentadorId: string; // activo de tipo FERMENTADOR
}

export class VolteoDto {
  @IsOptional() @IsNumber() @Min(20) @Max(60) temperatura?: number; // °C de la masa (normal: 40–50 °C)
}

export class IniciarSecadoDto {
  @IsIn(METODOS_SECADO) metodo: string;
  @IsMongoId() activoId: string; // tendal o secadora
}

export class MedicionHumedadDto {
  @IsNumber() @Min(0) @Max(80) humedad: number;
}

export class TerminarSecadoDto {
  @IsNumber() @Min(0.1) kgSeco: number;
  @IsNumber() @Min(0) @Max(80) humedadFinal: number;
}

export class CombinarLotesDto {
  @IsArray() @ArrayMinSize(2) @IsMongoId({ each: true }) lotes: string[];
  @IsOptional() @IsString() observacion?: string;
}
