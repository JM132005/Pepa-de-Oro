// lineas.service.ts → arma las líneas de una cotización, pedido o factura a partir de lo que envía el frontend.
// Para cada línea busca el precio (RN-16), la tarifa de IVA, el costo y revisa el descuento (RN-17).
// Lo usan cotizaciones, pedidos y facturación para que los tres calculen EXACTAMENTE igual.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Producto } from '../productos/esquemas/producto.esquema.js';
import { Activo } from '../equipos/esquemas/activo.esquema.js';
import { Alquiler } from '../equipos/esquemas/alquiler.esquema.js';
import { OrdenMantenimiento } from '../mantenimiento/esquemas/orden-mantenimiento.esquema.js';
import { precioUnitario } from '../productos/productos.reglas.js';
import { calcularTotales, type LineaEntrada } from '../facturacion/facturacion.reglas.js';
import { verificarDescuento } from './ventas.reglas.js';
import { calcularAlquiler } from '../equipos/equipos.reglas.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import type { UsuarioToken } from '../../comun/usuario-token.js';
import type { ItemEntradaDto } from './dto/ventas.dto.js';
import type { ItemVenta } from '../../comun/esquemas/item-venta.esquema.js';

@Injectable()
export class LineasService {
  constructor(
    @InjectModel(Producto.name) private readonly productos: Model<Producto>,
    @InjectModel(Activo.name) private readonly activos: Model<Activo>,
    @InjectModel(Alquiler.name) private readonly alquileres: Model<Alquiler>,
    @InjectModel(OrdenMantenimiento.name) private readonly ordenes: Model<OrdenMantenimiento>,
    private readonly configuracion: ConfiguracionService,
  ) {}

  // armar(): convierte los items del frontend en líneas completas + totales.
  async armar(items: ItemEntradaDto[], tipoCliente: string, usuario: UsuarioToken, canal = 'MOSTRADOR') {
    const config = await this.configuracion.obtener();
    const lineas: (LineaEntrada & Partial<ItemVenta>)[] = [];

    for (const item of items) {
      // RN-17: el descuento manual no supera el tope del rol.
      const errorDescuento = verificarDescuento(item.descuentoPct ?? 0, usuario.roles, config.ventas.topeDescuento);
      if (errorDescuento) throw new BadRequestException(errorDescuento);

      if (item.tipo === 'PRODUCTO') {
        const p = await this.productos.findById(item.refId).lean().exec();
        if (!p || !p.activo) throw new NotFoundException('Producto no encontrado o inactivo');
        const auto = precioUnitario(p, item.cantidad, tipoCliente); // RN-16
        lineas.push({
          tipo: 'PRODUCTO',
          refId: String(p._id),
          codigo: p.sku,
          descripcion: p.nombre,
          unidad: p.unidad,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario ?? auto.precio,
          reglaPrecio: item.precioUnitario !== undefined ? 'Precio manual' : auto.regla,
          descuentoPct: item.descuentoPct ?? 0,
          // Exportación: tarifa 0 % (las exportaciones de bienes no pagan IVA).
          tarifaIva: canal === 'EXPORTACION' ? 0 : p.tarifaIva,
          costoUnitario: p.costoPromedio,
          lotes: [],
        });
      } else if (item.tipo === 'EQUIPO') {
        const a = await this.activos.findById(item.refId).lean().exec();
        if (!a) throw new NotFoundException('Activo no encontrado');
        if (!a.usos.includes('VENTA') || ['VENDIDO', 'BAJA'].includes(a.estado)) throw new BadRequestException(`${a.codigo} no está a la venta`);
        lineas.push({
          tipo: 'EQUIPO',
          refId: String(a._id),
          codigo: a.codigo,
          descripcion: `${a.nombre} ${a.marca ?? ''} ${a.modelo ?? ''} ${a.anio ?? ''}`.replace(/\s+/g, ' ').trim(),
          unidad: 'UNIDAD',
          cantidad: 1,
          precioUnitario: item.precioUnitario ?? a.precioVenta,
          descuentoPct: item.descuentoPct ?? 0,
          // Maquinaria agrícola listada en el Art. 55 de la LRTI (tractores, sembradoras...) tiene tarifa 0 %.
          tarifaIva: item.tarifaIva ?? (['TRACTOR', 'MOTOCULTOR', 'FUMIGADORA'].includes(a.tipo) ? 0 : 15),
          costoUnitario: a.valorActual,
          lotes: [],
        });
      } else if (item.tipo === 'ALQUILER') {
        const al = await this.alquileres.findById(item.refId).populate('activo').lean().exec();
        if (!al) throw new NotFoundException('Alquiler no encontrado');
        const activo = al.activo as unknown as Activo;
        const calculo = calcularAlquiler({
          desde: al.desde,
          hasta: al.hasta,
          devolucion: al.devolucion?.fecha,
          tarifaDia: al.tarifaDia,
          conOperador: al.conOperador,
          tarifaOperadorDia: al.tarifaOperadorDia,
          garantia: al.garantia,
          danos: al.devolucion?.danos,
        });
        lineas.push({
          tipo: 'ALQUILER',
          refId: String(al._id),
          codigo: al.codigo,
          descripcion: `Alquiler ${activo.nombre} (${activo.codigo}) · ${calculo.diasReales} día(s)${al.conOperador ? ' con operador' : ''}`,
          unidad: 'DIA',
          cantidad: calculo.diasReales,
          precioUnitario: calculo.porDia,
          descuentoPct: item.descuentoPct ?? 0,
          tarifaIva: 15, // el arrendamiento de maquinaria grava 15 %
          costoUnitario: 0,
          lotes: [],
        });
      } else {
        // SERVICIO: transporte, mantenimiento a clientes, secado por maquila...
        let descripcion = item.descripcion;
        let precio = item.precioUnitario;
        if (item.refId) {
          const om = await this.ordenes.findById(item.refId).lean().exec();
          if (om) {
            descripcion ??= `Servicio de mantenimiento ${om.codigo}: ${om.equipoCliente?.descripcion ?? ''}`;
            precio ??= om.costos?.costoTotal ? Math.round(om.costos.costoTotal * 1.35 * 100) / 100 : 0; // 35 % de margen del taller
          }
        }
        if (!descripcion || precio === undefined) throw new BadRequestException('Un servicio necesita descripción y precio');
        lineas.push({
          tipo: 'SERVICIO',
          refId: item.refId,
          codigo: item.refId ? 'SERV-MANT' : 'SERV',
          descripcion,
          unidad: 'SERVICIO',
          cantidad: item.cantidad,
          precioUnitario: precio,
          descuentoPct: item.descuentoPct ?? 0,
          // El transporte de carga nacional es tarifa 0 % (Art. 56 LRTI); el resto, 15 %.
          tarifaIva: item.tarifaIva ?? 15,
          costoUnitario: 0,
          lotes: [],
        });
      }
    }
    const totales = calcularTotales(lineas);
    // Se juntan los datos calculados (descuento, subtotal, iva) con los extras (refId, costo...).
    const completas = totales.lineas.map((l, i) => ({ ...lineas[i], ...l })) as unknown as ItemVenta[];
    const { lineas: _l, ...resto } = totales;
    return { items: completas, totales: resto };
  }
}
