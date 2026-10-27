// configuracion.esquema.ts → colección "configuracion": UN solo documento con los parámetros de la empresa.
// Todo lo que el gerente puede cambiar SIN tocar el código vive aquí: datos tributarios, tarifas de IVA,
// tabla de grados de calidad, topes de descuento, bonos del acopio...
// Analogía: es el "panel de perillas" de la empresa.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

// Límites de un grado de calidad de CACAO (prueba de corte de 100 granos, en %).
export interface LimiteGradoCacao {
  grado: 'PREMIUM' | 'EXPORTACION' | 'NACIONAL';
  fermentadosMin: number; // bien fermentados (marrones) como mínimo
  violetasMax: number;
  pizarrososMax: number; // granos sin fermentar (grises): dan sabor astringente
  mohososMax: number;
  defectuososMax: number; // dañados por insectos + germinados
  humedadMax: number;
  peso100GranosMin: number; // gramos: granos pequeños rinden menos
}

// Límites de un grado de CAFÉ (defectos en 300 g y puntaje de taza SCA).
export interface LimiteGradoCafe {
  grado: 'PREMIUM' | 'EXPORTACION' | 'NACIONAL';
  defectosMax: number;
  puntajeTazaMin: number;
  humedadMax: number;
}

@Schema({ collection: 'configuracion', timestamps: true, minimize: false })
export class Configuracion {
  @Prop({ type: String, default: 'principal' }) // un único documento con _id "principal"
  _id: string;

  // Datos tributarios y de contacto (salen en facturas, correos y en la web).
  @Prop({ type: SchemaTypes.Mixed, required: true })
  empresa: {
    razonSocial: string;
    nombreComercial: string;
    ruc: string;
    direccionMatriz: string;
    direccionTienda: string;
    telefono: string;
    whatsapp: string;
    correo: string;
    horario: string;
    obligadoContabilidad: 'SI' | 'NO';
    establecimiento: string; // "001"
    puntoEmision: string; // "001"
    ambiente: '1' | '2'; // 1 = pruebas, 2 = producción (siempre 1: es un sistema académico)
    urlWeb: string; // para el QR de rastreo
  };

  // IVA: tarifa general vigente y su código SRI. Ecuador: 15 % desde el 1 de abril de 2024.
  @Prop({ type: SchemaTypes.Mixed, required: true })
  iva: { tarifaGeneral: number; codigos: Record<string, string> };

  @Prop({ type: SchemaTypes.Mixed, required: true })
  calidad: { gradosCacao: LimiteGradoCacao[]; gradosCafe: LimiteGradoCafe[] };

  // Ventas: tope de descuento manual por rol (RN-17), vigencia de cotizaciones (RN-22) y límite consumidor final (RN-19).
  @Prop({ type: SchemaTypes.Mixed, required: true })
  ventas: { topeDescuento: Record<string, number>; diasValidezCotizacion: number; limiteConsumidorFinal: number };

  // Acopio: humedad de referencia para descuentos (RN-04), descuento por impurezas, bonos.
  @Prop({ type: SchemaTypes.Mixed, required: true })
  acopio: { humedadReferencia: number; bonoOrganicoQq: number; bonoPremiumQq: number; retencionRentaPct: number };

  // Mantenimiento y alertas.
  @Prop({ type: SchemaTypes.Mixed, required: true })
  alertas: { diasVencimiento: number[]; diasAvisoMantenimiento: number; diasAlertaFermentacion: number };
}

export const ConfiguracionEsquema = SchemaFactory.createForClass(Configuracion);
