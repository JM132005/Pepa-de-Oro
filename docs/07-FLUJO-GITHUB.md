# 07 · Flujo de trabajo en GitHub: repositorio, Issues, CI, Copilot y Spec Kit

> Pasos para dejar el repositorio listo para la presentación. Lo que dice 🧑‍💻 se hace una sola vez.

## 0. Qué flujo de ramas usamos y por qué

Hay dos formas muy conocidas de organizar las ramas de Git. Elegimos una mezcla adaptada a un equipo de 2.

### Git Flow
Creado por Vincent Driessen (2010). Usa ramas de larga vida con un papel fijo:

| Rama | Para qué |
|---|---|
| `main` | Solo versiones publicadas (cada una con su tag `v1.0.0`) |
| `develop` | Donde se integra el trabajo del equipo |
| `feature/*` | Una por funcionalidad; nace de `develop` y vuelve a `develop` |
| `release/*` | Preparar una versión (pruebas finales) antes de pasar a `main` |
| `hotfix/*` | Arreglo urgente que sale de `main` y vuelve a `main` y `develop` |

```
main     ●───────────────────────●  v1.0.0
          \                     /
develop    ●──●───────●─────────●
               \     / \     /
feature/x       ●───●   ●───●  feature/y
```

### Trunk Based Development
Todos integran en **una sola rama** (`main`, "el tronco") varias veces al día, con ramas que duran horas, no
semanas. Lo que no está terminado se esconde con *feature flags*. Exige un CI muy confiable porque cada
merge puede ir a producción.

```
main  ●──●──●──●──●──●──●   (cada punto = un PR pequeño fusionado el mismo día)
       \/  \/  \/
```

### Comparación

| Criterio | Git Flow | Trunk Based |
|---|---|---|
| Ramas largas | `main`, `develop` (+ `release`, `hotfix`) | Solo `main` |
| Duración de una rama de trabajo | Días o semanas | Horas (máximo 1–2 días) |
| Conflictos al unir | Más probables (ramas largas) | Pocos (cambios pequeños y frecuentes) |
| Necesita CI | Recomendado | Obligatorio y muy rápido |
| Versiones | Claras: cada merge a `main` es una versión | Continuas: se publica todo el tiempo |
| Ideal para | Entregas por versión, equipos que aprenden, software con fechas | Equipos con experiencia, despliegue continuo (startups, web) |

### Lo que elegimos para Pepa de Oro
**Git Flow simplificado:** `main` + `develop` + ramas cortas con el número de la spec (`001-backend`,
`002-frontend`, `003-ci`…), sin `release/*` ni `hotfix/*`.

- **Por qué `develop`:** el parcial tiene una entrega fija; `main` queda limpio con la versión que se
  presenta (tag `v1.0.0`) y en `develop` se integra y prueba sin riesgo.
- **Por qué ramas cortas y numeradas (idea de Trunk Based):** cada rama hace una sola cosa, dura poco y
  se une por Pull Request con revisión y CI en verde; así hay pocos conflictos.
- **Sin `release` ni `hotfix`:** con 2 personas y una entrega, serían pasos de más.
- **Para la empresa del caso:** empezar igual que nosotros y, cuando el CI y las pruebas sean confiables,
  pasar a Trunk Based con despliegue continuo. En una startup se puede empezar directamente con Trunk Based.

## 1. Subir el proyecto 🧑‍💻

```powershell
cd pepadeoro
git init                                  # empieza a llevar el control de versiones
git add .                                 # prepara todos los archivos (el .gitignore deja fuera node_modules y .env)
git commit -m "chore: base del proyecto Pepa de Oro"
git branch -M main                        # la rama principal se llama main
gh repo create pepadeoro --private --source . --push   # crea el repo en GitHub y lo sube
git switch -c develop                     # rama de integración
git push -u origin develop
```

Invitar al compañero: **Settings → Collaborators → Add people**.

> Antes del primer commit revisa que **no** aparezca `backend/.env` en `git status`.

## 2. Proteger `main` 🧑‍💻

**Settings → Rules → Rulesets → New branch ruleset**: nombre `proteger-main`, objetivo `main`.

| Regla | Efecto |
|---|---|
| Require a pull request before merging · 1 approval | Nadie sube directo; el compañero aprueba |
| Require status checks to pass → `Backend (lint · pruebas · build)`, `Frontend (build de producción)`, `Integración (semilla de 1 mes sobre MongoDB)` | El CI debe estar en verde |
| Block force pushes · Restrict deletions | Nadie reescribe ni borra `main` |

> Los nombres de los checks aparecen después de la primera ejecución del CI.

## 3. Crear etiquetas, hitos e Issues 🧑‍💻

```powershell
gh auth login                                   # una vez
node scripts/crear-issues.mjs --dry-run         # muestra lo que haría
node scripts/crear-issues.mjs                   # crea 31 etiquetas, 8 hitos y 26 Issues
node scripts/crear-issues.mjs --cerrar          # (opcional) los cierra como completados
```

Opcional: **Projects → New project → Board** y agregar los Issues para ver el tablero Kanban
(Todo / In progress / Done).

## 4. El ciclo de cada cambio

```powershell
git switch develop
git pull                                         # traigo lo último
git switch -c 011-pago-mixto                     # rama con el número de la spec
# … escribo la spec, la prueba y el código …
cd backend; npm test; npm run lint; cd ..        # reviso antes de subir
git add .
git commit -m "feat(caja): cobrar con varias formas de pago"
git push -u origin 011-pago-mixto
```

En GitHub: **Compare & pull request** → base `develop` → la plantilla pide `Cierra #N`, RN y cómo probarlo →
esperar ✅ del CI → aprobación del compañero → **Squash and merge**. Al cerrar cada entrega: PR de
`develop` a `main` y una etiqueta de versión:

```powershell
git switch main; git pull
git tag v1.0.0 -m "Entrega del parcial"
git push origin v1.0.0
```

Convención de mensajes (*Conventional Commits*): `feat:` funcionalidad, `fix:` corrección, `docs:`
documentación, `test:` pruebas, `chore:` configuración, `refactor:` mejora sin cambiar comportamiento.

## 5. Ver el CI

Pestaña **Actions** → workflow **CI**. Cada ejecución tiene 3 trabajos:

```
backend ──────────────┐
  npm ci → lint → test (126) → build
frontend              │
  npm ci → ng build → artefacto frontend-dist
semilla (necesita backend)
  MongoDB 8 → npm run seed -- --meses=1 → ¿hay facturas?
```

Si algo falla, clic en el paso rojo para ver el error. Se puede volver a ejecutar con **Re-run jobs**
o lanzarlo a mano con **Run workflow**.

## 6. Spec Kit con Copilot

Spec Kit es la herramienta de GitHub para el **desarrollo guiado por especificaciones (SDD)**.

```powershell
# Instalar (una vez) — necesita Python y uv
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify check                 # revisa que todo esté instalado
```

El repositorio ya trae `.specify/` (constitución y plantillas) y `specs/001`…`010`. En VS Code, con el chat de
Copilot en modo **Agent**, los comandos son:

| Comando | Qué genera | En Pepa de Oro |
|---|---|---|
| `/speckit.constitution` | Los principios del proyecto | `.specify/memory/constitution.md` |
| `/speckit.specify Quiero cobrar con efectivo y tarjeta en la misma venta` | `specs/011-.../spec.md` con historias y escenarios | Igual a las 10 existentes |
| `/speckit.clarify` | Preguntas sobre lo que quedó ambiguo (`[NECESITA ACLARACIÓN]`) | — |
| `/speckit.plan` | `plan.md` con la técnica y la revisión contra la constitución | Usa NestJS + Angular + MongoDB |
| `/speckit.tasks` | `tasks.md` con tareas ordenadas (pruebas primero) | — |
| `/speckit.implement` | Copilot programa las tareas una por una | Revisar siempre lo que genera |

Copilot lee `.github/copilot-instructions.md`, así responde en español y sigue las reglas del proyecto
(RN en `*.reglas.ts`, pruebas primero, carpetas fijas).

> Para regenerar todas las specs y los Issues desde una sola fuente: `python scripts/generar-specs.py .`

## 7. Evidencias para la presentación

| Qué mostrar | Dónde |
|---|---|
| Issues con etiquetas `rn-xx` y hitos | Pestaña **Issues** y **Milestones** |
| Tablero | Pestaña **Projects** |
| Un PR con plantilla, revisión y checks verdes | Pestaña **Pull requests** → uno cerrado |
| Ruleset de `main` | Settings → Rules |
| CI con los 3 trabajos en verde | Pestaña **Actions** |
| Constitución y specs | `.specify/memory/constitution.md`, `specs/` |
| Pruebas | `npm test` en vivo (126 ✅) |
| Una regla funcionando | Caja → vender más de $50 a consumidor final → "RN-19: …" |
