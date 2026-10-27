// rastreo.ts → RASTREA TU CACAO: el visitante escribe (o escanea con la cámara) el código del lote que trae
// su barra o su saco y ve la historia: de qué hacienda o productor salió, cuántos días fermentó, cómo se secó,
// qué calidad obtuvo y cuándo se elaboró. Nunca se muestran datos privados (precios, cédulas).
//
// El QR de la etiqueta abre /rastreo?codigo=PT-20261015-01 y la búsqueda se hace sola.

import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WebService } from '../../../compartido/Servicios/web.service';
import { Rastreo as DatosRastreo } from '../../../compartido/Entidades/web';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Imagen } from '../../../compartido/Componentes/imagen/imagen';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { Cargando } from '../../../compartido/Componentes/cargando/cargando';
import { mensajeError } from '../../../compartido/Utils/errores';
import { fecha, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';

// BarcodeDetector: API del navegador (Chrome/Android) que lee códigos QR desde la cámara.
// No todos los navegadores la tienen, por eso se declara aquí y se revisa antes de usarla.
declare const BarcodeDetector: { new (opciones: { formats: string[] }): { detect(fuente: HTMLVideoElement): Promise<{ rawValue: string }[]> } } | undefined;

@Component({
  selector: 'app-rastreo',
  imports: [FormsModule, Icono, Imagen, Insignia, Cargando],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rastreo.html',
})
export class Rastreo {
  private readonly web = inject(WebService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  readonly codigo = signal('');
  readonly resultado = signal<DatosRastreo | null>(null);
  readonly buscando = signal(false);
  readonly error = signal<string | null>(null);
  // Cámara
  readonly escaneando = signal(false);
  readonly puedeEscanear = typeof BarcodeDetector !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private flujo: MediaStream | null = null;

  readonly fecha = fecha;
  readonly numero = numero;
  readonly texto = texto;

  constructor() {
    const destruir = inject(DestroyRef);
    // Si la URL trae ?codigo=..., se busca de inmediato (así funciona el QR de la etiqueta).
    this.ruta.queryParamMap.pipe(takeUntilDestroyed(destruir)).subscribe((q) => {
      const c = q.get('codigo');
      if (c) {
        this.codigo.set(c);
        this.consultar(c);
      }
    });
    destruir.onDestroy(() => this.detenerCamara());
  }

  // buscar(): pone el código en la URL (para poder compartir el enlace); la suscripción de arriba hace la consulta.
  buscar() {
    const c = this.codigo().trim().toUpperCase();
    if (!c) return;
    this.router.navigate([], { relativeTo: this.ruta, queryParams: { codigo: c } });
  }

  private consultar(c: string) {
    this.buscando.set(true);
    this.error.set(null);
    this.resultado.set(null);
    this.web.rastrear(c.trim().toUpperCase()).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.buscando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.buscando.set(false);
      },
    });
  }

  // escanear(): enciende la cámara trasera y busca un QR en cada cuadro de video.
  async escanear() {
    if (!this.puedeEscanear || !BarcodeDetector) return;
    try {
      // getUserMedia: pide permiso para usar la cámara. facingMode 'environment' = cámara de atrás.
      this.flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.escaneando.set(true);
      // Se espera un momento a que Angular dibuje el <video>.
      setTimeout(async () => {
        const video = this.video()?.nativeElement;
        if (!video || !this.flujo) return;
        video.srcObject = this.flujo;
        await video.play();
        const detector = new BarcodeDetector!({ formats: ['qr_code', 'code_128'] });
        const revisar = async () => {
          if (!this.escaneando()) return;
          const codigos = await detector.detect(video).catch(() => []);
          if (codigos.length) {
            // El QR trae la URL completa (…/rastreo?codigo=XYZ) o solo el código.
            const valor = codigos[0].rawValue;
            const encontrado = valor.includes('codigo=') ? new URL(valor).searchParams.get('codigo') ?? valor : valor;
            this.detenerCamara();
            this.codigo.set(encontrado);
            this.buscar();
          } else requestAnimationFrame(revisar); // requestAnimationFrame: vuelve a intentar en el siguiente cuadro
        };
        revisar();
      }, 50);
    } catch {
      this.error.set('No se pudo abrir la cámara. Revisa el permiso del navegador o escribe el código.');
    }
  }

  detenerCamara() {
    this.escaneando.set(false);
    this.flujo?.getTracks().forEach((t) => t.stop()); // apaga la cámara (se apaga la lucecita)
    this.flujo = null;
  }

  mapa(lat: number, lng: number): SafeResourceUrl {
    const d = 0.03;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`);
  }
}
