// correo.service.ts → envía correos (facturas, cotizaciones, confirmaciones de la web) con NODEMAILER.
//
// Nodemailer es la librería más usada en Node.js para enviar correos. Habla el protocolo SMTP
// (el "idioma" de los servidores de correo). Usamos el SMTP de Gmail con una CONTRASEÑA DE APLICACIÓN:
// una clave de 16 letras que Google da solo para programas, distinta de tu contraseña normal.
//
// Dos modos (variable CORREO_MODO en el .env):
//   gmail  → envía de verdad desde GMAIL_USER.
//   prueba → NO envía nada: guarda cada correo como archivo .eml en backend/correos-de-prueba/
//            (ábrelo con doble clic en Outlook/Thunderbird o arrástralo al navegador). Es el "buzón de prueba".
//
// Seguridad extra: CORREO_REDIRIGIR_A. Los clientes del seed tienen correos INVENTADOS; si se enviara
// a ellos de verdad, le llegaría a un desconocido. Con esta variable TODOS los correos van a tu Gmail
// y el asunto muestra a quién iban dirigidos: "[para cliente@x.com] Factura 001-001-000000123".

import { Injectable, Logger } from '@nestjs/common';
// createTransport: crea el "cartero" que sabe cómo entregar el correo (SMTP real o archivo).
import nodemailer, { type Transporter } from 'nodemailer';
// fs/promises y path: módulos de Node.js para crear carpetas y escribir archivos.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Forma de un adjunto: nombre del archivo y su contenido en memoria (Buffer = bytes).
export interface Adjunto {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface DatosCorreo {
  para: string;
  asunto: string;
  html: string; // cuerpo del correo con formato
  adjuntos?: Adjunto[];
}

// Resultado que se guarda en el historial de envíos de cada documento.
export interface ResultadoEnvio {
  ok: boolean;
  modo: 'gmail' | 'prueba' | 'apagado';
  destinatarioReal: string;
  archivo?: string; // ruta del .eml en modo prueba
  error?: string;
  fecha: Date;
}

@Injectable()
export class CorreoService {
  // Logger: imprime mensajes en la consola del backend con el nombre de la clase.
  private readonly logger = new Logger(CorreoService.name);
  private transporte?: Transporter;

  // modo(): lee el .env cada vez (así las pruebas pueden cambiarlo).
  //   apagado → no envía ni guarda nada (lo usa el seed al generar 12 meses de historia).
  get modo(): 'gmail' | 'prueba' | 'apagado' {
    if (process.env.CORREO_MODO === 'apagado') return 'apagado';
    const conCredenciales = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
    return process.env.CORREO_MODO === 'gmail' && conCredenciales ? 'gmail' : 'prueba';
  }

  // crearTransporte(): se crea una sola vez (patrón "perezoso": solo cuando se necesita).
  private obtenerTransporte(): Transporter {
    if (!this.transporte) {
      this.transporte = nodemailer.createTransport({
        host: 'smtp.gmail.com', // servidor de correo saliente de Google
        port: 465, // puerto SMTP con cifrado SSL
        secure: true, // conexión cifrada desde el inicio
        auth: {
          user: process.env.GMAIL_USER,
          // replace(/\s/g, ''): Google muestra la clave como "abcd efgh ijkl mnop"; se quitan los espacios.
          pass: (process.env.GMAIL_APP_PASSWORD ?? '').replace(/\s/g, ''),
        },
      });
    }
    return this.transporte;
  }

  // enviar(): punto único para mandar cualquier correo del sistema. Nunca lanza error:
  // devuelve { ok: false, error } para que la factura quede como ERROR_ENVIO y se pueda reintentar.
  async enviar(datos: DatosCorreo): Promise<ResultadoEnvio> {
    const redirigir = process.env.CORREO_REDIRIGIR_A?.trim();
    const destinatarioReal = redirigir || datos.para;
    const asunto = redirigir && redirigir !== datos.para ? `[para ${datos.para}] ${datos.asunto}` : datos.asunto;
    const remitente = `"${process.env.MAIL_FROM_NAME ?? 'Pepa de Oro'}" <${process.env.GMAIL_USER ?? 'no-responder@pepadeoro.ec'}>`;
    const mensaje = {
      from: remitente,
      to: destinatarioReal,
      subject: asunto,
      html: datos.html,
      attachments: datos.adjuntos,
    };

    if (this.modo === 'apagado') return { ok: true, modo: 'apagado', destinatarioReal, fecha: new Date() };
    try {
      if (this.modo === 'gmail') {
        // sendMail(): conecta con smtp.gmail.com, se identifica y entrega el correo.
        await this.obtenerTransporte().sendMail(mensaje);
        this.logger.log(`📧 Correo enviado a ${destinatarioReal}: ${asunto}`);
        return { ok: true, modo: 'gmail', destinatarioReal, fecha: new Date() };
      }
      // Modo prueba: streamTransport arma el correo completo (con adjuntos) pero en vez de enviarlo
      // lo devuelve como texto; buffer: true → lo entrega como Buffer para guardarlo en un archivo.
      const prueba = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
      const info = await prueba.sendMail(mensaje);
      const carpeta = join(process.cwd(), 'correos-de-prueba');
      await mkdir(carpeta, { recursive: true }); // recursive: no falla si ya existe
      const nombre = `${Date.now()}-${asunto.replace(/[^a-zA-Z0-9-]+/g, '_').slice(0, 60)}.eml`;
      const archivo = join(carpeta, nombre);
      await writeFile(archivo, info.message as Buffer);
      this.logger.log(`📭 (modo prueba) correo guardado en ${archivo}`);
      return { ok: true, modo: 'prueba', destinatarioReal, archivo, fecha: new Date() };
    } catch (error) {
      const texto = error instanceof Error ? error.message : String(error);
      this.logger.error(`No se pudo enviar el correo a ${destinatarioReal}: ${texto}`);
      return { ok: false, modo: this.modo, destinatarioReal, error: texto, fecha: new Date() };
    }
  }

  // plantilla(): envuelve el contenido en un diseño HTML con los colores de la marca.
  // Los correos usan estilos "en línea" (style="...") porque Gmail ignora las hojas de estilo.
  plantilla(titulo: string, cuerpo: string): string {
    return `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;border:1px solid #e8dcc8;border-radius:10px;overflow:hidden">
  <div style="background:#3b2314;color:#f3c969;padding:18px 24px">
    <div style="font-size:22px;font-weight:bold">Pepa de Oro</div>
    <div style="font-size:12px;color:#e8dcc8">Cacao &amp; Café de El Oro</div>
  </div>
  <div style="padding:24px;color:#2b2b2b;line-height:1.5">
    <h2 style="color:#3b2314;margin-top:0">${titulo}</h2>
    ${cuerpo}
  </div>
  <div style="background:#f7f1e6;padding:14px 24px;font-size:12px;color:#6b5a48">
    Pepa de Oro Agroindustrial S.A. · Km 3 vía El Guabo–Barbones, El Oro · (07) 295 0000<br>
    Documento generado por el sistema académico Pepa de Oro (datos ficticios, sin validez tributaria).
  </div>
</div>`;
  }
}
