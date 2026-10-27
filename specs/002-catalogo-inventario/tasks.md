# Tareas: Catálogo, bodegas e inventario con FEFO

**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md)

Formato: `[ID] [P?] Descripción` — **[P]** = se puede hacer en paralelo (archivos distintos). Las pruebas van primero.

## Fase 1 — Pruebas (rojo)

- [x] T001 [P] Pruebas de precio por mayor (RN-16)
- [x] T002 [P] Pruebas de stock no negativo, FEFO, vencido y ajuste (RN-12 a RN-15)

## Fase 2 — Backend (verde)

- [x] T003 Esquemas de producto, bodega, lote y movimiento
- [x] T004 InventarioService: entrada, salida FEFO, reserva, transferencia, ajuste
- [x] T005 Normalizar cantidades con $round tras cada operación
- [x] T006 Alertas de stock bajo y por vencer

## Fase 3 — Frontend

- [x] T007 [P] Página Catálogo con variantes y publicación web
- [x] T008 [P] Página Inventario: existencias, lotes, kárdex, ajustes y bajas

## Fase final — Verificación

- [x] T009 `npm test` y `ng build` sin errores
- [x] T010 Revisión manual con la semilla de 12 meses
