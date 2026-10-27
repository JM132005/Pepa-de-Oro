// rastreo.vista.ts → convierte los datos internos en la vista PÚBLICA de "Rastrea tu cacao".
// Regla de privacidad: el visitante ve la historia del lote pero NUNCA nombres de productores,
// precios, costos ni clientes. Por eso esta función elige campo por campo qué sale.

export interface OrigenPublico {
  tipo: 'HACIENDA_PROPIA' | 'PRODUCTOR_ASOCIADO';
  nombre: string; // "Hacienda La Esperanza" o "Productor asociado de El Guabo"
  canton?: string;
  variedad: string;
  parcela?: string;
  ubicacion?: { lat: number; lng: number };
  codigoLote: string;
}

// nombreProductorPublico(): "Luis Alberto Mora" → "Productor asociado de El Guabo" (no se publica el nombre).
export function nombreProductorPublico(canton?: string): string {
  return `Productor asociado de ${canton ?? 'El Oro'}`;
}

// eventoPublico(): traduce los eventos internos a frases para el visitante, sin pesos de compra ni personas.
export function eventoPublico(evento: string, detalle: string): { titulo: string; detalle: string } {
  const titulos: Record<string, string> = {
    RECEPCION: 'Cosecha y recepción',
    FERMENTACION: 'Fermentación',
    SECADO: 'Secado',
    SECO: 'Grano seco',
    CALIDAD: 'Control de calidad',
    BODEGA: 'Almacenamiento',
    MEZCLA: 'Lote combinado',
    NO_CONFORMIDAD: 'Revisión de calidad',
  };
  // Se quitan del detalle los nombres después de "de " (quién entregó) para no exponerlos.
  const limpio = evento === 'RECEPCION' ? detalle.replace(/ de .*$/, '') : detalle.replace(/ a .* como .*/, ' a bodega');
  return { titulo: titulos[evento] ?? evento, detalle: limpio };
}
