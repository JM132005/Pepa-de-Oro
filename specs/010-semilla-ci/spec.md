# Especificación: Datos de prueba e integración continua

**Rama**: `010-semilla-ci` · **Creada**: 2026-08-03 · **Estado**: Implementada · **Hito**: Entrega 8 · Analítica

> Semilla que simula 12 meses con los servicios reales, ilustraciones SVG, pipeline de GitHub Actions y script de Issues.

## Historias de usuario y pruebas de aceptación

### Historia 1 — Tener datos realistas para la demo (Prioridad: P1)

**Por qué esta prioridad**: Mostrar paneles con historia.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** una base vacía, **cuando** se ejecuta `npm run seed`, **entonces** hay 12 meses de ventas, órdenes cerradas, cosechas y viajes, y las reglas rechazan lo que deben.

### Historia 2 — Saber si algo se rompió (Prioridad: P1)

**Por qué esta prioridad**: Revisar cada PR automáticamente.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un Pull Request, **cuando** se abre hacia develop, **entonces** GitHub Actions corre lint, pruebas, builds y la semilla de 1 mes.

## Requisitos

### Funcionales

- **FR-001**: La semilla DEBE usar los servicios de la API (no insertar a mano saltándose las reglas).
- **FR-002**: El CI NO DEBE requerir secretos para pasar.

### Entidades clave

`(todas)`

## Criterios de éxito

- **SC-001**: todas las pruebas de reglas del módulo pasan en el CI.
- **SC-002**: la semilla de 12 meses ejecuta el flujo sin errores inesperados (solo los rechazos de reglas previstos).
- **SC-003**: cada pantalla carga en menos de 2 s con los datos de la semilla.
