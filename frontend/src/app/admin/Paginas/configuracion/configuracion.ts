// configuracion.ts → CONFIGURACIÓN de la empresa (solo gerente). Todo lo que cambia sin tocar el código:
//   · Empresa: datos que salen en las facturas (RUC, establecimiento, punto de emisión) y en la web.
//   · Ventas: tope de descuento por rol (RN-17), validez de cotizaciones, límite de consumidor final (RN-19).
//   · Acopio: humedad de referencia (RN-04), bonos y retención.
//   · Calidad: tabla de límites para asignar el grado (RN-06).
//   · Alertas: con cuántos días de anticipación avisar.
// Cada cambio queda en la bitácora de auditoría (acción sensible).

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SistemaService } from '../../../compartido/Servicios/sistema.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { Cargando } from '../../../compartido/Componentes/cargando/cargando';
import { FormularioDinamico, CampoFormulario } from '../../../compartido/Componentes/formulario-dinamico/formulario-dinamico';
import { ejecutar } from '../../Utils/acciones';

type Seccion = 'empresa' | 'ventas' | 'acopio' | 'calidad' | 'alertas';

@Component({
  selector: 'app-configuracion',
  imports: [FormsModule, Cargando, FormularioDinamico],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion.html',
})
export class Configuracion {
  private readonly sistema = inject(SistemaService);
  private readonly avisos = inject(NotificacionService);

  readonly config = signal<Record<string, any> | null>(null);
  readonly seccion = signal<Seccion>('empresa');
  readonly ocupado = signal(false);
  // Copia editable de la tabla de grados del cacao.
  readonly grados = signal<Record<string, number | string>[]>([]);

  readonly camposEmpresa: CampoFormulario[] = [
    { nombre: 'razonSocial', etiqueta: 'Razón social', tipo: 'texto', requerido: true },
    { nombre: 'nombreComercial', etiqueta: 'Nombre comercial', tipo: 'texto', requerido: true },
    { nombre: 'ruc', etiqueta: 'RUC', tipo: 'texto', requerido: true },
    { nombre: 'obligadoContabilidad', etiqueta: 'Obligado a llevar contabilidad', tipo: 'seleccion', opciones: [{ valor: 'SI', texto: 'Sí' }, { valor: 'NO', texto: 'No' }] },
    { nombre: 'establecimiento', etiqueta: 'Establecimiento (001)', tipo: 'texto', requerido: true },
    { nombre: 'puntoEmision', etiqueta: 'Punto de emisión (001)', tipo: 'texto', requerido: true },
    { nombre: 'ambiente', etiqueta: 'Ambiente SRI', tipo: 'seleccion', opciones: [{ valor: '1', texto: '1 · Pruebas' }, { valor: '2', texto: '2 · Producción' }] },
    { nombre: 'direccionMatriz', etiqueta: 'Dirección matriz', tipo: 'texto', ancho: true },
    { nombre: 'direccionTienda', etiqueta: 'Dirección tienda', tipo: 'texto', ancho: true },
    { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
    { nombre: 'whatsapp', etiqueta: 'WhatsApp (593…)', tipo: 'texto' },
    { nombre: 'correo', etiqueta: 'Correo de ventas', tipo: 'correo' },
    { nombre: 'horario', etiqueta: 'Horario', tipo: 'texto' },
    { nombre: 'urlWeb', etiqueta: 'Dirección de la web (para el QR de las etiquetas)', tipo: 'texto', ancho: true },
  ];
  readonly camposVentas: CampoFormulario[] = [
    { nombre: 'topeDescuento.VENTAS', etiqueta: 'Descuento máximo de Ventas (%) · RN-17', tipo: 'numero', min: 0, max: 100 },
    { nombre: 'diasValidezCotizacion', etiqueta: 'Días de validez de una cotización', tipo: 'numero', min: 1 },
    { nombre: 'limiteConsumidorFinal', etiqueta: 'Límite para consumidor final (USD) · RN-19', tipo: 'numero', min: 0 },
  ];
  readonly camposAcopio: CampoFormulario[] = [
    { nombre: 'humedadReferencia', etiqueta: 'Humedad de referencia (%) · RN-04', tipo: 'numero', min: 0, max: 20, paso: 0.1 },
    { nombre: 'bonoOrganicoQq', etiqueta: 'Bono orgánico (USD por quintal)', tipo: 'numero', min: 0 },
    { nombre: 'bonoPremiumQq', etiqueta: 'Bono por calidad premium (USD por quintal)', tipo: 'numero', min: 0 },
    { nombre: 'retencionRentaPct', etiqueta: 'Retención en la fuente (%)', tipo: 'numero', min: 0, max: 10, paso: 0.1 },
  ];
  readonly camposAlertas: CampoFormulario[] = [
    { nombre: 'diasAvisoMantenimiento', etiqueta: 'Avisar mantenimientos con (días)', tipo: 'numero', min: 0 },
    { nombre: 'diasAlertaFermentacion', etiqueta: 'Alerta si un lote fermenta más de (días)', tipo: 'numero', min: 1 },
  ];
  readonly columnasGrado = ['fermentadosMin', 'violetasMax', 'pizarrososMax', 'mohososMax', 'defectuososMax', 'humedadMax', 'peso100GranosMin'];
  readonly titulosGrado: Record<string, string> = { fermentadosMin: 'Fermentados mín. %', violetasMax: 'Violetas máx. %', pizarrososMax: 'Pizarrosos máx. %', mohososMax: 'Mohosos máx. %', defectuososMax: 'Defectuosos máx. %', humedadMax: 'Humedad máx. %', peso100GranosMin: 'Peso 100 granos mín. (g)' };

  constructor() {
    this.cargar();
  }

  cargar() {
    this.sistema.configuracion().subscribe((c) => {
      this.config.set(c);
      this.grados.set((c['calidad']?.gradosCacao ?? []).map((g: Record<string, number | string>) => ({ ...g })));
    });
  }

  // guardar(): manda SOLO la sección editada; el backend la mezcla con el resto ($set por sección).
  guardar(seccion: Seccion, datos: Record<string, unknown>) {
    const actual = this.config()?.[seccion] ?? {};
    const cuerpo = { [seccion]: { ...actual, ...datos, ...(seccion === 'ventas' ? { topeDescuento: { ...actual.topeDescuento, ...(datos['topeDescuento'] as object) } } : {}) } };
    ejecutar(this.sistema.guardarConfiguracion(cuerpo), { avisos: this.avisos, ocupado: this.ocupado, exito: 'Configuración guardada (queda en la auditoría)', luego: (c) => this.config.set(c) });
  }

  cambiarGrado(i: number, campo: string, valor: number) {
    this.grados.update((g) => g.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  }

  guardarGrados() {
    this.guardar('calidad', { gradosCacao: this.grados() });
  }
}
