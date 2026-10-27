// poscosecha.ts → POSCOSECHA: el camino del grano después de la cosecha o la compra.
//   RECIBIDO → FERMENTANDO (cajones de madera, volteos cada 2 días) → SECANDO (tendal al sol o secadora)
//   → SECO (espera la evaluación de Calidad) → ALMACENADO o RECHAZADO.
// Arriba se ve la OCUPACIÓN de cada fermentador, tendal y secadora (no se puede cargar más de su capacidad).
// RN-05: a un fermentador o tendal no se le asigna más kg que su capacidad. Tampoco se pueden saltar pasos.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AcopioService } from '../../../compartido/Servicios/acopio.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { LoteGrano, OcupacionPoscosecha } from '../../../compartido/Entidades/acopio';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { fecha, numero } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

type Accion = 'fermentar' | 'voltear' | 'secar' | 'humedad' | 'terminar';

@Component({
  selector: 'app-poscosecha',
  imports: [FormsModule, RouterLink, Modal, Icono, Tabla],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './poscosecha.html',
})
export class Poscosecha {
  private readonly acopio = inject(AcopioService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly ocupacion = signal<OcupacionPoscosecha[]>([]);
  readonly enProceso = signal<LoteGrano[]>([]);
  readonly almacenados = signal<LoteGrano[]>([]);
  readonly ocupado = signal(false);
  readonly puedeOperar = computed(() => this.auth.tieneRol('ACOPIO'));

  // Acción abierta y sus datos
  readonly accion = signal<{ tipo: Accion; lote: LoteGrano } | null>(null);
  readonly activoElegido = signal('');
  readonly metodo = signal('TENDAL');
  readonly valor = signal<number | null>(null); // temperatura, humedad o kg secos
  readonly humedadFinal = signal<number | null>(null);
  // Combinar lotes
  readonly combinando = signal(false);
  readonly paraCombinar = signal<string[]>([]);

  readonly titulosAccion: Record<Accion, string> = { fermentar: 'iniciar fermentación', voltear: 'registrar volteo', secar: 'pasar a secado', humedad: 'medir humedad', terminar: 'terminar secado' };
  readonly columnasEstados = ['RECIBIDO', 'FERMENTANDO', 'SECANDO', 'SECO'];
  readonly porEstado = computed(() => {
    const g: Record<string, LoteGrano[]> = { RECIBIDO: [], FERMENTANDO: [], SECANDO: [], SECO: [] };
    for (const l of this.enProceso()) g[l.estado]?.push(l);
    return g;
  });
  // Lugares donde cabe el lote de la acción abierta (con espacio libre suficiente y sin mantenimiento).
  readonly destinos = computed(() => {
    const a = this.accion();
    if (!a) return [];
    const tipo = a.tipo === 'fermentar' ? 'FERMENTADOR' : this.metodo();
    return this.ocupacion().filter((o) => o.tipo === tipo && o.estado !== 'EN_MANTENIMIENTO' && o.libreKg >= a.lote.kgEntrada);
  });
  readonly columnasAlmacen: Columna[] = [
    { campo: 'codigo', titulo: 'Lote' },
    { campo: 'origen', titulo: 'Origen', tipo: 'etiqueta' },
    { campo: 'variedad', titulo: 'Variedad', tipo: 'etiqueta' },
    { campo: 'kgSeco', titulo: 'Kg secos', tipo: 'numero' },
    { campo: 'calidad.grado', titulo: 'Grado', tipo: 'insignia' },
    { campo: 'mermaPct', titulo: 'Merma', tipo: 'porcentaje', ocultarEnMovil: true },
    { campo: 'costoKgSeco', titulo: 'Costo/kg', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'estado', titulo: 'Estado', tipo: 'insignia' },
  ];
  readonly fecha = fecha;
  readonly numero = numero;
  readonly texto = texto;

  constructor() {
    this.cargar();
  }

  cargar() {
    this.acopio.ocupacion().subscribe((o) => this.ocupacion.set(o));
    this.acopio.lotes({ estado: 'RECIBIDO,FERMENTANDO,SECANDO,SECO' }).subscribe((l) => this.enProceso.set(l));
    this.acopio.lotes({ estado: 'ALMACENADO,RECHAZADO,COMBINADO' }).subscribe((l) => this.almacenados.set(l.slice(0, 200)));
  }

  // diasDesde(): cuántos días lleva fermentando o secando (para saber cuándo toca el siguiente paso).
  diasDesde(f?: string) {
    return f ? Math.floor((Date.now() - new Date(f).getTime()) / 86_400_000) : 0;
  }

  porcentaje(o: OcupacionPoscosecha) {
    return o.capacidadKg ? Math.min(100, (o.ocupadoKg / o.capacidadKg) * 100) : 0;
  }

  abrir(tipo: Accion, lote: LoteGrano) {
    this.accion.set({ tipo, lote });
    this.activoElegido.set('');
    this.valor.set(null);
    this.humedadFinal.set(null);
    // Kg secos sugeridos: cacao en baba rinde ≈ 37 %; seco ≈ 97 %; café en cereza ≈ 20 %.
    if (tipo === 'terminar') {
      const factor = lote.estadoEntrega === 'BABA' ? 0.37 : lote.estadoEntrega === 'CEREZA' ? 0.2 : 0.97;
      this.valor.set(Math.round(lote.kgEntrada * factor * 10) / 10);
    }
  }

  confirmar() {
    const a = this.accion();
    if (!a) return;
    const id = a.lote._id;
    const peticiones: Record<Accion, () => ReturnType<AcopioService['fermentar']>> = {
      fermentar: () => this.acopio.fermentar(id, this.activoElegido()),
      voltear: () => this.acopio.voltear(id, this.valor() ?? undefined),
      secar: () => this.acopio.secar(id, this.metodo(), this.activoElegido()),
      humedad: () => this.acopio.medirHumedad(id, this.valor() ?? 0),
      terminar: () => this.acopio.terminarSecado(id, this.valor() ?? 0, this.humedadFinal() ?? 0),
    };
    const mensajes: Record<Accion, string> = { fermentar: 'Fermentación iniciada', voltear: 'Volteo registrado', secar: 'Secado iniciado', humedad: 'Medición registrada', terminar: 'Secado terminado: el lote espera a Calidad' };
    ejecutar(peticiones[a.tipo](), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: mensajes[a.tipo],
      luego: () => {
        this.accion.set(null);
        this.cargar();
      },
    });
  }

  alternarCombinar(id: string) {
    this.paraCombinar.update((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  }

  combinar() {
    ejecutar(this.acopio.combinar(this.paraCombinar()), {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: (l) => `Lote combinado ${l.codigo} creado (conserva la historia de cada lote de origen)`,
      luego: () => {
        this.combinando.set(false);
        this.paraCombinar.set([]);
        this.cargar();
      },
    });
  }
}
