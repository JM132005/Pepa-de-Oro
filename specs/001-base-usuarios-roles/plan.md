# Plan de implementación: Base: usuarios, roles, configuración y auditoría

**Rama**: `001-base-usuarios-roles` · **Especificación**: [spec.md](./spec.md)

## Contexto técnico

- **Lenguaje**: TypeScript 5 (backend y frontend)
- **Dependencias**: NestJS 12 · Mongoose 9 · Angular 21 · ECharts 6 · PDFKit · ExcelJS · Nodemailer
- **Almacenamiento**: MongoDB 8
- **Pruebas**: Vitest (reglas puras) + semilla en CI
- **Plataforma**: web (escritorio y móvil desde 360 px)

## Revisión contra la constitución

| Principio | Cumple |
|---|---|
| I. Reglas primero con TDD | Sí — RN-02 con prueba previa |
| II. Un sistema, dos caras | Sí |
| III. Trazabilidad | Sí — historial y auditoría |
| IV. Inventario | Sí — movimientos por cada cambio |
| V. Permisos por rol | Sí — `@Roles` en cada ruta |
| VI. Código que se entiende | Sí — comentarios en español |

## Estructura del código

```text
backend/src/
├── comun/guards/
├── comun/identificacion.reglas.ts
├── modulos/auth/
├── modulos/usuarios/
├── modulos/configuracion/
├── modulos/auditoria/
frontend/src/app/
├── compartido/Controlador/auth.guard.ts
├── compartido/Controlador/token.interceptor.ts
├── admin/Paginas/login/
├── admin/Paginas/usuarios/
├── admin/Paginas/configuracion/
├── admin/Paginas/auditoria/
├── admin/layout-admin/
```

## Decisiones

- Las reglas son funciones puras en `*.reglas.ts`; los servicios las llaman y traducen el error a `BadRequestException`.
- Los formularios del sistema se definen como listas de `CampoFormulario` (`admin/Formularios/campos.ts`) y se pintan con `FormularioDinamico`.
