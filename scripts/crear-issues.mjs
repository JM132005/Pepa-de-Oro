#!/usr/bin/env node
// crear-issues.mjs → CREA EN GITHUB las etiquetas, los hitos (milestones) y un Issue por cada historia de
// usuario de las especificaciones (specs/NNN-*/spec.md). Los datos salen de scripts/historias.json,
// que genera scripts/generar-specs.py, así los Issues y las specs siempre dicen lo mismo.
//
// Requisitos:
//   1. GitHub CLI instalado (https://cli.github.com) → comando "gh".
//   2. Sesión iniciada:  gh auth login
//   3. Estar dentro de la carpeta del repositorio (o pasar --repo usuario/pepadeoro).
//
// Uso:
//   node scripts/crear-issues.mjs --dry-run              → solo MUESTRA lo que haría (no crea nada)
//   node scripts/crear-issues.mjs                        → crea todo en el repositorio actual
//   node scripts/crear-issues.mjs --repo usuario/pepadeoro
//   node scripts/crear-issues.mjs --cerrar               → además CIERRA los Issues (las historias ya están hechas)
//
// Es seguro ejecutarlo dos veces: si una etiqueta, un hito o un Issue con el mismo título ya existe, lo salta.

// execFileSync: ejecuta un programa (aquí "gh") y devuelve lo que imprime. Se usa execFileSync y no execSync
// para pasar los argumentos como lista: así los acentos, comillas y saltos de línea no rompen el comando.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── 1. Opciones de la línea de comandos ───
const args = process.argv.slice(2);
const simular = args.includes('--dry-run');
const cerrar = args.includes('--cerrar');
const iRepo = args.indexOf('--repo');
const repo = iRepo >= 0 ? args[iRepo + 1] : null;

// ─── 2. Leer las historias ───
// import.meta.url → ruta de ESTE archivo; así historias.json se encuentra aunque ejecutes el script desde otra carpeta.
const carpeta = dirname(fileURLToPath(import.meta.url));
const { hitos, historias } = JSON.parse(readFileSync(join(carpeta, 'historias.json'), 'utf8'));

// gh(...): llama a GitHub CLI. Con --dry-run solo imprime el comando.
function gh(...parametros) {
  const completos = repo ? [...parametros, '--repo', repo] : parametros;
  if (simular) {
    console.log('  [simulado] gh', completos.map((p) => (p.includes(' ') ? JSON.stringify(p.slice(0, 60)) : p)).join(' '));
    return '';
  }
  return execFileSync('gh', completos, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

// La API REST necesita "repos/usuario/repo/...". {owner}/{repo} lo rellena gh con el repositorio actual.
const ruta = (resto) => (repo ? `repos/${repo}/${resto}` : `repos/{owner}/{repo}/${resto}`);
function api(...parametros) {
  if (simular) return console.log('  [simulado] gh api', parametros.join(' ').slice(0, 120)), '[]';
  return execFileSync('gh', ['api', ...parametros], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

// ─── 3. Comprobar que gh está listo ───
if (!simular) {
  try {
    execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' });
  } catch {
    console.error('❌ GitHub CLI no está instalado o no has iniciado sesión. Ejecuta: gh auth login');
    process.exit(1);
  }
}

// ─── 4. Etiquetas ───
// Cada etiqueta: [nombre, color en hexadecimal sin #, descripción].
const ETIQUETAS = [
  ['historia', '1d76db', 'Historia de usuario de una especificación'],
  ['p1', 'b60205', 'Prioridad alta: imprescindible para la entrega'],
  ['p2', 'fbca04', 'Prioridad media'],
  ['p3', 'c2e0c6', 'Prioridad baja'],
  ['bug', 'd73a4a', 'Algo no funciona'],
  ...Array.from({ length: 26 }, (_, i) => [`rn-${String(i + 1).padStart(2, '0')}`, '5319e7', `Regla de negocio RN-${String(i + 1).padStart(2, '0')}`]),
];
console.log(`🏷️  ${ETIQUETAS.length} etiquetas`);
for (const [nombre, color, descripcion] of ETIQUETAS) {
  // --force: si ya existe, la actualiza en vez de fallar.
  gh('label', 'create', nombre, '--color', color, '--description', descripcion, '--force');
}

// ─── 5. Hitos (milestones) ───
console.log(`🎯 ${hitos.length} hitos`);
const existentes = simular ? [] : JSON.parse(api(ruta('milestones?state=all&per_page=100'))).map((m) => m.title);
for (const titulo of hitos) {
  if (existentes.includes(titulo)) continue;
  // -f campo=valor: envía un campo de texto en el cuerpo de la petición POST.
  api(ruta('milestones'), '-f', `title=${titulo}`, '-f', `description=Entrega del proyecto Pepa de Oro: ${titulo}`);
}

// ─── 6. Issues ───
console.log(`📝 ${historias.length} historias`);
// gh issue list --json title: lista los títulos ya creados para no duplicarlos.
const yaCreados = simular ? [] : JSON.parse(gh('issue', 'list', '--state', 'all', '--limit', '500', '--json', 'title')).map((i) => i.title);
for (const h of historias) {
  if (yaCreados.includes(h.titulo)) {
    console.log(`  ↷ ya existe: ${h.titulo}`);
    continue;
  }
  // Cuerpo del Issue en Markdown: la historia, los criterios como lista de verificación y el enlace a la spec.
  const cuerpo = [
    `**Por qué**: ${h.cuerpo}`,
    '',
    '### Criterios de aceptación',
    ...h.escenarios.map((e) => `- [ ] ${e}`),
    '',
    `📄 Especificación: [\`${h.spec}/spec.md\`](../blob/main/${h.spec}/spec.md) · Tareas: [\`tasks.md\`](../blob/main/${h.spec}/tasks.md)`,
  ].join('\n');
  const salida = gh('issue', 'create', '--title', h.titulo, '--body', cuerpo, '--milestone', h.hito, ...h.etiquetas.flatMap((e) => ['--label', e]));
  console.log(`  ✔ ${h.titulo} ${salida.trim()}`);
  // gh issue create imprime la URL del Issue; el número es lo último de esa URL.
  if (cerrar && salida) gh('issue', 'close', salida.trim().split('/').pop(), '--reason', 'completed', '--comment', 'Implementado (ver tasks.md).');
}
console.log(simular ? '\nℹ️  Simulación: no se creó nada. Quita --dry-run para crear de verdad.' : '\n✅ Listo. Míralos en la pestaña Issues del repositorio.');
