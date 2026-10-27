# Especificación: Ventas, caja, cotizaciones, pedidos y facturación

**Rama**: `003-ventas-facturacion` · **Creada**: 2026-08-03 · **Estado**: Implementada · **Hito**: Entrega 3 · Ventas y facturación

> Caja de la tienda con turnos, ventas por mayor con cotización → pedido → factura, crédito con cupo, cobros, notas de crédito y PDF enviado por correo.

## Historias de usuario y pruebas de aceptación

### Historia 1 — Vender en la caja (Prioridad: P1)

**Por qué esta prioridad**: La tienda atiende rápido y cuadra el turno.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** un turno abierto, **cuando** la cajera vende 3 barras a consumidor final por 18 USD, **entonces** se emite la factura con secuencial correlativo (RN-20) y baja el stock.
2. **Dado** una venta de 65 USD, **cuando** se intenta como consumidor final, **entonces** el sistema pide cédula o RUC (RN-19).
3. **Dado** un descuento manual del 20 % hecho por VENTAS, **cuando** el tope del rol es 10 %, **entonces** se rechaza (RN-17).

### Historia 2 — Cotizar y vender por mayor (Prioridad: P1)

**Por qué esta prioridad**: Clientes mayoristas reciben precio y condiciones formales.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** una cotización vencida, **cuando** se intenta convertir en pedido, **entonces** el sistema lo impide (RN-22).
2. **Dado** un cliente con deuda vencida, **cuando** pide a crédito, **entonces** se rechaza (RN-18).

### Historia 3 — Corregir una factura (Prioridad: P2)

**Por qué esta prioridad**: Cumplir la norma: una factura emitida no se borra.

**Prueba independiente**: se puede demostrar sola desde la interfaz o con una petición a la API.

**Escenarios de aceptación**:

1. **Dado** una factura emitida con error, **cuando** se anula, **entonces** se genera una nota de crédito y la factura queda ANULADA, nunca eliminada (RN-21).

## Requisitos

### Funcionales

- **FR-001**: El número de comprobante DEBE ser único por tipo (índice compuesto tipo + número).
- **FR-002**: La factura DEBE generarse en PDF con formato SRI y enviarse al correo del cliente.
- **FR-003**: El cierre de turno DEBE comparar el efectivo contado con el esperado y registrar la diferencia.
- **FR-004**: Los abonos DEBEN reducir el saldo y liberar cupo de crédito.

### Reglas de negocio que cubre

RN-17, RN-18, RN-19, RN-20, RN-21, RN-22 (ver la tabla completa en `docs/01-REQUISITOS.md`).

### Entidades clave

`clientes`, `cotizaciones`, `pedidos`, `facturas`, `turnos_caja`, `contadores`

## Criterios de éxito

- **SC-001**: todas las pruebas de reglas del módulo pasan en el CI.
- **SC-002**: la semilla de 12 meses ejecuta el flujo sin errores inesperados (solo los rechazos de reglas previstos).
- **SC-003**: cada pantalla carga en menos de 2 s con los datos de la semilla.
