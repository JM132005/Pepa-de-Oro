# 04 · Mapa del backend (NestJS): dónde está cada cosa

> Responde **"¿dónde está…?"** con el archivo exacto y el método. Todas las rutas son relativas a `backend/src/`.
>
> Atajos de VS Code: **Ctrl + P** abre un archivo por nombre · **Ctrl + Shift + F** busca en todo el proyecto
> (ej. `RN-19`) · **Ctrl + clic** salta a la definición · **Ctrl + Shift + O** lista los métodos del archivo.

## Índice
1. [Vista de pájaro](#1-vista-de-pájaro)
2. [El viaje de una petición: una venta en la caja](#2-el-viaje-de-una-petición-una-venta-en-la-caja)
3. [Conceptos de NestJS y dónde están](#3-conceptos-de-nestjs-y-dónde-están)
4. [La forma de cada módulo](#4-la-forma-de-cada-módulo)
5. [Archivo por archivo](#5-archivo-por-archivo)
6. [API completa (186 rutas)](#6-api-completa)
7. [Tareas automáticas, PDF y correo](#7-tareas-automáticas-pdf-y-correo)
8. [La semilla (datos de prueba)](#8-la-semilla-datos-de-prueba)
9. [Preguntas "¿dónde está…?"](#9-preguntas-dónde-está)
10. [Recetas: agregar cosas nuevas](#10-recetas-agregar-cosas-nuevas)

---

## 1. Vista de pájaro

```
backend/
├── src/
│   ├── main.ts                → arranca el servidor: prefijo /api, CORS, ValidationPipe, puerto
│   ├── app.module.ts          → conecta MongoDB, registra los guards e interceptor globales y los 19 módulos
│   ├── base-datos.module.ts   → registra las 32 colecciones en un solo lugar
│   ├── comun/                 → piezas compartidas: guards, decoradores, pipe, PDF, correo, contadores, utilidades
│   ├── modulos/               → un módulo por área del negocio (19)
│   └── semilla/               → "npm run seed": simula 12 meses de operación
├── .env.example               → plantilla de configuración
├── package.json               → librerías y comandos (start:dev, test, lint, seed)
├── vitest.config.ts           → configuración de las pruebas
└── oxlint.json                → reglas del lint
```

| Módulo | Para qué | Reglas |
|---|---|---|
| `modulos/acopio/` | Compra a productores y liquidaciones | RN-03, RN-04 |
| `modulos/analitica/` | KPIs, alertas, informes y proyecciones | — |
| `modulos/auditoria/` | Bitácora de acciones sensibles | — |
| `modulos/auth/` | Inicio de sesión y token JWT | — |
| `modulos/calidad/` | Análisis, grado y liberación | RN-06, RN-07, RN-11 |
| `modulos/campo/` | Haciendas, parcelas, labores, cosechas, clima | RN-01 |
| `modulos/configuracion/` | Parámetros de la empresa | — |
| `modulos/equipos/` | Activos, venta y alquiler | RN-23, RN-24 |
| `modulos/facturacion/` | Facturas, notas de crédito, PDF y correo | RN-19 a RN-21 |
| `modulos/inventario/` | Bodegas, lotes, kárdex, FEFO | RN-11 a RN-15 |
| `modulos/logistica/` | Flota, viajes y fletes | RN-25 |
| `modulos/mantenimiento/` | Taller preventivo y correctivo | RN-26 |
| `modulos/poscosecha/` | Fermentación y secado | RN-05 |
| `modulos/produccion/` | Recetas, órdenes y costos | RN-08 a RN-10 |
| `modulos/productos/` | Catálogo, variantes y precios | RN-16 |
| `modulos/rastreo/` | "Rastrea tu cacao" (QR) | — |
| `modulos/salud/` | ¿La API está viva? | — |
| `modulos/usuarios/` | Cuentas y roles | — |
| `modulos/ventas/` | Clientes, cotizaciones, pedidos, caja | RN-17, RN-18, RN-22 |
| `modulos/web/` | Página pública y solicitudes | — |

### Analogía: un restaurante
| Pieza | En el restaurante | En el código |
|---|---|---|
| Controlador (`*.controller.ts`) | El mesero que toma el pedido | Recibe la petición y la pasa al servicio |
| Servicio (`*.service.ts`) | El cocinero | Coordina: lee la base, llama a las reglas, guarda |
| Reglas (`*.reglas.ts`) | El recetario que no se discute | Funciones puras que deciden si algo se puede |
| Esquema (`esquemas/*.esquema.ts`) | La despensa ordenada | Forma de los documentos en MongoDB |
| DTO (`dto/*.dto.ts`) | La comanda bien llenada | Valida lo que llega antes de entrar |
| Guard (`comun/guards/`) | El portero | ¿Tiene token? ¿Tiene el rol? |

---

## 2. El viaje de una petición: una venta en la caja

**La cajera cobra 3 barras a un cliente con cédula.** Sigue el camino con el dedo:

| # | Dónde | Archivo → método | Qué pasa |
|---|---|---|---|
| 1 | Pantalla | `frontend/.../admin/Paginas/caja/caja.ts` → `cobrar()` | Junta líneas, cliente y pagos |
| 2 | Servicio Angular | `compartido/Servicios/ventas.service.ts` → `emitirFactura()` | `POST /api/facturas` |
| 3 | Interceptor | `compartido/Controlador/token.interceptor.ts` | Agrega `Authorization: Bearer <token>` |
| 4 | Servidor | `main.ts` | Prefijo `/api`, CORS y `ValidationPipe` |
| 5 | Guard 1 | `comun/guards/jwt.guard.ts` → `canActivate()` | ¿Token válido? Si no → **401** |
| 6 | Guard 2 | `comun/guards/roles.guard.ts` | ¿Rol VENTAS (o GERENTE)? Si no → **403** |
| 7 | Validación | `modulos/facturacion/dto/facturacion.dto.ts` → `EmitirFacturaDto` | ¿Cantidades y pagos bien? Si no → **400** |
| 8 | Controlador | `facturacion.controller.ts` → `emitir()` | Pasa el DTO y el usuario al servicio |
| 9 | Servicio | `facturacion.service.ts` → `emitir()` | Arma líneas (`ventas/lineas.service.ts`: precio por mayor RN-16, descuento RN-17) |
| 10 | Reglas | `facturacion.reglas.ts` → `calcularTotales()`, `verificarConsumidorFinal()` | IVA, totales y **RN-19** |
| 11 | Secuencial | `comun/servicios/contadores.service.ts` → `siguiente()` | Número correlativo único (**RN-20**) |
| 12 | Inventario | `inventario/inventario.service.ts` → `salida()` | Descuenta por **FEFO** (RN-13), nunca negativo (RN-12), solo liberado y no vencido (RN-11, RN-14) |
| 13 | Base | `factura.esquema.ts` + `modelo.create()` | Guarda la factura; todo dentro de `transaccion()` |
| 14 | Auditoría | `auditoria/auditoria.interceptor.ts` | Anota quién emitió |
| 15 | Correo | `facturacion.service.ts` → `enviarPorCorreo()` | PDF (`pdf-factura.ts`) adjunto por Nodemailer |
| 16 | Respuesta | (de vuelta) | JSON de la factura; si una regla falló: `400 { message: "RN-19: ..." }` |

```
[caja.ts] → [ventas.service] → [interceptor] ══HTTP══▶ [main.ts] → [JwtGuard] → [RolesGuard] → [DTO]
   → [controller] → [service] → [reglas] → [contadores] → [inventario] → [MongoDB] → [correo]
◀══JSON══ toast "Factura 001-001-000003077 emitida · cambio $1,30"
```

> 💡 **Regla de oro:** el controlador no piensa, el servicio coordina, las reglas deciden, el esquema guarda.

---

## 3. Conceptos de NestJS y dónde están

| Concepto | Qué es | Dónde |
|---|---|---|
| Módulo `@Module` | Caja que agrupa controlador, servicio y esquemas | `modulos/*/*.module.ts` |
| Controlador `@Controller` | Define las rutas | `modulos/*/*.controller.ts` |
| Servicio `@Injectable` | Lógica; se "inyecta" en el constructor | `modulos/*/*.service.ts` |
| Inyección de dependencias | NestJS crea el servicio y lo pasa solo | `constructor(private readonly inventario: InventarioService)` |
| Guard global `APP_GUARD` | Portero de **todas** las rutas | `app.module.ts` → `JwtGuard`, `RolesGuard` |
| Interceptor global `APP_INTERCEPTOR` | Código antes/después de cada petición | `app.module.ts` → `AuditoriaInterceptor` |
| Decorador propio | Etiqueta que cambia el comportamiento | `@Publico()`, `@Roles(...)`, `@UsuarioActual()` en `comun/decoradores/` |
| Pipe | Valida/transforma un parámetro | `comun/pipes/id-mongo.pipe.ts` (`:id` debe ser ObjectId) |
| `ValidationPipe` | Valida DTO; `whitelist: true` borra campos no declarados | `main.ts` |
| DTO + class-validator | `@IsString()`, `@IsNumber()`, `@Min(0)`… | `modulos/*/dto/*.dto.ts` |
| Mongoose `@Schema` / `@Prop` | Forma del documento | `modulos/*/esquemas/*.esquema.ts` |
| `@InjectModel` | Recibe el modelo de una colección | Constructores de los servicios |
| Módulo global `@Global` | Disponible sin importarlo en cada módulo | `comun/comun.module.ts`, `configuracion`, `auditoria` |
| `@Cron` (`@nestjs/schedule`) | Tarea programada | Ver sección 7 |
| Excepciones | `BadRequestException` (400), `ForbiddenException` (403), `NotFoundException` (404) | Servicios y guards |

---

## 4. La forma de cada módulo

```
modulos/ventas/
├── ventas.module.ts        ← empaqueta todo y declara qué exporta
├── ventas.controller.ts    ← rutas (/api/clientes, /api/cotizaciones, /api/pedidos, /api/caja)
├── ventas.reglas.ts        ← funciones PURAS (RN-17, RN-18, RN-22)
├── ventas.reglas.spec.ts   ← sus pruebas (se escriben primero)
├── *.service.ts            ← lógica (clientes, cotizaciones, pedidos, caja, líneas)
├── dto/ventas.dto.ts       ← validación de lo que llega
├── esquemas/*.esquema.ts   ← colecciones de MongoDB
└── pdf-cotizacion.ts       ← plantilla PDF
```

---

## 5. Archivo por archivo

### Raíz y `comun/`

| Archivo | Qué hace |
|---|---|
| `app.module.ts` | módulo RAÍZ: conecta la base de datos, la seguridad global y todos los módulos. |
| `base-datos.module.ts` | registra TODAS las colecciones de MongoDB en un solo lugar. |
| `main.ts` | punto de entrada del backend. Es lo primero que se ejecuta con "npm run start:dev". |
| `comun/comun.module.ts` | módulo GLOBAL con servicios que usan muchos módulos a la vez: |
| `comun/constantes.ts` | valores fijos que usa TODO el sistema Pepa de Oro. |
| `comun/crud-base.service.ts` | servicio "plantilla" con las 4 operaciones básicas (CRUD) para cualquier colección. |
| `comun/decoradores/publico.decorator.ts` | decorador @Publico() para marcar rutas que NO necesitan token (login, salud). |
| `comun/decoradores/roles.decorator.ts` | decorador @Roles('VENTAS', 'BODEGA') para limitar una ruta a ciertos roles. |
| `comun/decoradores/usuario-actual.decorator.ts` | decorador @UsuarioActual() para recibir en el controlador |
| `comun/esquemas/contador.esquema.ts` | colección "contadores": guarda el último número usado de cada secuencia. |
| `comun/esquemas/item-venta.esquema.ts` | forma de UNA línea de detalle (cotizaciones, pedidos y facturas la comparten). |
| `comun/guards/jwt.guard.ts` | GUARD de autenticación. Un "guard" es un portero: decide si la petición pasa o no. |
| `comun/guards/roles.guard.ts` | GUARD de autorización: si la ruta tiene @Roles(...), revisa que el usuario |
| `comun/identificacion.reglas.ts` | RN-02: la cédula o el RUC deben pasar el dígito verificador. |
| `comun/pipes/id-mongo.pipe.ts` | PIPE que valida que un :id de la URL sea un ObjectId válido de MongoDB. |
| `comun/servicios/contadores.service.ts` | entrega números correlativos sin repetir (facturas, lotes, órdenes...). |
| `comun/servicios/correo.service.ts` | envía correos (facturas, cotizaciones, confirmaciones de la web) con NODEMAILER. |
| `comun/servicios/pdf.service.ts` | "motor de PDF" del sistema. Todas las plantillas (factura, cotización, liquidación, |
| `comun/transaccion.ts` | ayuda para hacer varias escrituras "todo o nada". |
| `comun/usuario-token.ts` | forma de los datos que viajan DENTRO del token JWT. |
| `comun/utilidades.ts` | funciones pequeñas reutilizables en varios módulos. |

### `modulos/acopio/` — Compra a productores y liquidaciones

| Archivo | Qué hace |
|---|---|
| `acopio.controller.ts` | rutas /api/productores, /api/precios-dia, /api/acopio y /api/liquidaciones. |
| `acopio.module.ts` | compra de grano a productores externos. |
| `acopio.reglas.ts` | reglas PURAS de la compra de cacao y café a productores externos. |
| `acopio.service.ts` | compra a productores: recepción en báscula, liquidación, pagos y anticipos. |
| `dto/acopio.dto.ts` | validación de productores, precios del día, recepciones, pagos y anticipos. |
| `esquemas/liquidacion.esquema.ts` | colección "liquidaciones": LIQUIDACIÓN DE COMPRA al productor (código SRI 03). |
| `esquemas/precio-dia.esquema.ts` | colección "precios_dia": precio por quintal que se paga hoy por cada tipo de grano. |
| `esquemas/productor.esquema.ts` | colección "productores": agricultores de la zona que venden su cacao o café. |
| `pdf-liquidacion.ts` | PDF de la liquidación de compra que se entrega al productor. |

### `modulos/analitica/` — KPIs, alertas, informes y proyecciones

| Archivo | Qué hace |
|---|---|
| `alertas.service.ts` | la CAMPANA de la barra superior: junta las alertas de todos los módulos |
| `analitica.controller.ts` | rutas /api/analitica (paneles, alertas, proyecciones) y /api/informes. |
| `analitica.module.ts` | KPIs, alertas, proyecciones e informes. Lee datos de casi todos los módulos. |
| `informes.service.ts` | INFORMES descargables en PDF (para imprimir o enviar) y Excel (para analizar). |
| `kpis.service.ts` | PANELES DE CONTROL (dashboards) con KPIs por área y el panel gerencial. |
| `proyecciones.reglas.ts` | métodos SIMPLES y EXPLICABLES para pronosticar (no es "magia" ni caja negra). |
| `proyecciones.service.ts` | pronósticos con datos reales de la base y las fórmulas de proyecciones.reglas.ts. |

### `modulos/auditoria/` — Bitácora de acciones sensibles

| Archivo | Qué hace |
|---|---|
| `auditoria.controller.ts` | GET /api/auditoria : la bitácora (solo el gerente la ve). |
| `auditoria.esquema.ts` | colección "auditoria": bitácora de QUIÉN hizo QUÉ y CUÁNDO. |
| `auditoria.interceptor.ts` | INTERCEPTOR global que anota en la bitácora toda petición que CAMBIA datos |
| `auditoria.module.ts` | módulo GLOBAL de auditoría: cualquier servicio puede inyectar AuditoriaService |
| `auditoria.service.ts` | registra y consulta la bitácora de auditoría. |

### `modulos/auth/` — Inicio de sesión y token JWT

| Archivo | Qué hace |
|---|---|
| `auth.controller.ts` | rutas /api/auth |
| `auth.module.ts` | configura JWT y empaqueta el login. |
| `auth.service.ts` | lógica del login: comprobar contraseña y generar el token JWT. |
| `dto/login.dto.ts` | datos del formulario de inicio de sesión. |

### `modulos/calidad/` — Análisis, grado y liberación

| Archivo | Qué hace |
|---|---|
| `calidad.controller.ts` | rutas /api/calidad |
| `calidad.module.ts` | control de calidad de grano y de producto terminado. |
| `calidad.reglas.ts` | reglas PURAS de calidad. El sistema calcula el grado: nadie lo escribe a mano. |
| `calidad.service.ts` | evalúa los lotes de grano (RN-06/07) y libera el producto terminado (RN-11). |
| `dto/calidad.dto.ts` | mediciones de calidad de grano y de producto terminado. |
| `pdf-certificado.ts` | certificado de calidad de un lote (para el mayorista o el exportador). |

### `modulos/campo/` — Haciendas, parcelas, labores, cosechas, clima

| Archivo | Qué hace |
|---|---|
| `campo.controller.ts` | rutas /api/haciendas, /api/parcelas, /api/trabajadores, /api/labores, |
| `campo.module.ts` | haciendas propias. |
| `campo.reglas.ts` | reglas PURAS del módulo de campo (haciendas propias). |
| `campo.service.ts` | haciendas propias: parcelas, labores, sanidad, clima y cosechas. |
| `catalogos.service.ts` | CRUD sencillos del campo. Cada clase HEREDA de CrudBase (crear, listar, |
| `dto/campo.dto.ts` | validación de haciendas, parcelas, trabajadores, labores, sanidad, clima y cosechas. |
| `esquemas/clima.esquema.ts` | colección "clima": lluvia y temperatura diaria por hacienda. |
| `esquemas/cosecha.esquema.ts` | colección "cosechas": lo recolectado en una parcela un día. |
| `esquemas/hacienda.esquema.ts` | colección "haciendas": las fincas PROPIAS de Pepa de Oro. |
| `esquemas/labor.esquema.ts` | colección "labores": cada trabajo hecho en una parcela (poda, fumigación...). |
| `esquemas/monitoreo-sanidad.esquema.ts` | colección "monitoreos_sanidad": conteo de plagas y enfermedades por parcela. |
| `esquemas/parcela.esquema.ts` | colección "parcelas": cada lote de terreno de una hacienda (ej: LE-P03). |
| `esquemas/trabajador.esquema.ts` | colección "trabajadores": personal de campo, choferes y técnicos (con jornal). |

### `modulos/configuracion/` — Parámetros de la empresa

| Archivo | Qué hace |
|---|---|
| `configuracion.controller.ts` | /api/configuracion |
| `configuracion.esquema.ts` | colección "configuracion": UN solo documento con los parámetros de la empresa. |
| `configuracion.module.ts` | módulo GLOBAL: facturación, calidad, acopio y web leen la configuración. |
| `configuracion.service.ts` | lee y actualiza la configuración de la empresa. |
| `configuracion.valores.ts` | valores POR DEFECTO de la configuración (se usan si la colección está vacía |
| `dto/actualizar-configuracion.dto.ts` | el gerente envía solo las secciones que quiere cambiar. |

### `modulos/equipos/` — Activos, venta y alquiler

| Archivo | Qué hace |
|---|---|
| `dto/equipos.dto.ts` | activos (máquinas y vehículos) y alquileres. |
| `equipos.controller.ts` | rutas /api/activos y /api/alquileres |
| `equipos.module.ts` | activos, venta y alquiler de maquinaria y vehículos. |
| `equipos.reglas.ts` | reglas PURAS de activos (maquinaria y vehículos) y alquileres. |
| `equipos.service.ts` | activos (ficha única), disponibilidad, alquileres con calendario y contrato. |
| `esquemas/activo.esquema.ts` | colección "activos": cada máquina o vehículo con UNA sola ficha. |
| `esquemas/alquiler.esquema.ts` | colección "alquileres": contrato de alquiler de un activo a un cliente. |
| `pdf-contrato.ts` | contrato de alquiler de maquinaria en PDF. |

### `modulos/facturacion/` — Facturas, notas de crédito, PDF y correo

| Archivo | Qué hace |
|---|---|
| `dto/facturacion.dto.ts` | datos para emitir facturas, notas de crédito y abonos. |
| `esquemas/factura.esquema.ts` | colección "facturas": facturas (código SRI 01) y notas de crédito (04). |
| `facturacion.controller.ts` | rutas /api/facturas |
| `facturacion.module.ts` | facturas, notas de crédito, PDF y envío por correo. |
| `facturacion.reglas.ts` | reglas PURAS de la factura con formato del SRI (simulada, no autorizada). |
| `facturacion.service.ts` | emite facturas y notas de crédito, genera el PDF y lo envía al correo del cliente. |
| `pdf-factura.ts` | plantilla del RIDE (Representación Impresa del Documento Electrónico) de la factura |

### `modulos/inventario/` — Bodegas, lotes, kárdex, FEFO

| Archivo | Qué hace |
|---|---|
| `dto/inventario.dto.ts` | datos que llegan a las rutas de inventario. |
| `esquemas/bodega.esquema.ts` | colección "bodegas": lugares donde se guarda el stock. |
| `esquemas/lote-producto.esquema.ts` | colección "lotes_producto": el STOCK, separado por lote y bodega. |
| `esquemas/movimiento.esquema.ts` | colección "movimientos_inventario": el KARDEX. |
| `inventario.controller.ts` | rutas /api/inventario y /api/bodegas. |
| `inventario.module.ts` | empaqueta el inventario. Exporta InventarioService porque lo usan |
| `inventario.reglas.ts` | reglas PURAS del inventario. |
| `inventario.service.ts` | el ÚNICO lugar del sistema que cambia el stock. |

### `modulos/logistica/` — Flota, viajes y fletes

| Archivo | Qué hace |
|---|---|
| `dto/logistica.dto.ts` | viajes de la flota. |
| `esquemas/viaje.esquema.ts` | colección "viajes": cada salida de un camión de la flota. |
| `logistica.controller.ts` | rutas /api/viajes |
| `logistica.module.ts` | flota, viajes y fletes. |
| `logistica.reglas.ts` | reglas PURAS de viajes y fletes. |
| `logistica.service.ts` | viajes: asignación de camión y chofer, guía de remisión, costos y fletes. |
| `pdf-guia.ts` | GUÍA DE REMISIÓN (código SRI 06): documento que acompaña a la mercadería en el camión. |

### `modulos/mantenimiento/` — Taller preventivo y correctivo

| Archivo | Qué hace |
|---|---|
| `dto/mantenimiento.dto.ts` | órdenes del taller. |
| `esquemas/orden-mantenimiento.esquema.ts` | colección "ordenes_mantenimiento": todo trabajo del taller. |
| `mantenimiento.controller.ts` | rutas /api/mantenimiento |
| `mantenimiento.module.ts` | taller de mantenimiento. |
| `mantenimiento.reglas.ts` | reglas PURAS del taller. |
| `mantenimiento.service.ts` | taller: preventivos automáticos (RN-26), correctivos, servicios a clientes, |
| `pdf-orden.ts` | orden de trabajo / presupuesto del taller en PDF. |

### `modulos/poscosecha/` — Fermentación y secado

| Archivo | Qué hace |
|---|---|
| `dto/poscosecha.dto.ts` | datos de fermentación, secado y mezcla de lotes. |
| `esquemas/lote-grano.esquema.ts` | colección "lotes_grano": cada lote de cacao o café desde que llega hasta que se |
| `poscosecha.controller.ts` | rutas /api/lotes-grano (fermentación y secado). |
| `poscosecha.module.ts` | lotes de grano, fermentación y secado. |
| `poscosecha.reglas.ts` | reglas PURAS de fermentación y secado. |
| `poscosecha.service.ts` | crea los lotes de grano y controla fermentación y secado. |

### `modulos/produccion/` — Recetas, órdenes y costos

| Archivo | Qué hace |
|---|---|
| `dto/produccion.dto.ts` | recetas y órdenes de producción. |
| `esquemas/orden-produccion.esquema.ts` | colección "ordenes_produccion". |
| `esquemas/receta.esquema.ts` | colección "recetas": la LISTA DE MATERIALES (BOM) de cada producto. |
| `pdf-etiqueta.ts` | hoja de etiquetas para imprimir y pegar en cada empaque del lote. |
| `produccion.controller.ts` | rutas /api/recetas y /api/produccion |
| `produccion.module.ts` | transformación de grano en productos. |
| `produccion.reglas.ts` | reglas PURAS de recetas y órdenes de producción. |
| `produccion.service.ts` | recetas, órdenes de producción, costos, simulador y etiquetas. |

### `modulos/productos/` — Catálogo, variantes y precios

| Archivo | Qué hace |
|---|---|
| `dto/producto.dto.ts` | validación de los datos de un producto (variante) del catálogo. |
| `esquemas/producto.esquema.ts` | colección "productos": cada documento es una VARIANTE que se vende y tiene stock. |
| `productos.controller.ts` | rutas /api/productos (catálogo interno). |
| `productos.module.ts` | catálogo de productos y precios. |
| `productos.reglas.ts` | reglas PURAS de precios del catálogo. |
| `productos.service.ts` | catálogo: variantes, precios (RN-16) e historial de precios. |

### `modulos/rastreo/` — "Rastrea tu cacao" (QR)

| Archivo | Qué hace |
|---|---|
| `rastreo.controller.ts` | GET /api/publico/rastreo/:codigo (PÚBLICO: es lo que abre el QR de la etiqueta). |
| `rastreo.module.ts` | trazabilidad pública "Rastrea tu cacao". |
| `rastreo.service.ts` | "Rastrea tu cacao": TRAZABILIDAD HACIA ATRÁS. |
| `rastreo.vista.ts` | convierte los datos internos en la vista PÚBLICA de "Rastrea tu cacao". |

### `modulos/salud/` — ¿La API está viva?

| Archivo | Qué hace |
|---|---|
| `salud.controller.ts` | GET /api/salud : responde si la API está viva (no necesita token). |
| `salud.module.ts` | módulo mínimo que solo registra el controlador de salud. |

### `modulos/usuarios/` — Cuentas y roles

| Archivo | Qué hace |
|---|---|
| `dto/actualizar-usuario.dto.ts` | el GERENTE puede cambiar nombre, rol o desactivar a un usuario. |
| `dto/crear-usuario.dto.ts` | datos que el GERENTE envía para crear un usuario. |
| `esquemas/usuario.esquema.ts` | cómo se guarda un USUARIO en MongoDB (colección "usuarios"). |
| `usuarios.controller.ts` | rutas /api/usuarios |
| `usuarios.module.ts` | empaqueta esquema + servicio + controlador de usuarios. |
| `usuarios.service.ts` | lógica de usuarios: crear (con contraseña cifrada), listar y actualizar. |

### `modulos/ventas/` — Clientes, cotizaciones, pedidos, caja

| Archivo | Qué hace |
|---|---|
| `caja.service.ts` | turnos de caja de la tienda (apertura, ventas, cierre con diferencia). |
| `clientes.service.ts` | clientes, su crédito (RN-18) y su estado de cuenta. |
| `cotizaciones.service.ts` | venta por mayor, paso 2: la cotización con PDF por correo. |
| `dto/ventas.dto.ts` | validación de clientes, cotizaciones, pedidos, caja y líneas de venta. |
| `esquemas/cliente.esquema.ts` | colección "clientes": a quién se le vende (consumidor, tienda, distribuidor, exportador). |
| `esquemas/cotizacion.esquema.ts` | colección "cotizaciones": propuesta de precios que se envía al cliente en PDF. |
| `esquemas/pedido.esquema.ts` | colección "pedidos": venta por mayor o exportación confirmada. |
| `esquemas/turno-caja.esquema.ts` | colección "turnos_caja": apertura y cierre de la caja de la tienda. |
| `lineas.service.ts` | arma las líneas de una cotización, pedido o factura a partir de lo que envía el frontend. |
| `pdf-cotizacion.ts` | plantilla PDF de la cotización (usa el motor común PdfService). |
| `pedidos.service.ts` | venta por mayor y exportación: pedido confirmado con stock RESERVADO. |
| `ventas.controller.ts` | rutas /api/clientes, /api/cotizaciones, /api/pedidos y /api/caja. |
| `ventas.module.ts` | clientes, cotizaciones, pedidos y caja. |
| `ventas.reglas.ts` | reglas PURAS de ventas: descuentos, crédito, cotizaciones y cobranza. |

### `modulos/web/` — Página pública y solicitudes

| Archivo | Qué hace |
|---|---|
| `dto/web.dto.ts` | formularios de la página pública y gestión de solicitudes. |
| `esquemas/contenido-web.esquema.ts` | colección "contenido_web": textos, banners y testimonios de la página pública. |
| `esquemas/solicitud-web.esquema.ts` | colección "solicitudes_web": lo que un visitante pide desde la web |
| `web.controller.ts` | rutas de la PÁGINA PÚBLICA (/api/publico/...) y de su administración. |
| `web.module.ts` | página pública y su administración (contenido y solicitudes). |
| `web.service.ts` | todo lo que alimenta la página pública: catálogo con precio y STOCK EN VIVO, |

### `semilla/`

| Archivo | Qué hace |
|---|---|
| `datos.ts` | DATOS FICTICIOS de Pepa de Oro: empresa, personal, haciendas, catálogo, recetas, activos, |
| `ejecutar.ts` | comando "npm run seed": BORRA la base de desarrollo y la llena con datos ficticios. |
| `reloj.ts` | "reloj de mentira" para el seed. |
| `simulacion.ts` | genera la HISTORIA de Pepa de Oro: día por día, durante los últimos meses, la empresa |

### Pruebas (`*.spec.ts`, 126 pruebas en 19 archivos)

- `comun/guards/jwt.guard.spec.ts`
- `comun/guards/roles.guard.spec.ts`
- `comun/identificacion.reglas.spec.ts`
- `comun/utilidades.spec.ts`
- `modulos/acopio/acopio.reglas.spec.ts`
- `modulos/analitica/proyecciones.reglas.spec.ts`
- `modulos/calidad/calidad.reglas.spec.ts`
- `modulos/campo/campo.reglas.spec.ts`
- `modulos/equipos/equipos.reglas.spec.ts`
- `modulos/facturacion/facturacion.reglas.spec.ts`
- `modulos/inventario/inventario.reglas.spec.ts`
- `modulos/logistica/logistica.reglas.spec.ts`
- `modulos/mantenimiento/mantenimiento.reglas.spec.ts`
- `modulos/poscosecha/poscosecha.reglas.spec.ts`
- `modulos/produccion/produccion.reglas.spec.ts`
- `modulos/productos/productos.reglas.spec.ts`
- `modulos/rastreo/rastreo.vista.spec.ts`
- `modulos/salud/salud.controller.spec.ts`
- `modulos/ventas/ventas.reglas.spec.ts`

---

## 6. API completa

Prefijo: `http://localhost:3000`. "con sesión" = cualquier usuario con token. El **GERENTE pasa siempre** aunque no
esté en la lista (`roles.guard.ts`). Las rutas `/api/publico/...` las usa la web sin iniciar sesión.

| Verbo | Ruta | Roles | Método del controlador |
|---|---|---|---|
| GET | `/api/productores` | ACOPIO, CALIDAD | `listar()` |
| GET | `/api/productores/:id` | ACOPIO, CALIDAD | `detalle()` |
| POST | `/api/productores` | ACOPIO | `crear()` |
| PATCH | `/api/productores/:id` | ACOPIO | `actualizar()` |
| POST | `/api/productores/:id/anticipos` | ACOPIO | `anticipo()` |
| GET | `/api/precios-dia` | con sesión | `vigentes()` |
| GET | `/api/precios-dia/historial` | con sesión | `historial()` |
| POST | `/api/precios-dia` | ACOPIO | `registrarPrecio()` |
| POST | `/api/acopio/recepciones` | ACOPIO | `recibir()` |
| GET | `/api/liquidaciones` | ACOPIO | `liquidaciones()` |
| GET | `/api/liquidaciones/:id` | ACOPIO | `liquidacion()` |
| GET | `/api/liquidaciones/:id/pdf` | ACOPIO | `pdf()` |
| POST | `/api/liquidaciones/:id/pagos` | ACOPIO | `pagar()` |
| GET | `/api/analitica/paneles/:area` | con sesión | `panel()` |
| GET | `/api/analitica/alertas` | con sesión | `misAlertas()` |
| GET | `/api/analitica/proyecciones/ventas` | VENTAS, PRODUCCION | `ventas()` |
| GET | `/api/analitica/proyecciones/productos` | VENTAS, PRODUCCION | `productos()` |
| GET | `/api/analitica/proyecciones/reorden` | VENTAS, PRODUCCION, BODEGA | `reorden()` |
| GET | `/api/analitica/proyecciones/cosecha` | AGRONOMO, PRODUCCION, ACOPIO | `cosecha()` |
| GET | `/api/analitica/proyecciones/materia-prima` | PRODUCCION, ACOPIO, BODEGA | `materiaPrima()` |
| GET | `/api/analitica/proyecciones/flujo-caja` | GERENTE | `flujoCaja()` |
| GET | `/api/analitica/proyecciones/tendencias` | VENTAS, CALIDAD, ACOPIO, PRODUCCION | `tendencias()` |
| GET | `/api/informes` | con sesión | `catalogo()` |
| GET | `/api/informes/:id` | con sesión | `informe()` |
| POST | `/api/informes/gerencial/enviar` | GERENTE | `enviarGerencial()` |
| GET | `/api/auditoria` | GERENTE | `listar()` |
| POST | `/api/auth/login` | **público** | `login()` |
| GET | `/api/auth/perfil` | con sesión | `perfil()` |
| GET | `/api/calidad/pendientes` | CALIDAD, ACOPIO, PRODUCCION, BODEGA | `pendientes()` |
| GET | `/api/calidad/evaluados` | CALIDAD, ACOPIO, PRODUCCION, BODEGA | `evaluados()` |
| GET | `/api/calidad/no-conformidades` | CALIDAD | `noConformidades()` |
| POST | `/api/calidad/lotes-grano/:id/evaluar` | CALIDAD | `evaluar()` |
| POST | `/api/calidad/lotes-grano/:id/cata` | CALIDAD | `catar()` |
| POST | `/api/calidad/lotes-grano/:id/no-conformidad/cerrar` | CALIDAD | `cerrar()` |
| GET | `/api/calidad/lotes-grano/:id/certificado` | CALIDAD, ACOPIO, VENTAS | `certificado()` |
| POST | `/api/calidad/lotes-producto/:id/control` | CALIDAD | `control()` |
| GET | `/api/haciendas` | ...VER | `listarHaciendas()` |
| GET | `/api/haciendas/:id` | ...VER | `hacienda()` |
| POST | `/api/haciendas` | AGRONOMO | `crearHacienda()` |
| PATCH | `/api/haciendas/:id` | AGRONOMO | `actualizarHacienda()` |
| GET | `/api/parcelas` | ...VER | `listarParcelas()` |
| GET | `/api/parcelas/:id` | ...VER | `parcela()` |
| POST | `/api/parcelas` | AGRONOMO | `crearParcela()` |
| PATCH | `/api/parcelas/:id` | AGRONOMO | `actualizarParcela()` |
| GET | `/api/trabajadores` | con sesión | `listarTrabajadores()` |
| POST | `/api/trabajadores` | AGRONOMO, LOGISTICA, MANTENIMIENTO | `crearTrabajador()` |
| PATCH | `/api/trabajadores/:id` | AGRONOMO, LOGISTICA, MANTENIMIENTO | `actualizarTrabajador()` |
| GET | `/api/campo/agenda` | ...VER | `agenda()` |
| GET | `/api/labores` | ...VER | `listarLabores()` |
| POST | `/api/labores` | AGRONOMO | `registrarLabor()` |
| GET | `/api/sanidad` | ...VER | `monitoreos()` |
| POST | `/api/sanidad` | AGRONOMO | `monitoreo()` |
| GET | `/api/clima` | ...VER | `clima()` |
| POST | `/api/clima` | AGRONOMO | `registrarClima()` |
| GET | `/api/cosechas` | ...VER | `cosechas()` |
| POST | `/api/cosechas` | AGRONOMO | `cosechar()` |
| GET | `/api/configuracion` | con sesión | `obtener()` |
| PATCH | `/api/configuracion` | GERENTE | `actualizar()` |
| GET | `/api/activos` | con sesión | `listar()` |
| GET | `/api/activos/alertas-documentos` | con sesión | `alertas()` |
| GET | `/api/activos/:id` | con sesión | `ficha()` |
| POST | `/api/activos` | VENTAS, LOGISTICA, MANTENIMIENTO | `crear()` |
| PATCH | `/api/activos/:id` | VENTAS, LOGISTICA, MANTENIMIENTO | `actualizar()` |
| POST | `/api/activos/:id/baja` | GERENTE | `baja()` |
| GET | `/api/alquileres` | VENTAS, LOGISTICA, MANTENIMIENTO | `alquileres()` |
| GET | `/api/alquileres/:id` | VENTAS, LOGISTICA, MANTENIMIENTO | `alquiler()` |
| POST | `/api/alquileres` | VENTAS | `crearAlquiler()` |
| POST | `/api/alquileres/:id/entregar` | VENTAS, LOGISTICA | `entregar()` |
| POST | `/api/alquileres/:id/devolver` | VENTAS, LOGISTICA | `devolver()` |
| POST | `/api/alquileres/:id/cancelar` | VENTAS | `cancelar()` |
| GET | `/api/alquileres/:id/contrato` | VENTAS, LOGISTICA, MANTENIMIENTO | `contrato()` |
| GET | `/api/facturas` | VENTAS | `listar()` |
| GET | `/api/facturas/por-cobrar` | VENTAS | `porCobrar()` |
| GET | `/api/facturas/:id` | VENTAS | `obtener()` |
| GET | `/api/facturas/:id/pdf` | VENTAS | `pdf()` |
| POST | `/api/facturas` | VENTAS | `emitir()` |
| POST | `/api/facturas/:id/reenviar` | VENTAS | `reenviar()` |
| POST | `/api/facturas/:id/abonos` | VENTAS | `abonar()` |
| POST | `/api/facturas/:id/nota-credito` | GERENTE | `notaCredito()` |
| GET | `/api/bodegas` | con sesión | `bodegas()` |
| POST | `/api/bodegas` | BODEGA | `crearBodega()` |
| PATCH | `/api/bodegas/:id` | BODEGA | `actualizarBodega()` |
| GET | `/api/inventario/stock` | con sesión | `stock()` |
| GET | `/api/inventario/lotes` | con sesión | `lotes()` |
| GET | `/api/inventario/kardex/:productoId` | con sesión | `kardex()` |
| GET | `/api/inventario/movimientos` | con sesión | `movimientos()` |
| GET | `/api/inventario/por-vencer` | con sesión | `porVencer()` |
| GET | `/api/inventario/bajo-minimo` | con sesión | `bajoMinimo()` |
| GET | `/api/inventario/valorizado` | con sesión | `valorizado()` |
| POST | `/api/inventario/entradas` | BODEGA | `entrada()` |
| POST | `/api/inventario/transferencias` | BODEGA | `transferir()` |
| POST | `/api/inventario/ajustes` | BODEGA | `ajustar()` |
| POST | `/api/inventario/bajas` | BODEGA | `baja()` |
| GET | `/api/viajes` | LOGISTICA, VENTAS, AGRONOMO, ACOPIO, MANTENIMIENTO | `listar()` |
| GET | `/api/viajes/costos` | LOGISTICA | `costos()` |
| GET | `/api/viajes/:id` | LOGISTICA, VENTAS, AGRONOMO, ACOPIO, MANTENIMIENTO | `obtener()` |
| POST | `/api/viajes` | LOGISTICA, VENTAS, AGRONOMO, ACOPIO | `crear()` |
| POST | `/api/viajes/:id/iniciar` | LOGISTICA | `iniciar()` |
| POST | `/api/viajes/:id/completar` | LOGISTICA | `completar()` |
| POST | `/api/viajes/:id/cancelar` | LOGISTICA | `cancelar()` |
| GET | `/api/viajes/:id/guia` | LOGISTICA, VENTAS, BODEGA | `guia()` |
| GET | `/api/mantenimiento/ordenes` | MANTENIMIENTO, LOGISTICA, PRODUCCION | `listar()` |
| GET | `/api/mantenimiento/plan` | MANTENIMIENTO, LOGISTICA, PRODUCCION | `plan()` |
| GET | `/api/mantenimiento/indicadores` | MANTENIMIENTO | `indicadores()` |
| GET | `/api/mantenimiento/ordenes/:id` | MANTENIMIENTO, LOGISTICA, PRODUCCION | `obtener()` |
| POST | `/api/mantenimiento/generar-preventivos` | MANTENIMIENTO | `generar()` |
| POST | `/api/mantenimiento/fallas` | MANTENIMIENTO, AGRONOMO, ACOPIO, PRODUCCION, LOGISTICA | `falla()` |
| POST | `/api/mantenimiento/servicios` | MANTENIMIENTO, VENTAS | `servicioCliente()` |
| POST | `/api/mantenimiento/ordenes/:id/presupuesto` | MANTENIMIENTO | `presupuesto()` |
| POST | `/api/mantenimiento/ordenes/:id/asignar` | MANTENIMIENTO | `asignar()` |
| POST | `/api/mantenimiento/ordenes/:id/iniciar` | MANTENIMIENTO | `iniciar()` |
| POST | `/api/mantenimiento/ordenes/:id/esperar-repuesto` | MANTENIMIENTO | `esperar()` |
| POST | `/api/mantenimiento/ordenes/:id/repuestos` | MANTENIMIENTO | `repuesto()` |
| POST | `/api/mantenimiento/ordenes/:id/terminar` | MANTENIMIENTO | `terminar()` |
| POST | `/api/mantenimiento/ordenes/:id/cancelar` | MANTENIMIENTO | `cancelar()` |
| GET | `/api/mantenimiento/ordenes/:id/pdf` | MANTENIMIENTO, VENTAS, LOGISTICA | `pdf()` |
| GET | `/api/lotes-grano` | AGRONOMO, ACOPIO, CALIDAD, PRODUCCION, BODEGA | `listar()` |
| GET | `/api/lotes-grano/ocupacion` | AGRONOMO, ACOPIO, CALIDAD, PRODUCCION, BODEGA | `ocupacion()` |
| GET | `/api/lotes-grano/:id` | AGRONOMO, ACOPIO, CALIDAD, PRODUCCION, BODEGA | `obtener()` |
| POST | `/api/lotes-grano/:id/fermentacion` | ACOPIO, CALIDAD, PRODUCCION | `fermentar()` |
| POST | `/api/lotes-grano/:id/volteos` | ACOPIO, CALIDAD, PRODUCCION | `voltear()` |
| POST | `/api/lotes-grano/:id/secado` | ACOPIO, CALIDAD, PRODUCCION | `secar()` |
| POST | `/api/lotes-grano/:id/humedad` | ACOPIO, CALIDAD, PRODUCCION | `humedad()` |
| POST | `/api/lotes-grano/:id/terminar-secado` | ACOPIO, CALIDAD, PRODUCCION | `terminar()` |
| POST | `/api/lotes-grano/combinar` | ACOPIO, CALIDAD | `combinar()` |
| GET | `/api/recetas` | PRODUCCION, BODEGA, CALIDAD | `recetas()` |
| GET | `/api/recetas/:id` | PRODUCCION, BODEGA, CALIDAD | `receta()` |
| POST | `/api/recetas` | PRODUCCION | `crearReceta()` |
| PATCH | `/api/recetas/:id` | PRODUCCION | `actualizarReceta()` |
| GET | `/api/produccion/ordenes` | PRODUCCION, BODEGA, CALIDAD | `ordenes()` |
| GET | `/api/produccion/tablero` | PRODUCCION, BODEGA | `tablero()` |
| GET | `/api/produccion/verificar` | PRODUCCION, BODEGA | `verificar()` |
| GET | `/api/produccion/ordenes/:id` | PRODUCCION, BODEGA, CALIDAD | `orden()` |
| POST | `/api/produccion/ordenes` | PRODUCCION | `crear()` |
| POST | `/api/produccion/ordenes/:id/iniciar` | PRODUCCION | `iniciar()` |
| POST | `/api/produccion/ordenes/:id/cerrar` | PRODUCCION | `cerrar()` |
| POST | `/api/produccion/ordenes/:id/anular` | PRODUCCION | `anular()` |
| POST | `/api/produccion/simular` | PRODUCCION | `simular()` |
| GET | `/api/produccion/lotes/:id/etiquetas` | PRODUCCION, BODEGA, CALIDAD | `etiquetas()` |
| GET | `/api/productos` | con sesión | `listar()` |
| GET | `/api/productos/:id` | con sesión | `detalle()` |
| GET | `/api/productos/:id/precio` | con sesión | `precio()` |
| POST | `/api/productos` | GERENTE | `crear()` |
| PATCH | `/api/productos/:id` | GERENTE | `actualizar()` |
| GET | `/api/publico/rastreo/:codigo` | **público** | `rastrear()` |
| GET | `/api/salud` | **público** | `verificar()` |
| GET | `/api/usuarios` | con sesión | `listar()` |
| POST | `/api/usuarios` | GERENTE | `crear()` |
| PATCH | `/api/usuarios/:id` | GERENTE | `actualizar()` |
| GET | `/api/clientes` | con sesión | `listarClientes()` |
| GET | `/api/clientes/consumidor-final` | con sesión | `consumidorFinal()` |
| GET | `/api/clientes/:id` | con sesión | `cliente()` |
| GET | `/api/clientes/:id/estado-cuenta` | con sesión | `estadoCuenta()` |
| POST | `/api/clientes` | VENTAS, LOGISTICA, MANTENIMIENTO | `crearCliente()` |
| PATCH | `/api/clientes/:id` | VENTAS | `actualizarCliente()` |
| GET | `/api/cotizaciones` | VENTAS | `listarCotizaciones()` |
| GET | `/api/cotizaciones/:id` | VENTAS | `cotizacion()` |
| POST | `/api/cotizaciones` | VENTAS | `crearCotizacion()` |
| GET | `/api/cotizaciones/:id/pdf` | VENTAS | `pdfCotizacion()` |
| POST | `/api/cotizaciones/:id/enviar` | VENTAS | `enviarCotizacion()` |
| POST | `/api/cotizaciones/:id/aceptar` | VENTAS | `aceptar()` |
| POST | `/api/cotizaciones/:id/rechazar` | VENTAS | `rechazar()` |
| GET | `/api/pedidos` | VENTAS, BODEGA, LOGISTICA | `listarPedidos()` |
| GET | `/api/pedidos/:id` | VENTAS, BODEGA, LOGISTICA | `pedido()` |
| POST | `/api/pedidos` | VENTAS | `crearPedido()` |
| POST | `/api/pedidos/:id/preparar` | BODEGA | `preparar()` |
| POST | `/api/pedidos/:id/despachar` | LOGISTICA, BODEGA | `despachar()` |
| POST | `/api/pedidos/:id/anular` | VENTAS | `anular()` |
| GET | `/api/caja/actual` | VENTAS | `cajaActual()` |
| GET | `/api/caja/historial` | VENTAS | `historialCaja()` |
| POST | `/api/caja/abrir` | VENTAS | `abrirCaja()` |
| POST | `/api/caja/cerrar` | VENTAS | `cerrarCaja()` |
| GET | `/api/publico/empresa` | **público** | `empresa()` |
| GET | `/api/publico/contenido/:clave` | **público** | `contenido()` |
| GET | `/api/publico/productos` | **público** | `catalogo()` |
| GET | `/api/publico/productos/:slug` | **público** | `producto()` |
| GET | `/api/publico/stock` | **público** | `stock()` |
| GET | `/api/publico/equipos` | **público** | `equipos()` |
| GET | `/api/publico/servicios` | **público** | `servicios()` |
| POST | `/api/publico/solicitudes` | **público** | `solicitar()` |
| GET | `/api/solicitudes` | VENTAS | `solicitudes()` |
| PATCH | `/api/solicitudes/:id` | VENTAS | `actualizar()` |
| POST | `/api/solicitudes/:id/cotizacion` | VENTAS | `aCotizacion()` |
| POST | `/api/solicitudes/avisar-stock` | VENTAS | `avisar()` |
| GET | `/api/contenido-web` | GERENTE | `listarContenido()` |
| PUT | `/api/contenido-web/:clave` | GERENTE | `guardar()` |

---

## 7. Tareas automáticas, PDF y correo

| Qué | Cuándo | Dónde |
|---|---|---|
| Generar órdenes preventivas (RN-26) | Todos los días 06:00 (`@Cron('0 6 * * *')`) | `mantenimiento.service.ts` |
| Avisar "ya llegó" a quien pidió aviso de stock | Cada 15 minutos (`@Cron('*/15 * * * *')`) | `web.service.ts` → `avisarStock()` |
| Informe gerencial por correo | Día 1 de cada mes 08:00 (`@Cron('0 8 1 * *')`) | `informes.service.ts` → `enviarGerencialMensual()` |

> Las tareas se apagan con `SIN_CRON=true` (lo hace la semilla).

| PDF | Plantilla |
|---|---|
| Factura y nota de crédito (RIDE con QR de rastreo) | `facturacion/pdf-factura.ts` |
| Cotización | `ventas/pdf-cotizacion.ts` |
| Liquidación de compra | `acopio/pdf-liquidacion.ts` |
| Certificado de calidad | `calidad/pdf-certificado.ts` |
| Etiquetas de producto con QR | `produccion/pdf-etiqueta.ts` |
| Contrato de alquiler | `equipos/pdf-contrato.ts` |
| Guía de remisión | `logistica/pdf-guia.ts` |
| Orden de trabajo / presupuesto | `mantenimiento/pdf-orden.ts` |
| Informes (PDF y Excel con ExcelJS) | `analitica/informes.service.ts` |

Todas usan el motor común `comun/servicios/pdf.service.ts` (PDFKit: encabezado con logo, tablas, QR).
El correo sale de `comun/servicios/correo.service.ts` (Nodemailer): `CORREO_MODO=prueba` guarda `.eml`
en `backend/correos-de-prueba/`; `gmail` envía de verdad.

---

## 8. La semilla (datos de prueba)

`npm run seed` (`semilla/ejecutar.ts`):
1. Instala un **reloj simulado** (`reloj.ts`) para que "hoy" sea cada día del pasado.
2. Arranca NestJS **sin servidor HTTP** y borra la base.
3. Carga los datos base (`datos.ts`): empresa, 11 usuarios, catálogo, recetas, 3 haciendas, 13 parcelas, clientes, productores, 41 activos.
4. Simula día por día 12 meses (`simulacion.ts` → `simularDia()`), **llamando a los mismos servicios que la API**: cosechas, compras, fermentación, calidad, producción (planificador MRP), ventas de mostrador, pedidos, alquileres, viajes, taller.
5. Muestra lo hecho y lo que las reglas rechazaron (es normal: la simulación intenta y el sistema dice que no).

Resultado típico de 12 meses: ~3 000 facturas, ~290 órdenes de producción cerradas, ~1 000 lotes de grano, ~11 000 movimientos de inventario.

---

## 9. Preguntas "¿dónde está…?"

- **¿Dónde se conecta a MongoDB?** → `app.module.ts` → `MongooseModule.forRootAsync` (variable `MONGO_URI`).
- **¿Dónde se registran las colecciones?** → `base-datos.module.ts`.
- **¿Dónde está el puerto, CORS y el prefijo `/api`?** → `main.ts`.
- **¿Dónde está el login?** → `modulos/auth/auth.service.ts` → `login()` (bcrypt + `signAsync`); el token dura 8 h (`auth.module.ts`).
- **¿Dónde se cifra la contraseña?** → `usuarios.service.ts` → `crear()` con `bcrypt.hash`.
- **¿Dónde se valida el token y el rol?** → `comun/guards/jwt.guard.ts` y `roles.guard.ts`.
- **¿Cómo hago pública una ruta?** → `@Publico()` · **¿Cómo limito por rol?** → `@Roles('VENTAS')`.
- **¿Dónde están los roles?** → `comun/constantes.ts` → `ROLES`.
- **¿Dónde cambia el stock?** → **solo** en `inventario/inventario.service.ts` (`entrada`, `salida`, `reservar`, `ajustar`, `transferir`).
- **¿Dónde está FEFO?** → `inventario.reglas.ts` → `ordenarFefo()` y `asignarSalida()`.
- **¿Dónde se arregló el error de decimales?** → `inventario.reglas.ts` → `TOLERANCIA` y `inventario.service.ts` → `normalizar()` (`$round`).
- **¿Dónde se numeran facturas, lotes y órdenes?** → `comun/servicios/contadores.service.ts` (colección `contadores`, `$inc`).
- **¿Dónde está la "todo o nada"?** → `comun/transaccion.ts` (usado al emitir facturas y cerrar órdenes).
- **¿Dónde está la clave de acceso de 49 dígitos?** → `facturacion.reglas.ts` → `claveAcceso()` y `digitoModulo11()`.
- **¿Dónde se calcula el grado del cacao?** → `calidad.reglas.ts` → `calcularGradoCacao()`.
- **¿Dónde se calcula el costo de producción?** → `produccion.reglas.ts` → `costoUnitario()`; servicio `cerrar()`.
- **¿Dónde se calculan los KPIs?** → `analitica/kpis.service.ts` (uno por área + gerencial).
- **¿Dónde están las proyecciones?** → `analitica/proyecciones.reglas.ts` (regresión lineal, índices estacionales, punto de reorden).
- **¿Dónde se guarda la auditoría?** → `auditoria/auditoria.interceptor.ts` (automático) y `auditoria.service.ts` → `registrar()` (con antes/después).
- **¿Qué ve el público del rastreo?** → `rastreo/rastreo.vista.ts` (filtra datos privados como precios y nombres de productores).

---

## 10. Recetas: agregar cosas nuevas

### Un campo nuevo (ej. "marca" en el cliente)
1. `ventas/esquemas/cliente.esquema.ts` → `@Prop() marca?: string;`
2. `ventas/dto/ventas.dto.ts` → `@IsOptional() @IsString() marca?: string;` (sin esto, `whitelist` lo borra)
3. `frontend/.../compartido/Entidades/ventas.ts` → `marca?: string`
4. `frontend/.../admin/Formularios/campos.ts` → agregar `{ nombre: 'marca', etiqueta: 'Marca', tipo: 'texto' }`

### Una regla nueva (RN-27)
1. Escribe la prueba en `modulos/<modulo>/<modulo>.reglas.spec.ts` → `npm test` (falla, rojo).
2. Escribe la función en `<modulo>.reglas.ts` que devuelve `null` o `'RN-27: mensaje'` → `npm test` (verde).
3. Llámala desde el servicio: `const error = verificarX(...); if (error) throw new BadRequestException(error);`
4. Agrégala a la tabla de `docs/01-REQUISITOS.md` y a una spec.

### Un módulo nuevo
```powershell
cd backend
npx nest generate module modulos/nombre
npx nest generate controller modulos/nombre --no-spec
npx nest generate service modulos/nombre --no-spec
```
Luego: esquema en `esquemas/`, registrarlo en `base-datos.module.ts`, DTO, reglas y pruebas. Los imports terminan en `.js`.
