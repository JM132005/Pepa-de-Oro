# 🌱 Pepa de Oro — Cacao & Café de El Oro

Sistema completo para una empresa orense que **cultiva, compra, transforma y vende** cacao y café
(grano, chocolate, cobertura, café) por menor y por mayor, y que además **vende y alquila maquinaria**,
hace **fletes** y presta servicio de **taller**.

Tiene dos caras sobre una sola API:

- 🌐 **Web pública**: catálogo con precio y **stock en vivo**, maquinaria en alquiler, servicios, contacto,
  solicitudes de cotización y **"Rastrea tu cacao"** con el código QR del empaque. No vende en línea.
- 🔐 **Sistema interno** con 9 roles: caja, facturas en PDF por correo, cotizaciones, pedidos, inventario
  por lotes (FEFO), campo, acopio, poscosecha, calidad, producción, equipos, logística, mantenimiento,
  paneles de KPIs, informes y proyecciones.

Proyecto del parcial de **Programación Móvil** (GitHub, GitHub Actions, Copilot y desarrollo guiado por
especificaciones con Spec Kit) y base para **Bases de Datos No Estructuradas** (MongoDB).

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21 (standalone, signals), ECharts |
| Backend | NestJS 12, Mongoose 9, JWT, PDFKit, ExcelJS, Nodemailer |
| Base de datos | MongoDB 8 (32 colecciones, una *time series*) |
| Pruebas | Vitest: **126 pruebas** de las 26 reglas de negocio |
| CI | GitHub Actions: lint, pruebas, builds y semilla sobre MongoDB |
| SDD | Spec Kit: constitución + 10 especificaciones |

## Arranque rápido

```powershell
# 1. Backend
cd backend
npm install
Copy-Item .env.example .env
npm run seed          # 12 meses de datos ficticios (~5 min)
npm run start:dev     # http://localhost:3000/api/salud

# 2. Frontend (otra terminal)
cd frontend
npm install
npm start             # http://localhost:4200
```

Entrar en <http://localhost:4200/login> con `gerente@pepadeoro.ec` / `PepaDeOro2026*`
(la pantalla trae botones para cada rol). Detalles en [docs/02-INSTALACION.md](docs/02-INSTALACION.md).

## Estructura

```
pepadeoro/
├── backend/        API NestJS: 19 módulos, reglas RN-01…RN-26 con pruebas, semilla
├── frontend/       Angular: publico/ (web), admin/ (sistema), compartido/
├── specs/          Spec Kit: 001…010 (spec, plan, tasks)
├── .specify/       Constitución y plantillas de Spec Kit
├── .github/        CI, plantillas de Issues y PR, Copilot, Dependabot
├── scripts/        Crear Issues (gh), generar specs e ilustraciones
├── docs/           Documentación (abajo)
└── CAMBIOS.md      Registro de cambios por entrega
```

## Documentación

| Documento | Para qué |
|---|---|
| [01 · Requisitos](docs/01-REQUISITOS.md) | Qué pide el proyecto y dónde se cumple; las 26 reglas con su función y prueba |
| [02 · Instalación](docs/02-INSTALACION.md) | Paso a paso, usuarios de prueba y errores comunes |
| [03 · Glosario](docs/03-GLOSARIO.md) | Siglas (SRI, RUC, FEFO, JWT, SDD, KPI…) con ejemplos del proyecto |
| [04 · Mapa del backend](docs/04-MAPA-BACKEND.md) | Archivo por archivo, el viaje de una petición, las 186 rutas de la API |
| [05 · Mapa del frontend](docs/05-MAPA-FRONTEND.md) | Rutas, conceptos de Angular, archivo por archivo |
| [06 · Base de datos](docs/06-BASE-DE-DATOS.md) | Las 32 colecciones, relaciones, índices, operadores y consultas |
| [07 · Flujo en GitHub](docs/07-FLUJO-GITHUB.md) | Repositorio, ruleset, Issues, CI, Copilot y Spec Kit |

## Equipo

Proyecto académico de dos integrantes. Los datos (personas, RUC, clientes) son **ficticios** y las facturas
siguen el formato del SRI pero **no están autorizadas** electrónicamente.
