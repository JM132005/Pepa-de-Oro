# 07 · Flujo de trabajo en GitHub: repositorio, Issues, CI, Copilot y Spec Kit

> Pasos para dejar el repositorio listo para la presentación. Lo que dice 🧑‍💻 se hace una sola vez.

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
