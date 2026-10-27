# Especificación: Catálogo, bodegas e inventario con FEFO

**Rama**: `002-catalogo-inventario` · **Creada**: 2026-08-03 · **Estado**: Implementada · **Hito**: Entrega 2 · Catálogo e inventario

> Productos con variantes, precios por menor y por mayor, bodegas, lotes con vencimiento, movimientos y ajustes aprobados.

## Historias de usuario y pruebas de aceptación

### Historia 1 — Mantener el catálogo (Prioridad: P1)

**Por qué esta prioridad**: Ventas y la web muestran precios correctos.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** el gerente, **cuando** publica un producto con precio por mayor desde 12 unidades, **entonces** la web lo muestra con su stock y la caja aplica el precio desde la unidad 12 (RN-16).

### Historia 2 — Despachar primero lo que vence primero (Prioridad: P1)

**Por qué esta prioridad**: Evitar pérdidas por vencimiento.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** dos lotes del mismo producto que vencen en marzo y en junio, **cuando** se vende una unidad, **entonces** sale del lote de marzo (RN-13).
2. **Dado** un lote vencido, **cuando** se intenta vender, **entonces** el sistema lo rechaza (RN-14) y lo propone para baja.

### Historia 3 — Ajustar inventario con control (Prioridad: P2)

**Por qué esta prioridad**: Las diferencias de conteo no se corrigen a escondidas.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** bodega registra un faltante, **cuando** no indica motivo, **entonces** el ajuste se rechaza (RN-15).
2. **Dado** un ajuste con motivo, **cuando** el gerente lo aprueba, **entonces** se crea el movimiento y el stock nunca queda negativo (RN-12).

## Requisitos

### Funcionales

- **FR-001**: Cada entrada, salida, transferencia o ajuste DEBE crear un `movimiento_inventario`.
- **FR-002**: Las salidas DEBEN reservar y descontar lotes por fecha de vencimiento ascendente (FEFO).
- **FR-003**: El sistema DEBE avisar de stock bajo y de lotes por vencer (30 días).
- **FR-004**: Los cálculos de cantidades DEBEN tolerar errores de redondeo de punto flotante (tolerancia 0,0005).

### Reglas de negocio que cubre

RN-12, RN-13, RN-14, RN-15, RN-16 (ver la tabla completa en `docs/01-REQUISITOS.md`).

### Entidades clave

`productos`, `recetas`, `bodegas`, `lotes_producto`, `movimientos_inventario`, `precios_dia`

## Criterios de éxito

- **SC-001**: todas las pruebas de reglas del módulo pasan en el CI.
- **SC-002**: la semilla de 12 meses ejecuta el flujo sin errores inesperados (solo los rechazos de reglas previstos).
- **SC-003**: cada pantalla carga en menos de 2 s con los datos de la semilla.
