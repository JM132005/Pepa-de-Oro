# Especificación: Control de calidad

**Rama**: `006-calidad` · **Creada**: 2026-08-03 · **Estado**: Implementada · **Hito**: Entrega 5 · Campo y acopio

> Prueba de corte, humedad, defectos y cata; grado calculado por el sistema; no conformidades y liberación de lotes de producto.

## Historias de usuario y pruebas de aceptación

### Historia 1 — Calificar un lote de grano (Prioridad: P1)

**Por qué esta prioridad**: El grado no depende de quién lo mira.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un análisis con 4 % de violeta y 1 % de moho, **cuando** Calidad lo registra, **entonces** el sistema asigna el grado según la tabla de límites (RN-06).
2. **Dado** un usuario de ACOPIO, **cuando** intenta aprobar un lote, **entonces** la API responde 403 (RN-07).

### Historia 2 — Liberar producto terminado (Prioridad: P1)

**Por qué esta prioridad**: Nada sale a la venta sin control.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un lote de producto recién producido (todavía no liberado), **cuando** se intenta vender, **entonces** se rechaza hasta que Calidad lo libere (RN-11).

## Requisitos

### Funcionales

- **FR-001**: El certificado de calidad DEBE descargarse en PDF.
- **FR-002**: Una no conformidad DEBE tener responsable, acción y fecha de cierre.

### Reglas de negocio que cubre

RN-06, RN-07, RN-11 (ver la tabla completa en `docs/01-REQUISITOS.md`).

### Entidades clave

`lotes_grano`, `lotes_producto`

## Criterios de éxito

- **SC-001**: todas las pruebas de reglas del módulo pasan en el CI.
- **SC-002**: la semilla de 12 meses ejecuta el flujo sin errores inesperados (solo los rechazos de reglas previstos).
- **SC-003**: cada pantalla carga en menos de 2 s con los datos de la semilla.
