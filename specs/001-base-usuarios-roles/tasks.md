# Tareas: Base: usuarios, roles, configuración y auditoría

**Entrada**: [spec.md](./spec.md) · [plan.md](./plan.md)

Formato: `[ID] [P?] Descripción` — **[P]** = se puede hacer en paralelo (archivos distintos). Las pruebas van primero.

## Fase 2 — Backend (verde)

- [x] T001 Escribir pruebas de `validarCedula` y `validarRuc` (RN-02)
- [x] T002 Implementar identificacion.reglas.ts
- [x] T003 Módulo auth: login, perfil, estrategia JWT
- [x] T004 Guards JwtGuard y RolesGuard con pruebas
- [x] T005 CRUD de usuarios (solo gerente)
- [x] T006 Módulo configuración con valores iniciales
- [x] T007 Interceptor de auditoría para acciones sensibles

## Fase 3 — Frontend

- [x] T008 [P] Frontend: login, guards conectado/invitado/rol e interceptor
- [x] T009 [P] Frontend: layout admin con menú por rol
- [x] T010 [P] Páginas Usuarios, Configuración y Auditoría

## Fase final — Verificación

- [x] T011 `npm test` y `ng build` sin errores
- [x] T012 Revisión manual con la semilla de 12 meses
