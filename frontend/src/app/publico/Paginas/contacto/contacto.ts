// contacto.ts → CONTACTO: formulario, WhatsApp, teléfonos, horario y mapa de la matriz y de la tienda.
// El formulario crea una solicitud CONTACTO en el sistema (la ve Ventas) y el visitante recibe un correo.

import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SitioService } from '../../Servicios/sitio.service';
import { WebService } from '../../../compartido/Servicios/web.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { DatosContacto, FormularioSolicitud } from '../../Formularios/formulario-solicitud/formulario-solicitud';

@Component({
  selector: 'app-contacto',
  imports: [Icono, FormularioSolicitud],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacto.html',
})
export class Contacto {
  readonly sitio = inject(SitioService);
  private readonly web = inject(WebService);
  private readonly avisos = inject(NotificacionService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly formulario = viewChild(FormularioSolicitud);

  readonly enviando = signal(false);
  readonly enviado = signal<string | null>(null);
  // Coordenadas de la matriz y la tienda (vienen del contenido editable "contacto").
  readonly mapas = signal<{ matriz?: SafeResourceUrl; tienda?: SafeResourceUrl }>({});

  constructor() {
    this.sitio.contenido('contacto').subscribe((c) => {
      const d = c.datos as { mapaMatriz?: { lat: number; lng: number }; mapaTienda?: { lat: number; lng: number } };
      this.mapas.set({ matriz: d.mapaMatriz && this.mapa(d.mapaMatriz.lat, d.mapaMatriz.lng), tienda: d.mapaTienda && this.mapa(d.mapaTienda.lat, d.mapaTienda.lng) });
    });
  }

  private mapa(lat: number, lng: number): SafeResourceUrl {
    const d = 0.008;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`);
  }

  enviar(datos: DatosContacto) {
    this.enviando.set(true);
    this.web.enviarSolicitud({ ...datos, tipo: 'CONTACTO' }).subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.enviado.set(r.numero ?? 'registrada');
        this.formulario()?.reiniciar();
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(e);
      },
    });
  }
}
