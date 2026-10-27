// datos.ts → DATOS FICTICIOS de Pepa de Oro: empresa, personal, haciendas, catálogo, recetas, activos,
// clientes, productores y contenido de la web. Todo es inventado (nombres, cédulas, RUC, correos).
// La "historia" (12 meses de ventas, cosechas, compras...) la genera simulacion.ts usando estos datos.

import { validarCedula, validarRuc } from '../comun/identificacion.reglas.js';

// ─────────────────────────── Generador de números aleatorios con semilla ───────────────────────────
// Math.random() da resultados distintos cada vez. Con una "semilla" fija (mulberry32) los datos
// salen SIEMPRE iguales: tu compañero y tú verán exactamente las mismas facturas.
export function crearAzar(semilla: number) {
  let a = semilla >>> 0;
  const siguiente = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    numero: siguiente, // 0 ≤ n < 1
    entero: (min: number, max: number) => Math.floor(siguiente() * (max - min + 1)) + min,
    decimal: (min: number, max: number, d = 2) => Math.round((siguiente() * (max - min) + min) * 10 ** d) / 10 ** d,
    elegir: <T>(lista: readonly T[]): T => lista[Math.floor(siguiente() * lista.length)],
    probable: (p: number) => siguiente() < p,
    // pesado(): elige según pesos ([['A', 70], ['B', 30]] → A el 70 % de las veces).
    pesado: <T>(opciones: [T, number][]): T => {
      const total = opciones.reduce((s, o) => s + o[1], 0);
      let r = siguiente() * total;
      for (const [v, p] of opciones) {
        if ((r -= p) < 0) return v;
      }
      return opciones[opciones.length - 1][0];
    },
  };
}
export type Azar = ReturnType<typeof crearAzar>;

// ─────────────────────────── Cédulas y RUC válidos (RN-02) ───────────────────────────
export function generarCedula(az: Azar, provincia = '07'): string {
  for (;;) {
    const base = provincia + String(az.entero(0, 5)) + String(az.entero(0, 999999)).padStart(6, '0');
    for (let d = 0; d <= 9; d++) if (validarCedula(base + d)) return base + d;
  }
}

export function generarRucSociedad(az: Azar, provincia = '07'): string {
  for (;;) {
    const base = provincia + '9' + String(az.entero(0, 999999)).padStart(6, '0');
    for (let d = 0; d <= 9; d++) if (validarRuc(base + d + '001')) return base + d + '001';
  }
}

export const NOMBRES = ['Luis', 'María', 'José', 'Carmen', 'Juan', 'Rosa', 'Carlos', 'Ana', 'Jorge', 'Lucía', 'Pedro', 'Elena', 'Manuel', 'Teresa', 'Ángel', 'Gloria', 'Segundo', 'Fanny', 'Víctor', 'Mercedes', 'Hugo', 'Patricia', 'Wilson', 'Narcisa', 'Byron', 'Jessica', 'Diego', 'Verónica', 'Galo', 'Mariana', 'Darwin', 'Silvia', 'Holger', 'Janeth', 'Fabián', 'Karina', 'Edison', 'Lorena', 'Klever', 'Mayra'];
export const APELLIDOS = ['Mora', 'Ramírez', 'Espinoza', 'Valarezo', 'Jaramillo', 'Loayza', 'Aguilar', 'Ordóñez', 'Cevallos', 'Maldonado', 'Romero', 'Torres', 'Ortiz', 'Zambrano', 'Sánchez', 'Vera', 'Correa', 'Granda', 'Herrera', 'Castillo', 'Encalada', 'Apolo', 'Armijos', 'Aguirre', 'Carrión', 'Ochoa', 'Pineda', 'Román', 'Tapia', 'Valencia', 'Vásquez', 'Pacheco', 'Chamba', 'Cuenca', 'Jiménez', 'Paladines', 'Quezada', 'Sarango', 'Feijóo', 'Benítez'];
export const nombreCompleto = (az: Azar) => `${az.elegir(NOMBRES)} ${az.elegir(APELLIDOS)} ${az.elegir(APELLIDOS)}`;

// Cantones de El Oro: los de la costa compran cacao; los de altura, café.
export const CANTONES_CACAO = ['El Guabo', 'Pasaje', 'Santa Rosa', 'Machala', 'Arenillas', 'Balsas', 'Marcabelí', 'Las Lajas', 'Chilla'];
export const CANTONES_CAFE = ['Zaruma', 'Piñas', 'Portovelo', 'Atahualpa'];

// ─────────────────────────── Personal (usuarios del sistema) ───────────────────────────
export const CONTRASENA_DEMO = 'PepaDeOro2026*';
export const USUARIOS = [
  { nombre: 'Ana Lucía Ramírez', correo: 'gerente@pepadeoro.ec', roles: ['GERENTE'], cargo: 'Gerente general' },
  { nombre: 'Carlos Valarezo', correo: 'agronomo@pepadeoro.ec', roles: ['AGRONOMO'], cargo: 'Ingeniero agrónomo' },
  { nombre: 'Marco Espinoza', correo: 'acopio@pepadeoro.ec', roles: ['ACOPIO'], cargo: 'Jefe de centro de acopio' },
  { nombre: 'Gabriela Ordóñez', correo: 'calidad@pepadeoro.ec', roles: ['CALIDAD'], cargo: 'Jefa de calidad' },
  { nombre: 'Jorge Aguilar', correo: 'produccion@pepadeoro.ec', roles: ['PRODUCCION'], cargo: 'Jefe de planta' },
  { nombre: 'Rosa Jaramillo', correo: 'bodega@pepadeoro.ec', roles: ['BODEGA'], cargo: 'Jefa de bodega' },
  { nombre: 'Daniela Loayza', correo: 'caja@pepadeoro.ec', roles: ['VENTAS'], cargo: 'Cajera tienda Machala' },
  { nombre: 'Andrés Cevallos', correo: 'ventas@pepadeoro.ec', roles: ['VENTAS'], cargo: 'Ejecutivo de ventas mayoristas' },
  { nombre: 'Byron Maldonado', correo: 'logistica@pepadeoro.ec', roles: ['LOGISTICA'], cargo: 'Coordinador de flota' },
  { nombre: 'Fernando Ruiz', correo: 'taller@pepadeoro.ec', roles: ['MANTENIMIENTO'], cargo: 'Jefe de taller' },
  { nombre: 'Paola Granda', correo: 'supervisora@pepadeoro.ec', roles: ['BODEGA', 'LOGISTICA'], cargo: 'Supervisora de despacho (dos roles)' },
];

// ─────────────────────────── Bodegas ───────────────────────────
export const BODEGAS = [
  { codigo: 'BOD-MP', nombre: 'Materia prima', tipo: 'MATERIA_PRIMA', ubicacion: 'Planta El Guabo', responsable: 'Rosa Jaramillo' },
  { codigo: 'BOD-IC', nombre: 'Insumos de campo', tipo: 'INSUMOS_CAMPO', ubicacion: 'Hacienda La Esperanza', responsable: 'Carlos Valarezo' },
  { codigo: 'BOD-IP', nombre: 'Insumos de planta', tipo: 'INSUMOS_PLANTA', ubicacion: 'Planta El Guabo', responsable: 'Rosa Jaramillo' },
  { codigo: 'BOD-PT', nombre: 'Producto terminado', tipo: 'PRODUCTO_TERMINADO', ubicacion: 'Planta El Guabo', responsable: 'Rosa Jaramillo' },
  { codigo: 'BOD-TDA', nombre: 'Tienda Machala', tipo: 'TIENDA', ubicacion: 'Av. 25 de Junio y Guayas', responsable: 'Daniela Loayza' },
  { codigo: 'BOD-REP', nombre: 'Repuestos', tipo: 'REPUESTOS', ubicacion: 'Taller El Guabo', responsable: 'Fernando Ruiz' },
];

// ─────────────────────────── Haciendas y parcelas ───────────────────────────
export const HACIENDAS = [
  {
    codigo: 'LE', nombre: 'La Esperanza', canton: 'El Guabo', parroquia: 'Barbones', ubicacion: { lat: -3.2389, lng: -79.8317 }, hectareasTotales: 42, hectareasCultivadas: 38, altitudMsnm: 12, fuenteAgua: 'Río Jubones (canal de riego)', responsable: 'Carlos Valarezo', cultivos: ['CACAO'],
    certificaciones: [{ tipo: 'ORGANICO', codigo: 'ORG-EC-2291', vence: '2027-03-31' }], registroAgrocalidad: 'AGR-07-001234',
    descripcion: 'La finca familiar donde empezó todo en 2011. Cacao Nacional fino de aroma bajo sombra de plátano y CCN-51 en monocultivo, a orillas del río Jubones.', imagen: 'img/haciendas/la-esperanza.svg',
  },
  {
    codigo: 'SJ', nombre: 'San Jacinto', canton: 'Pasaje', parroquia: 'Buenavista', ubicacion: { lat: -3.3270, lng: -79.8085 }, hectareasTotales: 28, hectareasCultivadas: 26, altitudMsnm: 30, fuenteAgua: 'Pozo profundo con riego por goteo', responsable: 'Carlos Valarezo', cultivos: ['CACAO'],
    certificaciones: [], registroAgrocalidad: 'AGR-07-002871',
    descripcion: 'Hacienda tecnificada de CCN-51 con riego por goteo: el cacao de alto rendimiento que alimenta la exportación.', imagen: 'img/haciendas/san-jacinto.svg',
  },
  {
    codigo: 'AZ', nombre: 'Alto Zaruma', canton: 'Zaruma', parroquia: 'Guanazán', ubicacion: { lat: -3.6912, lng: -79.6110 }, hectareasTotales: 15, hectareasCultivadas: 12, altitudMsnm: 1250, fuenteAgua: 'Vertiente de montaña', responsable: 'Carlos Valarezo', cultivos: ['CAFE'],
    certificaciones: [{ tipo: 'COMERCIO_JUSTO', codigo: 'FT-55120', vence: '2026-12-15' }], registroAgrocalidad: 'AGR-07-003310',
    descripcion: 'Café arábica de altura en las montañas de Zaruma, la tierra del mejor café del Ecuador. Cosecha manual de cereza madura.', imagen: 'img/haciendas/alto-zaruma.svg',
  },
];

// Plan de labores típico por cultivo (cada cuántos días toca cada labor).
const PLAN_CACAO = [
  { tipo: 'PODA', cadaDias: 180 },
  { tipo: 'FERTILIZACION', cadaDias: 120 },
  { tipo: 'DESHIERBE', cadaDias: 45 },
  { tipo: 'CONTROL_SANITARIO', cadaDias: 21 },
  { tipo: 'COSECHA', cadaDias: 15 },
];
const PLAN_CAFE = [
  { tipo: 'PODA', cadaDias: 365 },
  { tipo: 'FERTILIZACION', cadaDias: 120 },
  { tipo: 'DESHIERBE', cadaDias: 60 },
  { tipo: 'CONTROL_SANITARIO', cadaDias: 30 },
  { tipo: 'COSECHA', cadaDias: 10 },
];

export const PARCELAS = [
  { hacienda: 'LE', codigo: 'LE-P01', hectareas: 8, cultivo: 'CACAO', variedad: 'NACIONAL', clon: 'EET-103', anioSiembra: 2012, densidad: 900, sistema: 'SOMBRA_PLATANO', riego: 'GRAVEDAD', estado: 'PRODUCCION', planLabores: PLAN_CACAO },
  { hacienda: 'LE', codigo: 'LE-P02', hectareas: 7, cultivo: 'CACAO', variedad: 'NACIONAL', clon: 'EET-96', anioSiembra: 2014, densidad: 900, sistema: 'SOMBRA_PLATANO', riego: 'GRAVEDAD', estado: 'PRODUCCION', planLabores: PLAN_CACAO },
  { hacienda: 'LE', codigo: 'LE-P03', hectareas: 9, cultivo: 'CACAO', variedad: 'CCN51', clon: 'CCN-51', anioSiembra: 2016, densidad: 1100, sistema: 'MONOCULTIVO', riego: 'GRAVEDAD', estado: 'PRODUCCION', planLabores: PLAN_CACAO },
  { hacienda: 'LE', codigo: 'LE-P04', hectareas: 6, cultivo: 'CACAO', variedad: 'CCN51', clon: 'CCN-51', anioSiembra: 2018, densidad: 1100, sistema: 'MONOCULTIVO', riego: 'GRAVEDAD', estado: 'PRODUCCION', planLabores: PLAN_CACAO },
  { hacienda: 'LE', codigo: 'LE-P05', hectareas: 5, cultivo: 'CACAO', variedad: 'NACIONAL', clon: 'EET-103', anioSiembra: 2023, densidad: 1000, sistema: 'AGROFORESTAL', riego: 'GRAVEDAD', estado: 'DESARROLLO', planLabores: PLAN_CACAO.filter((t) => t.tipo !== 'COSECHA') },
  { hacienda: 'LE', codigo: 'LE-P06', hectareas: 3, cultivo: 'CACAO', variedad: 'NACIONAL', clon: 'Nacional criollo', anioSiembra: 1998, densidad: 700, sistema: 'SOMBRA_PLATANO', riego: 'SECANO', estado: 'RENOVACION', planLabores: [] },
  { hacienda: 'SJ', codigo: 'SJ-P01', hectareas: 8, cultivo: 'CACAO', variedad: 'CCN51', clon: 'CCN-51', anioSiembra: 2013, densidad: 1250, sistema: 'MONOCULTIVO', riego: 'GOTEO', estado: 'PRODUCCION', planLabores: PLAN_CACAO },
  { hacienda: 'SJ', codigo: 'SJ-P02', hectareas: 7, cultivo: 'CACAO', variedad: 'CCN51', clon: 'CCN-51', anioSiembra: 2015, densidad: 1250, sistema: 'MONOCULTIVO', riego: 'GOTEO', estado: 'PRODUCCION', planLabores: PLAN_CACAO },
  { hacienda: 'SJ', codigo: 'SJ-P03', hectareas: 6, cultivo: 'CACAO', variedad: 'CCN51', clon: 'CCN-51', anioSiembra: 2017, densidad: 1250, sistema: 'MONOCULTIVO', riego: 'GOTEO', estado: 'PRODUCCION', planLabores: PLAN_CACAO },
  { hacienda: 'SJ', codigo: 'SJ-P04', hectareas: 5, cultivo: 'CACAO', variedad: 'CCN51', clon: 'CCN-51', anioSiembra: 2024, densidad: 1250, sistema: 'MONOCULTIVO', riego: 'GOTEO', estado: 'DESARROLLO', planLabores: PLAN_CACAO.filter((t) => t.tipo !== 'COSECHA') },
  { hacienda: 'AZ', codigo: 'AZ-P01', hectareas: 5, cultivo: 'CAFE', variedad: 'ARABICA', clon: 'Typica', anioSiembra: 2015, densidad: 4000, sistema: 'AGROFORESTAL', riego: 'SECANO', estado: 'PRODUCCION', planLabores: PLAN_CAFE },
  { hacienda: 'AZ', codigo: 'AZ-P02', hectareas: 4, cultivo: 'CAFE', variedad: 'ARABICA', clon: 'Caturra', anioSiembra: 2018, densidad: 5000, sistema: 'AGROFORESTAL', riego: 'SECANO', estado: 'PRODUCCION', planLabores: PLAN_CAFE },
  { hacienda: 'AZ', codigo: 'AZ-P03', hectareas: 3, cultivo: 'CAFE', variedad: 'ARABICA', clon: 'Bourbon', anioSiembra: 2001, densidad: 3500, sistema: 'AGROFORESTAL', riego: 'SECANO', estado: 'RENOVACION', planLabores: [] },
];

// ─────────────────────────── Catálogo ───────────────────────────
// Ayuda para escribir menos: p(sku, nombre, base, familia, tipo, unidad, precioMenor, precioMayor, extra)
type ProductoSemilla = Record<string, unknown> & { sku: string; nombre: string; productoBase: string; familia: string; tipo: string; unidad: string; precioMenor: number; precioMayor: number };
const p = (sku: string, nombre: string, productoBase: string, familia: string, tipo: string, unidad: string, precioMenor: number, precioMayor: number, extra: Record<string, unknown> = {}): ProductoSemilla => ({
  sku,
  nombre,
  productoBase,
  familia,
  tipo,
  unidad,
  precioMenor,
  precioMayor,
  tarifaIva: 15,
  cantidadMinimaMayor: 24,
  ...extra,
});

const CACAO_ING = 'Pasta de cacao Nacional fino de aroma, azúcar de caña, manteca de cacao';
const GRANO = { tarifaIva: 0, vidaUtilDias: 365, publicado: true, stockMinimo: 500, diasReposicion: 10 };
const BARRA = { pesoNetoG: 50, vidaUtilDias: 365, publicado: true, stockMinimo: 60, diasReposicion: 5, alergenos: 'Puede contener trazas de leche y frutos secos', registroSanitario: '12345-ALN-1025' };

export const PRODUCTOS: ProductoSemilla[] = [
  // ── Cacao en grano (IVA 0 %: producto agrícola en estado natural, Art. 55 LRTI) ──
  p('CAC-NAC-PRE', 'Cacao Nacional fino de aroma · Premium · granel', 'Cacao Nacional fino de aroma', 'CACAO_GRANO', 'GRANO', 'KG', 6.6, 6.2, { ...GRANO, cultivo: 'CACAO', variedad: 'NACIONAL', grado: 'PREMIUM', presentacion: 'Saco de 69 kg', cantidadMinimaMayor: 690, sabor: 'Premium', descripcion: 'Cacao "Arriba" de nuestras haciendas y productores asociados, con notas florales y frutales. Ideal para chocolate de origen.', notasCata: ['floral', 'frutal', 'nuez'], origen: 'El Guabo y Pasaje, El Oro', imagen: 'img/productos/cacao-grano.svg', destacado: true, margenSobrePrecioDia: 15 }),
  p('CAC-NAC-EXP', 'Cacao Nacional · Exportación · granel', 'Cacao Nacional fino de aroma', 'CACAO_GRANO', 'GRANO', 'KG', 6.1, 5.8, { ...GRANO, cultivo: 'CACAO', variedad: 'NACIONAL', grado: 'EXPORTACION', presentacion: 'Saco de 69 kg', cantidadMinimaMayor: 690, sabor: 'Exportación', notasCata: ['floral', 'cacao'], origen: 'El Oro, Ecuador', imagen: 'img/productos/cacao-grano.svg', margenSobrePrecioDia: 10 }),
  p('CAC-CCN-PRE', 'Cacao CCN-51 · Premium · granel', 'Cacao CCN-51', 'CACAO_GRANO', 'GRANO', 'KG', 5.7, 5.4, { ...GRANO, cultivo: 'CACAO', variedad: 'CCN51', grado: 'PREMIUM', presentacion: 'Saco de 69 kg', cantidadMinimaMayor: 690, sabor: 'Premium', descripcion: 'Cacao clonal CCN-51 bien fermentado: sabor intenso a cacao, alto contenido de grasa. Perfecto para cobertura y polvo.', origen: 'Pasaje, El Oro', imagen: 'img/productos/cacao-grano.svg', margenSobrePrecioDia: 12 }),
  p('CAC-CCN-EXP', 'Cacao CCN-51 · Exportación · granel', 'Cacao CCN-51', 'CACAO_GRANO', 'GRANO', 'KG', 5.4, 5.1, { ...GRANO, cultivo: 'CACAO', variedad: 'CCN51', grado: 'EXPORTACION', presentacion: 'Saco de 69 kg', cantidadMinimaMayor: 690, sabor: 'Exportación', origen: 'El Oro, Ecuador', imagen: 'img/productos/cacao-grano.svg', margenSobrePrecioDia: 8 }),
  p('CAC-CCN-NAC', 'Cacao CCN-51 · Nacional · granel', 'Cacao CCN-51', 'CACAO_GRANO', 'GRANO', 'KG', 4.9, 4.7, { ...GRANO, cultivo: 'CACAO', variedad: 'CCN51', grado: 'NACIONAL', presentacion: 'Quintal', cantidadMinimaMayor: 454, sabor: 'Nacional', origen: 'El Oro, Ecuador', imagen: 'img/productos/cacao-grano.svg', margenSobrePrecioDia: 5 }),
  p('CAC-NAC-NAC', 'Cacao Nacional · Nacional · granel', 'Cacao Nacional fino de aroma', 'CACAO_GRANO', 'GRANO', 'KG', 5.2, 5.0, { ...GRANO, cultivo: 'CACAO', variedad: 'NACIONAL', grado: 'NACIONAL', presentacion: 'Quintal', cantidadMinimaMayor: 454, sabor: 'Nacional', publicado: false, imagen: 'img/productos/cacao-grano.svg' }),
  // ── Café verde (oro) ──
  p('CAF-ARA-PRE', 'Café arábica de Zaruma · verde · Especialidad', 'Café verde arábica de Zaruma', 'CAFE_GRANO', 'GRANO', 'KG', 10.5, 9.8, { ...GRANO, cultivo: 'CAFE', variedad: 'ARABICA', grado: 'PREMIUM', presentacion: 'Saco de 69 kg', cantidadMinimaMayor: 345, sabor: 'Especialidad (taza 84+)', stockMinimo: 200, descripcion: 'Café de altura (1 250 msnm), lavado, con notas de panela, cítricos y chocolate.', notasCata: ['panela', 'cítrico', 'chocolate'], origen: 'Hacienda Alto Zaruma', imagen: 'img/productos/cafe-verde.svg' }),
  p('CAF-ARA-EXP', 'Café arábica de Zaruma · verde · Exportación', 'Café verde arábica de Zaruma', 'CAFE_GRANO', 'GRANO', 'KG', 9.2, 8.7, { ...GRANO, cultivo: 'CAFE', variedad: 'ARABICA', grado: 'EXPORTACION', presentacion: 'Saco de 69 kg', cantidadMinimaMayor: 345, sabor: 'Exportación (taza 80+)', stockMinimo: 200, origen: 'Zaruma y Piñas', imagen: 'img/productos/cafe-verde.svg' }),
  p('CAF-ARA-NAC', 'Café arábica · verde · Nacional', 'Café verde arábica de Zaruma', 'CAFE_GRANO', 'GRANO', 'KG', 7.8, 7.4, { ...GRANO, cultivo: 'CAFE', variedad: 'ARABICA', grado: 'NACIONAL', publicado: false, imagen: 'img/productos/cafe-verde.svg' }),

  // ── Semielaborados internos (se usan en otras recetas; la web vende sus presentaciones) ──
  p('SEM-NIBS', 'Nibs de cacao a granel (interno)', 'Nibs a granel', 'SEMIELABORADOS', 'SEMIELABORADO', 'KG', 12, 11, { vidaUtilDias: 270, stockMinimo: 40, diasReposicion: 3 }),
  p('SEM-PASTA', 'Pasta de cacao a granel (interno)', 'Pasta a granel', 'SEMIELABORADOS', 'SEMIELABORADO', 'KG', 12, 11, { vidaUtilDias: 365, stockMinimo: 60, diasReposicion: 3 }),
  p('SEM-MANTECA', 'Manteca de cacao a granel (interno)', 'Manteca a granel', 'SEMIELABORADOS', 'SEMIELABORADO', 'KG', 20, 18, { vidaUtilDias: 540, stockMinimo: 10, diasReposicion: 4 }),
  p('SEM-COCOA', 'Cacao en polvo a granel (interno)', 'Polvo a granel', 'SEMIELABORADOS', 'SEMIELABORADO', 'KG', 10, 9, { vidaUtilDias: 540, stockMinimo: 15, diasReposicion: 4 }),
  p('SEM-CAFE', 'Café tostado a granel (interno)', 'Café tostado a granel', 'SEMIELABORADOS', 'SEMIELABORADO', 'KG', 18, 16, { vidaUtilDias: 180, stockMinimo: 15, diasReposicion: 3 }),

  // ── Chocolates (barra 50 g) ──
  p('CH55-NAT-50', 'Chocolate 55 % · Natural · barra 50 g', 'Chocolate 55 %', 'CHOCOLATES', 'TERMINADO', 'UNIDAD', 2.8, 2.3, { ...BARRA, sabor: 'Natural', presentacion: 'Barra 50 g', ingredientes: CACAO_ING, descripcion: 'Suave y cremoso, el favorito de los que empiezan en el chocolate oscuro.', notasCata: ['caramelo', 'cacao suave'], origen: 'Hacienda La Esperanza', imagen: 'img/productos/chocolate-55.svg' }),
  p('CH70-NAT-50', 'Chocolate 70 % · Natural · barra 50 g', 'Chocolate 70 %', 'CHOCOLATES', 'TERMINADO', 'UNIDAD', 3.2, 2.6, { ...BARRA, sabor: 'Natural', presentacion: 'Barra 50 g', ingredientes: CACAO_ING, descripcion: 'Nuestro clásico: cacao Nacional fino de aroma con notas florales y un final frutal.', notasCata: ['floral', 'frutos rojos', 'nuez'], origen: 'Hacienda La Esperanza, El Guabo', imagen: 'img/productos/chocolate-70.svg', destacado: true }),
  p('CH70-MAR-50', 'Chocolate 70 % · Maracuyá · barra 50 g', 'Chocolate 70 %', 'CHOCOLATES', 'TERMINADO', 'UNIDAD', 3.5, 2.85, { ...BARRA, sabor: 'Maracuyá', presentacion: 'Barra 50 g', ingredientes: `${CACAO_ING}, maracuyá deshidratada`, notasCata: ['ácido tropical', 'floral'], origen: 'Hacienda La Esperanza, El Guabo', imagen: 'img/productos/chocolate-maracuya.svg', destacado: true }),
  p('CH70-CAF-50', 'Chocolate 70 % · Café de Zaruma · barra 50 g', 'Chocolate 70 %', 'CHOCOLATES', 'TERMINADO', 'UNIDAD', 3.5, 2.85, { ...BARRA, sabor: 'Café', presentacion: 'Barra 50 g', ingredientes: `${CACAO_ING}, café arábica tostado`, notasCata: ['café', 'tostado'], imagen: 'img/productos/chocolate-cafe.svg' }),
  p('CH70-SAL-50', 'Chocolate 70 % · Sal marina · barra 50 g', 'Chocolate 70 %', 'CHOCOLATES', 'TERMINADO', 'UNIDAD', 3.5, 2.85, { ...BARRA, sabor: 'Sal marina', presentacion: 'Barra 50 g', ingredientes: `${CACAO_ING}, sal marina de Santa Elena`, imagen: 'img/productos/chocolate-sal.svg' }),
  p('CH70-NAT-C12', 'Chocolate 70 % · Natural · caja de 12 barras', 'Chocolate 70 %', 'CHOCOLATES', 'TERMINADO', 'UNIDAD', 34, 28.5, { ...BARRA, pesoNetoG: 600, cantidadMinimaMayor: 6, sabor: 'Natural', presentacion: 'Caja de 12', ingredientes: CACAO_ING, stockMinimo: 10, imagen: 'img/productos/caja-12.svg' }),
  p('CH85-NAT-50', 'Chocolate 85 % · Intenso · barra 50 g', 'Chocolate 85 %', 'CHOCOLATES', 'TERMINADO', 'UNIDAD', 3.8, 3.1, { ...BARRA, sabor: 'Natural', presentacion: 'Barra 50 g', ingredientes: CACAO_ING, descripcion: 'Para los amantes del cacao puro: intenso, poco dulce, con notas de nuez tostada.', notasCata: ['nuez tostada', 'madera'], imagen: 'img/productos/chocolate-85.svg', stockMinimo: 40 }),
  p('CHL-NAT-50', 'Chocolate con leche 40 % · barra 50 g', 'Chocolate con leche', 'CHOCOLATES', 'TERMINADO', 'UNIDAD', 2.9, 2.35, { ...BARRA, sabor: 'Natural', presentacion: 'Barra 50 g', ingredientes: 'Azúcar, pasta de cacao, leche entera en polvo, manteca de cacao', alergenos: 'Contiene leche', imagen: 'img/productos/chocolate-leche.svg' }),
  p('CHB-NAT-50', 'Chocolate blanco · barra 50 g', 'Chocolate blanco', 'CHOCOLATES', 'TERMINADO', 'UNIDAD', 2.9, 2.35, { ...BARRA, sabor: 'Natural', presentacion: 'Barra 50 g', ingredientes: 'Manteca de cacao, azúcar, leche entera en polvo', alergenos: 'Contiene leche', imagen: 'img/productos/chocolate-blanco.svg', proximamente: true }),
  // ── Bombones y coberturas ──
  p('BOM-SUR-9', 'Bombones surtidos · caja de 9', 'Bombones surtidos', 'BOMBONES', 'TERMINADO', 'UNIDAD', 9.5, 7.8, { pesoNetoG: 108, vidaUtilDias: 120, publicado: true, stockMinimo: 15, cantidadMinimaMayor: 12, presentacion: 'Caja de 9', ingredientes: 'Chocolate 70 %, maracuyá, café, nibs', alergenos: 'Puede contener leche', imagen: 'img/productos/bombones.svg', destacado: true, registroSanitario: '12346-ALN-1025' }),
  p('BOM-SUR-16', 'Bombones surtidos · caja de 16', 'Bombones surtidos', 'BOMBONES', 'TERMINADO', 'UNIDAD', 15.9, 13.2, { pesoNetoG: 192, vidaUtilDias: 120, publicado: true, stockMinimo: 10, cantidadMinimaMayor: 12, presentacion: 'Caja de 16', ingredientes: 'Chocolate 70 %, maracuyá, café, nibs', alergenos: 'Puede contener leche', imagen: 'img/productos/bombones.svg', registroSanitario: '12346-ALN-1025' }),
  p('COB-70-1K', 'Cobertura 70 % para repostería · 1 kg', 'Cobertura 70 %', 'BOMBONES', 'TERMINADO', 'UNIDAD', 14.5, 12.4, { pesoNetoG: 1000, vidaUtilDias: 365, publicado: true, stockMinimo: 20, cantidadMinimaMayor: 10, presentacion: 'Funda 1 kg', ingredientes: CACAO_ING, imagen: 'img/productos/cobertura.svg' }),
  p('COB-55-5K', 'Cobertura 55 % para repostería · 5 kg', 'Cobertura 55 %', 'BOMBONES', 'TERMINADO', 'UNIDAD', 62, 54, { pesoNetoG: 5000, vidaUtilDias: 365, publicado: true, stockMinimo: 5, cantidadMinimaMayor: 4, presentacion: 'Balde 5 kg', ingredientes: CACAO_ING, imagen: 'img/productos/cobertura.svg' }),
  // ── Semielaborados para la venta ──
  p('NIBS-250', 'Nibs de cacao · 250 g', 'Nibs de cacao', 'SEMIELABORADOS', 'TERMINADO', 'UNIDAD', 4.5, 3.7, { pesoNetoG: 250, vidaUtilDias: 270, publicado: true, stockMinimo: 25, presentacion: 'Funda 250 g', ingredientes: 'Cacao tostado y descascarillado', descripcion: 'El corazón del grano, tostado y troceado. Para granola, yogur, ensaladas y repostería.', imagen: 'img/productos/nibs.svg' }),
  p('NIBS-1K', 'Nibs de cacao · 1 kg', 'Nibs de cacao', 'SEMIELABORADOS', 'TERMINADO', 'UNIDAD', 15.5, 13, { pesoNetoG: 1000, vidaUtilDias: 270, publicado: true, stockMinimo: 10, cantidadMinimaMayor: 10, presentacion: 'Funda 1 kg', ingredientes: 'Cacao tostado y descascarillado', imagen: 'img/productos/nibs.svg' }),
  p('PASTA-1K', 'Pasta de cacao 100 % · 1 kg', 'Pasta de cacao 100 %', 'SEMIELABORADOS', 'TERMINADO', 'UNIDAD', 13.9, 11.9, { pesoNetoG: 1000, vidaUtilDias: 365, publicado: true, stockMinimo: 10, cantidadMinimaMayor: 10, presentacion: 'Bloque 1 kg', ingredientes: 'Cacao Nacional', descripcion: 'Licor de cacao puro, sin azúcar. Para chocolateros y para preparar chocolate de taza tradicional.', imagen: 'img/productos/pasta.svg' }),
  p('MANT-500', 'Manteca de cacao · 500 g', 'Manteca de cacao', 'SEMIELABORADOS', 'TERMINADO', 'UNIDAD', 12.5, 10.5, { pesoNetoG: 500, vidaUtilDias: 540, publicado: true, stockMinimo: 8, cantidadMinimaMayor: 12, presentacion: 'Funda 500 g', ingredientes: 'Manteca de cacao natural', imagen: 'img/productos/manteca.svg' }),
  p('COCOA-250', 'Cacao en polvo · 250 g', 'Cacao en polvo', 'SEMIELABORADOS', 'TERMINADO', 'UNIDAD', 4.2, 3.4, { pesoNetoG: 250, vidaUtilDias: 540, publicado: true, stockMinimo: 25, presentacion: 'Funda 250 g', ingredientes: 'Cacao en polvo natural', imagen: 'img/productos/cocoa.svg' }),
  p('COCOA-1K', 'Cacao en polvo · 1 kg', 'Cacao en polvo', 'SEMIELABORADOS', 'TERMINADO', 'UNIDAD', 14.5, 12.2, { pesoNetoG: 1000, vidaUtilDias: 540, publicado: true, stockMinimo: 10, cantidadMinimaMayor: 10, presentacion: 'Funda 1 kg', ingredientes: 'Cacao en polvo natural', imagen: 'img/productos/cocoa.svg' }),
  // ── Café tostado ──
  p('CAF-MED-G250', 'Café de Zaruma · tueste medio · grano 250 g', 'Café arábica de Zaruma', 'CAFE', 'TERMINADO', 'UNIDAD', 6.5, 5.3, { pesoNetoG: 250, vidaUtilDias: 270, publicado: true, stockMinimo: 25, sabor: 'Tueste medio · grano', presentacion: 'Funda 250 g', ingredientes: 'Café arábica 100 %', descripcion: 'Café de altura de nuestra hacienda Alto Zaruma, tostado en la planta cada semana.', notasCata: ['panela', 'cítrico', 'chocolate'], origen: 'Hacienda Alto Zaruma', imagen: 'img/productos/cafe.svg', destacado: true }),
  p('CAF-MED-M250', 'Café de Zaruma · tueste medio · molido 250 g', 'Café arábica de Zaruma', 'CAFE', 'TERMINADO', 'UNIDAD', 6.5, 5.3, { pesoNetoG: 250, vidaUtilDias: 180, publicado: true, stockMinimo: 30, sabor: 'Tueste medio · molido', presentacion: 'Funda 250 g', ingredientes: 'Café arábica 100 %', origen: 'Hacienda Alto Zaruma', imagen: 'img/productos/cafe.svg' }),
  p('CAF-OSC-M500', 'Café de Zaruma · tueste oscuro · molido 500 g', 'Café arábica de Zaruma', 'CAFE', 'TERMINADO', 'UNIDAD', 11.9, 9.8, { pesoNetoG: 500, vidaUtilDias: 180, publicado: true, stockMinimo: 15, sabor: 'Tueste oscuro · molido', presentacion: 'Funda 500 g', ingredientes: 'Café arábica 100 %', imagen: 'img/productos/cafe.svg' }),
  p('CAF-MED-G1K', 'Café de Zaruma · tueste medio · grano 1 kg', 'Café arábica de Zaruma', 'CAFE', 'TERMINADO', 'UNIDAD', 21.5, 18, { pesoNetoG: 1000, vidaUtilDias: 270, publicado: true, stockMinimo: 8, cantidadMinimaMayor: 10, sabor: 'Tueste medio · grano', presentacion: 'Funda 1 kg', ingredientes: 'Café arábica 100 %', imagen: 'img/productos/cafe.svg' }),
  // ── Café y cacao, bebidas ──
  p('MOC-400', 'Mocca instantáneo cacao + café · 400 g', 'Mocca cacao y café', 'CAFE_CACAO', 'TERMINADO', 'UNIDAD', 8.9, 7.3, { pesoNetoG: 400, vidaUtilDias: 365, publicado: true, stockMinimo: 15, presentacion: 'Tarro 400 g', ingredientes: 'Azúcar, café tostado, cacao en polvo, leche en polvo', alergenos: 'Contiene leche', descripcion: 'Lo mejor de El Oro en una taza: café de Zaruma y cacao de El Guabo.', imagen: 'img/productos/mocca.svg' }),
  p('CHT-400', 'Chocolate para taza · 400 g', 'Chocolate para taza', 'BEBIDAS', 'TERMINADO', 'UNIDAD', 6.9, 5.6, { pesoNetoG: 400, vidaUtilDias: 365, publicado: true, stockMinimo: 15, presentacion: 'Funda 400 g', ingredientes: 'Azúcar, pasta de cacao, cacao en polvo, canela', imagen: 'img/productos/chocolate-taza.svg' }),
  p('CHT-1K', 'Chocolate para taza · 1 kg', 'Chocolate para taza', 'BEBIDAS', 'TERMINADO', 'UNIDAD', 15.5, 12.9, { pesoNetoG: 1000, vidaUtilDias: 365, publicado: true, stockMinimo: 8, cantidadMinimaMayor: 10, presentacion: 'Funda 1 kg', ingredientes: 'Azúcar, pasta de cacao, cacao en polvo, canela', imagen: 'img/productos/chocolate-taza.svg' }),

  // ── Insumos de planta (IVA 15 %; no se publican) ──
  ...[
    ['INS-AZUCAR', 'Azúcar de caña', 'KG', 1.1, 200],
    ['INS-LECHE', 'Leche entera en polvo', 'KG', 6.5, 30],
    ['INS-MARACUYA', 'Maracuyá deshidratada', 'KG', 14, 5],
    ['INS-SAL', 'Sal marina en escamas', 'KG', 4, 2],
    ['INS-CANELA', 'Canela molida', 'KG', 9, 2],
    ['INS-ENVOLTURA', 'Envoltura para barra 50 g', 'UNIDAD', 0.08, 1500],
    ['INS-ETIQUETA', 'Etiqueta impresa con QR', 'UNIDAD', 0.05, 2000],
    ['INS-CAJA12', 'Caja para 12 barras', 'UNIDAD', 0.9, 40],
    ['INS-CAJABOM9', 'Caja de bombones x9', 'UNIDAD', 0.85, 60],
    ['INS-CAJABOM16', 'Caja de bombones x16', 'UNIDAD', 1.1, 40],
    ['INS-FUNDA250', 'Funda trilaminada 250 g con válvula', 'UNIDAD', 0.22, 500],
    ['INS-FUNDA500', 'Funda trilaminada 500 g', 'UNIDAD', 0.28, 300],
    ['INS-FUNDA1K', 'Funda trilaminada 1 kg', 'UNIDAD', 0.35, 300],
    ['INS-TARRO400', 'Tarro de 400 g', 'UNIDAD', 0.6, 150],
    ['INS-BALDE5K', 'Balde de 5 kg', 'UNIDAD', 1.2, 20],
    ['INS-SACO69', 'Saco de yute de 69 kg', 'UNIDAD', 1.8, 150],
  ].map(([sku, nombre, unidad, costo, minimo]) => p(sku as string, nombre as string, nombre as string, 'INSUMOS_PLANTA', 'INSUMO', unidad as string, costo as number, costo as number, { stockMinimo: minimo, costoReferencia: costo, diasReposicion: 7 })),
  // ── Insumos de campo ──
  ...[
    ['CAM-NPK', 'Fertilizante NPK 10-30-10', 'KG', 0.95, 300, 0],
    ['CAM-UREA', 'Urea 46 %', 'KG', 0.8, 200, 0],
    ['CAM-ORGANICO', 'Abono orgánico compostado', 'KG', 0.25, 500, 0],
    ['CAM-CUPRICO', 'Fungicida cúprico', 'KG', 12, 15, 14],
    ['CAM-INSECTICIDA', 'Insecticida biológico', 'LITRO', 18, 8, 21],
    ['CAM-HERBICIDA', 'Herbicida de contacto', 'LITRO', 9, 10, 7],
  ].map(([sku, nombre, unidad, costo, minimo, carencia]) => p(sku as string, nombre as string, nombre as string, 'INSUMOS_CAMPO', 'INSUMO', unidad as string, costo as number, costo as number, { stockMinimo: minimo, costoReferencia: costo, diasCarencia: carencia, tarifaIva: 0 })),
  // ── Repuestos ──
  ...[
    ['REP-FILTRO-ACEITE', 'Filtro de aceite', 'UNIDAD', 9.5, 6],
    ['REP-FILTRO-AIRE', 'Filtro de aire', 'UNIDAD', 18, 4],
    ['REP-ACEITE', 'Aceite 15W-40', 'GALON', 22, 10],
    ['REP-BANDA', 'Banda de transmisión', 'UNIDAD', 15, 4],
    ['REP-RODAMIENTO', 'Rodamiento 6205', 'UNIDAD', 6.5, 8],
    ['REP-FRENOS', 'Juego de pastillas de freno', 'UNIDAD', 45, 2],
    ['REP-GRASA', 'Grasa multipropósito', 'KG', 7, 5],
    ['REP-RESISTENCIA', 'Resistencia de secadora', 'UNIDAD', 38, 2],
  ].map(([sku, nombre, unidad, costo, minimo]) => p(sku as string, nombre as string, nombre as string, 'REPUESTOS', 'REPUESTO', unidad as string, costo as number, costo as number, { stockMinimo: minimo, costoReferencia: costo, diasReposicion: 10 })),
];

// ─────────────────────────── Recetas (lista de materiales) ───────────────────────────
// [productoQueSale, cantidadBase, [[sku, cantidad], ...], horasMaquina, horasManoObra, tipoMaquina, pasos]
type RecetaSemilla = [string, number, [string, number][], number, number, string, string[]];
const BARRA_70: [string, number][] = [['SEM-PASTA', 3.4], ['INS-AZUCAR', 1.5], ['SEM-MANTECA', 0.1], ['INS-ENVOLTURA', 100], ['INS-ETIQUETA', 100]];
export const RECETAS: RecetaSemilla[] = [
  ['SEM-NIBS', 80, [['CAC-NAC-EXP', 100]], 2.5, 3, 'TOSTADORA', ['Limpieza y clasificación del grano', 'Tostado a 120 °C por 25 min', 'Descascarillado y aventado']],
  ['SEM-PASTA', 100, [['SEM-NIBS', 102]], 4, 4, 'MOLINO', ['Molienda fina en molino de bolas', 'Control de finura (< 25 micras)']],
  ['SEM-MANTECA', 45, [['SEM-PASTA', 100]], 3, 3, 'PRENSA', ['Prensado hidráulico a 400 bar', 'Filtrado de la manteca']],
  ['SEM-COCOA', 50, [['SEM-PASTA', 100]], 3, 3, 'PRENSA', ['Prensado', 'Pulverizado de la torta', 'Tamizado']],
  ['SEM-CAFE', 100, [['CAF-ARA-EXP', 120]], 3, 3, 'TOSTADORA', ['Tostado medio u oscuro', 'Enfriado', 'Reposo 24 h']],
  ['CH70-NAT-50', 100, BARRA_70, 1.5, 3, 'CONCHADORA', ['Conchado 12 h', 'Templado a 31 °C', 'Moldeado y enfriado', 'Empaque y etiquetado']],
  ['CH70-MAR-50', 100, [['SEM-PASTA', 3.3], ['INS-AZUCAR', 1.45], ['SEM-MANTECA', 0.1], ['INS-MARACUYA', 0.15], ['INS-ENVOLTURA', 100], ['INS-ETIQUETA', 100]], 1.5, 3, 'CONCHADORA', ['Conchado', 'Inclusión de maracuyá', 'Templado', 'Moldeado', 'Empaque']],
  ['CH70-CAF-50', 100, [['SEM-PASTA', 3.3], ['INS-AZUCAR', 1.45], ['SEM-MANTECA', 0.1], ['SEM-CAFE', 0.15], ['INS-ENVOLTURA', 100], ['INS-ETIQUETA', 100]], 1.5, 3, 'CONCHADORA', ['Conchado', 'Inclusión de café molido', 'Templado', 'Moldeado', 'Empaque']],
  ['CH70-SAL-50', 100, [['SEM-PASTA', 3.4], ['INS-AZUCAR', 1.45], ['SEM-MANTECA', 0.1], ['INS-SAL', 0.05], ['INS-ENVOLTURA', 100], ['INS-ETIQUETA', 100]], 1.5, 3, 'CONCHADORA', ['Conchado', 'Templado', 'Moldeado con sal en escamas', 'Empaque']],
  ['CH55-NAT-50', 100, [['SEM-PASTA', 2.6], ['INS-AZUCAR', 2.2], ['SEM-MANTECA', 0.2], ['INS-ENVOLTURA', 100], ['INS-ETIQUETA', 100]], 1.5, 3, 'CONCHADORA', ['Conchado', 'Templado', 'Moldeado', 'Empaque']],
  ['CH85-NAT-50', 100, [['SEM-PASTA', 4.1], ['INS-AZUCAR', 0.75], ['SEM-MANTECA', 0.15], ['INS-ENVOLTURA', 100], ['INS-ETIQUETA', 100]], 1.5, 3, 'CONCHADORA', ['Conchado', 'Templado', 'Moldeado', 'Empaque']],
  ['CHL-NAT-50', 100, [['SEM-PASTA', 1.8], ['INS-AZUCAR', 1.9], ['INS-LECHE', 1.1], ['SEM-MANTECA', 0.2], ['INS-ENVOLTURA', 100], ['INS-ETIQUETA', 100]], 1.8, 3, 'CONCHADORA', ['Conchado con leche', 'Templado a 29 °C', 'Moldeado', 'Empaque']],
  ['CHB-NAT-50', 100, [['SEM-MANTECA', 1.6], ['INS-AZUCAR', 2.0], ['INS-LECHE', 1.4], ['INS-ENVOLTURA', 100], ['INS-ETIQUETA', 100]], 1.8, 3, 'CONCHADORA', ['Conchado', 'Templado a 28 °C', 'Moldeado', 'Empaque']],
  ['CH70-NAT-C12', 10, [['CH70-NAT-50', 120], ['INS-CAJA12', 10]], 0.2, 0.5, 'EMPACADORA', ['Armado de cajas de 12 barras']],
  ['BOM-SUR-9', 10, [['SEM-PASTA', 0.6], ['INS-AZUCAR', 0.35], ['SEM-MANTECA', 0.1], ['INS-MARACUYA', 0.05], ['INS-CAJABOM9', 10]], 0.5, 2.5, 'TEMPLADORA', ['Templado', 'Moldeado de bombones', 'Relleno', 'Empaque']],
  ['BOM-SUR-16', 10, [['SEM-PASTA', 1.05], ['INS-AZUCAR', 0.6], ['SEM-MANTECA', 0.18], ['INS-MARACUYA', 0.09], ['INS-CAJABOM16', 10]], 0.8, 4, 'TEMPLADORA', ['Templado', 'Moldeado de bombones', 'Relleno', 'Empaque']],
  ['COB-70-1K', 50, [['SEM-PASTA', 35], ['INS-AZUCAR', 14.5], ['SEM-MANTECA', 1], ['INS-FUNDA1K', 50]], 2, 3, 'CONCHADORA', ['Conchado', 'Templado', 'Moldeado en botones', 'Empaque 1 kg']],
  ['COB-55-5K', 10, [['SEM-PASTA', 27], ['INS-AZUCAR', 22], ['SEM-MANTECA', 1.5], ['INS-BALDE5K', 10]], 2, 3, 'CONCHADORA', ['Conchado', 'Templado', 'Moldeado en botones', 'Empaque 5 kg']],
  ['NIBS-250', 100, [['SEM-NIBS', 25], ['INS-FUNDA250', 100], ['INS-ETIQUETA', 100]], 0.5, 1.5, 'EMPACADORA', ['Pesaje', 'Sellado de fundas']],
  ['NIBS-1K', 50, [['SEM-NIBS', 50], ['INS-FUNDA1K', 50], ['INS-ETIQUETA', 50]], 0.4, 1, 'EMPACADORA', ['Pesaje', 'Sellado de fundas']],
  ['PASTA-1K', 50, [['SEM-PASTA', 50], ['INS-FUNDA1K', 50], ['INS-ETIQUETA', 50]], 0.5, 1, 'EMPACADORA', ['Moldeado en bloques', 'Empaque']],
  ['MANT-500', 50, [['SEM-MANTECA', 25], ['INS-FUNDA500', 50], ['INS-ETIQUETA', 50]], 0.3, 1, 'EMPACADORA', ['Moldeado', 'Empaque']],
  ['COCOA-250', 100, [['SEM-COCOA', 25], ['INS-FUNDA250', 100], ['INS-ETIQUETA', 100]], 0.5, 1.5, 'EMPACADORA', ['Pesaje', 'Sellado']],
  ['COCOA-1K', 50, [['SEM-COCOA', 50], ['INS-FUNDA1K', 50], ['INS-ETIQUETA', 50]], 0.4, 1, 'EMPACADORA', ['Pesaje', 'Sellado']],
  ['CAF-MED-G250', 100, [['SEM-CAFE', 25], ['INS-FUNDA250', 100], ['INS-ETIQUETA', 100]], 0.5, 1.5, 'EMPACADORA', ['Pesaje', 'Sellado con válvula']],
  ['CAF-MED-M250', 100, [['SEM-CAFE', 25], ['INS-FUNDA250', 100], ['INS-ETIQUETA', 100]], 0.8, 1.5, 'MOLINO', ['Molienda media', 'Pesaje', 'Sellado']],
  ['CAF-OSC-M500', 100, [['SEM-CAFE', 50], ['INS-FUNDA500', 100], ['INS-ETIQUETA', 100]], 1, 2, 'MOLINO', ['Molienda', 'Pesaje', 'Sellado']],
  ['CAF-MED-G1K', 50, [['SEM-CAFE', 50], ['INS-FUNDA1K', 50], ['INS-ETIQUETA', 50]], 0.4, 1, 'EMPACADORA', ['Pesaje', 'Sellado']],
  ['MOC-400', 100, [['SEM-CAFE', 14], ['SEM-COCOA', 10], ['INS-AZUCAR', 12], ['INS-LECHE', 4], ['INS-TARRO400', 100], ['INS-ETIQUETA', 100]], 1, 2, 'MOLINO', ['Mezclado', 'Envasado en tarro']],
  ['CHT-400', 100, [['SEM-PASTA', 14], ['INS-AZUCAR', 22], ['SEM-COCOA', 4], ['INS-CANELA', 0.3], ['INS-FUNDA500', 100], ['INS-ETIQUETA', 100]], 1, 2, 'MOLINO', ['Mezclado', 'Molienda', 'Envasado']],
  ['CHT-1K', 50, [['SEM-PASTA', 17.5], ['INS-AZUCAR', 27.5], ['SEM-COCOA', 5], ['INS-CANELA', 0.4], ['INS-FUNDA1K', 50], ['INS-ETIQUETA', 50]], 1, 2, 'MOLINO', ['Mezclado', 'Molienda', 'Envasado']],
];

// ─────────────────────────── Activos (maquinaria y vehículos) ───────────────────────────
const preventivoMaquina = (tarea: string, cadaDias: number, cadaUso: number) => ({ tarea, cadaDias, cadaUso });
export const ACTIVOS: Record<string, unknown>[] = [
  // Poscosecha
  // 10 cajones: en temporada alta (junio–agosto) llegan más de 2 t diarias de cacao en baba y cada tanda fermenta 4–7 días.
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ codigo: `F-${String(n).padStart(2, '0')}`, nombre: `Fermentador de madera ${n}`, tipo: 'FERMENTADOR', capacidad: n === 5 || n === 6 ? '600 kg en baba' : '1 000 kg en baba', capacidadKg: n === 5 || n === 6 ? 600 : 1000, usos: ['USO_INTERNO'], valorCompra: 450, valorActual: 300, ubicacion: 'Planta El Guabo' })),
  ...[1, 2, 3, 4].map((n) => ({ codigo: `T-0${n}`, nombre: `Tendal de cemento ${n}`, tipo: 'TENDAL', capacidad: '3 000 kg', capacidadKg: 3000, usos: ['USO_INTERNO'], valorCompra: 2500, valorActual: 2000, ubicacion: 'Planta El Guabo' })),
  { codigo: 'SEC-01', nombre: 'Secadora estática de gas', tipo: 'SECADORA', marca: 'Agroindustrial Andina', modelo: 'SE-2000', anio: 2020, capacidad: '2 000 kg por tanda', capacidadKg: 2000, usos: ['USO_INTERNO'], valorCompra: 14000, valorActual: 9800, costoHora: 4.5, horometro: 3200, planMantenimiento: [preventivoMaquina('Limpieza de quemador y revisión de resistencias', 90, 400)], ubicacion: 'Planta El Guabo' },
  // Planta
  { codigo: 'TOS-01', nombre: 'Tostadora de cacao 120 kg/h', tipo: 'TOSTADORA', marca: 'Cacaotec', modelo: 'TR-120', anio: 2021, capacidad: '120 kg/h', usos: ['USO_INTERNO'], valorCompra: 18500, valorActual: 14000, costoHora: 6, horometro: 1850, planMantenimiento: [preventivoMaquina('Limpieza de tambor y cambio de banda', 60, 250)] },
  { codigo: 'TOS-02', nombre: 'Tostadora de café 15 kg', tipo: 'TOSTADORA', marca: 'Toper', modelo: 'TKM-15', anio: 2022, capacidad: '15 kg por tanda', usos: ['USO_INTERNO'], valorCompra: 9800, valorActual: 8200, costoHora: 4, horometro: 980, planMantenimiento: [preventivoMaquina('Limpieza de ciclón y quemador', 60, 200)] },
  { codigo: 'DES-01', nombre: 'Descascarilladora y aventadora', tipo: 'DESCASCARILLADORA', marca: 'Cacaotec', modelo: 'DV-200', anio: 2021, capacidad: '200 kg/h', usos: ['USO_INTERNO'], valorCompra: 7600, valorActual: 5900, costoHora: 3, horometro: 1500, planMantenimiento: [preventivoMaquina('Revisión de rodamientos y engrase', 90, 300)] },
  { codigo: 'MOL-01', nombre: 'Molino de bolas para pasta', tipo: 'MOLINO', marca: 'Chocolatec', modelo: 'MB-50', anio: 2022, capacidad: '50 kg/h', usos: ['USO_INTERNO'], valorCompra: 22000, valorActual: 18500, costoHora: 7, horometro: 2100, planMantenimiento: [preventivoMaquina('Cambio de aceite del reductor', 120, 500)] },
  { codigo: 'PRE-01', nombre: 'Prensa hidráulica de manteca', tipo: 'PRENSA', marca: 'Chocolatec', modelo: 'PH-30', anio: 2022, capacidad: '30 kg por ciclo', usos: ['USO_INTERNO'], valorCompra: 16000, valorActual: 13200, costoHora: 5.5, horometro: 900, planMantenimiento: [preventivoMaquina('Revisión de sellos y aceite hidráulico', 120, 300)] },
  { codigo: 'CON-01', nombre: 'Conchadora-refinadora 200 kg', tipo: 'CONCHADORA', marca: 'Chocolatec', modelo: 'CR-200', anio: 2023, capacidad: '200 kg por tanda', usos: ['USO_INTERNO'], valorCompra: 26000, valorActual: 23000, costoHora: 6.5, horometro: 1600, planMantenimiento: [preventivoMaquina('Ajuste de rodillos y lubricación', 90, 400)] },
  { codigo: 'TEM-01', nombre: 'Templadora continua', tipo: 'TEMPLADORA', marca: 'Selmi', modelo: 'Plus EX', anio: 2023, capacidad: '25 kg/h', usos: ['USO_INTERNO'], valorCompra: 15000, valorActual: 13500, costoHora: 4, horometro: 1200, planMantenimiento: [preventivoMaquina('Calibración de temperatura', 90, 500)] },
  { codigo: 'EMP-01', nombre: 'Selladora y empacadora', tipo: 'EMPACADORA', marca: 'Hualian', modelo: 'FR-900', anio: 2021, capacidad: '600 fundas/h', usos: ['USO_INTERNO'], valorCompra: 3500, valorActual: 2400, costoHora: 1.5, horometro: 2400, planMantenimiento: [preventivoMaquina('Cambio de teflón y resistencia', 90, 600)] },
  { codigo: 'BAL-01', nombre: 'Balanza de plataforma 1 t', tipo: 'BALANZA', marca: 'Toledo', modelo: 'PL-1000', anio: 2019, capacidad: '1 000 kg', usos: ['USO_INTERNO'], valorCompra: 1800, valorActual: 900, planMantenimiento: [preventivoMaquina('Calibración certificada', 180, 0)] },
  // Flota
  { codigo: 'CAM-01', nombre: 'Camión Hino 500', tipo: 'CAMION', marca: 'Hino', modelo: '500 FC', anio: 2019, placa: 'OAB-1234', capacidad: '8 toneladas', capacidadKg: 8000, usos: ['USO_INTERNO'], valorCompra: 68000, valorActual: 48000, costoHora: 12, odometro: 142000, documentos: [{ tipo: 'MATRICULA', numero: 'MAT-OAB1234', vence: '2027-02-28' }, { tipo: 'SOAT', numero: 'SOAT-889120', vence: '2026-11-05' }, { tipo: 'REVISION_TECNICA', vence: '2027-01-15' }], planMantenimiento: [preventivoMaquina('Cambio de aceite y filtros', 90, 10000), preventivoMaquina('Revisión de frenos', 180, 30000)] },
  { codigo: 'CAM-02', nombre: 'Camión Isuzu NPR', tipo: 'CAMION', marca: 'Isuzu', modelo: 'NPR 816', anio: 2021, placa: 'OAC-5678', capacidad: '5 toneladas', capacidadKg: 5000, usos: ['USO_INTERNO'], valorCompra: 52000, valorActual: 41000, costoHora: 10, odometro: 88000, documentos: [{ tipo: 'MATRICULA', numero: 'MAT-OAC5678', vence: '2027-05-31' }, { tipo: 'SOAT', numero: 'SOAT-889121', vence: '2027-03-20' }, { tipo: 'REVISION_TECNICA', vence: '2026-12-10' }], planMantenimiento: [preventivoMaquina('Cambio de aceite y filtros', 90, 10000), preventivoMaquina('Revisión de frenos', 180, 30000)] },
  { codigo: 'CAM-03', nombre: 'Camión Hino 300', tipo: 'CAMION', marca: 'Hino', modelo: '300 Dutro', anio: 2017, placa: 'OAA-9012', capacidad: '3,5 toneladas', capacidadKg: 3500, usos: ['USO_INTERNO'], valorCompra: 42000, valorActual: 24000, costoHora: 9, odometro: 210000, documentos: [{ tipo: 'MATRICULA', numero: 'MAT-OAA9012', vence: '2027-01-31' }, { tipo: 'SOAT', numero: 'SOAT-889122', vence: '2027-01-10' }, { tipo: 'REVISION_TECNICA', vence: '2027-02-20' }], planMantenimiento: [preventivoMaquina('Cambio de aceite y filtros', 90, 10000), preventivoMaquina('Revisión de frenos', 180, 30000)] },
  { codigo: 'FUR-01', nombre: 'Furgón refrigerado', tipo: 'FURGON', marca: 'JAC', modelo: 'X200', anio: 2022, placa: 'OAD-3456', capacidad: '2 toneladas, 15 °C', capacidadKg: 2000, usos: ['USO_INTERNO'], valorCompra: 38000, valorActual: 31000, costoHora: 8, odometro: 54000, documentos: [{ tipo: 'MATRICULA', numero: 'MAT-OAD3456', vence: '2027-04-30' }, { tipo: 'SOAT', numero: 'SOAT-889123', vence: '2027-04-01' }, { tipo: 'REVISION_TECNICA', vence: '2027-03-15' }], planMantenimiento: [preventivoMaquina('Cambio de aceite y filtros', 90, 10000), preventivoMaquina('Revisión del equipo de frío', 120, 15000)] },
  { codigo: 'MON-01', nombre: 'Montacargas eléctrico', tipo: 'MONTACARGAS', marca: 'Toyota', modelo: '8FBE15', anio: 2020, capacidad: '1,5 toneladas', usos: ['USO_INTERNO'], valorCompra: 21000, valorActual: 15000, costoHora: 3, horometro: 4100, planMantenimiento: [preventivoMaquina('Revisión de baterías y frenos', 90, 300)] },
  // Alquiler
  { codigo: 'MAQ-001', nombre: 'Tractor Kubota M7040', tipo: 'TRACTOR', marca: 'Kubota', modelo: 'M7040', anio: 2020, serie: 'KBT-70-55123', capacidad: '70 hp, doble tracción', usos: ['ALQUILER', 'USO_INTERNO'], valorCompra: 39000, valorActual: 30000, tarifas: { hora: 25, dia: 160, semana: 950 }, tarifaOperadorDia: 30, garantia: 400, costoHora: 14, horometro: 3600, publicado: true, imagen: 'img/equipos/tractor.svg', descripcion: 'Tractor de 70 hp ideal para rastrar, surcar y transportar en fincas de cacao y banano.', fichaTecnica: [{ etiqueta: 'Potencia', valor: '70 hp' }, { etiqueta: 'Tracción', valor: '4×4' }, { etiqueta: 'Implementos', valor: 'Rastra, arado y carreta (consultar)' }], planMantenimiento: [preventivoMaquina('Cambio de aceite y filtros', 90, 250), preventivoMaquina('Revisión de hidráulico', 180, 500)] },
  { codigo: 'MAQ-002', nombre: 'Tractor John Deere 5075E', tipo: 'TRACTOR', marca: 'John Deere', modelo: '5075E', anio: 2022, serie: 'JD-5075-88341', capacidad: '75 hp', usos: ['ALQUILER'], valorCompra: 52000, valorActual: 45000, tarifas: { hora: 28, dia: 180, semana: 1080 }, tarifaOperadorDia: 30, garantia: 500, costoHora: 15, horometro: 1450, publicado: true, imagen: 'img/equipos/tractor.svg', descripcion: 'Tractor moderno con cabina, perfecto para preparación de suelo y labores pesadas.', fichaTecnica: [{ etiqueta: 'Potencia', valor: '75 hp' }, { etiqueta: 'Cabina', valor: 'Sí, con aire acondicionado' }], planMantenimiento: [preventivoMaquina('Cambio de aceite y filtros', 90, 250)] },
  { codigo: 'MAQ-003', nombre: 'Motocultor Honda', tipo: 'MOTOCULTOR', marca: 'Honda', modelo: 'F560', anio: 2023, capacidad: '5,5 hp', usos: ['ALQUILER'], valorCompra: 2400, valorActual: 2000, tarifas: { dia: 35, semana: 200 }, garantia: 80, costoHora: 2, horometro: 420, publicado: true, imagen: 'img/equipos/motocultor.svg', descripcion: 'Liviano y fácil de usar entre las calles del cacaotal.', planMantenimiento: [preventivoMaquina('Cambio de aceite', 90, 100)] },
  { codigo: 'MAQ-004', nombre: 'Fumigadora a motor Stihl', tipo: 'FUMIGADORA', marca: 'Stihl', modelo: 'SR 450', anio: 2023, capacidad: 'Tanque 14 L', usos: ['ALQUILER', 'USO_INTERNO'], valorCompra: 750, valorActual: 600, tarifas: { dia: 15, semana: 80 }, garantia: 50, costoHora: 1, horometro: 380, publicado: true, imagen: 'img/equipos/fumigadora.svg', descripcion: 'Atomizador de mochila para control fitosanitario.', planMantenimiento: [preventivoMaquina('Limpieza de carburador', 60, 80)] },
  { codigo: 'MAQ-005', nombre: 'Despulpadora de café', tipo: 'DESPULPADORA', marca: 'Penagos', modelo: 'DH-1000', anio: 2021, capacidad: '1 000 kg de cereza/h', usos: ['ALQUILER'], valorCompra: 3200, valorActual: 2400, tarifas: { dia: 40, semana: 220, temporada: 900 }, garantia: 150, costoHora: 2, horometro: 700, publicado: true, imagen: 'img/equipos/despulpadora.svg', descripcion: 'Despulpadora de cilindro para beneficio húmedo de café.', planMantenimiento: [preventivoMaquina('Ajuste de pechero y engrase', 120, 200)] },
  { codigo: 'MAQ-006', nombre: 'Secadora móvil de cacao 1 t', tipo: 'SECADORA', marca: 'Agroindustrial Andina', modelo: 'SM-1000', anio: 2022, capacidad: '1 000 kg por tanda', capacidadKg: 1000, usos: ['ALQUILER'], valorCompra: 8900, valorActual: 7400, tarifas: { dia: 70, semana: 420 }, garantia: 300, costoHora: 4, horometro: 1100, publicado: true, imagen: 'img/equipos/secadora.svg', descripcion: 'Secadora a gas montada sobre remolque: la llevamos a tu finca.', planMantenimiento: [preventivoMaquina('Revisión de quemador', 90, 300)] },
  { codigo: 'MAQ-007', nombre: 'Generador eléctrico 10 kVA', tipo: 'GENERADOR', marca: 'Honda', modelo: 'EP10000', anio: 2021, capacidad: '10 kVA', usos: ['ALQUILER', 'USO_INTERNO'], valorCompra: 4200, valorActual: 3000, tarifas: { dia: 45, semana: 260 }, garantia: 150, costoHora: 3, horometro: 1900, publicado: true, imagen: 'img/equipos/generador.svg', planMantenimiento: [preventivoMaquina('Cambio de aceite y bujía', 90, 200)] },
  // Venta
  { codigo: 'MAQ-010', nombre: 'Tractor Massey Ferguson 4275 (usado)', tipo: 'TRACTOR', marca: 'Massey Ferguson', modelo: '4275', anio: 2014, capacidad: '75 hp', usos: ['VENTA'], valorCompra: 34000, valorActual: 16500, precioVenta: 19900, horometro: 6200, publicado: true, imagen: 'img/equipos/tractor.svg', descripcion: 'Tractor propio, mantenimiento al día en nuestro taller, llantas al 70 %.', fichaTecnica: [{ etiqueta: 'Horas', valor: '6 200' }, { etiqueta: 'Garantía', valor: '3 meses en motor' }] },
  { codigo: 'MAQ-011', nombre: 'Despulpadora de café nueva', tipo: 'DESPULPADORA', marca: 'Penagos', modelo: 'DH-500', anio: 2026, capacidad: '500 kg de cereza/h', usos: ['VENTA'], nuevo: true, valorCompra: 1900, valorActual: 1900, precioVenta: 2490, publicado: true, imagen: 'img/equipos/despulpadora.svg', descripcion: 'Nueva, con garantía de fábrica de 1 año.' },
  { codigo: 'MAQ-012', nombre: 'Secadora de cacao a gas 500 kg (nueva)', tipo: 'SECADORA', marca: 'Agroindustrial Andina', modelo: 'SE-500', anio: 2026, capacidad: '500 kg por tanda', capacidadKg: 500, usos: ['VENTA'], nuevo: true, valorCompra: 4800, valorActual: 4800, precioVenta: 6200, publicado: true, imagen: 'img/equipos/secadora.svg', descripcion: 'Seca en 24 h lo que el tendal en 5 días. Incluye instalación.' },
  { codigo: 'MAQ-013', nombre: 'Motocultor Honda F560 (nuevo)', tipo: 'MOTOCULTOR', marca: 'Honda', modelo: 'F560', anio: 2026, capacidad: '5,5 hp', usos: ['VENTA'], nuevo: true, valorCompra: 2200, valorActual: 2200, precioVenta: 2850, publicado: true, imagen: 'img/equipos/motocultor.svg' },
  { codigo: 'CAM-09', nombre: 'Camión Chevrolet NKR (usado)', tipo: 'CAMION', marca: 'Chevrolet', modelo: 'NKR', anio: 2015, placa: 'OAZ-7788', capacidad: '3 toneladas', capacidadKg: 3000, usos: ['VENTA'], valorCompra: 36000, valorActual: 17000, precioVenta: 21500, odometro: 265000, publicado: true, imagen: 'img/equipos/camion.svg', descripcion: 'Camión de la flota, motor reparado en 2025, papeles al día.', documentos: [{ tipo: 'MATRICULA', vence: '2027-06-30' }, { tipo: 'SOAT', vence: '2027-02-10' }] },
];

// ─────────────────────────── Clientes ───────────────────────────
export const CLIENTES_EMPRESA: { nombre: string; nombreComercial?: string; tipoCliente: string; ciudad: string; creditoDias: number; cupo: number; tipoIdentificacion?: string; identificacion?: string; pais?: string }[] = [
  { nombre: 'Delicias del Puerto Cía. Ltda.', nombreComercial: 'Delicias del Puerto', tipoCliente: 'MAYORISTA', ciudad: 'Machala', creditoDias: 30, cupo: 3000 },
  { nombre: 'Cafetería La Casona S.A.', nombreComercial: 'La Casona', tipoCliente: 'MAYORISTA', ciudad: 'Machala', creditoDias: 15, cupo: 1500 },
  { nombre: 'Hotel Oro Verde Machala S.A.', nombreComercial: 'Hotel Oro Verde', tipoCliente: 'MAYORISTA', ciudad: 'Machala', creditoDias: 30, cupo: 4000 },
  { nombre: 'Supermercados El Bananero S.A.', nombreComercial: 'El Bananero', tipoCliente: 'DISTRIBUIDOR', ciudad: 'Machala', creditoDias: 45, cupo: 12000 },
  { nombre: 'Distribuidora Austral del Sur Cía. Ltda.', nombreComercial: 'Austral del Sur', tipoCliente: 'DISTRIBUIDOR', ciudad: 'Cuenca', creditoDias: 45, cupo: 15000 },
  { nombre: 'Comercial Costa Alta S.A.', nombreComercial: 'Costa Alta', tipoCliente: 'DISTRIBUIDOR', ciudad: 'Guayaquil', creditoDias: 30, cupo: 10000 },
  { nombre: 'Pastelería Dulce Jubones Cía. Ltda.', tipoCliente: 'MAYORISTA', ciudad: 'Pasaje', creditoDias: 15, cupo: 1200 },
  { nombre: 'Tienda Orgánica Raíces S.A.', tipoCliente: 'MAYORISTA', ciudad: 'Loja', creditoDias: 30, cupo: 2500 },
  { nombre: 'Heladería Santa Rosa Cía. Ltda.', tipoCliente: 'MAYORISTA', ciudad: 'Santa Rosa', creditoDias: 15, cupo: 1000 },
  { nombre: 'Café Zarumeño S.A.', tipoCliente: 'MAYORISTA', ciudad: 'Zaruma', creditoDias: 0, cupo: 0 },
  { nombre: 'Agroexportadora Pacífico Sur S.A.', nombreComercial: 'Pacífico Sur', tipoCliente: 'EXPORTADOR', ciudad: 'Guayaquil', creditoDias: 30, cupo: 120000 },
  { nombre: 'Chocolatiers Réunis SARL', tipoCliente: 'EXPORTADOR', ciudad: 'Lyon', pais: 'Francia', creditoDias: 60, cupo: 200000, tipoIdentificacion: 'PASAPORTE', identificacion: 'FR90512233401' },
  { nombre: 'Cacao Trading Europe BV', tipoCliente: 'EXPORTADOR', ciudad: 'Ámsterdam', pais: 'Países Bajos', creditoDias: 45, cupo: 250000, tipoIdentificacion: 'PASAPORTE', identificacion: 'NL855104921B01' },
  { nombre: 'Bean to Bar Collective LLC', tipoCliente: 'EXPORTADOR', ciudad: 'Portland', pais: 'Estados Unidos', creditoDias: 30, cupo: 90000, tipoIdentificacion: 'PASAPORTE', identificacion: 'US841177302' },
  { nombre: 'Hacienda Bananera Los Ángeles S.A.', tipoCliente: 'MAYORISTA', ciudad: 'El Guabo', creditoDias: 30, cupo: 5000 },
  { nombre: 'Finca Cacaotera El Porvenir Cía. Ltda.', tipoCliente: 'MAYORISTA', ciudad: 'Pasaje', creditoDias: 15, cupo: 3000 },
  { nombre: 'Asociación de Cafetaleros de Piñas', tipoCliente: 'MAYORISTA', ciudad: 'Piñas', creditoDias: 15, cupo: 2000 },
];

// ─────────────────────────── Contenido de la web (editable desde el sistema) ───────────────────────────
export const CONTENIDO_WEB = [
  {
    clave: 'inicio',
    titulo: 'Inicio',
    datos: {
      banners: [
        { titulo: 'La pepa de oro, de nuestra tierra a tu mesa', subtitulo: 'Cacao fino de aroma y café de altura de la provincia de El Oro', imagen: 'img/banners/haciendas.svg', boton: 'Ver productos', enlace: '/productos' },
        { titulo: 'Chocolate de origen con trazabilidad', subtitulo: 'Escanea el QR de tu barra y conoce la hacienda donde nació tu cacao', imagen: 'img/banners/chocolate.svg', boton: 'Rastrea tu cacao', enlace: '/rastreo' },
        { titulo: 'Maquinaria, transporte y taller', subtitulo: 'Alquiler de tractores y secadoras, fletes y mantenimiento para tu finca', imagen: 'img/banners/maquinaria.svg', boton: 'Ver equipos', enlace: '/equipos' },
      ],
      frase: 'Cultivamos, transformamos y compartimos lo mejor del cacao y el café orense desde 2011.',
      lineas: [
        { titulo: 'Cacao y café', texto: 'De nuestras 3 haciendas y de más de 120 productores asociados.', icono: 'grano' },
        { titulo: 'Chocolates y derivados', texto: 'Barras, bombones, coberturas, nibs, cacao en polvo y mocca.', icono: 'chocolate' },
        { titulo: 'Grano por mayor y exportación', texto: 'Sacos de 69 kg con certificado de calidad, FOB Puerto Bolívar.', icono: 'barco' },
        { titulo: 'Equipos y servicios', texto: 'Venta y alquiler de maquinaria, fletes y taller de mantenimiento.', icono: 'tractor' },
      ],
    },
  },
  {
    clave: 'testimonios',
    titulo: 'Testimonios',
    datos: {
      lista: [
        { nombre: 'Marcela Vélez', cargo: 'Chef pastelera, Guayaquil', texto: 'La cobertura 70 % se templa de maravilla y el sabor floral del Nacional se nota en cada postre.' },
        { nombre: 'Thomas Lefèvre', cargo: 'Chocolatier, Lyon (Francia)', texto: 'Cada saco llega con su certificado y su código: puedo contarle a mis clientes de qué finca viene el cacao.' },
        { nombre: 'Segundo Armijos', cargo: 'Productor asociado, El Guabo', texto: 'Me pagan a tiempo, me explican el descuento por humedad y el precio del día está siempre a la vista.' },
        { nombre: 'Gabriela Ochoa', cargo: 'Finca El Porvenir, Pasaje', texto: 'Alquilamos la secadora móvil en plena cosecha y nos salvó la temporada.' },
      ],
    },
  },
  {
    clave: 'nosotros',
    titulo: 'Quiénes somos',
    datos: {
      historia: [
        'Pepa de Oro nació en 2011 como una finca familiar de 8 hectáreas en El Guabo. Al cacao ecuatoriano se le llamó durante un siglo «la pepa de oro», y nuestra provincia lleva el oro en su nombre: de ahí viene el nuestro.',
        'Hoy cultivamos cacao y café en tres haciendas propias, compramos a más de 120 productores de la zona pagando un precio justo, transformamos el grano en nuestra planta y vendemos en la tienda de Machala, a distribuidores de todo el país y a chocolateros de Europa y Estados Unidos.',
        'Cada lote tiene su historia registrada: de qué parcela salió, cuántos días fermentó, cómo se secó y qué calidad obtuvo. Esa trazabilidad es nuestra promesa.',
      ],
      mision: 'Producir y comercializar cacao fino de aroma, café y sus derivados con trazabilidad completa, pagando un precio justo a los productores orenses.',
      vision: 'Ser en 2031 la marca de cacao y chocolate de origen más reconocida del sur del Ecuador, presente en tiendas nacionales y en tres mercados de exportación.',
      valores: [
        { titulo: 'Trazabilidad', texto: 'Cada saco tiene historia.' },
        { titulo: 'Calidad medida', texto: 'La calidad se mide, no se supone.' },
        { titulo: 'Trato justo', texto: 'Precio del día a la vista y pagos puntuales al productor.' },
        { titulo: 'Cuidado de la tierra', texto: 'Cultivo bajo sombra, abono orgánico y uso responsable del agua.' },
        { titulo: 'Servicio cercano', texto: 'Te atendemos por WhatsApp, en la tienda o en tu finca.' },
      ],
      equipo: [
        { nombre: 'Ana Lucía Ramírez', cargo: 'Gerente general' },
        { nombre: 'Carlos Valarezo', cargo: 'Agrónomo' },
        { nombre: 'Gabriela Ordóñez', cargo: 'Jefa de calidad' },
        { nombre: 'Jorge Aguilar', cargo: 'Jefe de planta' },
      ],
    },
  },
  {
    clave: 'servicios',
    titulo: 'Servicios',
    datos: {
      transporte: {
        texto: 'Flota propia de camiones de 3,5 a 8 toneladas y furgón refrigerado para chocolate. Guía de remisión en cada viaje.',
        rutas: [
          { ruta: 'El Guabo – Puerto Bolívar', tarifa: 'USD 90 por viaje (hasta 8 t)' },
          { ruta: 'El Guabo – Guayaquil', tarifa: 'USD 12 por tonelada' },
          { ruta: 'Machala – Cuenca', tarifa: 'USD 1,20 por km' },
          { ruta: 'Recolección en finca (El Oro)', tarifa: 'USD 0,90 por km' },
        ],
      },
      mantenimiento: { texto: 'Taller para tractores, secadoras, despulpadoras y vehículos. Presupuesto sin costo, repuestos originales y mano de obra a USD 8 por hora.' },
      compra: { texto: 'Compramos cacao en baba y seco, y café en cereza y oro. Pesaje en báscula certificada, medición de humedad delante de ti y liquidación por escrito.' },
    },
  },
  {
    clave: 'contacto',
    titulo: 'Contacto',
    datos: {
      mapaMatriz: { lat: -3.2408, lng: -79.8350 },
      mapaTienda: { lat: -3.2581, lng: -79.9554 },
      mensajeWhatsapp: 'Hola Pepa de Oro, quisiera información sobre',
    },
  },
];
