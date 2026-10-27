# Plan de implementación: Control de calidad

**Rama**: `006-calidad` · **Especificación**: [spec.md](./spec.md)

## Contexto técnico

- **Lenguaje**: TypeScript 5 (backend y frontend)
- **Dependencias**: NestJS 12 · Mongoose 9 · Angular 21 · ECharts 6 · PDFKit · ExcelJS · Nodemailer
- **Almacenamiento**: MongoDB 8
- **Pruebas**: Vitest (reglas puras) + semilla en CI
- **Plataforma**: web (escritorio y móvil desde 360 px)

## Revisión contra la constitución

| Principio | Cumple |
|---|---|
| I. Reglas primero con TDD | Sí — RN-06, RN-07, RN-11 con prueba previa |
| II. Un sistema, dos caras | Sí |
| III. Trazabilidad | Sí — historial y auditoría |
| IV. Inventario | Sí — movimientos por cada cambio |
| V. Permisos por rol | Sí — `@Roles` en cada ruta |
| VI. Código que se entiende | Sí — comentarios en español |

## Estructura del código

```text
backend/src/
├── modulos/calidad/
frontend/src/app/
├── admin/Paginas/calidad/
```

## Decisiones

- Las reglas son funciones puras en `*.reglas.ts`; los servicios las llaman y traducen el error a `BadRequestException`.
- Los formularios del sistema se definen como listas de `CampoFormulario` (`admin/Formularios/campos.ts`) y se pintan con `FormularioDinamico`.
