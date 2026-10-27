# Imágenes de Pepa de Oro

Ilustraciones SVG propias (estilo plano, paleta cacao/oro/crema) generadas con `scripts/generar-ilustraciones.py`.
Para cambiar una imagen basta con **reemplazar el archivo manteniendo el mismo nombre** (puede ser .svg, o
cambiar la ruta en el catálogo/contenido web si usas .jpg/.webp).

| Carpeta | Uso |
|---|---|
| `logo.svg` | Cabecera, pie, login, PDF |
| `generico.svg` | Producto sin imagen |
| `banners/` | Carrusel de la portada (1600 × 900) |
| `haciendas/` | Página Nosotros (1200 × 800) |
| `productos/` | Catálogo (800 × 600), una por producto |
| `equipos/` | Maquinaria en alquiler y venta (800 × 600) |

Regenerarlas: `python3 scripts/generar-ilustraciones.py frontend/public/img`
