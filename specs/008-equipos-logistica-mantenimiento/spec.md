# Especificación: Equipos, alquiler, logística y mantenimiento

**Rama**: `008-equipos-logistica-mantenimiento` · **Creada**: 2026-08-03 · **Estado**: Implementada · **Hito**: Entrega 7 · Equipos y logística

> Ficha de activos, venta y alquiler de maquinaria, flota con viajes y fletes, documentos con vencimiento y mantenimiento preventivo/correctivo.

## Historias de usuario y pruebas de aceptación

### Historia 1 — Alquilar maquinaria (Prioridad: P1)

**Por qué esta prioridad**: Generar ingresos con equipos ociosos.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un tractor alquilado del 10 al 15, **cuando** se pide del 14 al 18, **entonces** se rechaza por cruce (RN-23).
2. **Dado** un activo EN_MANTENIMIENTO o con SOAT vencido, **cuando** se intenta alquilar o asignar, **entonces** se rechaza (RN-24).

### Historia 2 — Programar viajes (Prioridad: P1)

**Por qué esta prioridad**: Entregar sin sobrecargar.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un camión de 3 500 kg, **cuando** se cargan 3 800 kg, **entonces** se rechaza (RN-25).

### Historia 3 — Mantenimiento preventivo (Prioridad: P2)

**Por qué esta prioridad**: Evitar paradas no planificadas.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un plan cada 90 días o 250 horas, **cuando** se cumplen 250 horas antes de 90 días, **entonces** se genera la orden preventiva (RN-26).

## Requisitos

### Funcionales

- **FR-001**: Los documentos por vencer (30 días) DEBEN generar alerta.
- **FR-002**: El alquiler DEBE emitir contrato y factura con garantía.

### Reglas de negocio que cubre

RN-23, RN-24, RN-25, RN-26 (ver la tabla completa en `docs/01-REQUISITOS.md`).

### Entidades clave

`activos`, `alquileres`, `viajes`, `ordenes_mantenimiento`

## Criterios de éxito

- **SC-001**: todas las pruebas de reglas del módulo pasan en el CI.
- **SC-002**: la semilla de 12 meses ejecuta el flujo sin errores inesperados (solo los rechazos de reglas previstos).
- **SC-003**: cada pantalla carga en menos de 2 s con los datos de la semilla.
