// comunes.ts → formas que se repiten en varios módulos.

export interface Documento {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

// Línea de cotización, pedido o factura.
export interface ItemVenta {
  tipo: 'PRODUCTO' | 'SERVICIO' | 'EQUIPO' | 'ALQUILER';
  refId?: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  unidad?: string;
  precioUnitario: number;
  descuentoPct: number;
  descuento: number;
  subtotal: number;
  tarifaIva: number;
  iva: number;
  reglaPrecio?: string;
  costoUnitario?: number;
  lotes: { loteId: string; codigo: string; cantidad: number }[];
}

export interface Totales {
  subtotalIva: number;
  subtotal0: number;
  subtotalSinImpuestos: number;
  descuento: number;
  iva: number;
  total: number;
}

export interface EnvioCorreo {
  fecha: string;
  ok: boolean;
  modo: string;
  destinatario: string;
  error?: string;
  archivo?: string;
}
