// actualizar-configuracion.dto.ts → el gerente envía solo las secciones que quiere cambiar.
// IsObject: valida que cada sección sea un objeto { ... }.

import { IsObject, IsOptional } from 'class-validator';

export class ActualizarConfiguracionDto {
  @IsOptional() @IsObject() empresa?: Record<string, unknown>;
  @IsOptional() @IsObject() iva?: Record<string, unknown>;
  @IsOptional() @IsObject() calidad?: Record<string, unknown>;
  @IsOptional() @IsObject() ventas?: Record<string, unknown>;
  @IsOptional() @IsObject() acopio?: Record<string, unknown>;
  @IsOptional() @IsObject() alertas?: Record<string, unknown>;
}
