# Plan de implementación: Ventas, caja, cotizaciones, pedidos y facturación

**Rama**: `003-ventas-facturacion` · **Especificación**: [spec.md](./spec.md)

## Contexto técnico

- **Lenguaje**: TypeScript 5 (backend y frontend)
- **Dependencias**: NestJS 12 · Mongoose 9 · Angular 21 · ECharts 6 · PDFKit · ExcelJS · Nodemailer
- **Almacenamiento**: MongoDB 8
- **Pruebas**: Vitest (reglas puras) + semilla en CI
- **Plataforma**: web (escritorio y móvil desde 360 px)

## Revisión contra la constitución

| Principio | Cumple |
|---|---|
| I. Reglas primero con TDD | Sí — RN-17, RN-18, RN-19, RN-20, RN-21, RN-22 con prueba previa |
| II. Un sistema, dos caras | Sí |
| III. Trazabilidad | Sí — historial y auditoría |
| IV. Inventario | Sí — movimientos por cada cambio |
| V. Permisos por rol | Sí — `@Roles` en cada ruta |
| VI. Código que se entiende | Sí — comentarios en español |

## Estructura del código

```text
backend/src/
├── modulos/ventas/
├── modulos/facturacion/
frontend/src/app/
├── admin/Paginas/caja/
├── admin/Paginas/facturas/
├── admin/Paginas/cotizaciones/
├── admin/Paginas/pedidos/
├── admin/Paginas/clientes/
├── admin/Componentes/editor-lineas/
├── admin/Utils/calculos-venta.ts
```

## Decisiones

- Las reglas son funciones puras en `*.reglas.ts`; los servicios las llaman y traducen el error a `BadRequestException`.
- Los formularios del sistema se definen como listas de `CampoFormulario` (`admin/Formularios/campos.ts`) y se pintan con `FormularioDinamico`.
