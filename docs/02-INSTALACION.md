# 02 · Instalación y ejecución paso a paso

> Los comandos están para **PowerShell** (Windows). En Linux/macOS son iguales salvo `Copy-Item` → `cp`.

## 1. Programas que necesitas

| Programa | Versión | Para qué | Comprobar |
|---|---|---|---|
| **Node.js** | 22 LTS | Ejecuta el backend y las herramientas de Angular | `node -v` |
| **npm** | 10 (viene con Node) | Instala las librerías | `npm -v` |
| **MongoDB Community Server** | 8 | La base de datos | `mongod --version` |
| **MongoDB Compass** | cualquiera | Ver la base con ventanas (opcional) | — |
| **Git** | cualquiera | Control de versiones | `git --version` |
| **GitHub CLI** | cualquiera | Solo para el script de Issues (opcional) | `gh --version` |
| **VS Code** | cualquiera | Editor (con Copilot y Angular Language Service) | — |

> MongoDB en Windows se instala como **servicio** y queda encendido solo. Si no, en Servicios → MongoDB → Iniciar.

## 2. Descargar el proyecto

```powershell
git clone https://github.com/USUARIO/pepadeoro.git   # o descomprime el zip
cd pepadeoro
```

## 3. Backend (API NestJS)

```powershell
cd backend
npm install                       # instala las librerías de package.json (crea node_modules/)
Copy-Item .env.example .env       # crea tu archivo de configuración (NUNCA se sube a GitHub)
```

Abre `backend/.env` y revisa:

| Variable | Valor por defecto | Qué es |
|---|---|---|
| `PORT` | `3000` | Puerto de la API |
| `FRONTEND_URL` | `http://localhost:4200` | Dirección del frontend (CORS y enlaces de correos/QR) |
| `MONGO_URI` | `mongodb://localhost:27017/pepadeoro` | Dónde está la base |
| `MONGO_TRANSACCIONES` | `false` | `true` solo si Mongo corre como *replica set* |
| `JWT_SECRET` | (cámbialo) | Texto largo con el que se firman los tokens |
| `CORREO_MODO` | `prueba` | `prueba` guarda los correos como `.eml` en `backend/correos-de-prueba/`; `gmail` los envía de verdad |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | — | Solo para `CORREO_MODO=gmail` (contraseña de aplicación de 16 letras) |
| `CORREO_REDIRIGIR_A` | tu correo | Todos los correos llegan aquí (los clientes de prueba son inventados) |

### Llenar la base con datos de prueba

```powershell
npm run seed                  # BORRA la base y simula 12 meses (tarda unos 5 minutos)
npm run seed -- --meses=3     # más rápido: solo 3 meses
```

Al terminar muestra cuántas operaciones hizo, las que una regla rechazó (es normal) y los usuarios.

### Encender la API

```powershell
npm run start:dev             # modo desarrollo: se reinicia sola al guardar cambios
```

Comprueba en el navegador: <http://localhost:3000/api/salud> → `{"estado":"ok","servicio":"pepadeoro-api",...}`

## 4. Frontend (Angular)

En **otra** terminal:

```powershell
cd frontend
npm install
npm start                     # = ng serve → http://localhost:4200
```

## 5. Entrar al sistema

- Web pública: <http://localhost:4200>
- Sistema interno: <http://localhost:4200/login> (la pantalla trae botones para entrar con cada cuenta)

Contraseña de todos: **`PepaDeOro2026*`**

| Correo | Rol | Qué ve |
|---|---|---|
| `gerente@pepadeoro.ec` | GERENTE | Todo, paneles globales, configuración, auditoría |
| `agronomo@pepadeoro.ec` | AGRONOMO | Haciendas, parcelas, labores, cosechas, clima |
| `acopio@pepadeoro.ec` | ACOPIO | Productores, recepción, liquidaciones, poscosecha |
| `calidad@pepadeoro.ec` | CALIDAD | Análisis, cata, liberación, no conformidades |
| `produccion@pepadeoro.ec` | PRODUCCION | Recetas y órdenes de producción |
| `bodega@pepadeoro.ec` | BODEGA | Inventario, ajustes, transferencias |
| `caja@pepadeoro.ec` | VENTAS | Caja de la tienda |
| `ventas@pepadeoro.ec` | VENTAS | Cotizaciones, pedidos, clientes, facturas |
| `logistica@pepadeoro.ec` | LOGISTICA | Flota y viajes |
| `taller@pepadeoro.ec` | MANTENIMIENTO | Órdenes de mantenimiento |
| `supervisora@pepadeoro.ec` | BODEGA + LOGISTICA | Ejemplo de usuario con dos roles |

## 6. Comandos útiles

| Dónde | Comando | Qué hace |
|---|---|---|
| backend | `npm test` | 126 pruebas de las reglas de negocio |
| backend | `npm run lint` | Revisa el estilo del código |
| backend | `npm run build` | Compila a `dist/` |
| backend | `npm run start:prod` | Ejecuta lo compilado |
| frontend | `npx ng build` | Compila la web para producción (`dist/frontend/browser`) |
| raíz | `node scripts/crear-issues.mjs --dry-run` | Muestra los Issues que se crearían en GitHub |
| raíz | `python scripts/generar-specs.py .` | Regenera `specs/` y `scripts/historias.json` |
| raíz | `python scripts/generar-ilustraciones.py frontend/public/img` | Regenera los SVG |

## 7. Errores comunes

| Mensaje | Causa | Solución |
|---|---|---|
| `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB no está encendido | Servicios → MongoDB → Iniciar (o `mongod` en una terminal) |
| `EADDRINUSE :::3000` | Ya hay otra API en el puerto 3000 | Cierra la otra terminal o cambia `PORT` en `.env` |
| Aviso "No hay conexión con el servidor" | La API está apagada | `npm run start:dev` en `backend/` |
| `401 Unauthorized` en todas las pantallas | El token caducó (8 h) o cambiaste `JWT_SECRET` | Cierra sesión y vuelve a entrar |
| `npm ERR! ERESOLVE` | Conflicto de versiones de npm | `npm install --legacy-peer-deps` |
| Los correos no llegan | `CORREO_MODO=prueba` | Ábrelos en `backend/correos-de-prueba/` o configura Gmail |
| `ng` no se reconoce | Angular CLI no está global | Usa `npx ng ...` o `npm start` |
