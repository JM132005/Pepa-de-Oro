// acopio.ts → productores, precio del día, lotes de grano y liquidaciones.

import { Documento } from './comunes';

export interface Productor extends Documento {
  cedula: string;
  nombre: string;
  telefono?: string;
  finca?: string;
  canton: string;
  hectareas: number;
  cultivos: string[];
  certificaciones: { tipo: string; codigo?: string; vence: string }[];
  cuentaBancaria?: { banco: string; tipo: string; numero: string };
  activo: boolean;
  motivoInactivo?: string;
  anticipos: { fecha: string; monto: number; motivo?: string; usuario: string }[];
  saldoAnticipo: number;
  calificacion: number;
  liquidaciones?: Liquidacion[];
  porPagar?: number;
  kgEntregados?: number;
}

export interface PrecioDia extends Documento {
  fecha: string;
  cultivo: string;
  variedad: string;
  estado: string;
  precioQq: number;
  precioReferencia?: number;
  usuario: string;
}

export interface Liquidacion extends Documento {
  numero: string;
  claveAcceso: string;
  fecha: string;
  productor: { id: string; cedula: string; nombre: string; canton: string };
  loteGrano?: string;
  codigoLote?: string;
  cultivo: string;
  variedad: string;
  estadoEntrega: string;
  kgBrutos: number;
  taraKg: number;
  kgNetos: number;
  humedad: number;
  impurezasPct: number;
  descuentoHumedadKg: number;
  descuentoImpurezasKg: number;
  kgPagables: number;
  quintales: number;
  precioQq: number;
  subtotal: number;
  bonos: { concepto: string; monto: number }[];
  retencion: number;
  anticipoDescontado: number;
  totalPagar: number;
  pagos: { fecha: string; monto: number; forma: string; referencia?: string; usuario: string }[];
  pagado: number;
  saldo: number;
  estadoPago: string;
  usuario: string;
}

export interface LoteGrano extends Documento {
  codigo: string;
  origen: 'PROPIO' | 'COMPRA';
  cultivo: string;
  variedad: string;
  estadoEntrega: string;
  fechaRecepcion: string;
  productor?: { id: string; nombre: string; canton?: string };
  hacienda?: { id: string; nombre: string };
  parcela?: { id: string; codigo: string };
  kgEntrada: number;
  kgSeco: number;
  mermaPct: number;
  factorConversion: number;
  humedadEntrada: number;
  costoTotal: number;
  costoKgSeco: number;
  estado: string;
  fermentacion?: { activo: string; codigo: string; inicio: string; fin?: string; volteos: { fecha: string; temperatura?: number; usuario: string }[] };
  secado?: { metodo: string; activo: string; codigo: string; inicio: string; fin?: string; mediciones: { fecha: string; humedad: number; usuario: string }[] };
  calidad?: {
    fecha: string;
    usuario: string;
    bienFermentados?: number;
    violetas?: number;
    pizarrosos?: number;
    mohosos?: number;
    insectados?: number;
    germinados?: number;
    humedad: number;
    peso100Granos?: number;
    defectos300g?: number;
    puntajeTaza?: number;
    grado: string;
    motivos: string[];
    destino: string;
    cata?: { notas: string[]; puntaje: number };
  };
  noConformidad?: { causa: string; fecha: string; destino?: string; cerrada: boolean };
  lotesOrigen: string[];
  historial: { fecha: string; evento: string; detalle: string; usuario: string }[];
}

export interface OcupacionPoscosecha {
  _id: string;
  codigo: string;
  nombre: string;
  tipo: 'FERMENTADOR' | 'TENDAL' | 'SECADORA';
  estado: string;
  capacidadKg: number;
  ocupadoKg: number;
  libreKg: number;
  lotes: { _id: string; codigo: string; kg: number; variedad: string }[];
}
