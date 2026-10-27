# Instrucciones para GitHub Copilot en Pepa de Oro

Copilot lee este archivo y lo usa como contexto en cada sugerencia y en el chat.

- Responde y escribe el código **en español**: nombres de variables, métodos, clases, comentarios y mensajes.
- Cada archivo nuevo empieza con un comentario `// archivo.ts → qué es y para qué sirve`.
- Las reglas de negocio se identifican como **RN-01 … RN-26** (tabla en `docs/01-REQUISITOS.md`). Viven en
  funciones puras dentro de `backend/src/modulos/<modulo>/<modulo>.reglas.ts`, con su prueba Vitest en
  `<modulo>.reglas.spec.ts`. Propón primero la prueba y luego el código (TDD).
- Backend: NestJS 12 + Mongoose 9. DTO con `class-validator`; rutas protegidas con `@Roles(...)`.
  Los errores de regla se lanzan como `BadRequestException('RN-xx: mensaje')`.
- Inventario: toda entrada o salida pasa por `InventarioService` (nunca actualizar `lotes_producto` a mano).
- Frontend: Angular 21 standalone, `signal`/`computed`, `ChangeDetectionStrategy.OnPush`, `@if`/`@for`.
  Carpetas: `Componentes/`, `Controlador/`, `Entidades/`, `Formularios/`, `Paginas/`, `Servicios/`, `Utils/`.
  En plantillas no uses funciones flecha, expresiones regulares ni objetos literales con claves: usa métodos o `computed`.
- Sigue la constitución de `.specify/memory/constitution.md` y las especificaciones de `specs/`.
