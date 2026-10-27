# Especificación: Campo, acopio y poscosecha

**Rama**: `005-campo-acopio-poscosecha` · **Creada**: 2026-08-03 · **Estado**: Implementada · **Hito**: Entrega 5 · Campo y acopio

> Haciendas y parcelas con labores, sanidad y cosechas; compra a productores con liquidación; fermentación, volteos y secado con control de capacidad.

## Historias de usuario y pruebas de aceptación

### Historia 1 — Registrar labores y cosechas (Prioridad: P1)

**Por qué esta prioridad**: Saber cuánto produce cada parcela y a qué costo.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** una parcela fumigada ayer con un producto de 14 días de carencia, **cuando** se intenta cosechar, **entonces** se rechaza (RN-01).

### Historia 2 — Comprar cacao a productores (Prioridad: P1)

**Por qué esta prioridad**: Pagar justo y con respaldo.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un productor inactivo, **cuando** entrega un lote, **entonces** se rechaza (RN-03).
2. **Dado** cacao seco al 9 % de humedad, **cuando** se liquida, **entonces** se descuenta solo el exceso sobre 7 % (RN-04).

### Historia 3 — Fermentar y secar sin pasarse de capacidad (Prioridad: P1)

**Por qué esta prioridad**: No dañar el grano por sobrecarga.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un fermentador de 1 000 kg con 600 kg, **cuando** se asignan 500 kg más, **entonces** se rechaza (RN-05).

## Requisitos

### Funcionales

- **FR-001**: Cada lote de grano DEBE tener código único y un historial de eventos.
- **FR-002**: El clima diario DEBE guardarse en una colección time series.
- **FR-003**: La liquidación DEBE generar un PDF para el productor.

### Reglas de negocio que cubre

RN-01, RN-02, RN-03, RN-04, RN-05 (ver la tabla completa en `docs/01-REQUISITOS.md`).

### Entidades clave

`haciendas`, `parcelas`, `labores`, `cosechas`, `monitoreos_sanidad`, `trabajadores`, `clima`, `productores`, `liquidaciones`, `lotes_grano`

## Criterios de éxito

- **SC-001**: todas las pruebas de reglas del módulo pasan en el CI.
- **SC-002**: la semilla de 12 meses ejecuta el flujo sin errores inesperados (solo los rechazos de reglas previstos).
- **SC-003**: cada pantalla carga en menos de 2 s con los datos de la semilla.
