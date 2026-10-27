// archivos.service.ts → abre o descarga los PDF y Excel que genera el backend.

import { Injectable, inject, signal } from '@angular/core';
import { ApiService, Filtros } from './api.service';
import { NotificacionService } from './notificacion.service';

@Injectable({ providedIn: 'root' })
export class ArchivosService {
  private readonly api = inject(ApiService);
  private readonly avisos = inject(NotificacionService);

  // pdfAbierto: el visor (componente VisorPdf) se muestra cuando este signal tiene una URL.
  readonly pdfAbierto = signal<{ url: string; titulo: string; nombre: string } | null>(null);

  // verPdf(): pide el PDF y lo muestra DENTRO de la página (iframe del visor).
  verPdf(ruta: string, titulo: string, nombre = 'documento.pdf', filtros?: Filtros) {
    this.api.archivo(ruta, filtros).subscribe({
      next: (blob) => {
        // createObjectURL(): crea una dirección temporal "blob:..." que apunta al archivo en memoria.
        this.cerrarPdf();
        this.pdfAbierto.set({ url: URL.createObjectURL(blob), titulo, nombre });
      },
      error: (e) => this.avisos.error(e),
    });
  }

  cerrarPdf() {
    const actual = this.pdfAbierto();
    if (actual) URL.revokeObjectURL(actual.url); // libera la memoria
    this.pdfAbierto.set(null);
  }

  // descargar(): guarda el archivo en la computadora (PDF o Excel).
  descargar(ruta: string, nombre: string, filtros?: Filtros) {
    this.api.archivo(ruta, filtros).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a'); // un <a download> invisible
        enlace.href = url;
        enlace.download = nombre;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      error: (e) => this.avisos.error(e),
    });
  }
}
