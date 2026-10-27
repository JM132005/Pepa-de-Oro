// solicitudes.ts → SOLICITUDES que llegan desde la web pública (cotización, alquiler, servicio, contacto,
// aviso de stock). Cada una se asigna sola al vendedor con menos trabajo. El vendedor la gestiona, deja
// notas y, si es una cotización, la convierte en una cotización formal con un clic.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WebService } from '../../../compartido/Servicios/web.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { Cliente } from '../../../compartido/Entidades/ventas';
import { SolicitudWeb } from '../../../compartido/Entidades/web';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { SelectorCliente } from '../../Componentes/selector-cliente/selector-cliente';
import { fecha, fechaHora, hace } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

@Component({
  selector: 'app-solicitudes',
  imports: [FormsModule, Tabla, Modal, Icono, Insignia, SelectorCliente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './solicitudes.html',
})
export class Solicitudes {
  private readonly web = inject(WebService);
  private readonly avisos = inject(NotificacionService);
  private readonly router = inject(Router);

  readonly estados = ['NUEVA', 'EN_GESTION', 'ATENDIDA', 'DESCARTADA'];
  readonly tipos = ['COTIZACION', 'ALQUILER', 'SERVICIO', 'CONTACTO', 'AVISO_STOCK'];
  readonly estado = signal('NUEVA');
  readonly tipo = signal('');
  readonly lista = signal<SolicitudWeb[]>([]);
  readonly detalle = signal<SolicitudWeb | null>(null);
  readonly nota = signal('');
  readonly cliente = signal<Cliente | null>(null);
  readonly ocupado = signal(false);

  // Datos del visitante para crear el cliente sin volver a escribirlos.
  readonly valoresCliente = computed(() => {
    const s = this.detalle();
    return s ? { tipoIdentificacion: 'CEDULA', tipoCliente: s.empresa ? 'MAYORISTA' : 'CONSUMIDOR', nombre: s.empresa ?? s.nombre, correo: s.correo, telefono: s.telefono, ciudad: s.ciudad, creditoDias: 0 } : null;
  });

  readonly columnas: Columna[] = [
    { campo: 'numero', titulo: 'Número' },
    { campo: 'createdAt', titulo: 'Recibida', tipo: 'fechaHora' },
    { campo: 'tipo', titulo: 'Tipo', tipo: 'etiqueta' },
    { campo: 'nombre', titulo: 'Visitante' },
    { campo: 'ciudad', titulo: 'Ciudad', ocultarEnMovil: true },
    { campo: 'asignadoA.nombre', titulo: 'Asignada a', ocultarEnMovil: true },
    { campo: 'estado', titulo: 'Estado', tipo: 'insignia' },
  ];
  readonly fecha = fecha;
  readonly fechaHora = fechaHora;
  readonly hace = hace;
  readonly texto = texto;

  constructor() {
    this.cargar();
  }

  cargar() {
    this.web.solicitudes({ estado: this.estado(), tipo: this.tipo() }).subscribe((s) => this.lista.set(s));
  }

  abrir(s: SolicitudWeb) {
    this.detalle.set(s);
    this.nota.set('');
    this.cliente.set(null);
  }

  // actualizar(): cambia el estado y/o agrega una nota (queda el historial de quién hizo qué).
  actualizar(datos: { estado?: string; nota?: string }) {
    const s = this.detalle();
    if (!s) return;
    ejecutar(this.web.actualizarSolicitud(s._id, datos), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Solicitud actualizada',
      luego: (r) => {
        this.detalle.set(r);
        this.nota.set('');
        this.cargar();
      },
    });
  }

  // whatsapp(): 0991234567 → https://wa.me/593991234567 (formato internacional sin el 0 inicial).
  whatsapp(telefono: string) {
    return `https://wa.me/593${telefono.replace(/\D/g, '').replace(/^0/, '')}`;
  }

  aCotizacion() {
    const s = this.detalle();
    const c = this.cliente();
    if (!s || !c) return;
    ejecutar(this.web.solicitudACotizacion(s._id, c._id), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (r) => `Cotización ${r.numero} creada en borrador`,
      luego: () => this.router.navigate(['/admin/cotizaciones']),
    });
  }
}
