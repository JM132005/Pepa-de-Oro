# Registro de cambios de Pepa de Oro

Cada entrega (zip) agrega una sección arriba. Sirve para saber qué cambió y por qué.

## Parte 4 · Documentación (20/10/2026)

- `README.md` principal (qué es, tecnologías, arranque rápido, estructura e índice de documentos) y README cortos en `backend/` y `frontend/`.
- `docs/01-REQUISITOS.md`: qué pide el parcial (GitHub, Actions, Copilot, Spec Kit) y qué pidió la empresa, con el archivo o la pantalla donde se cumple cada punto; tabla de las 26 RN con su función, archivo y pantalla. Marca con 🧑‍💻 lo que hay que hacer a mano en GitHub (ruleset, ejecutar el script de Issues, revisión del compañero).
- `docs/02-INSTALACION.md`: programas, variables del `.env`, semilla, usuarios de prueba, comandos y errores comunes.
- `docs/03-GLOSARIO.md`: siglas del negocio (SRI, RUC, IVA, FEFO, BOM, MRP, KPI…), de SDD, de GitHub, de web, de frontend y de MongoDB, cada una con un ejemplo real de los datos.
- `docs/04-MAPA-BACKEND.md`: vista de pájaro, el viaje de una venta en la caja paso a paso, conceptos de NestJS, **cada archivo** con lo que hace, las **186 rutas** de la API con sus roles, tareas automáticas, PDF, la semilla y preguntas "¿dónde está…?".
- `docs/05-MAPA-FRONTEND.md`: rutas con sus roles, conceptos de Angular con ejemplos del proyecto, cada archivo, estilos e imágenes, preguntas y recetas.
- `docs/06-BASE-DE-DATOS.md`: las 32 colecciones con sus campos, relaciones, embebido o referencia, índices, operadores usados, transacciones y consultas listas para Compass.
- `docs/07-FLUJO-GITHUB.md`: subir el repo, ruleset de `main`, crear Issues, ciclo de ramas y PR, leer el CI, Spec Kit con Copilot y evidencias para la presentación.
- Corrección: las specs y la constitución decían que los KPIs usan *aggregation pipeline*; en realidad se calculan con consultas filtradas y se suman en el servicio. Ahora lo dicen así, y la guía de base de datos trae ejemplos de *aggregation* para practicar.

---

## Parte 3 · Ilustraciones, CI, Spec Kit e Issues (20/10/2026)

### Ilustraciones SVG (`frontend/public/img/`)
- **36 ilustraciones propias** en estilo plano (paleta cacao, oro y crema): logo, imagen genérica, 3 banners de la portada, 3 haciendas, 20 productos y 8 equipos. Ya no queda ninguna imagen rota (antes todas daban 404).
- Se generan con `scripts/generar-ilustraciones.py`; para cambiar una basta con reemplazar el archivo con el mismo nombre (ver `img/LEEME.md`).

### Integración continua (`.github/`)
- `workflows/ci.yml` con 3 trabajos en cada push y Pull Request a `main`/`develop`:
  1. **Backend**: `npm ci` → lint (oxlint) → 126 pruebas (Vitest) → build.
  2. **Frontend**: `npm ci` → `ng build --configuration production` (guarda la web compilada como artefacto).
  3. **Integración**: levanta MongoDB 8 como servicio y corre la semilla de **1 mes** con los servicios reales; falla si no se generaron facturas.
- Plantillas: Pull Request, Issue "Historia de usuario" y "Error" (formularios), `copilot-instructions.md` (contexto para GitHub Copilot) y `dependabot.yml` (actualizaciones semanales).

### Spec Kit (desarrollo guiado por especificaciones)
- `.specify/memory/constitution.md`: los 7 principios del proyecto (TDD de las RN, un sistema con dos caras, trazabilidad, inventario, permisos, código en español, datos realistas) y el flujo de trabajo.
- `.specify/templates/`: plantillas de `spec.md`, `plan.md` y `tasks.md`.
- `specs/001` a `specs/010`: una carpeta por funcionalidad con **spec** (26 historias con escenarios Dado/Cuando/Entonces y sus RN), **plan** (estructura de archivos y revisión contra la constitución) y **tasks** (tareas marcadas como hechas).
- Se generan desde `scripts/generar-specs.py`, que también escribe `scripts/historias.json`.

### Script de Issues
- `scripts/crear-issues.mjs`: con GitHub CLI crea 31 etiquetas (prioridades y `rn-01`…`rn-26`), 8 hitos (entregas) y un Issue por historia con sus criterios como lista de verificación. Se puede probar sin crear nada con `--dry-run`, no duplica si se ejecuta dos veces y `--cerrar` los deja cerrados.

### Semilla: grano atascado en "Recibido"
- En temporada alta llegaban más de 2 t diarias de cacao en baba y solo había 5,2 t de fermentadores (4–7 días por tanda): **239 lotes** quedaban "Recibidos" para siempre. Ahora: cosechas grandes divididas en tandas que caben en un cajón, **10 fermentadores** y 4 tendales, y el café usa cualquier fermentador si los pequeños están ocupados. Resultado: 24 lotes recibidos (los de los últimos días) y **288 de 289 órdenes cerradas**.

### Otros
- `angular.json`: el build de producción ya no intenta incrustar Google Fonts (`fonts: false`); así compila también sin internet o detrás de un firewall. Las fuentes se siguen cargando normalmente en el navegador.
- Quitado un import sin usar en la semilla (lint sin advertencias).

---

## Parte 2b · Sistema interno (20/10/2026)

- **22 pantallas** del sistema con datos reales: Caja (turnos y venta de mostrador), Facturas (PDF, correo, nota de crédito, abonos), Cotizaciones, Pedidos, Clientes, Solicitudes web, Catálogo, Inventario (existencias, lotes, kárdex, ajustes y bajas), Campo y ficha de parcela, Acopio, Poscosecha y ficha del lote de grano, Calidad, Producción, Equipos, Logística, Mantenimiento, Informes, Proyecciones, Contenido web, Usuarios, Configuración y Auditoría.
- Componentes de `admin/`: `campana-alertas`, `editor-lineas` (líneas de factura/cotización con precio por mayor y descuento), `selector-cliente`; formularios en `admin/Formularios/campos.ts`; utilidades `calculos-venta.ts` y `acciones.ts`.
- Unidades de los formularios alineadas con el backend (`KG`, `UNIDAD`, `LITRO`, `SACO`, `QUINTAL`, `GALON`).

---

## Parte 2a · Frontend: base y web pública (20/10/2026)

- `app.routes.ts`: todas las rutas (web pública, login y sistema `/admin`), con **carga perezosa** (`loadComponent`) y guards por rol.
- `publico/`: layout (cabecera, pie, WhatsApp flotante, lista de interés) y las 8 páginas del diseño: Inicio, Nosotros, Productos, Ficha de producto, Equipos, Servicios, Rastrea tu cacao (con escáner QR si el navegador lo permite) y Contacto, más la página 404.
- Stock **en vivo** en el catálogo y en la ficha (se refresca cada 20 s con `GET /api/publico/stock`).
- `admin/`: login (con botones de cuentas de prueba), layout con menú por rol y campana de alertas, Inicio por rol y Paneles de KPIs.
- Estilos separados: `src/estilos/publico.css` y `src/estilos/admin.css` (registrados en `angular.json`).
- Nuevo componente compartido `app-imagen` (imagen con respaldo si la foto no existe).
- `auth.guard.ts`: si alguien abre una página interna sin sesión, después de ingresar vuelve a esa página (`?volver=`).
- Las pantallas internas se completaron en la parte 2b.

---

## Parte 1 · Seed (20/10/2026)

### Problema 1: las órdenes de producción casi no se cerraban
En 12 meses se creaban **4 669 órdenes** y solo **37** llegaban a cerrarse (4 630 se anulaban).

**Causa.** El planificador del seed (`backend/src/semilla/simulacion.ts → planificarProduccion`) tenía tres fallas que juntas causaban un "bloqueo en cadena":

1. Pedía la orden por el **total** que faltaba para el objetivo (ej. 200 kg de pasta) sin revisar si alcanzaban los insumos (204 kg de nibs). Si faltaba un poco, la orden se anulaba entera.
2. Los nibs tenían un objetivo fijo de 160 kg: como había 172 kg "estaban bien" y **nunca se reponían**, aunque la pasta necesitaba 204 kg. Sin pasta no hay chocolate, sin chocolate no hay manteca ni cocoa → todo se detenía.
3. Cada intento fallido creaba y anulaba una orden (por eso había miles de órdenes anuladas en la base).

**Solución (un MRP sencillo).**
- La demanda de cada producto se calcula con lo que **realmente salió** en las últimas 3 semanas (ventas + consumo de producción), con un mínimo según la tienda y los mayoristas.
- Antes de crear la orden se calcula cuántas **tandas permite el stock** (`tandasPosibles`): si alcanza para 1 de 2 tandas, se produce 1. Si no alcanza ni para una, no se crea la orden y se anota qué semielaborado faltó para producirlo primero.
- Los terminados se ordenan por **urgencia** (días de stock que quedan), no por una lista fija.
- Una orden que no logra iniciar se **anula** en el momento (no queda colgada reteniendo insumos ni la máquina marcada "EN USO"). Las órdenes PLANIFICADAS para mañana ahora sí se ejecutan al día siguiente.
- Arreglado un detalle: las "unidades buenas" podían salir mayores que las "producidas" (eran dos números al azar independientes) y la orden no cerraba.

**Resultado (12 meses):** 306 órdenes iniciadas y **306 cerradas**; solo 2 anuladas.

### Problema 2: se agotaba el stock de la tienda
Era consecuencia del problema 1 (sin producción no hay qué vender) más:
- La tienda solo se reabastecía desde **un** lote; ahora toma de varios lotes liberados (primero el que vence antes, FEFO).
- Los mayoristas pedían cantidades muy grandes (hasta 96 barras por línea) que vaciaban el inventario; ahora 24 a 60.

**Resultado:** 2 624 ventas de mostrador y ~30 rechazadas por stock en todo el año (antes 2 113 rechazadas). Las 159 rechazadas por RN-19 son normales: la cajera pide la cédula y vuelve a facturar.

### Bug real del backend encontrado al correr el seed: decimales "fantasma"
Al sumar y restar cantidades con decimales, MongoDB guardaba restos como `47,99999999999996` kg. La regla `abajo3()` lo mostraba como 48 disponibles, pero la base decía que 47,99999999999996 < 48 y la reserva fallaba con *"RN-12: el stock cambió mientras se reservaba"*. Esto también le habría pasado a un usuario real en la caja o en producción.

**Solución** en `inventario.service.ts` e `inventario.reglas.ts`:
- `TOLERANCIA = 0,0005`: al comparar cantidades en la base se acepta media milésima de diferencia.
- `normalizar()`: después de cada entrada, salida o reserva, MongoDB redondea `cantidad` y `reservado` a 3 decimales (`$round`) y nunca los deja negativos.

### Bug real: la primera nota de crédito chocaba con la primera factura
El número `001-001-000000001` era **único** en toda la colección `facturas`, pero el SRI numera facturas (01) y notas de crédito (04) por separado. Ahora lo único es el par `tipoComprobante + numero` (`factura.esquema.ts`).

### Otros
- El seed genera **12 meses** por defecto (`npm run seed`). Sigue funcionando `npm run seed -- --meses=6`.
- Pruebas unitarias: **126 pasan**.
