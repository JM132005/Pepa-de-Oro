// notificacion.service.ts → mensajes emergentes ("toasts") de éxito o error en la esquina de la pantalla.

import { Injectable, signal } from '@angular/core';
import { mensajeError } from '../Utils/errores';

export interface Aviso {
  id: number;
  tipo: 'exito' | 'error' | 'info';
  texto: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  readonly avisos = signal<Aviso[]>([]);
  private siguienteId = 1;

  private mostrar(tipo: Aviso['tipo'], texto: string, ms = 4500) {
    const aviso = { id: this.siguienteId++, tipo, texto };
    // update(): calcula el nuevo valor a partir del anterior (agrega el aviso al final).
    this.avisos.update((lista) => [...lista, aviso]);
    setTimeout(() => this.cerrar(aviso.id), ms);
  }

  exito(texto: string) {
    this.mostrar('exito', texto);
  }
  info(texto: string) {
    this.mostrar('info', texto);
  }
  // error(): acepta el error HTTP tal cual y saca el mensaje de la regla de negocio (RN-xx).
  error(error: unknown) {
    this.mostrar('error', mensajeError(error), 7000);
  }
  cerrar(id: number) {
    this.avisos.update((lista) => lista.filter((a) => a.id !== id));
  }
}
