# 01 · Qué pide el proyecto y dónde se cumple

> Este documento une **cada requisito** con el **archivo, la pantalla o el comando** donde se cumple, para
> mostrarlo rápido en la presentación. Tiene tres partes:
>
> 1. [Requisitos del parcial](#1-requisitos-del-parcial-github-actions-copilot-y-spec-kit): GitHub, GitHub Actions, Copilot y desarrollo guiado por especificaciones (SDD) con Spec Kit.
> 2. [Requisitos del sistema](#2-requisitos-del-sistema-lo-que-pidió-la-empresa): lo que pidió la empresa Pepa de Oro (documento de diseño).
> 3. [Las 26 reglas de negocio](#3-las-26-reglas-de-negocio-rn): función, prueba y pantalla de cada RN.
>
> ✅ = hecho en el código · 🧑‍💻 = lo hacen ustedes en GitHub (no se puede dejar hecho dentro del zip)

---

## 1. Requisitos del parcial (GitHub, Actions, Copilot y Spec Kit)

### 1.1 Repositorio y trabajo en equipo con GitHub

| Requisito | Estado | Dónde / cómo |
|---|---|---|
| Repositorio con frontend, backend y documentación | ✅ | `frontend/` (Angular), `backend/` (NestJS), `docs/`, `specs/` |
| No subir secretos ni archivos generados | ✅ | `.gitignore` (ignora `node_modules`, `dist`, `.env`); plantilla `backend/.env.example` |
| Saltos de línea consistentes entre Windows y Linux | ✅ | `.gitattributes` |
| Issues con historias de usuario | ✅ + 🧑‍💻 | `scripts/crear-issues.mjs` crea 26 Issues (uno por historia). Ejecutar: `node scripts/crear-issues.mjs` |
| Hitos (milestones) por entrega | ✅ + 🧑‍💻 | El mismo script crea 8 hitos: "Entrega 1 · Base" … "Entrega 8 · Analítica" |
| Etiquetas (prioridad y regla de negocio) | ✅ + 🧑‍💻 | El script crea `p1`, `p2`, `p3`, `bug`, `historia` y `rn-01` … `rn-26` |
| Plantillas de Issue | ✅ | `.github/ISSUE_TEMPLATE/historia.yml` (Como / Quiero / Para + criterios), `error.yml`, `config.yml` |
| Ramas por funcionalidad y Pull Requests | ✅ + 🧑‍💻 | Convención `NNN-nombre` (número de la spec). Plantilla `.github/pull_request_template.md` con lista de verificación y `Cierra #N` |
| Protección de la rama `main` | 🧑‍💻 | Settings → Rules → Rulesets: PR obligatorio con 1 aprobación + checks del CI en verde (pasos en `docs/07-FLUJO-GITHUB.md`) |
| Revisión de código entre compañeros | 🧑‍💻 | Cada PR lo aprueba el otro integrante |
| Actualización de dependencias | ✅ | `.github/dependabot.yml` (npm del backend y frontend, semanal) |
| Registro de cambios | ✅ | `CAMBIOS.md` (una sección por entrega) |

### 1.2 GitHub Actions (integración continua)

| Requisito | Estado | Dónde |
|---|---|---|
| Pipeline que se ejecuta en cada push y PR | ✅ | `.github/workflows/ci.yml` (`on: push / pull_request` a `main` y `develop`, y botón manual) |
| Instalar dependencias de forma reproducible | ✅ | `npm ci` (usa `package-lock.json`) con caché de npm |
| Revisar estilo de código (lint) | ✅ | Job **backend** → `npm run lint` (oxlint) |
| Ejecutar pruebas automáticas | ✅ | Job **backend** → `npm test` → **126 pruebas** de reglas (Vitest) |
| Compilar backend y frontend | ✅ | `npm run build` (NestJS) y `ng build --configuration production` (Angular) |
| Prueba de integración con base de datos real | ✅ | Job **semilla**: levanta MongoDB 8 como `service` y simula 1 mes de operación con los servicios reales; falla si no se generaron facturas |
| Guardar el resultado de la compilación | ✅ | `actions/upload-artifact` → `frontend-dist` (7 días) |
| Permisos mínimos y cancelar ejecuciones viejas | ✅ | `permissions: contents: read` y `concurrency` |

### 1.3 GitHub Copilot

| Requisito | Estado | Dónde |
|---|---|---|
| Contexto del proyecto para Copilot | ✅ | `.github/copilot-instructions.md`: idioma español, RN en `*.reglas.ts`, TDD, estructura de carpetas, límites de las plantillas Angular |
| Usar Copilot para generar la constitución, specs y código | 🧑‍💻 | En VS Code con la extensión de Copilot y Spec Kit: `/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement` (ver `docs/07-FLUJO-GITHUB.md`) |
| Copilot en la revisión de PR | 🧑‍💻 | En el PR: Reviewers → Copilot (si su cuenta lo tiene habilitado) |

### 1.4 Desarrollo guiado por especificaciones (SDD) con Spec Kit

| Requisito | Estado | Dónde |
|---|---|---|
| Constitución (principios que no se negocian) | ✅ | `.specify/memory/constitution.md` (7 principios, restricciones técnicas, flujo y gobierno) |
| Plantillas de Spec Kit | ✅ | `.specify/templates/spec-template.md`, `plan-template.md`, `tasks-template.md` |
| Especificación por funcionalidad (qué y por qué) | ✅ | `specs/001` … `specs/010` → `spec.md`: historias con prioridad, escenarios **Dado / Cuando / Entonces**, requisitos `FR-xxx`, RN y criterios de éxito |
| Plan técnico (cómo) | ✅ | `specs/NNN-*/plan.md`: contexto técnico, revisión contra la constitución y estructura de archivos |
| Lista de tareas | ✅ | `specs/NNN-*/tasks.md`: fases pruebas → backend → frontend → verificación, marcadas `[x]` |
| Pruebas antes del código (TDD) | ✅ | Cada `*.reglas.ts` tiene su `*.reglas.spec.ts` (19 archivos de prueba) |
| Specs e Issues consistentes | ✅ | `scripts/generar-specs.py` escribe las specs **y** `scripts/historias.json`, que lee el script de Issues |

Las 10 especificaciones:

| Spec | Funcionalidad | RN |
|---|---|---|
| 001 | Base: usuarios, roles, configuración y auditoría | RN-02 |
| 002 | Catálogo, bodegas e inventario con FEFO | RN-12 a RN-16 |
| 003 | Ventas, caja, cotizaciones, pedidos y facturación | RN-17 a RN-22 |
| 004 | Sitio web público, solicitudes y rastreo | — |
| 005 | Campo, acopio y poscosecha | RN-01 a RN-05 |
| 006 | Control de calidad | RN-06, RN-07, RN-11 |
| 007 | Producción: recetas, órdenes y costos | RN-08 a RN-10 |
| 008 | Equipos, alquiler, logística y mantenimiento | RN-23 a RN-26 |
| 009 | Paneles, informes y proyecciones | — |
| 010 | Datos de prueba e integración continua | — |

---

## 2. Requisitos del sistema (lo que pidió la empresa)

| Lo que se pidió | Estado | Backend | Frontend |
|---|---|---|---|
| **Web pública** solo para ver (sin compras), con precios y **stock en vivo** | ✅ | `modulos/web/` (`/api/publico/...`) | `publico/Paginas/productos`, `producto-detalle` (refresca el stock cada 20 s, `publico/Utils/stock-vivo.ts`) |
| Portada, nosotros, servicios, equipos, contacto | ✅ | `web.service.ts`, `contenido_web` | `publico/Paginas/inicio`, `nosotros`, `servicios`, `equipos`, `contacto` |
| Solicitudes desde la web (cotización, alquiler, servicio, "avísame cuando llegue") | ✅ | `POST /api/publico/solicitudes`; aviso automático cada 15 min (`@Cron` en `web.service.ts`) | `publico/Formularios/formulario-solicitud`, lista de interés; bandeja `admin/Paginas/solicitudes` |
| Rastreo del lote con código QR | ✅ | `modulos/rastreo/` | `publico/Paginas/rastreo` (con cámara si el navegador lo permite) |
| Contenido editable sin programar | ✅ | `PUT /api/contenido-web/:clave` | `admin/Paginas/contenido-web` |
| **Sistema interno con roles** (9 roles) | ✅ | `comun/guards/`, `@Roles(...)` | `admin/menu.ts` (menú por rol), `compartido/Controlador/auth.guard.ts` |
| Cultivo propio: haciendas, parcelas, labores, sanidad, clima, cosechas | ✅ | `modulos/campo/` | `admin/Paginas/campo`, `parcela-detalle` |
| Compra a productores con liquidación PDF | ✅ | `modulos/acopio/` | `admin/Paginas/acopio` |
| Fermentación y secado | ✅ | `modulos/poscosecha/` | `admin/Paginas/poscosecha`, `lote-grano` |
| Control de calidad y certificado | ✅ | `modulos/calidad/` | `admin/Paginas/calidad` |
| Producción con recetas, costos y etiquetas | ✅ | `modulos/produccion/` | `admin/Paginas/produccion` |
| Inventario por lotes con vencimiento (FEFO) | ✅ | `modulos/inventario/` | `admin/Paginas/inventario` |
| Venta por menor (caja) y por mayor (cotización → pedido → factura) | ✅ | `modulos/ventas/` | `admin/Paginas/caja`, `cotizaciones`, `pedidos`, `clientes` |
| **Facturación en PDF** (formato SRI) **enviada por correo** | ✅ | `modulos/facturacion/` (`pdf-factura.ts`, `correo.service.ts`) | `admin/Paginas/facturas` (ver PDF, reenviar, nota de crédito, abonos) |
| Venta y **alquiler de maquinaria y vehículos** | ✅ | `modulos/equipos/` (contrato PDF) | `admin/Paginas/equipos`; web `publico/Paginas/equipos` |
| Flota, viajes, fletes y guía de remisión | ✅ | `modulos/logistica/` | `admin/Paginas/logistica` |
| **Mantenimiento** preventivo y correctivo | ✅ | `modulos/mantenimiento/` (preventivos a las 06:00 con `@Cron`) | `admin/Paginas/mantenimiento` |
| **Paneles con KPIs** por área | ✅ | `modulos/analitica/kpis.service.ts` | `admin/Paginas/paneles`, `inicio-admin` (ECharts) |
| **Informes** descargables PDF y Excel | ✅ | `informes.service.ts` (gerencial automático el día 1 de cada mes) | `admin/Paginas/informes` |
| Proyecciones (ventas, cosecha, reorden, flujo de caja) | ✅ | `proyecciones.reglas.ts` + `proyecciones.service.ts` | `admin/Paginas/proyecciones` |
| Auditoría de acciones sensibles | ✅ | `modulos/auditoria/` (interceptor global) | `admin/Paginas/auditoria` |
| Configuración de la empresa (IVA, topes, establecimientos) | ✅ | `modulos/configuracion/` | `admin/Paginas/configuracion` |
| Datos ficticios con historia | ✅ | `semilla/` → `npm run seed` (12 meses) | — |
| Ilustraciones propias reemplazables | ✅ | — | `frontend/public/img/` (36 SVG) |
| Pendiente para después (fuera del alcance acordado) | — | Gemelo digital con sensores (IoT) | — |

---

## 3. Las 26 reglas de negocio (RN)

Cada regla es una **función pura** (sin base de datos) en un archivo `*.reglas.ts`, probada en el
`*.reglas.spec.ts` del mismo módulo. El servicio la llama y, si no se cumple, responde
`400 Bad Request` con el mensaje `"RN-xx: …"` que la pantalla muestra al usuario.

Rutas relativas a `backend/src/`.

| RN | Regla | Función | Archivo | Dónde se ve en el sistema |
|---|---|---|---|---|
| RN-01 | No se cosecha una parcela en período de carencia de un agroquímico | `verificarCarencia()`, `finCarencia()` | `modulos/campo/campo.reglas.ts` | Campo → Registrar cosecha |
| RN-02 | La cédula o el RUC deben pasar el dígito verificador | `validarCedula()`, `validarRuc()` | `comun/identificacion.reglas.ts` | Clientes, Productores, Caja (venta con cédula) |
| RN-03 | Un productor inactivo no entrega lotes | `verificarProductorActivo()` | `modulos/acopio/acopio.reglas.ts` | Acopio → Recepción |
| RN-04 | El descuento por humedad se aplica sobre el exceso a 7 % | `descuentoHumedadKg()` | `modulos/acopio/acopio.reglas.ts` | Acopio → Liquidación |
| RN-05 | No se asigna a un fermentador o tendal más kg que su capacidad | `verificarCapacidad()` | `modulos/poscosecha/poscosecha.reglas.ts` | Poscosecha → Iniciar fermentación / secado |
| RN-06 | El grado de calidad lo calcula el sistema con la tabla de límites | `calcularGradoCacao()`, `calcularGradoCafe()` | `modulos/calidad/calidad.reglas.ts` | Calidad → Evaluar lote |
| RN-07 | Solo Calidad y Gerencia evalúan o rechazan lotes | `puedeEvaluar()` | `modulos/calidad/calidad.reglas.ts` | Calidad (otros roles reciben 403) |
| RN-08 | Solo grano aprobado entra a producción | `verificarGranoAprobado()` | `modulos/produccion/produccion.reglas.ts` | Producción → Iniciar orden |
| RN-09 | Una orden no inicia sin insumos suficientes | `verificarInicio()`, `faltantes()` | `modulos/produccion/produccion.reglas.ts` | Producción → Iniciar orden (muestra el faltante) |
| RN-10 | Cerrar una orden descuenta insumos y suma producto terminado | `mermaProceso()`, `costoUnitario()` | `modulos/produccion/produccion.reglas.ts` | Producción → Cerrar orden |
| RN-11 | Un lote de producto no se vende hasta que Calidad lo libere | `puedeVenderse()`, `esVendible()` | `calidad.reglas.ts`, `inventario.reglas.ts` | Calidad → Liberar; Caja |
| RN-12 | El stock nunca queda negativo | `disponible()`, `asignarSalida()`, `abajo3()` | `modulos/inventario/inventario.reglas.ts` | Caja, Pedidos, Producción, Inventario |
| RN-13 | Las salidas siguen FEFO: primero lo que vence primero | `ordenarFefo()` | `modulos/inventario/inventario.reglas.ts` | Inventario → Kárdex (qué lote salió) |
| RN-14 | Un producto vencido no se vende | `estaVencido()`, `esVendible()` | `modulos/inventario/inventario.reglas.ts` | Caja; Inventario → Bajas |
| RN-15 | Un ajuste de inventario exige motivo y aprobación del gerente | `verificarAjuste()` | `modulos/inventario/inventario.reglas.ts` | Inventario → Ajustes |
| RN-16 | El precio por mayor se aplica desde la cantidad mínima | `precioUnitario()` | `modulos/productos/productos.reglas.ts` | Caja, Cotizaciones (editor de líneas) |
| RN-17 | El descuento manual no supera el tope del rol | `topeDescuento()`, `verificarDescuento()` | `modulos/ventas/ventas.reglas.ts` | Caja, Cotizaciones |
| RN-18 | No se vende a crédito si se supera el cupo o hay deuda vencida | `verificarCredito()` | `modulos/ventas/ventas.reglas.ts` | Pedidos, Facturas a crédito |
| RN-19 | Consumidor final solo hasta 50 USD | `verificarConsumidorFinal()` | `modulos/facturacion/facturacion.reglas.ts` | Caja (pide cédula o RUC) |
| RN-20 | El secuencial de factura es único y correlativo | `numeroComprobante()` + `ContadoresService` | `facturacion.reglas.ts`, `comun/servicios/contadores.service.ts` | Facturas (001-001-000000123) |
| RN-21 | Una factura no se borra: se anula con nota de crédito | `verificarNotaCredito()` | `modulos/facturacion/facturacion.reglas.ts` | Facturas → Anular |
| RN-22 | Una cotización vencida no se convierte en pedido | `cotizacionVigente()`, `verificarConversion()` | `modulos/ventas/ventas.reglas.ts` | Cotizaciones → Convertir en pedido |
| RN-23 | Un activo no se alquila si las fechas cruzan otro alquiler o un mantenimiento | `verificarDisponibilidad()` | `modulos/equipos/equipos.reglas.ts` | Equipos → Nuevo alquiler |
| RN-24 | Un activo en mantenimiento o con documentos vencidos no se usa, alquila ni asigna | `verificarActivoUsable()`, `documentosPorVencer()` | `modulos/equipos/equipos.reglas.ts` | Equipos, Logística, Producción |
| RN-25 | La carga de un viaje no supera la capacidad del camión | `verificarCarga()` | `modulos/logistica/logistica.reglas.ts` | Logística → Nuevo viaje |
| RN-26 | El preventivo se genera al cumplir tiempo o uso, lo que llegue primero | `estadoPreventivo()` | `modulos/mantenimiento/mantenimiento.reglas.ts` | Mantenimiento (cron diario 06:00) |

> 💡 Para mostrar una regla en vivo: **Ctrl + Shift + F** en VS Code, escribir `RN-19` y se ven la regla,
> su prueba y el servicio que la usa. En la pantalla: Caja → vender más de $50 a "Consumidor final".

### Cómo probarlas

```powershell
cd backend
npm test            # 126 pruebas, 19 archivos
npx vitest run modulos/ventas   # solo las de ventas
```
