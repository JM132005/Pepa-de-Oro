# Plan de implementación: [NOMBRE]

**Rama**: `[NNN-nombre-corto]` · **Especificación**: [spec.md](./spec.md)

## Contexto técnico

- **Lenguaje**: TypeScript 5 · **Dependencias**: NestJS 12, Mongoose 9, Angular 21
- **Almacenamiento**: MongoDB 8 · **Pruebas**: Vitest

## Revisión contra la constitución

| Principio | Cumple | Nota |
|---|---|---|
| I. Reglas primero con TDD | | |
| II. Un sistema, dos caras | | |
| III. Trazabilidad | | |
| IV. Inventario | | |
| V. Permisos por rol | | |
| VI. Código que se entiende | | |

## Estructura del código

```text
backend/src/modulos/[modulo]/
├── [modulo].reglas.ts        ← funciones puras (RN-xx)
├── [modulo].reglas.spec.ts   ← pruebas, se escriben primero
├── [modulo].service.ts
├── [modulo].controller.ts
├── dto/  esquemas/
frontend/src/app/admin/Paginas/[pagina]/
```

## Decisiones

- [decisión] — [por qué] — [alternativas descartadas]
