// equipos.ts → MAQUINARIA Y VEHÍCULOS en venta y en alquiler, con ficha técnica, tarifas y disponibilidad
// ("Alquilado hasta el 25/10"). El visitante puede pedir un alquiler (con fechas) o información para comprar.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebService } from '../../../compartido/Servicios/web.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { EquipoPublico } from '../../../compartido/Entidades/web';
import { Imagen } from '../../../compartido/Componentes/imagen/imagen';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Cargando, Vacio } from '../../../compartido/Componentes/cargando/cargando';
import { DatosContacto, FormularioSolicitud } from '../../Formularios/formulario-solicitud/formulario-solicitud';
import { dinero, fecha, isoDia, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';

@Component({
  selector: 'app-equipos',
  imports: [FormsModule, Imagen, Modal, Cargando, Vacio, FormularioSolicitud],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './equipos.html',
})
export class Equipos {
  private readonly web = inject(WebService);
  private readonly avisos = inject(NotificacionService);

  readonly equipos = signal<EquipoPublico[] | null>(null);
  // filtro: TODOS, VENTA o ALQUILER.
  readonly filtro = signal<'TODOS' | 'VENTA' | 'ALQUILER'>('TODOS');
  readonly tipo = signal('');
  // Ventanas abiertas
  readonly ficha = signal<EquipoPublico | null>(null);
  readonly pedido = signal<{ equipo: EquipoPublico; modo: 'ALQUILER' | 'COMPRA' } | null>(null);
  readonly desde = signal(isoDia(new Date(Date.now() + 2 * 86_400_000)));
  readonly hasta = signal(isoDia(new Date(Date.now() + 5 * 86_400_000)));
  readonly enviando = signal(false);

  readonly tipos = computed(() => [...new Set((this.equipos() ?? []).map((e) => e.tipo))].sort());
  readonly visibles = computed(() =>
    (this.equipos() ?? []).filter((e) => (this.filtro() === 'TODOS' || (this.filtro() === 'VENTA' ? e.enVenta : e.enAlquiler)) && (!this.tipo() || e.tipo === this.tipo())),
  );
  // dias: cuántos días de alquiler se piden (incluye ambos extremos).
  readonly dias = computed(() => Math.max(1, Math.round((new Date(this.hasta()).getTime() - new Date(this.desde()).getTime()) / 86_400_000) + 1));
  // choque: ¿las fechas pedidas se cruzan con un alquiler ya reservado? (solo aviso; la regla real RN-23 la revisa el backend)
  readonly choque = computed(() => {
    const p = this.pedido();
    if (!p) return null;
    const d = new Date(this.desde()).getTime();
    const h = new Date(this.hasta()).getTime();
    return p.equipo.ocupado.find((o) => d <= new Date(o.hasta).getTime() && h >= new Date(o.desde).getTime()) ?? null;
  });

  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly numero = numero;
  readonly texto = texto;
  readonly hoy = isoDia();

  constructor() {
    this.web.equipos().subscribe({ next: (e) => this.equipos.set(e), error: () => this.equipos.set([]) });
  }

  // estimado(): costo referencial del alquiler = tarifa diaria (o semanal si conviene) × días.
  estimado(e: EquipoPublico): number {
    const dias = this.dias();
    const t = e.tarifas ?? {};
    const porDias = (t.dia ?? 0) * dias;
    const porSemanas = t.semana ? Math.floor(dias / 7) * t.semana + (dias % 7) * (t.dia ?? 0) : porDias;
    // Se queda con la opción más barata que tenga valor (si no hay tarifas, 0).
    const opciones = [porDias, porSemanas].filter((v) => v > 0);
    return opciones.length ? Math.min(...opciones) : 0;
  }

  enviar(datos: DatosContacto) {
    const p = this.pedido();
    if (!p) return;
    this.enviando.set(true);
    // Alquiler → solicitud ALQUILER con el equipo y las fechas. Compra → CONTACTO con el equipo.
    const cuerpo =
      p.modo === 'ALQUILER'
        ? { ...datos, tipo: 'ALQUILER', activoId: p.equipo._id, desde: new Date(this.desde()).toISOString(), hasta: new Date(this.hasta()).toISOString() }
        : { ...datos, tipo: 'CONTACTO', activoId: p.equipo._id, mensaje: datos.mensaje ?? `Me interesa comprar: ${p.equipo.nombre}` };
    this.web.enviarSolicitud(cuerpo).subscribe({
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
