// producto-detalle.ts → FICHA de un producto: galería, descripción, notas de cata, origen, ingredientes y
// cada variante (sabor/presentación) con su precio por menor y por mayor, escalas y stock en vivo.
// Botones: "Agregar a mi lista" (para cotizar) o, si está agotado, "Avísame cuando llegue".

import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Meta } from '@angular/platform-browser';
import { WebService } from '../../../compartido/Servicios/web.service';
import { ListaInteresService } from '../../../compartido/Servicios/lista-interes.service';
import { NotificacionService } from '../../../compartido/Servicios/notificacion.service';
import { ProductoPublico, VariantePublica } from '../../../compartido/Entidades/web';
import { Imagen } from '../../../compartido/Componentes/imagen/imagen';
import { Insignia } from '../../../compartido/Componentes/insignia/insignia';
import { Icono } from '../../../compartido/Componentes/icono/icono';
import { Modal } from '../../../compartido/Componentes/modal/modal';
import { Cargando, Vacio } from '../../../compartido/Componentes/cargando/cargando';
import { BotonWhatsapp } from '../../Componentes/boton-whatsapp/boton-whatsapp';
import { DatosContacto, FormularioSolicitud } from '../../Formularios/formulario-solicitud/formulario-solicitud';
import { REFRESCO_STOCK_MS } from '../../../compartido/Utils/config';
import { dinero, numero } from '../../../compartido/Utils/formato';
import { aplicarStock } from '../../Utils/stock-vivo';

@Component({
  selector: 'app-producto-detalle',
  imports: [RouterLink, Imagen, Insignia, Icono, Modal, Cargando, Vacio, BotonWhatsapp, FormularioSolicitud],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './producto-detalle.html',
})
export class ProductoDetalle {
  private readonly web = inject(WebService);
  private readonly interes = inject(ListaInteresService);
  private readonly avisos = inject(NotificacionService);
  private readonly titulo = inject(Title);
  private readonly meta = inject(Meta);

  // slug: llega desde la URL /productos/:slug (withComponentInputBinding lo convierte en input()).
  readonly slug = input.required<string>();
  readonly producto = signal<ProductoPublico | null>(null);
  readonly noExiste = signal(false);
  // fotoActiva: la imagen grande de la galería.
  readonly fotoActiva = signal<string | undefined>(undefined);
  // cantidades: cuántas unidades quiere de cada variante (id → cantidad).
  readonly cantidades = signal<Record<string, number>>({});
  // avisoDe: variante agotada para la que se abrió "Avísame cuando llegue".
  readonly avisoDe = signal<VariantePublica | null>(null);
  readonly enviando = signal(false);

  // fotos: imagen del producto + imágenes distintas de sus variantes (sin repetir).
  readonly fotos = computed(() => {
    const p = this.producto();
    return p ? [...new Set([p.imagen, ...p.variantes.map((v) => v.imagen)].filter((x): x is string => Boolean(x)))] : [];
  });
  readonly mensajeWhatsapp = computed(() => `Hola Pepa de Oro, me interesa el producto «${this.producto()?.productoBase ?? ''}». ¿Me pueden dar más información?`);

  readonly dinero = dinero;
  readonly numero = numero;

  constructor() {
    // effect(): cada vez que cambia el slug (por ejemplo al ir de un producto a otro), se carga de nuevo.
    effect(() => {
      const slug = this.slug();
      this.producto.set(null);
      this.noExiste.set(false);
      this.web.producto(slug).subscribe({
        next: (p) => {
          this.producto.set(p);
          this.fotoActiva.set(p.imagen ?? p.variantes[0]?.imagen);
          // Título y descripción de la pestaña con el nombre del producto (bueno para Google).
          this.titulo.setTitle(`${p.productoBase} · Pepa de Oro`);
          this.meta.updateTag({ name: 'description', content: (p.descripcion ?? `${p.productoBase} de Pepa de Oro`).slice(0, 160) });
        },
        error: () => this.noExiste.set(true),
      });
    });

    // Stock en vivo de las variantes.
    const reloj = setInterval(() => {
      const p = this.producto();
      if (!p) return;
      this.web.stock(p.variantes.map((v) => String(v._id))).subscribe({ next: (r) => this.producto.set(aplicarStock([p], r.stock)[0]), error: () => undefined });
    }, REFRESCO_STOCK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  cantidad(v: VariantePublica) {
    return this.cantidades()[v._id] ?? (v.unidad === 'KG' ? v.cantidadMinimaMayor || 69 : 1);
  }

  cambiarCantidad(v: VariantePublica, valor: number) {
    // Spread {...}: copia el objeto y cambia solo una clave (los signals necesitan un objeto nuevo).
    this.cantidades.update((c) => ({ ...c, [v._id]: Math.max(1, Math.round(valor) || 1) }));
  }

  // precioPara(): RN-16 en pequeño, solo informativo: por mayor desde la cantidad mínima y escalas por volumen.
  precioPara(v: VariantePublica, cantidad: number): number {
    const escala = [...(v.escalas ?? [])].sort((a, b) => b.desde - a.desde).find((e) => cantidad >= e.desde);
    if (escala) return escala.precio;
    return v.cantidadMinimaMayor && cantidad >= v.cantidadMinimaMayor ? v.precioMayor : v.precioMenor;
  }

  agregar(v: VariantePublica) {
    const p = this.producto()!;
    this.interes.agregar({ productoId: v._id, nombre: v.nombre, sku: v.sku, cantidad: this.cantidad(v), precioMenor: v.precioMenor, imagen: v.imagen ?? p.imagen });
    this.avisos.exito(`Agregado a tu lista: ${v.nombre}`);
  }

  // avisarme(): crea una solicitud AVISO_STOCK; el vendedor recibe la alerta y el visitante un correo cuando llegue.
  avisarme(datos: DatosContacto) {
    const v = this.avisoDe();
    if (!v) return;
    this.enviando.set(true);
    this.web.enviarSolicitud({ ...datos, tipo: 'AVISO_STOCK', items: [{ productoId: v._id, cantidad: 1 }] }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisoDe.set(null);
        this.avisos.exito('¡Listo! Te escribiremos apenas llegue.');
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(e);
      },
    });
  }
}
