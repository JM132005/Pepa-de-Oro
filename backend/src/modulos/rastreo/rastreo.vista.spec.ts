// rastreo.vista.spec.ts → la vista pública no expone datos privados.

import { eventoPublico, nombreProductorPublico } from './rastreo.vista.js';

describe('Rastreo público', () => {
  it('no muestra el nombre del productor', () => {
    expect(nombreProductorPublico('El Guabo')).toBe('Productor asociado de El Guabo');
    expect(eventoPublico('RECEPCION', '470 kg seco de Luis Mora').detalle).toBe('470 kg seco');
  });
  it('traduce los eventos a títulos legibles', () => {
    expect(eventoPublico('FERMENTACION', 'Entra al fermentador F-02').titulo).toBe('Fermentación');
  });
});
