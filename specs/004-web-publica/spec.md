# Especificación: Sitio web público, solicitudes y rastreo

**Rama**: `004-web-publica` · **Creada**: 2026-08-03 · **Estado**: Implementada · **Hito**: Entrega 4 · Sitio web

> Portada, nosotros, catálogo con precio y stock en vivo, equipos en alquiler, servicios, contacto con solicitudes y rastreo del lote por código QR.

## Historias de usuario y pruebas de aceptación

### Historia 1 — Ver productos con stock real (Prioridad: P1)

**Por qué esta prioridad**: El cliente sabe qué hay antes de llamar.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un producto publicado con 0 unidades, **cuando** un visitante abre el catálogo, **entonces** ve "Agotado" y puede pedir aviso.

### Historia 2 — Enviar una solicitud (Prioridad: P1)

**Por qué esta prioridad**: Sin compra en línea: el equipo de ventas responde.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un visitante, **cuando** llena el formulario de cotización, **entonces** se crea una solicitud que ve Ventas en el sistema.

### Historia 3 — Rastrear el origen de mi chocolate (Prioridad: P2)

**Por qué esta prioridad**: Diferenciar la marca por trazabilidad.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** el código impreso en la barra, **cuando** se consulta en /rastreo, **entonces** se ve la hacienda o cantón, fermentación, secado, calidad y fecha de elaboración sin datos privados.

## Requisitos

### Funcionales

- **FR-001**: Las rutas `/api/publico/...` NO DEBEN exigir token y solo leen o crean solicitudes.
- **FR-002**: El contenido (textos, banners, testimonios) DEBE ser editable por el gerente sin programar.
- **FR-003**: La web DEBE verse bien desde 360 px de ancho sin desplazamiento horizontal.

### Entidades clave

`contenido_web`, `solicitudes_web`, `productos`, `activos`

## Criterios de éxito

- **SC-001**: todas las pruebas de reglas del módulo pasan en el CI.
- **SC-002**: la semilla de 12 meses ejecuta el flujo sin errores inesperados (solo los rechazos de reglas previstos).
- **SC-003**: cada pantalla carga en menos de 2 s con los datos de la semilla.
