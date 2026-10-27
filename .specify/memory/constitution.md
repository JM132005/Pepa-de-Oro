# Constitución de Pepa de Oro

> Spec Kit (`github/spec-kit`) trabaja con **Desarrollo Guiado por Especificaciones (SDD)**: primero se escribe
> QUÉ debe hacer el sistema y POR QUÉ (`spec.md`), luego CÓMO se construye (`plan.md`) y al final la lista de
> pasos (`tasks.md`). Esta constitución son las reglas que TODA especificación, plan y tarea debe respetar.
> Si una propuesta choca con un principio, se cambia la propuesta o se enmienda la constitución (ver al final).

**Versión**: 1.0.0 · **Ratificada**: 2026-08-03 · **Última enmienda**: 2026-10-20

## Principios

### I. Las reglas de negocio primero, con pruebas (TDD) — NO NEGOCIABLE
Cada regla de negocio tiene un identificador **RN-xx** (hoy RN-01 a RN-26), vive en un archivo de reglas
**puro** (`*.reglas.ts`: funciones sin base de datos ni HTTP) y su prueba (`*.reglas.spec.ts`) se escribe
**antes** del código. Ciclo: rojo (la prueba falla) → verde (se programa lo mínimo) → refactor.
Un servicio nunca reimplementa una regla: llama a la función de reglas.

### II. Un solo sistema, dos caras
Un frontend Angular (`publico/` y `admin/`), una API NestJS y una base MongoDB. La web pública **solo lee**
catálogo, stock, contenido y rastreo, y **recibe solicitudes** (`/api/publico/...`); no vende en línea.
Todo lo demás exige token JWT y rol.

### III. Trazabilidad de punta a punta
Todo kilo se puede seguir: parcela o productor → lote de grano → fermentación y secado → análisis de calidad →
orden de producción → lote de producto → factura. Cada cambio de estado guarda un evento en el `historial`
del documento; las acciones sensibles se registran en `auditoria` con el valor anterior y el nuevo.

### IV. El inventario no miente
El stock nunca queda negativo (RN-12), las salidas siguen FEFO (RN-13), lo vencido no se vende (RN-14) y los
ajustes exigen motivo y aprobación del gerente (RN-15). Toda entrada o salida crea un `movimiento_inventario`.
Las operaciones que tocan varias colecciones (cerrar una orden, emitir una factura) son "todo o nada".

### V. Permisos mínimos por rol
Roles: GERENTE, AGRONOMO, ACOPIO, CALIDAD, PRODUCCION, BODEGA, VENTAS, LOGISTICA, MANTENIMIENTO.
El backend valida el rol en cada ruta (`@Roles(...)` + `RolesGuard`); el frontend solo oculta lo que no
corresponde, nunca es la única barrera.

### VI. Código que se entiende
Todo en español (nombres, comentarios, mensajes). Cada archivo empieza con un comentario que dice qué es y
para qué sirve; cada clase, método y comando no evidente lleva su explicación. Estructura por carpetas fijas:
`Componentes/`, `Controlador/`, `Entidades/`, `Formularios/`, `Paginas/`, `Servicios/`, `Utils/`.

### VII. Datos de prueba realistas
La semilla (`npm run seed`) simula 12 meses de operación **usando los mismos servicios de la API**, de modo que
las reglas también se prueban con datos. Nada de datos reales de personas: todo es ficticio.

## Restricciones técnicas

| Tema | Decisión |
|---|---|
| Frontend | Angular 21 standalone, signals, `ChangeDetectionStrategy.OnPush`, control de flujo `@if/@for` |
| Backend | NestJS 12, Mongoose 9, `ValidationPipe` con `whitelist: true`, JWT |
| Base | MongoDB 8 (índices únicos y compuestos, consultas con operadores $gte, $in, $inc, $push, $round; time series para el clima) |
| Pruebas | Vitest (reglas), integración con la semilla en CI |
| PDF y correo | Generados en el backend (PDFKit, ExcelJS, Nodemailer + Gmail; en desarrollo, buzón de prueba) |
| Facturas | Formato SRI Ecuador (no autorizadas electrónicamente), IVA 15 % / 0 % |

## Flujo de trabajo

1. Se abre un **Issue** por historia (plantilla "Historia de usuario") con su RN y criterios de aceptación.
2. Rama `NNN-nombre-corto` (el número de la especificación) desde `develop`.
3. `/speckit.specify` → `spec.md`; `/speckit.plan` → `plan.md`; `/speckit.tasks` → `tasks.md`.
4. Pull Request hacia `develop` con la plantilla; el **CI** (lint, pruebas, build y semilla) debe pasar.
5. Revisión del compañero; `develop` → `main` al cerrar cada entrega.

## Gobierno

Esta constitución está por encima de cualquier otra práctica. Una enmienda se propone por Pull Request que
cambie este archivo, explique el motivo y suba la versión (MAYOR: se quita o redefine un principio;
MENOR: se agrega uno; PARCHE: redacción). Todo PR se revisa contra estos principios.
