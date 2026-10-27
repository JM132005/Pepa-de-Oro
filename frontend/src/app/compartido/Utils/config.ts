// config.ts → constantes de configuración del frontend.

// Dirección de la API NestJS. Si despliegan el backend en internet, solo se cambia esta línea.
export const API_URL = 'http://localhost:3000/api';

// Clave con la que se guarda la sesión en el navegador (localStorage).
export const CLAVE_SESION = 'pepadeoro.sesion';

// Clave de la "lista de interés" del visitante de la web (productos que quiere cotizar).
export const CLAVE_INTERES = 'pepadeoro.interes';

// Cada cuánto la web vuelve a pedir el stock (milisegundos): así se ve "en vivo".
export const REFRESCO_STOCK_MS = 20_000;

// Cada cuánto el sistema revisa las alertas de la campana.
export const REFRESCO_ALERTAS_MS = 60_000;

// WhatsApp de la empresa (formato internacional sin +).
export const WHATSAPP = '593990000000';
