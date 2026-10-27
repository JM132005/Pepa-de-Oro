// servicios.ts → SERVICIOS: transporte de carga (rutas y tarifas referenciales), taller de mantenimiento
// y compra de cacao y café a productores con el PRECIO DEL DÍA (sale de la base, el mismo que usa Acopio).

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { WebService } from '../../../compartido/Servicios/web.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Cargando } from '../../../compartido/Componentes/cargando/cargando';
import { DatosContacto, FormularioSolicitud } from '../../Formularios/formulario-solicitud/formulario-solicitud';
import { dinero, fecha } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';

interface DatosServicios {
  transporte?: { texto: string; rutas: { ruta: string; tarifa: string }[] };
  mantenimiento?: { texto: string };
  compra?: { texto: string };
}

@Component({
  selector: 'app-servicios',
  imports: [Icono, Modal, Cargando, FormularioSolicitud],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './servicios.html',
})
export class Servicios {
  private readonly web = inject(WebService);
  private readonly avisos = inject(NotificacionService);

  readonly datos = signal<DatosServicios | null>(null);
  readonly precios = signal<{ cultivo: string; variedad: string; estado: string; precioQq: number; fecha: string }[]>([]);
  // pedido: qué servicio se está pidiendo en la ventana (TRANSPORTE o MANTENIMIENTO).
  readonly pedido = signal<'TRANSPORTE' | 'MANTENIMIENTO' | null>(null);
  readonly enviando = signal(false);
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly texto = texto;

  constructor() {
    this.web.servicios().subscribe({
      next: (r) => {
        this.datos.set(r.contenido as DatosServicios);
        this.precios.set(r.preciosDia);
      },
      error: () => this.datos.set({}),
    });
  }

  enviar(datos: DatosContacto) {
    this.enviando.set(true);
    this.web.enviarSolicitud({ ...datos, tipo: 'SERVICIO', servicio: this.pedido() }).subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.pedido.set(null);
        this.avisos.exito(`Solicitud ${r.numero ?? ''} enviada. Te contactaremos pronto.`);
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(e);
      },
    });
  }
}
