// catalogo.ts → CATÁLOGO Y PRECIOS: todas las variantes (SKU) con precio por menor, por mayor, costo
// promedio, margen y stock. Solo el GERENTE crea productos y cambia precios (acción sensible: queda en
// el historial de precios y en la auditoría). Bodega y Ventas solo consultan.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
// KeyValuePipe: permite recorrer un objeto { clave: valor } con @for (ej. stock por bodega).
import { KeyValuePipe } from '@angular/common';
import { CatalogoService } from '../../../compartido/Servicios/catalogo.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { AuthService } from '../../../compartido/Servicios/auth.service';
import { Producto } from '../../../compartido/Entidades/catalogo';
import { Tabla, Columna } from '../../../compartido/Componentes/tabla/tabla';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Imagen } from '../../../compartido/Componentes/imagen/imagen';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { FormularioDinamico } from '../../../compartido/Componentes/formulario-dinamico/formulario-dinamico';
import { CAMPOS_PRODUCTO, FAMILIAS, TIPOS_PRODUCTO } from '../../Formularios/campos';
import { dinero, fecha, numero, porcentaje } from '../../../compartido/Utils/formato';
import { texto } from '../../../compartido/Utils/etiquetas';
import { ejecutar } from '../../Utils/acciones';

@Component({
  selector: 'app-catalogo',
  imports: [FormsModule, KeyValuePipe, Tabla, Modal, Icono, Imagen, Insignia, FormularioDinamico],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo.html',
})
export class Catalogo {
  private readonly catalogo = inject(CatalogoService);
  private readonly avisos = inject(NotificacionService);
  readonly auth = inject(AuthService);

  readonly productos = signal<Producto[]>([]);
  readonly familia = signal('');
  readonly tipo = signal('TERMINADO');
  readonly detalle = signal<Producto | null>(null);
  readonly editando = signal<Partial<Producto> | null>(null);
  readonly ocupado = signal(false);
  readonly familias = FAMILIAS;
  readonly tipos = TIPOS_PRODUCTO;
  readonly campos = CAMPOS_PRODUCTO;

  readonly filtrados = computed(() => this.productos().filter((p) => (!this.familia() || p.familia === this.familia()) && (!this.tipo() || p.tipo === this.tipo())));
  readonly columnas: Columna[] = [
    { campo: 'sku', titulo: 'SKU' },
    { campo: 'nombre', titulo: 'Producto' },
    { campo: 'precioMenor', titulo: 'P. menor', tipo: 'dinero' },
    { campo: 'precioMayor', titulo: 'P. mayor', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'costoPromedio', titulo: 'Costo prom.', tipo: 'dinero', ocultarEnMovil: true },
    { campo: 'margen', titulo: 'Margen', tipo: 'porcentaje', valor: (p: Producto) => (p.precioMenor > 0 ? ((p.precioMenor - p.costoPromedio) / p.precioMenor) * 100 : 0), ocultarEnMovil: true },
    { campo: 'stock.disponible', titulo: 'Disponible', tipo: 'numero' },
    { campo: 'stock.estado', titulo: 'Stock', tipo: 'insignia' },
    { campo: 'publicado', titulo: 'En la web', tipo: 'booleano', ocultarEnMovil: true },
  ];
  readonly dinero = dinero;
  readonly fecha = fecha;
  readonly numero = numero;
  readonly porcentaje = porcentaje;
  readonly texto = texto;

  constructor() {
    this.cargar();
  }

  cargar() {
    this.catalogo.productos({ todos: true }).subscribe((p) => this.productos.set(p));
  }

  abrir(p: Producto) {
    this.catalogo.producto(p._id).subscribe((x) => this.detalle.set(x));
  }

  nuevo() {
    this.editando.set({ tipo: 'TERMINADO', familia: 'CHOCOLATES', unidad: 'UNIDAD', tarifaIva: 15, publicado: false, activo: true, cantidadMinimaMayor: 24 });
  }

  guardar(datos: Record<string, unknown>) {
    const actual = this.editando();
    const peticion = actual?._id ? this.catalogo.actualizarProducto(actual._id, datos as Partial<Producto>) : this.catalogo.crearProducto(datos as Partial<Producto>);
    ejecutar(peticion, {
      avisos: this.avisos,
      ocupado: this.ocupado,
      exito: 'Producto guardado',
      luego: () => {
        this.editando.set(null);
        this.detalle.set(null);
        this.cargar();
      },
    });
  }
}
