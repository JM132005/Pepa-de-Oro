// facturas.ts → FACTURAS Y COBROS.
//   · Lista de facturas y notas de crédito con filtros (fechas, canal, estado de pago, texto).
//   · Ver el PDF (formato SRI, simulado), reenviarlo al correo del cliente.
//   · Registrar abonos de facturas a crédito (RN-18) y ver las cuentas por cobrar por antigüedad.
//   · Nota de crédito (devolución o anulación): solo el gerente (RN-21: una factura nunca se borra).

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../../../compartido/Servicios/ventas.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Factura } from '../../../compartido/Entidades/ventas';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { SelectorPeriodo } from '../../../compartido/Componentes/selector-periodo/selector-periodo';
import { FORMAS_PAGO, texto } from '../../../compartido/Utils/etiquetas';
import { dinero, fecha, fechaHora, isoDia, redondear } from '../../../compartido/Utils/formato';
import { ejecutar } from '../../Utils/acciones';

@Component({
  selector: 'app-facturas',
  imports: [FormsModule, Tabla, Modal, Icono, Insignia, SelectorPeriodo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './facturas.html',
})
export class Facturas {
  private readonly ventas = inject(VentasService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly pestana = signal<'todas' | 'cobrar'>('todas');
  readonly facturas = signal<Factura[]>([]);
  readonly porCobrar = signal<Factura[]>([]);
  // Filtros
  readonly desde = signal(isoDia(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  readonly hasta = signal(isoDia());
  readonly canal = signal('');
  readonly estadoPago = signal('');
  readonly tipo = signal('');

  // Ventanas
  readonly detalle = signal<Factura | null>(null);
  readonly abonoDe = signal<Factura | null>(null);
  readonly ncDe = signal<Factura | null>(null);
  readonly ocupado = signal(false);
  // Abono
  readonly montoAbono = signal(0);
  readonly formaAbono = signal('20');
  readonly referencia = signal('');
  // Nota de crédito
  readonly motivoNc = signal('');
  readonly lineasNc = signal<Record<number, number>>({});
  readonly devolverStock = signal(true);

  readonly nombresPago: Record<string, string> = FORMAS_PAGO;
  readonly formasPago = Object.entries(FORMAS_PAGO).map(([codigo, nombre]) => ({ codigo, nombre }));
  // Resumen del período (solo facturas, sin notas de crédito ni anuladas).
  readonly resumen = computed(() => {
    const f = this.facturas().filter((x) => x.tipoComprobante === '01' && x.estado !== 'ANULADA');
    const nc = this.facturas().filter((x) => x.tipoComprobante === '04');
    return {
      numero: f.length,
      ventas: redondear(f.reduce((s, x) => s + x.subtotalSinImpuestos, 0)),
      iva: redondear(f.reduce((s, x) => s + x.iva, 0)),
      notas: redondear(nc.reduce((s, x) => s + x.total, 0)),
      saldo: redondear(f.reduce((s, x) => s + x.saldo, 0)),
    };
  });
  readonly totalPorCobrar = computed(() => redondear(this.porCobrar().reduce((s, x) => s + x.saldo, 0)));
  // Antigüedad de la cartera: vigente, 1-30, 31-60, más de 60 días vencida.
  readonly antiguedad = computed(() => {
    const tramos = { Vigente: 0, '1–30 días': 0, '31–60 días': 0, 'Más de 60': 0 } as Record<string, number>;
    const hoy = Date.now();
    for (const f of this.porCobrar()) {
      const dias = f.vence ? Math.floor((hoy - new Date(f.vence).getTime()) / 86_400_000) : 0;
      const tramo = dias <= 0 ? 'Vigente' : dias <= 30 ? '1–30 días' : dias <= 60 ? '31–60 días' : 'Más de 60';
      tramos[tramo] = redondear(tramos[tramo] + f.saldo);
    }
    return Object.entries(tramos);
  });
  readonly totalNc = computed(() => {
    const f = this.ncDe();
    if (!f) return 0;
    const lineas = this.lineasNc();
    // Sin líneas elegidas = anulación total.
    if (!Object.values(lineas).some((c) => c > 0)) return redondear(f.total - f.totalNotasCredito);
    return redondear(f.items.reduce((s, it, i) => s + ((lineas[i] ?? 0) / it.cantidad) * (it.subtotal + it.iva), 0));
  });

  readonly columnas: Columna[] = [
    { campo: 'numero', titulo: 'Número' },
    { campo: 'tipoComprobante', titulo: 'Tipo', valor: (f: Factura) => (f.tipoComprobante === '04' ? 'Nota de crédito' : 'Factura'), ocultarEnMovil: true },
    { campo: 'fechaEmision', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'cliente.nombre', titulo: 'Cliente' },
    { campo: 'canal', titulo: 'Canal', tipo: 'etiqueta', ocultarEnMovil: true },
    { campo: 'total', titulo: 'Total', tipo: 'dinero' },
    { campo: 'saldo', titulo: 'Saldo', tipo: 'dinero' },
    { campo: 'estadoPago', titulo: 'Pago', tipo: 'insignia' },
    { campo: 'estado', titulo: 'Documento', tipo: 'insignia', ocultarEnMovil: true },
  ];
  readonly columnasCobrar: Columna[] = [
    { campo: 'numero', titulo: 'Factura' },
    { campo: 'cliente.nombre', titulo: 'Cliente' },
    { campo: 'fechaEmision', titulo: 'Emitida', tipo: 'fecha' },
    { campo: 'vence', titulo: 'Vence', tipo: 'fecha' },
    { campo: 'diasVencida', titulo: 'Días vencida', tipo: 'numero', valor: (f: Factura) => (f.vence ? Math.max(0, Math.floor((Date.now() - new Date(f.vence).getTime()) / 86_400_000)) : 0) },
    { campo: 'total', titulo: 'Total', tipo: 'dinero' },
    { campo: 'saldo', titulo: 'Saldo', tipo: 'dinero' },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly fechaHora = fechaHora;
  readonly texto = texto;

  constructor() {
    this.cargar();
    this.cargarPorCobrar();
  }

  cargar() {
    this.ventas
      .facturas({ desde: this.desde(), hasta: this.hasta(), canal: this.canal(), estadoPago: this.estadoPago(), tipo: this.tipo() })
      .subscribe((f) => this.facturas.set(f));
  }

  cargarPorCobrar() {
    this.ventas.porCobrar().subscribe((f) => this.porCobrar.set(f));
  }

  periodo(p: { desde: string; hasta: string }) {
    this.desde.set(p.desde);
    this.hasta.set(p.hasta);
    this.cargar();
  }

  abrir(f: Factura) {
    // Se pide completa (con abonos y envíos).
    this.ventas.factura(f._id).subscribe((x) => this.detalle.set(x));
  }

  pdf(f: Factura) {
    this.archivos.verPdf(`facturas/${f._id}/pdf`, `${f.tipoComprobante === '04' ? 'Nota de crédito' : 'Factura'} ${f.numero}`, `${f.numero}.pdf`);
  }

  reenviar(f: Factura) {
    ejecutar(this.ventas.reenviarFactura(f._id), { avisos: this.avisos, ocupado: this.ocupado, exito: (r) => (r.ok ? `Enviada a ${r.destinatario}` : `No se pudo enviar: ${r.error ?? r.estado}`), luego: () => this.abrir(f) });
  }

  prepararAbono(f: Factura) {
    this.abonoDe.set(f);
    this.montoAbono.set(f.saldo);
    this.referencia.set('');
  }

  abonar() {
    const f = this.abonoDe();
    if (!f) return;
    ejecutar(this.ventas.abonar(f._id, { monto: this.montoAbono(), formaPago: this.formaAbono(), referencia: this.referencia() || undefined }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Abono registrado',
      luego: () => {
        this.abonoDe.set(null);
        this.cargar();
        this.cargarPorCobrar();
      },
    });
  }

  prepararNc(f: Factura) {
    this.ncDe.set(f);
    this.motivoNc.set('');
    this.lineasNc.set({});
  }

  emitirNc() {
    const f = this.ncDe();
    if (!f) return;
    const lineas = Object.entries(this.lineasNc())
      .filter(([, c]) => c > 0)
      .map(([i, c]) => ({ indice: Number(i), cantidad: c }));
    ejecutar(this.ventas.notaCredito(f._id, { motivo: this.motivoNc(), lineas: lineas.length ? lineas : undefined, devolverStock: this.devolverStock() }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (nc) => `Nota de crédito ${nc.numero} emitida`,
      luego: () => {
        this.ncDe.set(null);
        this.detalle.set(null);
        this.cargar();
      },
    });
  }

  cambiarLineaNc(i: number, cantidad: number) {
    this.lineasNc.update((l) => ({ ...l, [i]: cantidad }));
  }
}
