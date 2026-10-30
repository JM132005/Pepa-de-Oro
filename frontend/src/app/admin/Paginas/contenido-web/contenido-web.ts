// contenido-web.ts → CONTENIDO EDITABLE de la web pública (solo gerente): banners y frase de la portada,
// historia, misión, valores y equipo de "Nosotros", textos y tarifas de "Servicios", testimonios y mapas.
// Se guarda en la colección contenido_web: la web lo lee al abrirse, sin volver a programar nada.
//
// Cada sección se edita como JSON (el formato de los datos): se valida antes de guardar para no romper la web.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebService } from '../../../compartido/Servicios/web.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { fechaHora } from '../../../compartido/Utils/formato';
import { ejecutar } from '../../Utils/acciones';

interface Contenido {
  clave: string;
  titulo: string;
  datos: Record<string, unknown>;
  actualizadoPor?: string;
  updatedAt?: string;
}

// Dónde se ve cada sección en la web pública (para el botón "Ver en la web").
const RUTAS: Record<string, string> = { inicio: '/', testimonios: '/', nosotros: '/nosotros', servicios: '/servicios', contacto: '/contacto' };

@Component({
  selector: 'app-contenido-web',
  imports: [FormsModule, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contenido-web.html',
})
export class ContenidoWeb {
  private readonly web = inject(WebService);
  private readonly avisos = inject(NotificacionService);

  readonly contenidos = signal<Contenido[]>([]);
  readonly elegido = signal<Contenido | null>(null);
  readonly titulo = signal('');
  readonly texto = signal('');
  readonly ocupado = signal(false);

  // errorJson: si el texto no es un JSON válido, el mensaje del error (y no se deja guardar).
  readonly errorJson = computed(() => {
    try {
      const v = JSON.parse(this.texto());
      return typeof v === 'object' && v !== null && !Array.isArray(v) ? null : 'Debe ser un objeto { … }';
    } catch (e) {
      return (e as Error).message;
    }
  });
  readonly rutas = RUTAS;
  readonly fechaHora = fechaHora;

  constructor() {
    this.cargar();
  }

  cargar() {
    this.web.contenidos().subscribe((c) => {
      this.contenidos.set(c);
      if (!this.elegido() && c.length) this.elegir(c[0]);
    });
  }

  elegir(c: Contenido) {
    this.elegido.set(c);
    this.titulo.set(c.titulo);
    // JSON.stringify(..., null, 2): convierte el objeto en texto con sangría de 2 espacios (fácil de leer).
    this.texto.set(JSON.stringify(c.datos, null, 2));
  }

  guardar() {
    const c = this.elegido();
    if (!c || this.errorJson()) return;
    ejecutar(this.web.guardarContenido(c.clave, this.titulo(), JSON.parse(this.texto())), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Contenido publicado en la web',
      luego: () => this.cargar(),
    });
  }

  formatear() {
    if (!this.errorJson()) this.texto.set(JSON.stringify(JSON.parse(this.texto()), null, 2));
  }
}
