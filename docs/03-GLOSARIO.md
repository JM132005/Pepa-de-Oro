# 03 · Glosario de siglas y términos (con ejemplos de Pepa de Oro)

> Ordenado por tema. Cada sigla dice qué significa, qué es en palabras simples y **dónde aparece en el proyecto**.

## 1. Negocio y Ecuador

| Sigla | Significa | Qué es | Ejemplo en Pepa de Oro |
|---|---|---|---|
| **SRI** | Servicio de Rentas Internas | La entidad de impuestos de Ecuador | Las facturas siguen su formato (no están autorizadas electrónicamente, es un proyecto académico) |
| **RUC** | Registro Único de Contribuyentes | Número de 13 dígitos de una empresa o persona que factura | Cliente "Delicias del Puerto Cía. Ltda." con RUC `0790547810001` |
| **IVA** | Impuesto al Valor Agregado | Impuesto sobre la venta: 15 % o 0 % según el producto | Barra 70 % de 50 g a $3,20 + IVA 15 % = $3,68; el cacao en grano (`CAC-NAC-PRE`) va con 0 % |
| **RIDE** | Representación Impresa del Documento Electrónico | El PDF de la factura | `facturacion/pdf-factura.ts` |
| **NC** | Nota de Crédito | Documento que anula o corrige una factura (código SRI 04) | Anular la factura `001-001-000003076` genera una NC con su propio secuencial (RN-21) |
| **USD** | Dólar estadounidense | Moneda de Ecuador | Todos los precios están en USD |
| **SOAT** | Seguro Obligatorio de Accidentes de Tránsito | Seguro que todo vehículo debe tener vigente | Camión CAM-01 con SOAT que vence en noviembre → alerta; vencido → no viaja (RN-24) |
| **qq** | Quintal | 100 libras ≈ 45,36 kg; así se paga el cacao al productor | Precio del día: $180 por quintal de cacao seco |
| **ha** | Hectárea | 10 000 m² | Parcela LE-P03 de 4,5 ha |
| **msnm** | Metros sobre el nivel del mar | Altitud | Hacienda Alto Zaruma a 1 200 msnm (café de altura) |
| **CCN-51** | Colección Castro Naranjal 51 | Variedad de cacao muy productiva | Lotes "CCN51" fermentan 5–7 días; el Nacional, 4–6 |
| **POS** | Point of Sale (punto de venta) | La caja de la tienda | Pantalla **Caja** con turnos |
| **SKU** | Stock Keeping Unit | Código único de cada variante que se vende | `CH70-MAR-50` = Chocolate 70 % · Maracuyá · barra 50 g |
| **FEFO** | First Expired, First Out | Sale primero lo que **vence** primero | Si hay lotes que vencen en marzo y junio, se vende el de marzo (RN-13) |
| **FIFO** | First In, First Out | Sale primero lo que **entró** primero | No se usa: en alimentos importa el vencimiento (FEFO) |
| **BOM** | Bill of Materials (lista de materiales) | La receta: qué insumos y cuánto lleva un producto | Receta de chocolate 70 %: pasta, azúcar, manteca (`recetas`) |
| **MRP** | Material Requirements Planning | Planificar qué producir según la demanda y los insumos | El planificador de la semilla decide cuántas tandas alcanzan (`planificarProduccion`) |
| **KPI** | Key Performance Indicator (indicador clave) | Un número que dice si el negocio va bien | "Ventas del mes $18 240 ▲ 12 %" en Paneles |
| **RN** | Regla de Negocio | Algo que el sistema nunca debe permitir | RN-19: consumidor final solo hasta $50 |

## 2. Desarrollo guiado por especificaciones

| Sigla | Significa | Qué es | Ejemplo |
|---|---|---|---|
| **SDD** | Spec-Driven Development | Primero se escribe QUÉ debe hacer el sistema; el código viene después | `specs/003-ventas-facturacion/spec.md` antes de `ventas.service.ts` |
| **TDD** | Test-Driven Development | Primero la prueba (falla, rojo), luego el código (pasa, verde) | `ventas.reglas.spec.ts` se escribió antes que `ventas.reglas.ts` |
| **FR** | Functional Requirement | Requisito funcional numerado en una spec | `FR-001: El número de comprobante DEBE ser único por tipo` |
| **SC** | Success Criteria | Criterio de éxito medible | `SC-003: cada pantalla carga en menos de 2 s` |
| **P1/P2/P3** | Prioridad 1, 2, 3 | Qué tan importante es una historia | "Vender en la caja" es P1 |

## 3. GitHub y trabajo en equipo

| Sigla | Significa | Qué es | Ejemplo |
|---|---|---|---|
| **PR** | Pull Request | Pedido para unir tu rama a `main`; ahí se revisa el código | PR "Agrega nota de crédito" con `Cierra #14` |
| **CI** | Continuous Integration | Un robot prueba y compila cada cambio automáticamente | `.github/workflows/ci.yml` |
| **CD** | Continuous Delivery/Deployment | Publicar automáticamente lo que pasó el CI | No se usa todavía (no hay servidor en internet) |
| **CLI** | Command Line Interface | Programa que se usa escribiendo comandos | `gh` (GitHub CLI), `ng` (Angular CLI), `nest` (NestJS CLI) |
| **YAML** | YAML Ain't Markup Language | Formato de texto por sangrías para configuraciones | `ci.yml`, `dependabot.yml`, plantillas de Issues |
| **LF / CRLF** | Line Feed / Carriage Return + Line Feed | Cómo se marca el fin de línea en Linux / Windows | `.gitattributes` evita mezclarlos |

## 4. Web y backend

| Sigla | Significa | Qué es | Ejemplo |
|---|---|---|---|
| **API** | Application Programming Interface | La "ventanilla" por donde el frontend pide datos al backend | `http://localhost:3000/api/...` |
| **REST** | Representational State Transfer | Estilo de API: recursos con URL y verbos HTTP | `GET /api/facturas`, `POST /api/facturas/:id/nota-credito` |
| **HTTP** | HyperText Transfer Protocol | El idioma con el que se hablan navegador y servidor | Verbos `GET` (leer), `POST` (crear), `PATCH` (cambiar una parte), `PUT` (reemplazar), `DELETE` (borrar) |
| **URL** | Uniform Resource Locator | Dirección de una página o recurso | `/productos/chocolate-70` |
| **JSON** | JavaScript Object Notation | Formato de los datos que viajan por la API | `{ "codigo": "L-2026-0887", "estado": "RECIBIDO" }` |
| **JWT** | JSON Web Token | "Pase" firmado que demuestra quién eres; dura 8 h | Cabecera `Authorization: Bearer eyJhbGci...` |
| **CORS** | Cross-Origin Resource Sharing | Permiso para que la web (puerto 4200) llame a la API (puerto 3000) | `app.enableCors(...)` en `main.ts` |
| **CRUD** | Create, Read, Update, Delete | Las 4 operaciones básicas | `comun/crud-base.service.ts` |
| **DTO** | Data Transfer Object | Clase que describe y **valida** los datos que llegan | `facturacion/dto/facturacion.dto.ts` con `@IsNumber()` |
| **ODM** | Object Document Mapper | Librería que convierte documentos de Mongo en objetos | **Mongoose** (`@Schema`, `@Prop`) |
| **PDF** | Portable Document Format | Documento para imprimir | Factura, cotización, liquidación, contrato (PDFKit) |
| **SMTP** | Simple Mail Transfer Protocol | Protocolo para enviar correos | Nodemailer con Gmail |
| **QR** | Quick Response (código) | Código de barras cuadrado que abre una URL | La etiqueta del chocolate abre `/rastreo?codigo=...` |
| **E2E** | End to End | Prueba que recorre todo el sistema | El job "semilla" del CI hace de prueba de integración |
| **ENV** | Environment (variables de entorno) | Configuración que no va en el código | `backend/.env` (`MONGO_URI`, `JWT_SECRET`) |
| **npm** | Node Package Manager | Instala librerías de JavaScript | `npm install`, `npm ci` |
| **LTS** | Long Term Support | Versión con soporte largo | Node 22 LTS |
| **cron** | (de *chronos*, tiempo) | Tarea programada por horario | `@Cron('0 6 * * *')` → preventivos todos los días 06:00 |

## 5. Frontend

| Sigla | Significa | Qué es | Ejemplo |
|---|---|---|---|
| **SPA** | Single Page Application | Una sola página que cambia de pantalla sin recargar | Angular: pasar de Caja a Facturas no recarga el navegador |
| **HTML** | HyperText Markup Language | La estructura de la página | `contenido-web.html` |
| **CSS** | Cascading Style Sheets | Los estilos (colores, tamaños) | `src/styles.css`, `estilos/publico.css`, `estilos/admin.css` |
| **SVG** | Scalable Vector Graphics | Imagen hecha de formas; se ve nítida en cualquier tamaño | `public/img/productos/chocolate-70.svg` |
| **TS / JS** | TypeScript / JavaScript | JavaScript con tipos / el lenguaje del navegador | Todo el proyecto está en TypeScript |
| **UI / UX** | User Interface / User Experience | Cómo se ve / cómo se siente usarlo | Botones de cuentas de prueba en el login |

## 6. Base de datos

| Sigla | Significa | Qué es | Ejemplo |
|---|---|---|---|
| **NoSQL** | Not only SQL | Bases sin tablas fijas; MongoDB guarda **documentos** | Un lote de grano guarda su `historial` dentro del mismo documento |
| **BSON** | Binary JSON | Cómo Mongo guarda el JSON internamente | Fechas y `ObjectId` reales, no texto |
| **ObjectId** | — | Identificador único de 24 caracteres hexadecimales | `6ad766485674270ea314ee25` |
| **TTL** | Time To Live | Borrado automático por tiempo | No se usa (nada se borra: trazabilidad) |
| **Time series** | Serie de tiempo | Colección optimizada para mediciones por fecha | `clima` (lluvia y temperatura diarias) |

## 7. Términos del proyecto (sin sigla)

| Término | Qué es |
|---|---|
| **Guard** | "Portero" que decide si una petición o una pantalla se puede abrir (`jwt.guard.ts`, `auth.guard.ts`) |
| **Interceptor** | Código que pasa por **todas** las peticiones: el del frontend pega el token; el del backend anota la auditoría |
| **Pipe** | Transforma o valida un dato de la URL (`id-mongo.pipe.ts`) |
| **Signal** | Variable de Angular que redibuja la pantalla sola cuando cambia (`signal`, `computed`) |
| **Standalone** | Componente de Angular que declara sus propios `imports` (sin `NgModule`) |
| **Lazy loading** | Cargar una pantalla solo cuando se abre (`loadComponent` en `app.routes.ts`) |
| **Semilla (seed)** | Programa que llena la base con datos ficticios (`npm run seed`) |
| **Carencia** | Días que hay que esperar después de fumigar antes de cosechar (RN-01) |
| **Baba** | Cacao recién sacado de la mazorca, con su pulpa, antes de fermentar |
| **Tendal** | Patio de cemento donde se seca el grano al sol |
| **Prueba de corte** | Cortar 100 granos y contar violetas, pizarrosos y mohosos para dar el grado (RN-06) |
| **Liquidación de compra** | Comprobante (SRI 03) que se entrega al productor cuando se le compra |
| **Guía de remisión** | Documento (SRI 06) que acompaña la mercadería en el camión |
| **Kárdex** | Historial de entradas y salidas de un producto (`movimientos_inventario`) |
| **Merma** | Lo que se pierde en un proceso (agua al secar, cáscara al descascarillar) |
