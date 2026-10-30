// panel-interes.ts → cajón lateral con la LISTA DE INTERÉS del visitante.
// El visitante marca varios productos (con su cantidad) y envía UNA sola solicitud de cotización con todos.
// No es un carrito: no hay pago en línea; un vendedor le responde con la cotización formal.

import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListaInteresService } from '../../../compartido/Servicios/lista-interes.service';
import { WebService } from '../../../compartido/Servicios/web.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Imagen } from '../../../compartido/Componentes/imagen/imagen';
import { dinero } from '../../../compartido/Utils/formato';
import { DatosContacto, FormularioSolicitud } from '../../Formularios/formulario-solicitud/formulario-solicitud';

@Component({
  selector: 'app-panel-interes',
  imports: [RouterLink, Icono, Imagen, FormularioSolicitud],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (interes.abierta()) {
      <div class="web-cajon-fondo" (click)="interes.abierta.set(false)"></div>
      <aside class="web-cajon" role="dialog" aria-modal="true" aria-label="Mi lista de interés">
        <header>
          <h3 style="margin:0">Mi lista de interés</h3>
          <button class="btn-icono" type="button" (click)="interes.abierta.set(false)" aria-label="Cerrar"><app-icono nombre="cerrar" /></button>
        </header>
        <div class="cuerpo">
          @if (numero()) {
            <div class="aviso exito">
              ✓ Recibimos tu solicitud <strong>{{ numero() }}</strong>. Un asesor te enviará la cotización a tu correo.
            </div>
          }
          @if (!interes.items().length) {
            <p class="tenue">Tu lista está vacía. Agrega productos desde el <a routerLink="/productos" (click)="interes.abierta.set(false)">catálogo</a> para pedir una cotización con todos a la vez.</p>
          } @else {
            @for (i of interes.items(); track i.productoId) {
              <div class="web-item-interes">
                <app-imagen [src]="i.imagen" [alt]="i.nombre" />
                <div>
                  <strong style="font-size:0.9rem">{{ i.nombre }}</strong>
                  <div class="tenue" style="font-size:0.8rem">{{ precio(i.precioMenor) }} c/u por menor</div>
                </div>
                <div class="fila" style="gap:0.25rem">
                  <button class="btn-icono" type="button" (click)="interes.cambiarCantidad(i.productoId, i.cantidad - 1)" aria-label="Menos"><app-icono nombre="menos" [tam]="16" /></button>
                  <input type="number" min="1" [value]="i.cantidad" (change)="interes.cambiarCantidad(i.productoId, +$any($event.target).value)" style="width:58px;text-align:center;padding:0.3rem" aria-label="Cantidad" />
                  <button class="btn-icono" type="button" (click)="interes.cambiarCantidad(i.productoId, i.cantidad + 1)" aria-label="Más"><app-icono nombre="mas" [tam]="16" /></button>
                  <button class="btn-icono" type="button" (click)="interes.quitar(i.productoId)" aria-label="Quitar"><app-icono nombre="cerrar" [tam]="16" /></button>
                </div>
              </div>
            }
            <p class="fila entre" style="margin:0.75rem 0">
              <span class="tenue">Referencial por menor (sin descuentos por mayor)</span>
              <strong>{{ precio(totalReferencial()) }}</strong>
            </p>
            <div class="separador"></div>
            <h3>Pedir cotización</h3>
            <app-formulario-solicitud #formulario textoBoton="Enviar solicitud de cotización" [ocupado]="enviando()" (enviar)="enviar($event)" />
          }
        </div>
      </aside>
    }
  `,
})
export class PanelInteres {
  readonly interes = inject(ListaInteresService);
  private readonly web = inject(WebService);
  private readonly avisos = inject(NotificacionService);
  // viewChild: referencia al formulario hijo para poder reiniciarlo después de enviar.
  private readonly formulario = viewChild<FormularioSolicitud>('formulario');
  readonly enviando = signal(false);
  readonly numero = signal<string | null>(null);
  readonly totalReferencial = computed(() => this.interes.items().reduce((s, i) => s + i.precioMenor * i.cantidad, 0));
  readonly precio = dinero;

  // enviar(): junta los datos de contacto con los productos de la lista y crea la solicitud (tipo COTIZACION).
  enviar(datos: DatosContacto) {
    this.enviando.set(true);
    const items = this.interes.items().map((i) => ({ productoId: i.productoId, cantidad: i.cantidad }));
    this.web.enviarSolicitud({ ...datos, tipo: 'COTIZACION', items }).subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.numero.set(r.numero ?? 'registrada');
        this.interes.vaciar();
        this.formulario()?.reiniciar();
        this.avisos.exito('¡Solicitud enviada! Revisa tu correo.');
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(e);
      },
    });
  }
}
