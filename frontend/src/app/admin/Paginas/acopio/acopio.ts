// acopio.ts → ACOPIO: compra de cacao y café a productores.
//   · Recepción en la báscula: peso, tara, humedad e impurezas → liquidación con cada descuento explicado
//     (RN-03: un productor inactivo no puede entregar). Crea el lote de grano que sigue a poscosecha.
//   · Liquidaciones: lo que se debe a cada productor, pagos (efectivo/transferencia) y el PDF.
//   · Productores: ficha, certificaciones, cuenta bancaria, anticipos y calificación de calidad.
//   · Precio del día: lo publica Acopio y sale también en la web pública.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AcopioService } from '../../../compartido/Servicios/acopio.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Liquidacion, LoteGrano, PrecioDia, Productor } from '../../../compartido/Entidades/acopio';
import { Grafico } from '../../../compartido/Entidades/analitica';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { GraficoComponent } from '../../../compartido/Componentes/grafico/grafico';
import { FormularioDinamico, CampoFormulario } from '../../../compartido/Componentes/formulario-dinamico/formulario-dinamico';
import { CAMPOS_PRODUCTOR, CULTIVOS, ESTADOS_ENTREGA, VARIEDADES } from '../../Formularios/campos';
import { dinero, fecha, fechaHora, numero, redondear } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar, opciones } from '../../Utils/acciones';

type Pestana = 'recepcion' | 'liquidaciones' | 'productores' | 'precios';
const KG_POR_QUINTAL = 45.36;

@Component({
  selector: 'app-acopio',
  imports: [FormsModule, RouterLink, Tabla, Modal, Icono, GraficoComponent, FormularioDinamico],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './acopio.html',
})
export class Acopio {
  private readonly acopio = inject(AcopioService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly pestana = signal<Pestana>('recepcion');
  readonly productores = signal<Productor[]>([]);
  readonly precios = signal<PrecioDia[]>([]);
  readonly historial = signal<PrecioDia[]>([]);
  readonly liquidaciones = signal<Liquidacion[]>([]);
  readonly estadoPago = signal('PENDIENTE');
  readonly ocupado = signal(false);
  readonly puedeOperar = computed(() => this.auth.tieneRol('ACOPIO'));

  // ─── Recepción ───
  readonly buscarProductor = signal('');
  readonly productor = signal<Productor | null>(null);
  readonly cultivo = signal('CACAO');
  readonly variedad = signal('CCN51');
  readonly estadoEntrega = signal('BABA');
  readonly kgBrutos = signal<number | null>(null);
  readonly tara = signal(0);
  readonly humedad = signal<number | null>(null);
  readonly impurezas = signal(0);
  readonly precioManual = signal<number | null>(null);
  readonly descontarAnticipo = signal(true);
  readonly resultado = signal<{ liquidacion: Liquidacion; lote: LoteGrano; kgSecosEstimados: number } | null>(null);

  readonly coincidencias = computed(() => {
    const q = this.buscarProductor().toLowerCase().trim();
    if (q.length < 2) return [];
    return this.productores().filter((p) => p.nombre.toLowerCase().includes(q) || p.cedula.includes(q)).slice(0, 8);
  });
  readonly variedades = computed(() => (this.cultivo() === 'CACAO' ? ['CCN51', 'NACIONAL'] : ['ARABICA', 'ROBUSTA']));
  readonly estados = computed(() => (this.cultivo() === 'CACAO' ? ['BABA', 'SECO'] : ['CEREZA', 'PERGAMINO', 'ORO']));
  // precioDelDia: el precio vigente para la combinación elegida.
  readonly precioDelDia = computed(() => this.precios().find((p) => p.cultivo === this.cultivo() && p.variedad === this.variedad() && p.estado === this.estadoEntrega())?.precioQq ?? null);
  // estimado: vista previa del cálculo (las mismas fórmulas de acopio.reglas.ts, sin bonos ni retención).
  readonly estimado = computed(() => {
    const brutos = this.kgBrutos() ?? 0;
    const hum = this.humedad() ?? 0;
    const precio = this.precioManual() ?? this.precioDelDia() ?? 0;
    if (brutos <= this.tara()) return null;
    const netos = redondear(brutos - this.tara());
    const descHum = this.estadoEntrega() === 'SECO' && hum > 7 ? redondear((netos * (hum - 7)) / 93) : 0;
    const descImp = redondear(((netos - descHum) * this.impurezas()) / 100);
    const pagables = redondear(netos - descHum - descImp);
    return { netos, descHum, descImp, pagables, quintales: redondear(pagables / KG_POR_QUINTAL), subtotal: redondear((pagables / KG_POR_QUINTAL) * precio) };
  });

  // ─── Productores y precios ───
  readonly editando = signal<Partial<Productor> | null>(null);
  readonly fichaProductor = signal<Productor | null>(null);
  readonly anticipo = signal<{ productor: Productor; monto: number; motivo: string } | null>(null);
  readonly pago = signal<{ liquidacion: Liquidacion; monto: number; forma: string; referencia: string } | null>(null);
  readonly registrandoPrecio = signal(false);
  readonly campos = CAMPOS_PRODUCTOR;
  readonly camposPrecio: CampoFormulario[] = [
    { nombre: 'cultivo', etiqueta: 'Cultivo', tipo: 'seleccion', requerido: true, opciones: opciones(CULTIVOS, texto) },
    { nombre: 'variedad', etiqueta: 'Variedad', tipo: 'seleccion', requerido: true, opciones: opciones(VARIEDADES, texto) },
    { nombre: 'estado', etiqueta: 'Estado de entrega', tipo: 'seleccion', requerido: true, opciones: opciones(ESTADOS_ENTREGA, texto) },
    { nombre: 'precioQq', etiqueta: 'Precio por quintal (USD)', tipo: 'numero', requerido: true, min: 0, paso: 0.01 },
    { nombre: 'precioReferencia', etiqueta: 'Precio de referencia (bolsa/MAG)', tipo: 'numero', min: 0, paso: 0.01 },
  ];
  readonly graficoPrecios = computed<Grafico>(() => {
    const claves = ['CACAO-CCN51-SECO', 'CACAO-NACIONAL-SECO', 'CAFE-ARABICA-ORO'];
    const fechas = [...new Set(this.historial().map((p) => p.fecha.slice(0, 10)))].sort();
    return {
      id: 'precios',
      titulo: 'Precio por quintal',
      tipo: 'linea',
      formato: 'dinero',
      categorias: fechas.map((f) => f.slice(5)),
      series: claves.map((k) => ({ nombre: k.replace(/-/g, ' ').replace('CCN51', 'CCN-51').toLowerCase(), datos: fechas.map((f) => this.historial().find((p) => `${p.cultivo}-${p.variedad}-${p.estado}` === k && p.fecha.slice(0, 10) === f)?.precioQq ?? null) })),
    };
  });
  readonly porPagar = computed(() => redondear(this.liquidaciones().reduce((s, l) => s + l.saldo, 0)));

  readonly columnasLiq: Columna[] = [
    { campo: 'numero', titulo: 'Liquidación' },
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'productor.nombre', titulo: 'Productor' },
    { campo: 'codigoLote', titulo: 'Lote', ocultarEnMovil: true },
    { campo: 'variedad', titulo: 'Variedad', tipo: 'etiqueta', ocultarEnMovil: true },
    { campo: 'kgPagables', titulo: 'Kg pagables', tipo: 'numero' },
    { campo: 'totalPagar', titulo: 'A pagar', tipo: 'dinero' },
    { campo: 'saldo', titulo: 'Saldo', tipo: 'dinero' },
    { campo: 'estadoPago', titulo: 'Pago', tipo: 'insignia' },
  ];
  readonly columnasProd: Columna[] = [
    { campo: 'nombre', titulo: 'Productor' },
    { campo: 'cedula', titulo: 'Cédula', ocultarEnMovil: true },
    { campo: 'canton', titulo: 'Cantón' },
    { campo: 'cultivos', titulo: 'Cultivos', valor: (p: Productor) => p.cultivos.map((c) => texto(c)).join(', ') },
    { campo: 'hectareas', titulo: 'Ha', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'certificaciones', titulo: 'Certificación', valor: (p: Productor) => p.certificaciones.map((c) => texto(c.tipo)).join(', ') || '—', ocultarEnMovil: true },
    { campo: 'saldoAnticipo', titulo: 'Anticipo', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'calificacion', titulo: 'Calidad', tipo: 'numero' },
    { campo: 'activo', titulo: 'Activo', tipo: 'booleano' },
  ];
  readonly columnasPrecios: Columna[] = [
    { campo: 'cultivo', titulo: 'Cultivo', tipo: 'etiqueta' },
    { campo: 'variedad', titulo: 'Variedad', tipo: 'etiqueta' },
    { campo: 'estado', titulo: 'Estado', tipo: 'etiqueta' },
    { campo: 'precioQq', titulo: 'Precio / qq', tipo: 'dinero' },
    { campo: 'precioKg', titulo: 'Precio / kg', tipo: 'dinero', valor: (p: PrecioDia) => p.precioQq / KG_POR_QUINTAL },
    { campo: 'precioReferencia', titulo: 'Referencia', tipo: 'dinero' },
    { campo: 'fecha', titulo: 'Desde', tipo: 'fecha' },
    { campo: 'usuario', titulo: 'Publicó' },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly fechaHora = fechaHora;
  readonly numero = numero;
  readonly texto = texto;

  constructor() {
    // Calidad solo consulta: empieza en Liquidaciones (no ve la báscula).
    if (!this.puedeOperar()) this.pestana.set('liquidaciones');
    this.acopio.productores().subscribe((p) => this.productores.set(p));
    this.acopio.precios().subscribe((p) => this.precios.set(p));
    this.cargarLiquidaciones();
  }

  cambiar(p: Pestana) {
    this.pestana.set(p);
    if (p === 'precios') this.acopio.historialPrecios().subscribe((h) => this.historial.set(h));
    if (p === 'liquidaciones') this.cargarLiquidaciones();
  }

  cargarLiquidaciones() {
    this.acopio.liquidaciones({ estadoPago: this.estadoPago() }).subscribe((l) => this.liquidaciones.set(l));
  }

  elegirProductor(p: Productor) {
    this.productor.set(p);
    this.buscarProductor.set('');
    if (p.cultivos.length === 1) this.cambiarCultivo(p.cultivos[0]);
  }

  cambiarCultivo(c: string) {
    this.cultivo.set(c);
    this.variedad.set(this.variedades()[0]);
    this.estadoEntrega.set(this.estados()[0]);
  }

  recibir() {
    const p = this.productor();
    if (!p || !this.kgBrutos() || this.humedad() === null) return;
    const datos = {
      productorId: p._id,
      cultivo: this.cultivo(),
      variedad: this.variedad(),
      estadoEntrega: this.estadoEntrega(),
      kgBrutos: this.kgBrutos(),
      taraKg: this.tara(),
      humedad: this.humedad(),
      impurezasPct: this.impurezas(),
      precioQq: this.precioManual() ?? undefined,
      descontarAnticipo: this.descontarAnticipo(),
    };
    ejecutar(this.acopio.recibir(datos), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (r) => `Liquidación ${r.liquidacion.numero} · lote ${r.lote.codigo}`,
      luego: (r) => {
        this.resultado.set(r);
        this.kgBrutos.set(null);
        this.humedad.set(null);
        this.tara.set(0);
        this.impurezas.set(0);
        this.precioManual.set(null);
        this.productor.set(null);
      },
    });
  }

  pdfLiquidacion(l: Liquidacion) {
    this.archivos.verPdf(`liquidaciones/${l._id}/pdf`, `Liquidación ${l.numero}`, `liquidacion-${l.numero}.pdf`);
  }

  pagar() {
    const p = this.pago();
    if (!p) return;
    ejecutar(this.acopio.pagar(p.liquidacion._id, { monto: p.monto, forma: p.forma, referencia: p.referencia || undefined }), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Pago registrado',
      luego: () => {
        this.pago.set(null);
        this.cargarLiquidaciones();
      },
    });
  }

  verProductor(p: Productor) {
    this.acopio.productor(p._id).subscribe((x) => this.fichaProductor.set(x));
  }

  guardarProductor(datos: Record<string, unknown>) {
    const actual = this.editando();
    const peticion = actual?._id ? this.acopio.actualizarProductor(actual._id, datos as Partial<Productor>) : this.acopio.crearProductor(datos as Partial<Productor>);
    ejecutar(peticion, {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Productor guardado',
      luego: () => {
        this.editando.set(null);
        this.acopio.productores().subscribe((x) => this.productores.set(x));
      },
    });
  }

  darAnticipo() {
    const a = this.anticipo();
    if (!a || a.monto <= 0) return;
    ejecutar(this.acopio.anticipo(a.productor._id, a.monto, a.motivo || undefined), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Anticipo registrado: se descontará de las próximas entregas',
      luego: () => {
        this.anticipo.set(null);
        this.acopio.productores().subscribe((x) => this.productores.set(x));
      },
    });
  }

  registrarPrecio(datos: Record<string, unknown>) {
    ejecutar(this.acopio.registrarPrecio(datos as Partial<PrecioDia>), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Precio publicado (también en la web)',
      luego: () => {
        this.registrandoPrecio.set(false);
        this.acopio.precios().subscribe((p) => this.precios.set(p));
        this.acopio.historialPrecios().subscribe((h) => this.historial.set(h));
      },
    });
  }
}
