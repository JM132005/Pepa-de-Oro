# 05 · Mapa del frontend (Angular): dónde está cada cosa

> Un solo proyecto Angular con **dos caras**: la web pública (`publico/`) y el sistema interno (`admin/`),
> que comparten servicios, entidades y componentes (`compartido/`). Rutas relativas a `frontend/src/`.

## Índice
1. [Vista de pájaro](#1-vista-de-pájaro)
2. [Rutas (pantallas)](#2-rutas-pantallas)
3. [Conceptos de Angular y dónde están](#3-conceptos-de-angular-y-dónde-están)
4. [Archivo por archivo](#4-archivo-por-archivo)
5. [Estilos e imágenes](#5-estilos-e-imágenes)
6. [Preguntas "¿dónde está…?"](#6-preguntas-dónde-está)
7. [Recetas](#7-recetas)

---

## 1. Vista de pájaro

```
frontend/
├── angular.json            → configuración del proyecto (estilos, build de producción)
├── public/img/             → 36 ilustraciones SVG (logo, banners, productos, equipos, haciendas)
└── src/
    ├── main.ts, index.html → arranque y página base
    ├── styles.css          → variables de color (:root), tipografía y piezas comunes
    ├── estilos/            → publico.css (web) y admin.css (sistema)
    └── app/
        ├── app.config.ts   → proveedores: router, HttpClient con interceptor, zona horaria
        ├── app.routes.ts   → mapa de pantallas con carga perezosa y guards
        ├── compartido/     → lo que usan las dos caras
        │   ├── Entidades/    forma de los datos (interfaces)
        │   ├── Servicios/    hablan con la API
        │   ├── Controlador/  guards e interceptor
        │   ├── Componentes/  tabla, gráfico, modal, formulario dinámico, visor PDF, íconos…
        │   └── Utils/        configuración, formatos, etiquetas, errores, validadores
        ├── publico/        → WEB PÚBLICA: layout, Componentes, Formularios, Paginas, Servicios, Utils
        └── admin/          → SISTEMA INTERNO: layout, menú, Componentes, Formularios, Paginas, Utils
```

---

## 2. Rutas (pantallas)

| URL | Pantalla | Quién entra |
|---|---|---|
| `/` | `publico/Paginas/inicio` | Todos |
| `/nosotros`, `/productos`, `/productos/:slug`, `/equipos`, `/servicios`, `/rastreo`, `/contacto` | Páginas públicas | Todos |
| `/login` | `admin/Paginas/login` | Solo sin sesión (`invitadoGuard`) |
| `/admin` | `admin/Paginas/inicio-admin` (tablero según el rol) | Con sesión (`conectadoGuard`) |
| `/admin/paneles/:area` | `paneles` | Según el área |
| `/admin/caja`, `/admin/facturas`, `/admin/cotizaciones`, `/admin/solicitudes` | Ventas | VENTAS |
| `/admin/pedidos` | Pedidos | VENTAS, BODEGA, LOGISTICA |
| `/admin/clientes` | Clientes | VENTAS, LOGISTICA, MANTENIMIENTO |
| `/admin/catalogo` | Catálogo y precios | BODEGA, VENTAS |
| `/admin/inventario` | Inventario | Con sesión (cada pestaña según el rol) |
| `/admin/campo`, `/admin/campo/parcelas/:id` | Campo | AGRONOMO, ACOPIO, CALIDAD |
| `/admin/acopio` | Acopio | ACOPIO, CALIDAD |
| `/admin/poscosecha`, `/admin/poscosecha/:id` | Poscosecha y lote de grano | ACOPIO, CALIDAD, PRODUCCION, BODEGA, AGRONOMO |
| `/admin/calidad` | Calidad | CALIDAD, ACOPIO, PRODUCCION, BODEGA |
| `/admin/produccion` | Producción | PRODUCCION, CALIDAD, BODEGA |
| `/admin/equipos` | Equipos y alquileres | VENTAS, LOGISTICA, MANTENIMIENTO |
| `/admin/logistica` | Flota y viajes | LOGISTICA, VENTAS, AGRONOMO, ACOPIO, MANTENIMIENTO |
| `/admin/mantenimiento` | Taller | MANTENIMIENTO, LOGISTICA, PRODUCCION, AGRONOMO, ACOPIO |
| `/admin/informes` | Informes | Con sesión (cada rol ve los suyos) |
| `/admin/proyecciones` | Proyecciones | VENTAS, PRODUCCION, AGRONOMO, ACOPIO, BODEGA, CALIDAD |
| `/admin/contenido-web`, `/admin/usuarios`, `/admin/configuracion`, `/admin/auditoria` | Administración | Solo GERENTE (`rolGuard()` sin roles) |
| `**` | `publico/Paginas/no-encontrada` (404) | Todos |

> Los roles exactos de cada ruta están en `app.routes.ts` (`canActivate: [rolGuard(...)]`) y el menú en `admin/menu.ts`.
> El GERENTE ve todo. El backend vuelve a validar el rol: el frontend solo oculta.

---

## 3. Conceptos de Angular y dónde están

| Concepto | Qué es | Dónde / ejemplo |
|---|---|---|
| Componente standalone | Pantalla o pieza con su plantilla y sus `imports` | Todos los `*.ts` de `Paginas/` y `Componentes/` |
| `signal()` / `computed()` | Estado que redibuja la pantalla solo | `contenido-web.ts`: `texto = signal('')`, `errorJson = computed(...)` |
| `effect()` | Reacciona cuando cambia un signal (ej. recargar al cambiar el `:id`) | `admin/Paginas/lote-grano/lote-grano.ts`, `parcela-detalle.ts` |
| `input()` / `output()` / `model()` | Datos que entran, eventos que salen y valores de doble vía | `tabla.ts` (`filas`, `seleccion`); `editor-lineas.ts` → `[(lineas)]` |
| `@if` / `@for` / `@switch` / `@let` | Control de flujo en la plantilla | `auditoria.ts` → `@if (detalle(); as d)` |
| `ChangeDetectionStrategy.OnPush` | Solo redibuja cuando cambian sus datos (más rápido) | Todos los componentes |
| `inject()` | Pide un servicio sin constructor | `private readonly ventas = inject(VentasService)` |
| Carga perezosa | La pantalla se descarga al abrirla | `app.routes.ts` → `loadComponent: () => import(...)` |
| `withComponentInputBinding` | `:id` de la URL llega como `input()` | `parcela-detalle.ts`, `lote-grano.ts`, `producto-detalle.ts` |
| Guards | Deciden si se abre una ruta | `compartido/Controlador/auth.guard.ts` (`conectadoGuard`, `invitadoGuard`, `rolGuard`) |
| Interceptor | Pega el token a cada petición y cierra la sesión si llega 401 | `compartido/Controlador/token.interceptor.ts` |
| `HttpClient` | Hace las peticiones | `compartido/Servicios/api.service.ts` (la única puerta a la API) |
| Formularios | Reactivos y dinámicos | `compartido/Componentes/formulario-dinamico` + descripciones en `admin/Formularios/campos.ts` |
| ECharts | Gráficos | `compartido/Componentes/grafico/grafico.ts` (un solo componente para todo) |

### El viaje de un dato hasta la pantalla
```
Página (signal) ──llama──▶ Servicio de dominio (ventas.service) ──▶ api.service (HttpClient)
   ──▶ token.interceptor (Bearer) ══HTTP══▶ API ══JSON══▶ subscribe(r => this.lista.set(r)) ──▶ la plantilla se redibuja
```

---

## 4. Archivo por archivo

### Raíz de la app

| Archivo | Qué hace |
|---|---|
| `main.ts` | punto de entrada del frontend: arranca la aplicación Angular con su configuración. |
| `app/app.config.ts` | configuración global de la aplicación Angular (proveedores). |
| `app/app.routes.ts` | MAPA de todas las pantallas de la aplicación. |
| `app/app.ts` | componente RAÍZ. Solo contiene el "hueco" donde se dibuja cada página (<router-outlet>) |

### `compartido/Controlador/` — guards e interceptor

| Archivo | Qué hace |
|---|---|
| `compartido/Controlador/auth.guard.ts` | GUARDS de rutas: deciden si se puede entrar a una pantalla. |
| `compartido/Controlador/token.interceptor.ts` | INTERCEPTOR: "intercepta" TODAS las peticiones HTTP antes de salir. |

### `compartido/Servicios/` — comunicación con la API

| Archivo | Qué hace |
|---|---|
| `compartido/Servicios/acopio.service.ts` | productores, precio del día, recepciones, liquidaciones, poscosecha y calidad. |
| `compartido/Servicios/analitica.service.ts` | paneles de KPIs, alertas (campana), proyecciones e informes. |
| `compartido/Servicios/api.service.ts` | puerta ÚNICA hacia el backend. Todos los demás servicios la usan. |
| `compartido/Servicios/archivos.service.ts` | abre o descarga los PDF y Excel que genera el backend. |
| `compartido/Servicios/auth.service.ts` | SERVICIO de sesión: inicia/cierra sesión y recuerda quién está conectado. |
| `compartido/Servicios/campo.service.ts` | haciendas, parcelas, trabajadores, labores, sanidad, clima y cosechas. |
| `compartido/Servicios/catalogo.service.ts` | productos, precios, bodegas e inventario (rutas /api/productos, /api/bodegas, /api/inventario). |
| `compartido/Servicios/lista-interes.service.ts` | la "lista de interés" del visitante de la web (NO es un carrito: no se paga). |
| `compartido/Servicios/notificacion.service.ts` | mensajes emergentes ("toasts") de éxito o error en la esquina de la pantalla. |
| `compartido/Servicios/operaciones.service.ts` | producción, activos, alquileres, viajes y mantenimiento. |
| `compartido/Servicios/sistema.service.ts` | usuarios, configuración de la empresa y bitácora de auditoría. |
| `compartido/Servicios/ventas.service.ts` | clientes, cotizaciones, pedidos, caja y facturas. |
| `compartido/Servicios/web.service.ts` | datos de la PÁGINA PÚBLICA (sin login) y administración de solicitudes y contenido. |

### `compartido/Entidades/` — forma de los datos

| Archivo | Qué hace |
|---|---|
| `compartido/Entidades/acopio.ts` | productores, precio del día, lotes de grano y liquidaciones. |
| `compartido/Entidades/analitica.ts` | paneles de KPIs, alertas, proyecciones e informes (misma forma que devuelve la API). |
| `compartido/Entidades/campo.ts` | haciendas, parcelas, labores, cosechas, sanidad, clima y trabajadores. |
| `compartido/Entidades/catalogo.ts` | productos (variantes), stock e inventario. |
| `compartido/Entidades/comunes.ts` | formas que se repiten en varios módulos. |
| `compartido/Entidades/operaciones.ts` | producción, activos, alquileres, viajes y mantenimiento. |
| `compartido/Entidades/usuario.ts` | forma de los datos de usuarios y sesión (lo que responde la API). |
| `compartido/Entidades/ventas.ts` | clientes, cotizaciones, pedidos, caja y facturas. |
| `compartido/Entidades/web.ts` | lo que ve el visitante de la página pública. |

### `compartido/Componentes/` — piezas reutilizables

| Archivo | Qué hace |
|---|---|
| `compartido/Componentes/cargando/cargando.ts` | indicador de "cargando..." y estado vacío reutilizables. |
| `compartido/Componentes/formulario-dinamico/formulario-dinamico.ts` | FORMULARIO que se arma a partir de una lista de campos. |
| `compartido/Componentes/grafico/grafico.ts` | componente ÚNICO de gráficos para todo el sistema (paneles, proyecciones, clima...). |
| `compartido/Componentes/icono/icono.ts` | iconos SVG propios (trazos simples de 24×24). Uso: <app-icono nombre="factura" /> |
| `compartido/Componentes/imagen/imagen.ts` | <img> con imagen de RESPALDO. Si la foto no existe (o todavía no la reemplazan por una real), |
| `compartido/Componentes/insignia/insignia.ts` | píldora de color para estados: <app-insignia [valor]="'PAGADA'" /> |
| `compartido/Componentes/modal/modal.ts` | ventana emergente reutilizable. El contenido se "proyecta" con <ng-content>. |
| `compartido/Componentes/notificaciones/notificaciones.ts` | dibuja los avisos (toasts) que pide NotificacionService. |
| `compartido/Componentes/panel-kpis/panel-kpis.ts` | dibuja un PANEL completo (tarjetas + gráficos + listas) tal como lo manda la API. |
| `compartido/Componentes/selector-periodo/selector-periodo.ts` | filtro de fechas reutilizable: botones rápidos (hoy, semana, mes, año) o rango a mano. |
| `compartido/Componentes/tabla/tabla.ts` | TABLA genérica para todos los listados del sistema: búsqueda, orden por columna, |
| `compartido/Componentes/tarjeta-kpi/tarjeta-kpi.ts` | una tarjeta de indicador: título, valor grande y variación (▲ verde / ▼ rojo). |
| `compartido/Componentes/visor-pdf/visor-pdf.ts` | muestra un PDF DENTRO de la página (factura, cotización, contrato...) con botones |

### `compartido/Utils/` — ayudas

| Archivo | Qué hace |
|---|---|
| `compartido/Utils/config.ts` | constantes de configuración del frontend. |
| `compartido/Utils/errores.ts` | convierte cualquier error de la API en un mensaje legible para el usuario. |
| `compartido/Utils/etiquetas.ts` | convierte los códigos del backend ("EN_MANTENIMIENTO") en textos para personas ("En mantenimiento") |
| `compartido/Utils/formato.ts` | funciones para MOSTRAR números y fechas como se acostumbra en Ecuador. |
| `compartido/Utils/validadores.ts` | validadores para formularios reactivos de Angular. |

### `publico/` — web pública

| Archivo | Qué hace |
|---|---|
| `publico/Componentes/boton-whatsapp/boton-whatsapp.ts` | botón verde flotante (abajo a la derecha) que abre WhatsApp con un mensaje ya escrito. |
| `publico/Componentes/cabecera/cabecera.ts` | barra superior de la web pública: logo, menú, botón de la lista de interés y acceso al sistema. |
| `publico/Componentes/panel-interes/panel-interes.ts` | cajón lateral con la LISTA DE INTERÉS del visitante. |
| `publico/Componentes/pie/pie.ts` | pie de página de la web pública: datos de la empresa, enlaces, horario y aviso legal. |
| `publico/Componentes/tarjeta-producto/tarjeta-producto.ts` | tarjeta del catálogo: foto, familia, nombre, precio "desde", estado del stock y sabores. |
| `publico/Formularios/formulario-solicitud/formulario-solicitud.ts` | datos de contacto del visitante (nombre, correo, teléfono, ciudad, mensaje). |
| `publico/Paginas/contacto/contacto.ts` | CONTACTO: formulario, WhatsApp, teléfonos, horario y mapa de la matriz y de la tienda. |
| `publico/Paginas/equipos/equipos.ts` | MAQUINARIA Y VEHÍCULOS en venta y en alquiler, con ficha técnica, tarifas y disponibilidad |
| `publico/Paginas/inicio/inicio.ts` | PORTADA de la web: banner rotativo, cifras de la empresa, las cuatro líneas de negocio, |
| `publico/Paginas/no-encontrada/no-encontrada.ts` | página 404: la dirección escrita no existe. |
| `publico/Paginas/nosotros/nosotros.ts` | QUIÉNES SOMOS: historia, misión, visión, valores, haciendas (con mapa), certificaciones y equipo. |
| `publico/Paginas/producto-detalle/producto-detalle.ts` | FICHA de un producto: galería, descripción, notas de cata, origen, ingredientes y |
| `publico/Paginas/productos/productos.ts` | CATÁLOGO de la web: filtros por familia, sabor, presentación y precio, búsqueda y tarjetas |
| `publico/Paginas/rastreo/rastreo.ts` | RASTREA TU CACAO: el visitante escribe (o escanea con la cámara) el código del lote que trae |
| `publico/Paginas/servicios/servicios.ts` | SERVICIOS: transporte de carga (rutas y tarifas referenciales), taller de mantenimiento |
| `publico/Servicios/sitio.service.ts` | datos de la empresa para TODA la web pública (cabecera, pie, contacto, nosotros). |
| `publico/Utils/stock-vivo.ts` | funciones para mantener el STOCK EN VIVO en la web pública. |
| `publico/layout-publico/layout-publico.ts` | "marco" de la web pública: cabecera arriba, la página en el medio (<router-outlet>), |

### `admin/` (sin páginas) — marco, menú, componentes, formularios y utilidades

| Archivo | Qué hace |
|---|---|
| `admin/menu.ts` | MENÚ del sistema interno: qué opciones hay, su ícono y qué roles las ven. |
| `admin/layout-admin/layout-admin.ts` | "marco" del SISTEMA INTERNO: menú lateral (solo con lo que los roles permiten), |
| `admin/Componentes/campana-alertas/campana-alertas.ts` | la CAMPANA de la barra superior. Junta las alertas de todos los módulos |
| `admin/Componentes/editor-lineas/editor-lineas.ts` | EDITOR DE LÍNEAS de una venta (lo usan la Caja, las Cotizaciones y los Pedidos). |
| `admin/Componentes/selector-cliente/selector-cliente.ts` | buscador de CLIENTES con opción de crear uno nuevo sin salir de la pantalla. |
| `admin/Formularios/campos.ts` | DESCRIPCIÓN de los formularios del sistema interno. Cada arreglo es la lista de campos que |
| `admin/Formularios/formulario-campo/formulario-campo.ts` | formulario para registrar una COSECHA o una LABOR de campo. |
| `admin/Utils/acciones.ts` | ayudante para los botones que llaman a la API ("Guardar", "Anular", "Cobrar"...). |
| `admin/Utils/calculos-venta.ts` | las MISMAS fórmulas del backend para que la pantalla muestre el total exacto antes de cobrar. |

### `admin/Paginas/` — pantallas del sistema interno

| Archivo | Qué hace |
|---|---|
| `admin/Paginas/acopio/acopio.ts` | ACOPIO: compra de cacao y café a productores. |
| `admin/Paginas/auditoria/auditoria.ts` | BITÁCORA DE AUDITORÍA (solo gerente): quién hizo qué y cuándo en las acciones sensibles |
| `admin/Paginas/caja/caja.ts` | CAJA DE LA TIENDA (venta por menor). |
| `admin/Paginas/calidad/calidad.ts` | CONTROL DE CALIDAD. |
| `admin/Paginas/campo/campo.ts` | HACIENDAS Y COSECHAS (cultivo propio). Pestañas: |
| `admin/Paginas/catalogo/catalogo.ts` | CATÁLOGO Y PRECIOS: todas las variantes (SKU) con precio por menor, por mayor, costo |
| `admin/Paginas/clientes/clientes.ts` | CLIENTES: consumidores, mayoristas, distribuidores y exportadores. |
| `admin/Paginas/configuracion/configuracion.ts` | CONFIGURACIÓN de la empresa (solo gerente). Todo lo que cambia sin tocar el código: |
| `admin/Paginas/contenido-web/contenido-web.ts` | CONTENIDO EDITABLE de la web pública (solo gerente): banners y frase de la portada, |
| `admin/Paginas/cotizaciones/cotizaciones.ts` | COTIZACIONES (venta por mayor y exportación). |
| `admin/Paginas/equipos/equipos.ts` | EQUIPOS Y ALQUILERES. |
| `admin/Paginas/facturas/facturas.ts` | FACTURAS Y COBROS. |
| `admin/Paginas/informes/informes.ts` | INFORMES DESCARGABLES. Cada rol ve los informes de su área (el gerente, todos). |
| `admin/Paginas/inicio-admin/inicio-admin.ts` | INICIO POR ROL: cada usuario entra a su propio tablero. |
| `admin/Paginas/inventario/inventario.ts` | INVENTARIO en 6 pestañas: |
| `admin/Paginas/login/login.ts` | INICIO DE SESIÓN del sistema interno. |
| `admin/Paginas/logistica/logistica.ts` | FLOTA Y VIAJES: entregas de pedidos, exportaciones a Puerto Bolívar, recolección de cacao |
| `admin/Paginas/lote-grano/lote-grano.ts` | HOJA DE VIDA de un lote de grano: de dónde vino (parcela o productor), la fermentación |
| `admin/Paginas/mantenimiento/mantenimiento.ts` | TALLER: mantenimiento de la maquinaria y los vehículos propios y servicio a clientes. |
| `admin/Paginas/paneles/paneles.ts` | PANELES DE CONTROL (dashboards). Un panel gerencial y uno por área (ventas, inventario, |
| `admin/Paginas/parcela-detalle/parcela-detalle.ts` | FICHA DE UNA PARCELA: etapa productiva (según la edad de las plantas), plan de labores |
| `admin/Paginas/pedidos/pedidos.ts` | PEDIDOS por mayor y de exportación, en un tablero por estado: |
| `admin/Paginas/poscosecha/poscosecha.ts` | POSCOSECHA: el camino del grano después de la cosecha o la compra. |
| `admin/Paginas/produccion/produccion.ts` | PRODUCCIÓN en la planta. |
| `admin/Paginas/proyecciones/proyecciones.ts` | PROYECCIONES Y PRONÓSTICOS con métodos simples y explicables (proyecciones.reglas.ts): |
| `admin/Paginas/solicitudes/solicitudes.ts` | SOLICITUDES que llegan desde la web pública (cotización, alquiler, servicio, contacto, |
| `admin/Paginas/usuarios/usuarios.ts` | USUARIOS del sistema (solo gerente). Un usuario puede tener VARIOS roles |

> Cada página tiene su `.ts` (lógica) y, si la plantilla es larga, su `.html` al lado (ej. `contenido-web.html`).

---

## 5. Estilos e imágenes

| Archivo | Qué contiene |
|---|---|
| `src/styles.css` | Variables `:root` (colores `--cacao-*`, `--oro-*`, `--crema`), botones `.btn`, tarjetas, tablas, formularios, rejillas |
| `src/estilos/publico.css` | Solo la web: cabecera, banner, tarjetas de producto, pie |
| `src/estilos/admin.css` | Solo el sistema: menú lateral, barra superior, fichas `.adm-ficha`, tableros |
| `angular.json` → `styles` | Registra los tres archivos |
| `public/img/` | Ilustraciones SVG (ver `public/img/LEEME.md`); se reemplazan con el mismo nombre |

> Para cambiar el color de toda la marca: `styles.css` → `:root`.

---

## 6. Preguntas "¿dónde está…?"

- **¿Dónde se pone la URL de la API?** → `compartido/Utils/config.ts` → `API_URL`.
- **¿Dónde se guarda la sesión?** → `compartido/Servicios/auth.service.ts` (localStorage `pepadeoro.sesion`).
- **¿Dónde se envía el token?** → `compartido/Controlador/token.interceptor.ts`.
- **¿Dónde se protege una pantalla por rol?** → `app.routes.ts` (`rolGuard`) y `admin/menu.ts`.
- **¿Dónde se vuelve a la página que quería abrir después del login?** → `auth.guard.ts` (`?volver=`).
- **¿Dónde se convierten los errores de la API en mensajes?** → `compartido/Utils/errores.ts`.
- **¿Dónde se muestran los avisos verdes/rojos?** → `NotificacionService` + `Componentes/notificaciones`.
- **¿Dónde se formatea el dinero y la fecha?** → `compartido/Utils/formato.ts` (`dinero()`, `fecha()`, `fechaHora()`).
- **¿Dónde están los textos de los estados (EN_MANTENIMIENTO → "En mantenimiento")?** → `compartido/Utils/etiquetas.ts`.
- **¿Dónde se calcula el total antes de cobrar?** → `admin/Utils/calculos-venta.ts` (mismas fórmulas que el backend).
- **¿Dónde se definen los formularios del sistema?** → `admin/Formularios/campos.ts`.
- **¿Dónde está la tabla con búsqueda, orden y exportar?** → `compartido/Componentes/tabla/`.
- **¿Dónde se abre un PDF?** → `compartido/Servicios/archivos.service.ts` + `Componentes/visor-pdf/`.
- **¿Dónde se refresca el stock de la web?** → `publico/Utils/stock-vivo.ts` (cada 20 s).
- **¿Dónde está la lista de interés (no es carrito)?** → `compartido/Servicios/lista-interes.service.ts` + `publico/Componentes/panel-interes/`.
- **¿Dónde está el botón de WhatsApp?** → `publico/Componentes/boton-whatsapp/`.

---

## 7. Recetas

### Una pantalla nueva en el sistema
1. Crea `admin/Paginas/mi-pagina/mi-pagina.ts` (componente standalone, `OnPush`).
2. Agrégala a `app.routes.ts` dentro de `admin` con `loadComponent` y `canActivate: [rolGuard('ROL')]`.
3. Agrega la opción a `admin/menu.ts` con su ícono y roles.

### Un campo nuevo en un formulario
Agrega un objeto a la lista de `admin/Formularios/campos.ts` (`nombre`, `etiqueta`, `tipo`, `requerido`).
El `FormularioDinamico` lo dibuja y lo valida solo. Los nombres con punto (`entrega.direccion`) arman objetos anidados.

### Límites de las plantillas de Angular
No se puede usar en el HTML: funciones flecha, expresiones regulares ni objetos literales con claves.
Solución: un método o un `computed()` en el `.ts`.
