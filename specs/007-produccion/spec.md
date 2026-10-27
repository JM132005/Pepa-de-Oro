# Especificación: Producción: recetas, órdenes y costos

**Rama**: `007-produccion` · **Creada**: 2026-08-03 · **Estado**: Implementada · **Hito**: Entrega 6 · Producción

> Recetas (lista de materiales), cadena grano → nibs → pasta → chocolate, órdenes con consumo FEFO, costo real y lotes de producto en cuarentena.

## Historias de usuario y pruebas de aceptación

### Historia 1 — Planificar y ejecutar una orden (Prioridad: P1)

**Por qué esta prioridad**: Producir lo que se vende sin quedarse sin insumos.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** grano en estado RECHAZADO, **cuando** se elige como insumo, **entonces** se rechaza (RN-08).
2. **Dado** una orden que necesita 40 kg de pasta y hay 25, **cuando** se intenta iniciar, **entonces** se rechaza indicando el faltante (RN-09).
3. **Dado** una orden en proceso, **cuando** se cierra con la cantidad real, **entonces** se descuentan insumos, se crea el lote de producto y se calcula el costo unitario (RN-10).

## Requisitos

### Funcionales

- **FR-001**: El cierre DEBE ser "todo o nada" (transacción o compensación).
- **FR-002**: El costo DEBE incluir materiales, mano de obra y horas máquina.

### Reglas de negocio que cubre

RN-08, RN-09, RN-10 (ver la tabla completa en `docs/01-REQUISITOS.md`).

### Entidades clave

`recetas`, `ordenes_produccion`, `lotes_producto`, `movimientos_inventario`

## Criterios de éxito

- **SC-001**: todas las pruebas de reglas del módulo pasan en el CI.
- **SC-002**: la semilla de 12 meses ejecuta el flujo sin errores inesperados (solo los rechazos de reglas previstos).
- **SC-003**: cada pantalla carga en menos de 2 s con los datos de la semilla.
