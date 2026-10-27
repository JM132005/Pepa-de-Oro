# Tareas: Campo, acopio y poscosecha

**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md)

Formato: `[ID] [P?] Descripción` — **[P]** = se puede hacer en paralelo (archivos distintos). Las pruebas van primero.

## Fase 1 — Pruebas (rojo)

- [x] T001 [P] Pruebas de carencia (RN-01)
- [x] T002 [P] Pruebas de productor inactivo y descuento por humedad (RN-03, RN-04)
- [x] T003 [P] Pruebas de capacidad (RN-05)

## Fase 2 — Backend (verde)

- [x] T004 Campo: haciendas, parcelas, labores, sanidad, cosechas, clima
- [x] T005 Acopio: productores, precios del día, recepción y liquidación PDF
- [x] T006 Poscosecha: fermentación, volteos, secado, humedad

## Fase 3 — Frontend

- [x] T007 [P] Páginas Campo, Parcela, Acopio, Poscosecha y Lote de grano

## Fase final — Verificación

- [x] T008 `npm test` y `ng build` sin errores
- [x] T009 Revisión manual con la semilla de 12 meses
