// publico.decorator.ts → decorador @Publico() para marcar rutas que NO necesitan token (login, salud).

// SetMetadata: guarda un dato "pegado" a un método; luego el guard lo lee con Reflector.
import { SetMetadata } from '@nestjs/common';

// Clave con la que se guarda la marca (se exporta para que el guard la busque).
export const ES_PUBLICO = 'esPublico';

// Uso: @Publico() encima de un método del controlador.
export const Publico = () => SetMetadata(ES_PUBLICO, true);
