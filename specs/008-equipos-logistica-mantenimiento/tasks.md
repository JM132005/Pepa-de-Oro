# Tareas: Equipos, alquiler, logística y mantenimiento

**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md)

Formato: `[ID] [P?] Descripción` — **[P]** = se puede hacer en paralelo (archivos distintos). Las pruebas van primero.

## Fase 1 — Pruebas (rojo)

- [x] T001 [P] Pruebas de cruce y disponibilidad (RN-23, RN-24)
- [x] T002 [P] Pruebas de capacidad del camión (RN-25)
- [x] T003 [P] Pruebas de preventivo por tiempo o uso (RN-26)

## Fase 2 — Backend (verde)

- [x] T004 Activos, venta y alquiler con contrato PDF
- [x] T005 Viajes, fletes y hoja de ruta
- [x] T006 Órdenes de mantenimiento y cron diario

## Fase 3 — Frontend

- [x] T007 [P] Páginas Equipos, Logística y Mantenimiento

## Fase final — Verificación

- [x] T008 `npm test` y `ng build` sin errores
- [x] T009 Revisión manual con la semilla de 12 meses
