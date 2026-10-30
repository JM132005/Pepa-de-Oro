// acciones.ts → ayudante para los botones que llaman a la API ("Guardar", "Anular", "Cobrar"...).
// Hace siempre lo mismo: marca "ocupado", espera la respuesta, muestra el aviso verde o rojo
// (con el mensaje de la regla de negocio RN-xx si la API dijo que no) y luego ejecuta lo que siga.
//
// Uso:
//   ejecutar(this.ventas.abonar(id, datos), { avisos: this.avisos, ocupado: this.ocupado, exito: 'Abono registrado', luego: () => this.cargar() });

import { WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificacionService } from '../../compartido/Servicios/notificacion.service';

export function ejecutar<T>(
  peticion: Observable<T>,
  op: { avisos: NotificacionService; exito?: string | ((r: T) => string); ocupado?: WritableSignal<boolean>; luego?: (r: T) => void; alFallar?: () => void },
) {
  op.ocupado?.set(true);
  peticion.subscribe({
    next: (r) => {
      op.ocupado?.set(false);
      if (op.exito) op.avisos.exito(typeof op.exito === 'function' ? op.exito(r) : op.exito);
      op.luego?.(r);
    },
    error: (e) => {
      op.ocupado?.set(false);
      op.avisos.error(e); // muestra el mensaje que mandó la API (ej. "RN-12: stock insuficiente…")
      op.alFallar?.();
    },
  });
}

// opciones(): convierte una lista de códigos en opciones para un <select> del formulario dinámico.
// Ej: opciones(['CACAO','CAFE'], texto) → [{ valor: 'CACAO', texto: 'Cacao' }, ...]
export function opciones(valores: readonly string[], textoDe: (v: string) => string = (v) => v) {
  return valores.map((v) => ({ valor: v, texto: textoDe(v) }));
}
