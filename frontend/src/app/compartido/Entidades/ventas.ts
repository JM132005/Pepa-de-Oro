// ventas.ts → clientes, cotizaciones, pedidos, caja y facturas.

import { Documento, EnvioCorreo, ItemVenta, Totales } from './comunes';

export interface Cliente extends Documento {
  tipoIdentificacion: 'RUC' | 'CEDULA' | 'PASAPORTE' | 'CONSUMIDOR_FINAL';
  identificacion: string;
  nombre: string;
  nombreComercial?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  tipoCliente: string;
  creditoDias: number;
  cupo: number;
  vendedor?: { _id: string; nombre: string } | string;
  notas?: string;
  activo: boolean;
}

export interface Cotizacion extends Documento {
  numero: string;
  fecha: string;
  cliente: Cliente;
  items: ItemVenta[];
  totales: Totales;
  diasValidez: number;
  vence: string;
  estado: string;
  canal: string;
  vendedor: { id: string; nombre: string };
  condiciones?: string;
  observaciones?: string;
  envios: EnvioCorreo[];
  pedido?: { _id: string; numero: string; estado: string };
}

export interface Pedido extends Documento {
  numero: string;
  fecha: string;
  cliente: Cliente;
  canal: string;
  items: ItemVenta[];
  totales: Totales;
  estado: string;
  creditoDias: number;
  vendedor: { id: string; nombre: string };
  entrega?: { direccion?: string; fechaEstimada?: string; contacto?: string };
  exportacion?: Record<string, string>;
  factura?: { _id: string; numero: string; total: number };
  viaje?: { _id: string; codigo: string; estado: string };
  observaciones?: string;
}

export interface TurnoCaja extends Documento {
  cajero: string;
  cajeroNombre: string;
  apertura: string;
  montoInicial: number;
  cierre?: string;
  contado?: number;
  esperado?: number;
  diferencia?: number;
  ventasPorFormaPago: Record<string, number>;
  numeroVentas: number;
  estado: 'ABIERTO' | 'CERRADO';
}

export interface Factura extends Documento {
  tipoComprobante: '01' | '04';
  numero: string;
  secuencial: number;
  claveAcceso: string;
  fechaEmision: string;
  cliente: { id?: string; tipoIdentificacion: string; identificacion: string; nombre: string; direccion?: string; correo?: string; telefono?: string; tipoCliente?: string };
  canal: string;
  items: ItemVenta[];
  subtotalIva: number;
  subtotal0: number;
  subtotalSinImpuestos: number;
  descuento: number;
  iva: number;
  total: number;
  tarifaIvaVigente: number;
  pagos: { codigo: string; nombre: string; monto: number }[];
  recibido: number;
  cambio: number;
  creditoDias: number;
  vence?: string;
  abonos: { fecha: string; monto: number; formaPago: string; referencia?: string; usuario: string }[];
  saldo: number;
  estadoPago: string;
  estado: string;
  envios: EnvioCorreo[];
  vendedor: { id: string; nombre: string };
  facturaModificada?: { id: string; numero: string; fecha: string };
  motivo?: string;
  totalNotasCredito: number;
  observaciones?: string;
}

export interface EstadoCuenta {
  cliente: Cliente;
  credito: { creditoDias: number; cupo: number; saldoPendiente: number; facturasVencidas: number; disponible: number };
  facturas: (Pick<Factura, '_id' | 'numero' | 'tipoComprobante' | 'fechaEmision' | 'vence' | 'total' | 'saldo' | 'estado' | 'estadoPago' | 'abonos'> & { vencida: boolean; tramo: string | null })[];
}
