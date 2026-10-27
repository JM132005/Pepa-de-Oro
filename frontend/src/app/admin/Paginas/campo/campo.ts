// campo.ts → HACIENDAS Y COSECHAS (cultivo propio). Pestañas:
//   Haciendas (resumen y rendimiento) · Parcelas (con su ficha) · Agenda (labores atrasadas y carencias)
//   · Cosechas · Labores · Sanidad (monitoreo de plagas) · Clima · Trabajadores.
// El agrónomo registra; acopio y calidad solo consultan (el backend revisa los roles).

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CampoService } from '../../../compartido/Servicios/campo.service';
import { CatalogoService } from '../../../compartido/Servicios/catalogo.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Clima, Cosecha, Hacienda, Labor, Monitoreo, Parcela, Trabajador } from '../../../compartido/Entidades/campo';
import { Producto } from '../../../compartido/Entidades/catalogo';
import { Grafico } from '../../../compartido/Entidades/analitica';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { GraficoComponent } from '../../../compartido/Componentes/grafico/grafico';
import { FormularioDinamico, CampoFormulario } from '../../../compartido/Componentes/formulario-dinamico/formulario-dinamico';
import { FormularioCampo } from '../../Formularios/formulario-campo/formulario-campo';
import { CAMPOS_TRABAJADOR, PLAGAS } from '../../Formularios/campos';
import { dinero, fecha, kg, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar, opciones } from '../../Utils/acciones';

type Pestana = 'haciendas' | 'parcelas' | 'agenda' | 'cosechas' | 'labores' | 'sanidad' | 'clima' | 'trabajadores';

@Component({
  selector: 'app-campo',
  imports: [FormsModule, RouterLink, Tabla, Modal, Icono, GraficoComponent, FormularioDinamico, FormularioCampo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campo.html',
})
export class Campo {
  private readonly campo = inject(CampoService);
  private readonly catalogo = inject(CatalogoService);
  private readonly avisos = inject(NotificacionService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly pestana = signal<Pestana>('haciendas');
  readonly haciendas = signal<Hacienda[]>([]);
  readonly parcelas = signal<Parcela[]>([]);
  readonly trabajadores = signal<Trabajador[]>([]);
  readonly insumos = signal<Producto[]>([]);
  readonly agenda = signal<{ parcela: { _id: string; codigo: string; hacienda?: string }; atrasadas: { tipo: string; diasAtraso: number }[]; bloqueo: string | null }[]>([]);
  readonly cosechas = signal<Cosecha[]>([]);
  readonly labores = signal<Labor[]>([]);
  readonly monitoreos = signal<Monitoreo[]>([]);
  readonly clima = signal<Clima[]>([]);
  readonly haciendaClima = signal('');
  readonly ocupado = signal(false);
  // Ventanas
  readonly registrando = signal<'COSECHA' | 'LABOR' | 'SANIDAD' | 'CLIMA' | null>(null);
  readonly trabajador = signal<Partial<Trabajador> | null>(null);

  readonly puedeRegistrar = computed(() => this.auth.tieneRol('AGRONOMO'));
  readonly camposTrabajador = computed<CampoFormulario[]>(() => [...CAMPOS_TRABAJADOR, { nombre: 'hacienda', etiqueta: 'Hacienda', tipo: 'seleccion', opciones: this.haciendas().map((h) => ({ valor: h._id, texto: h.nombre })) }]);
  readonly camposSanidad = computed<CampoFormulario[]>(() => [
    { nombre: 'parcela', etiqueta: 'Parcela', tipo: 'seleccion', requerido: true, opciones: this.parcelas().map((p) => ({ valor: p._id, texto: `${p.codigo} · ${texto(p.cultivo)}` })) },
    { nombre: 'plaga', etiqueta: 'Plaga o enfermedad', tipo: 'seleccion', requerido: true, opciones: opciones(PLAGAS, texto) },
    { nombre: 'evaluadas', etiqueta: 'Mazorcas / plantas evaluadas', tipo: 'numero', requerido: true, min: 1 },
    { nombre: 'afectadas', etiqueta: 'Afectadas', tipo: 'numero', requerido: true, min: 0 },
    { nombre: 'accion', etiqueta: 'Acción tomada', tipo: 'area' },
  ]);
  readonly camposClima = computed<CampoFormulario[]>(() => [
    { nombre: 'hacienda', etiqueta: 'Hacienda', tipo: 'seleccion', requerido: true, opciones: this.haciendas().map((h) => ({ valor: h._id, texto: h.nombre })) },
    { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
    { nombre: 'lluviaMm', etiqueta: 'Lluvia (mm)', tipo: 'numero', requerido: true, min: 0 },
    { nombre: 'temperaturaMax', etiqueta: 'Temperatura máxima (°C)', tipo: 'numero' },
    { nombre: 'temperaturaMin', etiqueta: 'Temperatura mínima (°C)', tipo: 'numero' },
    { nombre: 'humedadRelativa', etiqueta: 'Humedad relativa (%)', tipo: 'numero', min: 0, max: 100 },
  ]);

  // graficoClima: lluvia diaria (barras) de los últimos 90 días de la hacienda elegida.
  readonly graficoClima = computed<Grafico>(() => {
    const datos = [...this.clima()].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return { id: 'lluvia', titulo: 'Lluvia diaria (mm)', tipo: 'barras', categorias: datos.map((c) => fecha(c.fecha).slice(0, 5)), series: [{ nombre: 'Lluvia', datos: datos.map((c) => c.lluviaMm) }] };
  });
  readonly graficoTemperatura = computed<Grafico>(() => {
    const datos = [...this.clima()].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return { id: 'temp', titulo: 'Temperatura (°C)', tipo: 'linea', categorias: datos.map((c) => fecha(c.fecha).slice(0, 5)), series: [{ nombre: 'Máxima', datos: datos.map((c) => c.temperaturaMax ?? null) }, { nombre: 'Mínima', datos: datos.map((c) => c.temperaturaMin ?? null) }] };
  });

  readonly columnasParcelas: Columna[] = [
    { campo: 'codigo', titulo: 'Parcela' },
    { campo: 'hacienda.nombre', titulo: 'Hacienda' },
    { campo: 'cultivo', titulo: 'Cultivo', tipo: 'etiqueta' },
    { campo: 'variedad', titulo: 'Variedad', tipo: 'etiqueta' },
    { campo: 'hectareas', titulo: 'Ha', tipo: 'numero' },
    { campo: 'anioSiembra', titulo: 'Siembra', ocultarEnMovil: true },
    { campo: 'plantas', titulo: 'Plantas', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'estado', titulo: 'Estado', tipo: 'etiqueta' },
  ];
  readonly columnasCosechas: Columna[] = [
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'parcela.codigo', titulo: 'Parcela' },
    { campo: 'hacienda.nombre', titulo: 'Hacienda', ocultarEnMovil: true },
    { campo: 'kg', titulo: 'Kg', tipo: 'kg' },
    { campo: 'mazorcas', titulo: 'Mazorcas', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'costoManoObra', titulo: 'Mano de obra', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'codigoLote', titulo: 'Lote generado' },
  ];
  readonly columnasLabores: Columna[] = [
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'parcela.codigo', titulo: 'Parcela' },
    { campo: 'tipo', titulo: 'Labor', tipo: 'etiqueta' },
    { campo: 'jornales', titulo: 'Jornales', tipo: 'numero', valor: (l: Labor) => l.cuadrilla.reduce((s, c) => s + c.jornales, 0) },
    { campo: 'insumos', titulo: 'Insumos', valor: (l: Labor) => l.insumos.map((i) => `${i.cantidad} ${i.unidad.toLowerCase()} ${i.nombre}`).join(', ') || '—', ocultarEnMovil: true },
    { campo: 'agroquimico.producto', titulo: 'Agroquímico (carencia)', valor: (l: Labor) => (l.agroquimico ? `${l.agroquimico.producto} (${l.agroquimico.diasCarencia} d)` : '—'), ocultarEnMovil: true },
    { campo: 'costoTotal', titulo: 'Costo', tipo: 'dinero' },
  ];
  readonly columnasSanidad: Columna[] = [
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'parcela.codigo', titulo: 'Parcela' },
    { campo: 'plaga', titulo: 'Plaga', tipo: 'etiqueta' },
    { campo: 'evaluadas', titulo: 'Evaluadas', tipo: 'numero' },
    { campo: 'afectadas', titulo: 'Afectadas', tipo: 'numero' },
    { campo: 'incidencia', titulo: 'Incidencia', tipo: 'porcentaje' },
    { campo: 'accion', titulo: 'Acción', ocultarEnMovil: true },
  ];
  readonly columnasTrabajadores: Columna[] = [
    { campo: 'nombre', titulo: 'Nombre' },
    { campo: 'cedula', titulo: 'Cédula', ocultarEnMovil: true },
    { campo: 'cargo', titulo: 'Cargo', tipo: 'etiqueta' },
    { campo: 'hacienda.nombre', titulo: 'Hacienda' },
    { campo: 'jornalDiario', titulo: 'Jornal', tipo: 'dinero' },
    { campo: 'licenciaVence', titulo: 'Licencia vence', tipo: 'fecha', ocultarEnMovil: true },
    { campo: 'activo', titulo: 'Activo', tipo: 'booleano' },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly kg = kg;
  readonly numero = numero;
  readonly texto = texto;

  constructor() {
    this.campo.haciendas().subscribe((h) => {
      this.haciendas.set(h);
      this.haciendaClima.set(h[0]?._id ?? '');
    });
    this.campo.parcelas().subscribe((p) => this.parcelas.set(p));
    this.campo.trabajadores().subscribe((t) => this.trabajadores.set(t));
    this.campo.agenda().subscribe((a) => this.agenda.set(a.filter((x) => x.atrasadas.length || x.bloqueo)));
    if (this.puedeRegistrar()) this.catalogo.productos({ familia: 'INSUMOS_CAMPO' }).subscribe((p) => this.insumos.set(p));
  }

  cambiar(p: Pestana) {
    this.pestana.set(p);
    if (p === 'cosechas') this.campo.cosechas().subscribe((c) => this.cosechas.set(c));
    if (p === 'labores') this.campo.labores().subscribe((l) => this.labores.set(l));
    if (p === 'sanidad') this.campo.monitoreos().subscribe((m) => this.monitoreos.set(m));
    if (p === 'clima') this.cargarClima();
  }

  cargarClima() {
    if (this.haciendaClima()) this.campo.clima(this.haciendaClima(), 90).subscribe((c) => this.clima.set(c));
  }

  abrirParcela(p: Parcela) {
    this.router.navigate(['/admin/campo/parcelas', p._id]);
  }

  // registrar(): un solo método para los 4 formularios; elige la llamada según la ventana abierta.
  registrar(datos: Record<string, unknown>) {
    const tipo = this.registrando();
    const peticiones = {
      COSECHA: () => this.campo.registrarCosecha(datos),
      LABOR: () => this.campo.registrarLabor(datos),
      SANIDAD: () => this.campo.registrarMonitoreo(datos),
      CLIMA: () => this.campo.registrarClima({ ...datos, fecha: new Date(`${datos['fecha']}T12:00:00`).toISOString() }),
    };
    if (!tipo) return;
    ejecutar(peticiones[tipo]() as never, {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: { COSECHA: 'Cosecha registrada: se creó el lote de grano', LABOR: 'Labor registrada', SANIDAD: 'Monitoreo registrado', CLIMA: 'Clima registrado' }[tipo],
      luego: () => {
        this.registrando.set(null);
        this.cambiar(this.pestana());
        this.campo.agenda().subscribe((a) => this.agenda.set(a.filter((x) => x.atrasadas.length || x.bloqueo)));
      },
    });
  }

  guardarTrabajador(datos: Record<string, unknown>) {
    const t = this.trabajador();
    const peticion = t?._id ? this.campo.actualizarTrabajador(t._id, datos) : this.campo.crearTrabajador(datos);
    ejecutar(peticion, {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Trabajador guardado',
      luego: () => {
        this.trabajador.set(null);
        this.campo.trabajadores().subscribe((x) => this.trabajadores.set(x));
      },
    });
  }

  // valoresTrabajador: para editar, la hacienda poblada se convierte en su id.
  // Es un computed (y no un método) para que el formulario no se reinicie en cada dibujo de la pantalla.
  readonly valoresTrabajador = computed(() => {
    const t = this.trabajador();
    return t ? { ...t, hacienda: typeof t.hacienda === 'object' ? t.hacienda?._id : t.hacienda } : null;
  });
}
