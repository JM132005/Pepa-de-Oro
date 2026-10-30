// selector-cliente.ts → buscador de CLIENTES con opción de crear uno nuevo sin salir de la pantalla.
// Lo usan la Caja, las Cotizaciones, los Pedidos, los Alquileres y el Taller.
//
// Uso: <app-selector-cliente [(cliente)]="cliente" [permitirConsumidorFinal]="true" />

import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VentasService } from '../../../compartido/Servicios/ventas.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { Cliente } from '../../../compartido/Entidades/ventas';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { FormularioDinamico } from '../../../compartido/Componentes/formulario-dinamico/formulario-dinamico';
import { CAMPOS_CLIENTE } from '../../Formularios/campos';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

@Component({
  selector: 'app-selector-cliente',
  imports: [FormsModule, Icono, Modal, FormularioDinamico],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cliente(); as c) {
      <div class="fila entre tarjeta" style="padding:0.6rem 0.8rem">
        <div>
          <strong>{{ c.nombre }}</strong>
          <div class="tenue" style="font-size:0.8rem">{{ texto(c.tipoIdentificacion) }} {{ c.identificacion }} · {{ texto(c.tipoCliente) }}{{ c.creditoDias ? ' · crédito ' + c.creditoDias + ' días' : '' }}</div>
          @if (c.correo) { <div class="tenue" style="font-size:0.8rem">✉ {{ c.correo }}</div> }
        </div>
        <button class="btn btn-borde btn-sm" type="button" (click)="cliente.set(null)">Cambiar</button>
      </div>
    } @else {
      <div style="position:relative">
        <div class="fila">
          <input style="flex:1;min-width:200px" placeholder="Buscar cliente por nombre, cédula o RUC…" [ngModel]="texto_()" (ngModelChange)="buscar($event)" aria-label="Buscar cliente" />
          @if (permitirConsumidorFinal()) {
            <button class="btn btn-borde btn-sm" type="button" (click)="consumidorFinal()">Consumidor final</button>
          }
          <button class="btn btn-borde btn-sm" type="button" (click)="nuevo.set(true)"><app-icono nombre="mas" [tam]="16" /> Nuevo</button>
        </div>
        @if (resultados().length) {
          <div class="adm-desplegable" style="left:0;right:auto;width:min(520px,100%)">
            @for (c of resultados(); track c._id) {
              <button type="button" class="adm-alerta" style="width:100%;border:none;background:none;text-align:left;cursor:pointer" (click)="elegir(c)">
                <span><strong>{{ c.nombre }}</strong><br /><span class="tenue">{{ c.identificacion }} · {{ texto(c.tipoCliente) }}</span></span>
              </button>
            }
          </div>
        }
      </div>
    }
    @if (nuevo()) {
      <app-modal titulo="Nuevo cliente" ancho="ancho" (cerrar)="nuevo.set(false)">
        <app-formulario-dinamico [campos]="campos" [valores]="valoresNuevo() ?? { tipoIdentificacion: 'CEDULA', tipoCliente: tipoPorDefecto(), creditoDias: 0 }" [ocupado]="ocupado()" textoBoton="Crear cliente" (guardar)="crear($event)" />
      </app-modal>
    }
  `,
})
export class SelectorCliente {
  private readonly ventas = inject(VentasService);
  private readonly avisos = inject(NotificacionService);
  readonly cliente = model<Cliente | null>(null);
  readonly permitirConsumidorFinal = input(false);
  readonly tipoPorDefecto = input('CONSUMIDOR');
  // valoresNuevo: datos para llenar el formulario de "Nuevo cliente" (ej. desde una solicitud de la web).
  readonly valoresNuevo = input<Record<string, unknown> | null>(null);

  readonly texto_ = signal('');
  readonly resultados = signal<Cliente[]>([]);
  readonly nuevo = signal(false);
  readonly ocupado = signal(false);
  readonly campos = CAMPOS_CLIENTE;
  readonly texto = texto;

  // Subject: "tubo" donde se mete cada letra escrita. debounceTime(300): espera 300 ms sin escribir antes de buscar
  // (así no se hace una petición por cada tecla). switchMap: si llega otra búsqueda, cancela la anterior.
  private readonly busquedas = new Subject<string>();

  constructor() {
    this.busquedas
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => (q.trim().length < 2 ? of([]) : this.ventas.clientes({ q }).pipe(catchError(() => of([]))))),
        takeUntilDestroyed(),
      )
      .subscribe((r) => this.resultados.set(r.slice(0, 8)));
  }

  buscar(q: string) {
    this.texto_.set(q);
    this.busquedas.next(q);
  }

  elegir(c: Cliente) {
    this.cliente.set(c);
    this.resultados.set([]);
    this.texto_.set('');
  }

  // consumidorFinal(): el cliente genérico 9999999999999 (solo ventas hasta $50, RN-19).
  consumidorFinal() {
    this.ventas.clientes({ q: '9999999999999' }).subscribe((r) => {
      const cf = r.find((c) => c.tipoIdentificacion === 'CONSUMIDOR_FINAL');
      if (cf) this.elegir(cf);
    });
  }

  crear(datos: Record<string, unknown>) {
    ejecutar(this.ventas.crearCliente(datos as Partial<Cliente>), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Cliente creado',
      luego: (c) => {
        this.nuevo.set(false);
        this.elegir(c);
      },
    });
  }
}
