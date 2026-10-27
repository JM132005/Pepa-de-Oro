// clientes.ts → CLIENTES: consumidores, mayoristas, distribuidores y exportadores.
// Crear y editar (con validación de cédula/RUC, RN-02), condiciones de crédito (RN-18) y
// ESTADO DE CUENTA de cada cliente (facturas, abonos, saldo y antigüedad), descargable en PDF.

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VentasService } from '../../../compartido/Servicios/ventas.service';
import { ArchivosService } from '../../../compartido/Servicios/archivos.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Cliente, EstadoCuenta } from '../../../compartido/Entidades/ventas';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { FormularioDinamico } from '../../../compartido/Componentes/formulario-dinamico/formulario-dinamico';
import { CAMPOS_CLIENTE, TIPOS_CLIENTE } from '../../Formularios/campos';
import { dinero, fecha } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

@Component({
  selector: 'app-clientes',
  imports: [FormsModule, Tabla, Modal, Icono, FormularioDinamico],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './clientes.html',
})
export class Clientes {
  private readonly ventas = inject(VentasService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly clientes = signal<Cliente[]>([]);
  readonly tipo = signal('');
  readonly editando = signal<Partial<Cliente> | null>(null);
  readonly cuenta = signal<EstadoCuenta | null>(null);
  readonly ocupado = signal(false);
  readonly tipos = TIPOS_CLIENTE;
  readonly campos = CAMPOS_CLIENTE;

  readonly columnas: Columna[] = [
    { campo: 'nombre', titulo: 'Nombre' },
    { campo: 'identificacion', titulo: 'Cédula / RUC' },
    { campo: 'tipoCliente', titulo: 'Tipo', tipo: 'etiqueta' },
    { campo: 'ciudad', titulo: 'Ciudad', ocultarEnMovil: true },
    { campo: 'correo', titulo: 'Correo', ocultarEnMovil: true },
    { campo: 'creditoDias', titulo: 'Crédito (días)', tipo: 'numero', ocultarEnMovil: true },
    { campo: 'activo', titulo: 'Activo', tipo: 'booleano', ocultarEnMovil: true },
  ];
  readonly columnasCuenta: Columna[] = [
    { campo: 'numero', titulo: 'Documento' },
    { campo: 'fechaEmision', titulo: 'Fecha', tipo: 'fecha' },
    { campo: 'vence', titulo: 'Vence', tipo: 'fecha' },
    { campo: 'total', titulo: 'Total', tipo: 'dinero' },
    { campo: 'saldo', titulo: 'Saldo', tipo: 'dinero' },
    { campo: 'tramo', titulo: 'Antigüedad', valor: (f: { tramo: string | null; vencida: boolean }) => (f.vencida ? (f.tramo ?? 'Vencida') : 'Vigente') },
    { campo: 'estadoPago', titulo: 'Pago', tipo: 'insignia' },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly texto = texto;

  constructor() {
    this.cargar();
  }

  cargar() {
    this.ventas.clientes({ tipo: this.tipo() }).subscribe((c) => this.clientes.set(c));
  }

  nuevo() {
    this.editando.set({ tipoIdentificacion: 'RUC', tipoCliente: 'MAYORISTA', creditoDias: 0, pais: 'Ecuador' });
  }

  guardar(datos: Record<string, unknown>) {
    const actual = this.editando();
    const peticion = actual?._id ? this.ventas.actualizarCliente(actual._id, datos as Partial<Cliente>) : this.ventas.crearCliente(datos as Partial<Cliente>);
    ejecutar(peticion, {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Cliente guardado',
      luego: () => {
        this.editando.set(null);
        this.cargar();
      },
    });
  }

  verCuenta(c: Cliente) {
    this.ventas.estadoCuenta(c._id).subscribe({ next: (e) => this.cuenta.set(e), error: (e) => this.avisos.error(e) });
  }

  pdfCuenta(c: Cliente) {
    this.archivos.verPdf('informes/estado-cuenta', `Estado de cuenta · ${c.nombre}`, `estado-cuenta-${c.identificacion}.pdf`, { cliente: c._id, formato: 'pdf' });
  }
}
