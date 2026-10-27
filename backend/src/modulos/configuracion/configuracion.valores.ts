// configuracion.valores.ts → valores POR DEFECTO de la configuración (se usan si la colección está vacía
// y también en el seed). Todos los datos de la empresa son FICTICIOS.

import type { Configuracion } from './configuracion.esquema.js';

export const CONFIGURACION_INICIAL: Configuracion = {
  _id: 'principal',
  empresa: {
    razonSocial: 'Pepa de Oro Agroindustrial S.A.',
    nombreComercial: 'Pepa de Oro — Cacao & Café de El Oro',
    ruc: '0791234557001',
    direccionMatriz: 'Km 3 vía El Guabo–Barbones, El Guabo, El Oro',
    direccionTienda: 'Av. 25 de Junio y Guayas, Machala',
    telefono: '(07) 295 0000',
    whatsapp: '593990000000',
    correo: 'ventas@pepadeoro.ec',
    horario: 'Lunes a sábado, 08:00–17:00',
    obligadoContabilidad: 'SI',
    establecimiento: '001',
    puntoEmision: '001',
    ambiente: '1',
    urlWeb: 'http://localhost:4200',
  },
  // Códigos de porcentaje de IVA del SRI (tabla 17 de la ficha técnica): 0 → 0 %, 4 → 15 %, 5 → 5 %.
  iva: { tarifaGeneral: 15, codigos: { '0': '0', '5': '5', '15': '4' } },
  calidad: {
    // Límites INSPIRADOS en NTE INEN 176 (Cacao en grano. Requisitos). Son configurables:
    // la empresa puede afinarlos sin tocar el código.
    gradosCacao: [
      { grado: 'PREMIUM', fermentadosMin: 75, violetasMax: 10, pizarrososMax: 4, mohososMax: 1, defectuososMax: 1, humedadMax: 7, peso100GranosMin: 120 },
      { grado: 'EXPORTACION', fermentadosMin: 65, violetasMax: 20, pizarrososMax: 9, mohososMax: 2, defectuososMax: 2, humedadMax: 7, peso100GranosMin: 110 },
      { grado: 'NACIONAL', fermentadosMin: 45, violetasMax: 30, pizarrososMax: 18, mohososMax: 4, defectuososMax: 4, humedadMax: 7.5, peso100GranosMin: 100 },
    ],
    gradosCafe: [
      { grado: 'PREMIUM', defectosMax: 5, puntajeTazaMin: 84, humedadMax: 12 },
      { grado: 'EXPORTACION', defectosMax: 23, puntajeTazaMin: 80, humedadMax: 12 },
      { grado: 'NACIONAL', defectosMax: 86, puntajeTazaMin: 0, humedadMax: 12.5 },
    ],
  },
  ventas: {
    // % máximo de descuento manual que puede dar cada rol (RN-17). El gerente no tiene tope.
    topeDescuento: { VENTAS: 5, GERENTE: 100 },
    diasValidezCotizacion: 15,
    limiteConsumidorFinal: 50,
  },
  acopio: { humedadReferencia: 7, bonoOrganicoQq: 10, bonoPremiumQq: 8, retencionRentaPct: 1 },
  alertas: { diasVencimiento: [90, 60, 30], diasAvisoMantenimiento: 7, diasAlertaFermentacion: 7 },
};
