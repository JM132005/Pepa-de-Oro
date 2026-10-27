# Especificación: Paneles, informes y proyecciones

**Rama**: `009-paneles-informes-proyecciones` · **Creada**: 2026-08-03 · **Estado**: Implementada · **Hito**: Entrega 8 · Analítica

> KPIs por área calculados en el backend, informes descargables en PDF y Excel, y pronósticos de cosecha, ventas y flujo de caja.

## Historias de usuario y pruebas de aceptación

### Historia 1 — Ver el estado del negocio (Prioridad: P1)

**Por qué esta prioridad**: Decidir con datos.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** el gerente, **cuando** abre el panel general y elige "últimos 90 días", **entonces** ve ventas, margen, stock valorizado y alertas con gráficos.

### Historia 2 — Descargar informes (Prioridad: P2)

**Por qué esta prioridad**: Llevar la información a reuniones y al contador.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un informe de ventas, **cuando** se descarga en Excel, **entonces** contiene las mismas cifras que el panel.

### Historia 3 — Proyectar la temporada (Prioridad: P2)

**Por qué esta prioridad**: Planificar compras y personal.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** 12 meses de historia, **cuando** se abre Proyecciones, **entonces** se ve la cosecha esperada por mes con estacionalidad.

## Requisitos

### Funcionales

- **FR-001**: Todos los KPIs DEBEN calcularse en el backend (consultas filtradas en MongoDB), no en el navegador.
- **FR-002**: Cada panel DEBE respetar el rol (solo ve su área).

### Entidades clave

`(todas, solo lectura)`

## Criterios de éxito

- **SC-001**: todas las pruebas de reglas del módulo pasan en el CI.
- **SC-002**: la semilla de 12 meses ejecuta el flujo sin errores inesperados (solo los rechazos de reglas previstos).
- **SC-003**: cada pantalla carga en menos de 2 s con los datos de la semilla.
