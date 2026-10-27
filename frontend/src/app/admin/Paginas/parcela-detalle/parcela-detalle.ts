// parcela-detalle.ts → FICHA DE UNA PARCELA: etapa productiva (según la edad de las plantas), plan de labores
// con lo atrasado, bloqueo por carencia (RN-01), historial de labores, cosechas y sanidad, y sus KPIs
// (kg cosechados, rendimiento por hectárea y costo por kg). Desde aquí se registra una cosecha o labor.

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CampoService } from '../../../compartido/Servicios/campo.service';
import { CatalogoService } from '../../../compartido/Servicios/catalogo.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { FichaParcela, Trabajador } from '../../../compartido/Entidades/campo';
import { Producto } from '../../../compartido/Entidades/catalogo';
import { Grafico } from '../../../compartido/Entidades/analitica';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Cargando } from '../../../compartido/Componentes/cargando/cargando';
import { GraficoComponent } from '../../../compartido/Componentes/grafico/grafico';
import { FormularioDinamico, CampoFormulario } from '../../../compartido/Componentes/formulario-dinamico/formulario-dinamico';
import { FormularioCampo } from '../../Formularios/formulario-campo/formulario-campo';
import { ESTADOS_PARCELA } from '../../Formularios/campos';
import { dinero, fecha, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar, opciones } from '../../Utils/acciones';

@Component({
  selector: 'app-parcela-detalle',
  imports: [RouterLink, Tabla, Modal, Icono, Cargando, GraficoComponent, FormularioDinamico, FormularioCampo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './parcela-detalle.html',
})
export class ParcelaDetalle {
  private readonly campo = inject(CampoService);
  private readonly catalogo = inject(CatalogoService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  // id: viene de la URL /admin/campo/parcelas/:id
  readonly id = input.required<string>();
  readonly ficha = signal<FichaParcela | null>(null);
  readonly trabajadores = signal<Trabajador[]>([]);
  readonly insumos = signal<Producto[]>([]);
  readonly registrando = signal<'COSECHA' | 'LABOR' | null>(null);
  readonly editando = signal(false);
  readonly ocupado = signal(false);

  readonly camposParcela: CampoFormulario[] = [
    { nombre: 'estado', etiqueta: 'Estado', tipo: 'seleccion', requerido: true, opciones: opciones(ESTADOS_PARCELA, texto) },
    { nombre: 'hectareas', etiqueta: 'Hectáreas', tipo: 'numero', min: 0.1 },
    { nombre: 'densidad', etiqueta: 'Densidad (plantas/ha)', tipo: 'numero', min: 0 },
    { nombre: 'clon', etiqueta: 'Clon', tipo: 'texto' },
    { nombre: 'sistema', etiqueta: 'Sistema', tipo: 'seleccion', opciones: opciones(['MONOCULTIVO', 'SOMBRA_PLATANO', 'AGROFORESTAL'], texto) },
    { nombre: 'riego', etiqueta: 'Riego', tipo: 'seleccion', opciones: opciones(['GOTEO', 'ASPERSION', 'GRAVEDAD', 'SECANO'], texto) },
  ];
  // Cosechas por mes de esta parcela (barras).
  readonly graficoCosechas = computed<Grafico>(() => {
    const porMes = new Map<string, number>();
    for (const c of [...(this.ficha()?.cosechas ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      const mes = c.fecha.slice(0, 7);
      porMes.set(mes, (porMes.get(mes) ?? 0) + c.kg);
    }
    return { id: 'cosechas', titulo: 'Kg cosechados por mes', tipo: 'barras', formato: 'kg', categorias: [...porMes.keys()], series: [{ nombre: 'Kg', datos: [...porMes.values()] }] };
  });
  readonly columnasLabores: Columna[] = [
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'tipo', titulo: 'Labor', tipo: 'etiqueta' },
    { campo: 'jornales', titulo: 'Jornales', tipo: 'numero', valor: (l: { cuadrilla: { jornales: number }[] }) => l.cuadrilla.reduce((s, c) => s + c.jornales, 0) },
    { campo: 'agroquimico.producto', titulo: 'Agroquímico' },
    { campo: 'costoTotal', titulo: 'Costo', tipo: 'dinero' },
  ];
  readonly columnasCosechas: Columna[] = [
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'kg', titulo: 'Kg', tipo: 'kg' },
    { campo: 'mazorcas', titulo: 'Mazorcas', tipo: 'numero' },
    { campo: 'costoManoObra', titulo: 'Mano de obra', tipo: 'dinero' },
    { campo: 'codigoLote', titulo: 'Lote' },
  ];
  readonly columnasSanidad: Columna[] = [
    { campo: 'fecha', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'plaga', titulo: 'Plaga', tipo: 'etiqueta' },
    { campo: 'incidencia', titulo: 'Incidencia', tipo: 'porcentaje' },
    { campo: 'accion', titulo: 'Acción' },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly numero = numero;
  readonly texto = texto;

  constructor() {
    effect(() => this.cargar(this.id()));
    this.campo.trabajadores().subscribe((t) => this.trabajadores.set(t));
    if (this.auth.tieneRol('AGRONOMO')) this.catalogo.productos({ familia: 'INSUMOS_CAMPO' }).subscribe((p) => this.insumos.set(p));
  }

  // atrasoDe(): si esa labor del plan está atrasada, devuelve cuántos días (si no, undefined).
  atrasoDe(tipo: string) {
    return this.ficha()?.laboresAtrasadas.find((a) => a.tipo === tipo);
  }

  cargar(id: string) {
    this.campo.parcela(id).subscribe({ next: (f) => this.ficha.set(f), error: (e) => this.avisos.error(e) });
  }

  registrar(datos: Record<string, unknown>) {
    const tipo = this.registrando();
    if (!tipo) return;
    const peticion = tipo === 'COSECHA' ? this.campo.registrarCosecha(datos) : this.campo.registrarLabor(datos);
    ejecutar(peticion as never, {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: tipo === 'COSECHA' ? 'Cosecha registrada' : 'Labor registrada',
      luego: () => {
        this.registrando.set(null);
        this.cargar(this.id());
      },
    });
  }

  guardar(datos: Record<string, unknown>) {
    ejecutar(this.campo.actualizarParcela(this.id(), datos), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Parcela actualizada',
      luego: () => {
        this.editando.set(false);
        this.cargar(this.id());
      },
    });
  }
}
