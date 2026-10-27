# Tareas: Control de calidad

**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md)

Formato: `[ID] [P?] Descripción` — **[P]** = se puede hacer en paralelo (archivos distintos). Las pruebas van primero.

## Fase 1 — Pruebas (rojo)

- [x] T001 [P] Pruebas de grado por tabla y permisos (RN-06, RN-07)
- [x] T002 [P] Prueba de liberación (RN-11)

## Fase 2 — Backend (verde)

- [x] T003 Análisis, cata y no conformidades
- [x] T004 Certificado PDF

## Fase 3 — Frontend

- [x] T005 [P] Página Calidad

## Fase final — Verificación

- [x] T006 `npm test` y `ng build` sin errores
- [x] T007 Revisión manual con la semilla de 12 meses
