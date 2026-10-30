// sitio.service.ts → datos de la empresa para TODA la web pública (cabecera, pie, contacto, nosotros).
// Se piden UNA sola vez al backend y se guardan en memoria (caché), así no se repite la petición
// cada vez que el visitante cambia de página.

import { Injectable, inject, signal } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { WebService } from '../../compartido/Servicios/web.service';
import { EmpresaPublica } from '../../compartido/Entidades/web';
import { WHATSAPP } from '../../compartido/Utils/config';

@Injectable({ providedIn: 'root' })
export class SitioService {
  private readonly web = inject(WebService);

  // empresa: signal con los datos públicos de la empresa (null mientras cargan).
  readonly empresa = signal<EmpresaPublica | null>(null);

  // Caché de las secciones editables (inicio, nosotros, servicios, testimonios, contacto).
  // shareReplay(1): el primer suscriptor dispara la petición; los siguientes reciben la misma respuesta guardada.
  private readonly contenidos = new Map<string, Observable<{ clave: string; titulo: string; datos: any }>>();

  constructor() {
    // Se carga apenas se crea el servicio (la primera vez que alguien lo usa).
    this.web.empresa().subscribe({ next: (e) => this.empresa.set(e), error: () => this.empresa.set(null) });
  }

  // contenido(): una sección editable desde el sistema (Contenido web), con caché.
  contenido(clave: string) {
    if (!this.contenidos.has(clave)) this.contenidos.set(clave, this.web.contenido(clave).pipe(shareReplay(1)));
    return this.contenidos.get(clave)!;
  }

  // enlaceWhatsapp(): arma el enlace wa.me con un mensaje ya escrito.
  // encodeURIComponent: convierte espacios y tildes en el formato que entiende una URL (%20, %C3%A1...).
  enlaceWhatsapp(mensaje = 'Hola Pepa de Oro, quisiera información') {
    const numero = (this.empresa()?.whatsapp ?? WHATSAPP).replace(/\D/g, '') || WHATSAPP;
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  }
}
