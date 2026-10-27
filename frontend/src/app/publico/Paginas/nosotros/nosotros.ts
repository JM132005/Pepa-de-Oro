// nosotros.ts → QUIÉNES SOMOS: historia, misión, visión, valores, haciendas (con mapa), certificaciones y equipo.
// La historia, la misión y el equipo vienen del contenido editable; las haciendas, de la base de datos.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SitioService } from '../../Servicios/sitio.service';
import { Imagen } from '../../../compartido/Componentes/imagen/imagen';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { texto } from '../../../compartido/Utils/etiquetas';
import { numero } from '../../../compartido/Utils/formato';

interface DatosNosotros {
  historia: string[];
  mision: string;
  vision: string;
  valores: { titulo: string; texto: string }[];
  equipo: { nombre: string; cargo: string }[];
}

@Component({
  selector: 'app-nosotros',
  imports: [Imagen, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nosotros.html',
})
export class Nosotros {
  readonly sitio = inject(SitioService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly datos = signal<DatosNosotros | null>(null);
  readonly texto = texto;
  readonly numero = numero;

  // certificaciones: lista sin repetir de todas las certificaciones de las haciendas (Set elimina duplicados).
  readonly certificaciones = computed(() => [...new Set((this.sitio.empresa()?.haciendas ?? []).flatMap((h) => h.certificaciones.map((c) => c.tipo)))]);

  constructor() {
    this.sitio.contenido('nosotros').subscribe((c) => this.datos.set(c.datos as DatosNosotros));
  }

  // mapa(): URL del mapa de OpenStreetMap (libre, sin clave) centrado en la hacienda, con un marcador.
  // bypassSecurityTrustResourceUrl: Angular bloquea iframes externos por seguridad; esta URL la armamos nosotros.
  mapa(lat: number, lng: number): SafeResourceUrl {
    const d = 0.02; // margen alrededor del punto (≈ 2 km)
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`);
  }

  // iniciales(): "Ana Lucía Ramírez" → "AR" (para el avatar del equipo).
  iniciales(nombre: string) {
    const partes = nombre.split(' ');
    return (partes[0][0] + (partes.at(-1)?.[0] ?? '')).toUpperCase();
  }
}
