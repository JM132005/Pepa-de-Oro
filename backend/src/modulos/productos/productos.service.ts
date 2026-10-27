// productos.service.ts → catálogo: variantes, precios (RN-16) e historial de precios.

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrudBase } from '../../comun/crud-base.service.js';
import { crearSlug, escaparRegex } from '../../comun/utilidades.js';
import { Producto } from './esquemas/producto.esquema.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { margen, precioUnitario } from './productos.reglas.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { CrearProductoDto, ActualizarProductoDto } from './dto/producto.dto.js';

// extends CrudBase<Producto>: hereda listar/obtener/crear/actualizar y añade lo propio del catálogo.
@Injectable()
export class ProductosService extends CrudBase<Producto> {
  constructor(
    @InjectModel(Producto.name) modelo: Model<Producto>,
    private readonly inventario: InventarioService,
    private readonly auditoria: AuditoriaService,
  ) {
    // super(): llama al constructor de la clase padre con el modelo, el nombre y el orden por defecto.
    super(modelo, 'Producto', [], { familia: 1, nombre: 1 });
  }

  // buscar(): filtro por texto (nombre o SKU), familia y tipo. Devuelve cada variante con su stock.
  async buscar(f: { q?: string; familia?: string; tipo?: string; incluirInactivos?: boolean }) {
    const filtro: Record<string, unknown> = {};
    if (!f.incluirInactivos) filtro.activo = true;
    if (f.familia) filtro.familia = f.familia;
    if (f.tipo) filtro.tipo = { $in: f.tipo.split(',') };
    if (f.q) {
      // $regex con la opción 'i': búsqueda que no distingue mayúsculas ("choco" encuentra "Chocolate").
      const r = { $regex: escaparRegex(f.q), $options: 'i' };
      filtro.$or = [{ nombre: r }, { sku: r }, { productoBase: r }];
    }
    const productos = await this.modelo.find(filtro).sort({ familia: 1, nombre: 1 }).lean().exec();
    const stock = await this.inventario.resumenStock({ productoIds: productos.map((p) => String(p._id)) });
    // Map: diccionario productoId → stock, para unir rápido.
    const porId = new Map(stock.map((s) => [s.productoId, s]));
    return productos.map((p) => ({
      ...p,
      stock: porId.get(String(p._id)) ?? null,
      margen: margen(p.precioMenor, p.costoPromedio),
    }));
  }

  // detalle(): un producto con sus lotes por bodega.
  async detalle(id: string) {
    const producto = await this.obtener(id);
    const [stock] = await this.inventario.resumenStock({ productoIds: [id] });
    const lotes = await this.inventario.lotesDeProducto(id);
    return { ...producto, stock, lotes, margen: margen(producto.precioMenor, producto.costoPromedio) };
  }

  // crearProducto(): calcula el slug desde el nombre base (para la URL de la web).
  crearProducto(dto: CrearProductoDto, usuario: UsuarioToken) {
    return this.crear({
      ...dto,
      slug: crearSlug(dto.productoBase),
      historialPrecios: [{ fecha: new Date(), usuario: usuario.nombre, precioMenor: dto.precioMenor, precioMayor: dto.precioMayor }],
    });
  }

  // actualizarProducto(): si cambian los precios se guarda en el historial y en la auditoría (acción sensible).
  async actualizarProducto(id: string, dto: ActualizarProductoDto, usuario: UsuarioToken) {
    const antes = await this.obtener(id);
    const cambiaPrecio =
      (dto.precioMenor !== undefined && dto.precioMenor !== antes.precioMenor) ||
      (dto.precioMayor !== undefined && dto.precioMayor !== antes.precioMayor);
    const cambios: Record<string, unknown> = { ...dto };
    if (dto.productoBase) cambios.slug = crearSlug(dto.productoBase);
    if (cambiaPrecio) {
      // $push agrega un elemento al final del arreglo historialPrecios sin reescribir el resto.
      await this.modelo.updateOne(
        { _id: id },
        { $push: { historialPrecios: { fecha: new Date(), usuario: usuario.nombre, precioMenor: dto.precioMenor ?? antes.precioMenor, precioMayor: dto.precioMayor ?? antes.precioMayor } } },
      );
      await this.auditoria.registrar({
        usuario,
        accion: 'CAMBIAR_PRECIO',
        entidad: 'productos',
        entidadId: id,
        antes: { precioMenor: antes.precioMenor, precioMayor: antes.precioMayor },
        despues: { precioMenor: dto.precioMenor, precioMayor: dto.precioMayor },
        sensible: true,
      });
    }
    return this.actualizar(id, cambios);
  }

  // cotizarPrecio(): RN-16 para una cantidad y tipo de cliente.
  async cotizarPrecio(id: string, cantidad: number, tipoCliente: string) {
    const p = await this.obtener(id);
    return { productoId: id, sku: p.sku, cantidad, tipoCliente, tarifaIva: p.tarifaIva, ...precioUnitario(p, cantidad, tipoCliente) };
  }
}
