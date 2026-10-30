// stock-vivo.ts → funciones para mantener el STOCK EN VIVO en la web pública.
// Cada 20 segundos la página pide al backend solo el stock (GET /api/publico/stock?ids=...) y actualiza
// las variantes sin volver a descargar todo el catálogo.

import { ProductoPublico, VariantePublica } from '../../compartido/Entidades/web';

export type EstadoStock = VariantePublica['estado'];

// estadoDelGrupo(): el estado de un producto según sus variantes.
// Si alguna está disponible → "Disponible"; si no, si alguna tiene pocas → "Últimas unidades"; etc.
export function estadoDelGrupo(variantes: { estado: string }[]): string {
  const estados = variantes.map((v) => v.estado);
  if (estados.includes('DISPONIBLE')) return 'DISPONIBLE';
  if (estados.includes('ULTIMAS_UNIDADES')) return 'ULTIMAS_UNIDADES';
  if (estados.length && estados.every((e) => e === 'PROXIMAMENTE')) return 'PROXIMAMENTE';
  return 'AGOTADO';
}

// aplicarStock(): devuelve una COPIA de los productos con el stock nuevo (no modifica el original,
// así los signals detectan el cambio).
export function aplicarStock(productos: ProductoPublico[], stock: { _id: string; disponible: number; estado: string }[]): ProductoPublico[] {
  // Map: diccionario id → stock para buscar rápido.
  const porId = new Map(stock.map((s) => [String(s._id), s]));
  return productos.map((p) => {
    const variantes = p.variantes.map((v) => {
      const s = porId.get(String(v._id));
      return s ? { ...v, disponible: s.disponible, estado: s.estado as EstadoStock } : v;
    });
    return { ...p, variantes, estado: estadoDelGrupo(variantes) };
  });
}

// idsDe(): todos los _id de variantes (para pedir su stock).
export function idsDe(productos: ProductoPublico[]): string[] {
  return productos.flatMap((p) => p.variantes.map((v) => String(v._id)));
}
