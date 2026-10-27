// analitica.ts → paneles de KPIs, alertas, proyecciones e informes (misma forma que devuelve la API).

export interface Tarjeta {
  id: string;
  titulo: string;
  valor: number | null;
  formato: 'dinero' | 'numero' | 'porcentaje' | 'kg' | 'dias' | 'horas';
  anterior?: number | null;
  variacion?: number | null;
  mejorSiBaja?: boolean;
  ayuda: string;
}

export interface Grafico {
  id: string;
  titulo: string;
  tipo: 'barras' | 'linea' | 'barras_apiladas' | 'apiladas_100' | 'circular' | 'dispersion' | 'calor' | 'embudo' | 'medidor' | 'horizontal' | 'banda';
  categorias?: string[];
  series: { nombre: string; datos: (number | number[] | null)[] }[];
  ejeY?: string[];
  formato?: 'dinero' | 'numero' | 'porcentaje' | 'kg';
}

export interface Lista {
  id: string;
  titulo: string;
  columnas: string[];
  filas: (string | number)[][];
  semaforo?: ('rojo' | 'amarillo' | 'verde')[];
}

export interface Panel {
  area: string;
  titulo: string;
  desde: string;
  hasta: string;
  tarjetas: Tarjeta[];
  graficos: Grafico[];
  listas: Lista[];
}

export interface Alerta {
  area: string;
  tipo: string;
  nivel: 'ALTA' | 'MEDIA';
  mensaje: string;
  ruta?: string;
}

export interface Pronostico {
  mes: string;
  valor: number;
  minimo: number;
  maximo: number;
  r2: number;
}

export interface InformeCatalogo {
  id: string;
  titulo: string;
  area: string;
  filtros: string[];
  descripcion: string;
}

export interface Informe {
  titulo: string;
  subtitulo: string;
  columnas: { titulo: string; ancho: number; alinear?: string }[];
  filas: (string | number)[][];
  resumen: [string, string][];
}
