// visor-pdf.ts → muestra un PDF DENTRO de la página (factura, cotización, contrato...) con botones
// de descargar e imprimir. Se abre llamando ArchivosService.verPdf(...) desde cualquier pantalla.

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ArchivosService } from '../../Servicios/archivos.service';
import { Modal } from '../modal/modal';
import { Icono } from '../icono/icono';

@Component({
  selector: 'app-visor-pdf',
  imports: [Modal, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (archivos.pdfAbierto(); as pdf) {
      <app-modal [titulo]="pdf.titulo" ancho="completo" (cerrar)="archivos.cerrarPdf()">
        <div class="barra">
          <a class="btn btn-borde btn-sm" [href]="pdf.url" [attr.download]="pdf.nombre"><app-icono nombre="descargar" /> Descargar</a>
          <button class="btn btn-borde btn-sm" type="button" (click)="imprimir()"><app-icono nombre="imprimir" /> Imprimir</button>
          <a class="btn btn-borde btn-sm" [href]="pdf.url" target="_blank" rel="noopener">Abrir en otra pestaña</a>
        </div>
        <!-- iframe: una "ventana" dentro de la página que usa el lector de PDF del navegador -->
        <iframe #marco [src]="urlSegura()" title="Vista del PDF"></iframe>
      </app-modal>
    }
  `,
  styles: `
    .barra { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    iframe { width: 100%; height: calc(100vh - 190px); border: 1px solid var(--borde); border-radius: var(--radio-sm); background: #fff; }
  `,
})
export class VisorPdf {
  readonly archivos = inject(ArchivosService);
  private readonly sanitizer = inject(DomSanitizer);
  // bypassSecurityTrustResourceUrl: el blob lo creamos nosotros, así que es seguro mostrarlo en el iframe.
  readonly urlSegura = computed(() => {
    const pdf = this.archivos.pdfAbierto();
    return pdf ? this.sanitizer.bypassSecurityTrustResourceUrl(pdf.url) : null;
  });

  imprimir() {
    const marco = document.querySelector<HTMLIFrameElement>('app-visor-pdf iframe');
    marco?.contentWindow?.print();
  }
}
