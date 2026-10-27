# Tareas: Ventas, caja, cotizaciones, pedidos y facturación

**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md)

Formato: `[ID] [P?] Descripción` — **[P]** = se puede hacer en paralelo (archivos distintos). Las pruebas van primero.

## Fase 1 — Pruebas (rojo)

- [x] T001 [P] Pruebas de descuento, crédito y cotización vencida (RN-17, RN-18, RN-22)
- [x] T002 [P] Pruebas de consumidor final, secuencial y anulación (RN-19 a RN-21)

## Fase 2 — Backend (verde)

- [x] T003 Clientes con validación de identificación
- [x] T004 Turnos de caja y venta de mostrador
- [x] T005 Cotizaciones → pedidos → facturas
- [x] T006 Notas de crédito y abonos
- [x] T007 PDF de factura, cotización y nota de crédito
- [x] T008 Envío por correo (modo prueba .eml y Gmail)

## Fase 3 — Frontend

- [x] T009 [P] Páginas Caja, Facturas, Cotizaciones, Pedidos y Clientes

## Fase final — Verificación

- [x] T010 `npm test` y `ng build` sin errores
- [x] T011 Revisión manual con la semilla de 12 meses
