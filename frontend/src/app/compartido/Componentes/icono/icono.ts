// icono.ts → iconos SVG propios (trazos simples de 24×24). Uso: <app-icono nombre="factura" />
// Se dibujan con código (no son imágenes), así heredan el color del texto y no se descargan aparte.

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
// DomSanitizer: Angular bloquea HTML "crudo" por seguridad; aquí el SVG es nuestro, así que se marca como confiable.
import { DomSanitizer } from '@angular/platform-browser';
import { inject } from '@angular/core';

// Cada icono es la parte interna del <svg> (líneas, círculos y caminos).
const ICONOS: Record<string, string> = {
  inicio: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  panel: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  campo: '<path d="M12 21c0-7 0-11 7-16-1 7-3 10-7 11"/><path d="M12 21c0-5-1-8-6-11 0 5 2 8 6 9"/>',
  acopio: '<path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7l-3 7a4 4 0 006 0z"/><path d="M19 7l-3 7a4 4 0 006 0z"/><path d="M8 21h8"/>',
  poscosecha: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  calidad: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M8 11l2 2 4-4"/>',
  produccion: '<path d="M3 21V10l6 4V10l6 4V4h6v17z"/><path d="M7 17h2M12 17h2M17 17h2"/>',
  inventario: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  catalogo: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="8" cy="8" r="1.5"/>',
  caja: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8V4h10v4"/><path d="M7 13h2M11 13h2M15 13h2M7 16h10"/>',
  clientes: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0114 0"/><path d="M17 4a4 4 0 010 8M22 21a7 7 0 00-4-6.3"/>',
  cotizacion: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  pedido: '<path d="M6 2l-3 4v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/>',
  factura: '<path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  solicitud: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 9h8M8 13h5"/>',
  equipos: '<circle cx="7" cy="17" r="3"/><circle cx="18" cy="18" r="2"/><path d="M10 17h6M4 14V8h7l2 5h6v3"/><path d="M7 8V5h4"/>',
  alquiler: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h3v3H8z"/>',
  logistica: '<path d="M1 4h14v12H1z"/><path d="M15 9h4l4 4v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  mantenimiento: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  informe: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/><path d="M9 17v-3M12 17v-6M15 17v-2"/>',
  proyeccion: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
  usuarios: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  configuracion: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  auditoria: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
  campana: '<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  salir: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  cerrar: '<path d="M18 6L6 18M6 6l12 12"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  descargar: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
  pdf: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/><path d="M8 15h1.5a1.5 1.5 0 000-3H8v5M13 12v5h1a2 2 0 002-2v-1a2 2 0 00-2-2z"/>',
  excel: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/><path d="M8 12l4 5M12 12l-4 5"/>',
  correo: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
  whatsapp: '<path d="M21 11.5a8.5 8.5 0 01-12.6 7.4L3 21l2.1-5.3A8.5 8.5 0 1121 11.5z"/><path d="M8.5 9.5c.5 2.5 2.5 4.5 5 5l1.2-1.2 2 1-.5 1.7c-3.5.5-8.5-4.5-8-8l1.7-.5 1 2z"/>',
  arriba: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  abajo: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  lista: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  ubicacion: '<path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  telefono: '<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.8 2.1z"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  alerta: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  ojo: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  enviar: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  imprimir: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  grano: '<ellipse cx="12" cy="12" rx="6" ry="9"/><path d="M12 3c-2 4-2 14 0 18"/>',
  chocolate: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18M14 3v18"/>',
  barco: '<path d="M2 20c2 1 4 1 6 0s4-1 6 0 4 1 6 0"/><path d="M4 17l-1-5h18l-2 5"/><path d="M12 12V3l6 6h-6"/>',
  tractor: '<circle cx="7" cy="17" r="4"/><circle cx="18" cy="18" r="2.5"/><path d="M11 17h4.5M3 13V7h7l2 5h7v3.5"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
  hoja: '<path d="M11 20A7 7 0 014 13c0-6 6-10 16-10 0 10-4 16-10 16z"/><path d="M4 21c4-6 8-9 12-11"/>',
};

@Component({
  selector: 'app-icono',
  // host: estilos del propio elemento <app-icono>.
  host: { style: 'display:inline-flex;line-height:0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [innerHTML]="svg()"></span>`,
})
export class Icono {
  // input(): propiedad que recibe el componente desde la plantilla del padre.
  readonly nombre = input.required<string>();
  readonly tam = input(18);
  private readonly sanitizer = inject(DomSanitizer);

  readonly svg = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      `<svg width="${this.tam()}" height="${this.tam()}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[this.nombre()] ?? ICONOS['alerta']}</svg>`,
    ),
  );
}
