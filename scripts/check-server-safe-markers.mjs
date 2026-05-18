#!/usr/bin/env node
/**
 * check-server-safe-markers.mjs — D1-P1 gate
 *
 * Verifica el invariante de los componentes marcados con JSDoc
 * `@server-safe`: el componente puede ser renderizado server-side
 * (incluyendo React Server Components / SSR puro) sin acceder a APIs
 * que solo existen en cliente.
 *
 * Reglas que enforza este gate:
 *
 *   1. **No `"use client"` directive**: si un componente está marcado
 *      `@server-safe`, NO debe declarar `"use client"`. Las dos cosas
 *      son contradictorias por design.
 *
 *   2. **No accesos DOM bare en código del archivo**: `document.X`,
 *      `window.X`, `navigator.X`, `process.X`, `Buffer.X`,
 *      `globalThis.X` deben aparecer SOLO bajo guard
 *      `typeof X !== "undefined"` o dentro de `useEffect`/handlers
 *      (donde el código no corre en render server).
 *
 *      Heurística: el gate marca como violación cualquier match del
 *      patrón `(document|window|navigator|process|Buffer)\.` que NO
 *      esté precedido por `typeof` en la misma línea (proxy
 *      conservador). Falsos positivos posibles en strings/comments;
 *      se documentan vía allowlist explícita.
 *
 * ─── Contrato de invocación ────────────────────────────────────
 * • **Invoker**: `npm run test:server-safe-markers`, encadenado en
 *   `verify:unit`. CI lo invoca como gate.
 * • **Entorno requerido**: source files en `src/components/`.
 * • **Fallback / errores**: ERROR (exit 1) si encuentra cualquier
 *   violación. La intención del marker es "audited+enforced", no
 *   "declarative wish".
 *
 * Modo de uso:
 *
 *   node scripts/check-server-safe-markers.mjs
 *
 * No acepta flags — invariante binario.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const COMPONENTS_DIR = resolve(repoRoot, "src/components");
const HOOKS_DIR = resolve(repoRoot, "src/hooks");

// Patrones de acceso DOM cliente que NO deben aparecer en código de
// archivos marcados @server-safe (excepto bajo `typeof` guard o
// dentro de handlers/effects que no corren en render).
//
// Codex P2 sobre PR #90: incluir `globalThis` — mencionado en el doc
// del gate pero faltante en el regex (silent bypass).
const CLIENT_API_PATTERN =
  /\b(?<!typeof\s)(document|window|navigator|process|Buffer|globalThis)\./;

// Codex P2 sobre PR #90: look-back para detectar guards multi-línea.
// `if (typeof window !== "undefined") { window.matchMedia(...) }` debe
// pasar el gate aunque el acceso esté en línea distinta del typeof.
// Limit conservador de 8 líneas — guards típicos son contiguos al
// acceso. La heurística no rastrea brace depth: si dentro del block
// guard se usa una API DISTINTA a la guarded, no se suprime.
const GUARD_LOOKBACK_LINES = 8;

/**
 * Strip block comments multi-línea (block /*...*\/) del content
 * COMPLETO, preservando line numbers (reemplaza contenido por
 * mismos newlines + espacios). Aplicado una vez antes de split.
 * Necesario porque codex P2 round 4 detectó silent bypass:
 *
 *   /* typeof window *\/  <- comment multi-línea que contiene typeof
 *   window.alert(...)     <- el look-back falsamente lo veía guarded
 *
 * Heurística: regex `/\*[\s\S]*?\*\//g` con replacement que mantiene
 * solo los newlines del match para no romper números de línea.
 */
function stripBlockCommentsPreservingLines(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    match.replace(/[^\n]/g, " "),
  );
}

/**
 * Strip de line comments (linea //) en una sola línea. Necesario
 * después del strip de block comments para que checks de `typeof
 * <api>` no sean falsamente satisfechos por texto en comentarios
 * `// foo` al final de línea (codex P2 round 3 sobre PR #90).
 *
 * Heurística simple — no maneja `//` dentro de strings, pero en la
 * práctica los strings con `//` son URLs que no contienen
 * `typeof <api>` (no false positive realista).
 */
function stripLineComments(line) {
  const idx = line.indexOf("//");
  return idx >= 0 ? line.slice(0, idx) : line;
}

function listSourceFiles(dir) {
  const result = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      result.push(...listSourceFiles(p));
    } else if (
      (p.endsWith(".tsx") || p.endsWith(".ts")) &&
      !p.endsWith(".test.tsx") &&
      !p.endsWith(".test.ts") &&
      !p.endsWith(".stories.tsx")
    ) {
      result.push(p);
    }
  }
  return result;
}

const allFiles = [
  ...listSourceFiles(COMPONENTS_DIR),
  ...listSourceFiles(HOOKS_DIR),
];

const violations = [];

for (const file of allFiles) {
  const content = readFileSync(file, "utf8");
  if (!content.includes("@server-safe")) continue;

  const relPath = relative(repoRoot, file);

  // Regla 1: no `"use client"` directive.
  if (/^["']use client["'];?/m.test(content)) {
    violations.push({
      file: relPath,
      rule: "no-use-client",
      detail: '@server-safe contradice "use client" en el mismo archivo',
    });
  }

  // Regla 2: no accesos DOM bare. Iteramos línea por línea para
  // poder reportar el número de línea exacto. La detección honra
  // guards `typeof X !==` tanto same-line como multi-línea (look-back
  // de GUARD_LOOKBACK_LINES).
  //
  // Pre-stripping: removemos block comments multi-línea del content
  // antes de split para que ningún `typeof <api>` dentro de un
  // `/* ... */` cuente como guard real. Line comments `// ...` se
  // strippan después per-line (necesitamos preservar el código
  // original para reportar el detail correcto en violations).
  const codeContent = stripBlockCommentsPreservingLines(content);
  const lines = codeContent.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // Ignora líneas que son comentarios completos o partes de JSDoc.
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    const match = CLIENT_API_PATTERN.exec(line);
    if (!match) continue;
    const api = match[1];
    if (!api) continue;
    // Codex P2 round 3+4 sobre PR #90: el match del `typeof <api>`
    // debe hacerse SOBRE CÓDIGO SIN COMENTARIOS. Block comments
    // multi-línea ya se strippan a nivel content (codeContent).
    // Line comments `//` se strippan per-línea aquí.
    const lineCode = stripLineComments(line);
    // Same-line guard.
    if (lineCode.includes(`typeof ${api}`)) continue;
    // Multi-line guard: look-back en las últimas N líneas con
    // comments stripped.
    let guarded = false;
    const start = Math.max(0, i - GUARD_LOOKBACK_LINES);
    for (let j = i - 1; j >= start; j--) {
      const prev = lines[j];
      if (!prev) continue;
      if (stripLineComments(prev).includes(`typeof ${api}`)) {
        guarded = true;
        break;
      }
    }
    if (guarded) continue;
    violations.push({
      file: relPath,
      rule: "no-bare-dom-access",
      line: i + 1,
      detail: `acceso bare a \`${api}\` sin guard typeof (same-line o look-back ${String(GUARD_LOOKBACK_LINES)} líneas): ${trimmed.slice(0, 80)}`,
    });
  }
}

const markedCount = allFiles.filter((f) =>
  readFileSync(f, "utf8").includes("@server-safe"),
).length;

if (violations.length === 0) {
  console.log(
    `✓ @server-safe invariant holds (${String(markedCount)} files marked, 0 violations)`,
  );
  process.exit(0);
}

console.error(
  `\n${String(violations.length)} @server-safe violation(s) detected:\n`,
);
for (const v of violations) {
  const loc = v.line ? `:${String(v.line)}` : "";
  console.error(`  [${v.rule}] ${v.file}${loc}`);
  console.error(`    ${v.detail}`);
}
console.error(
  `\nFix options:\n` +
    `  - Remove @server-safe marker if the component genuinely needs client APIs.\n` +
    `  - Guard the access with \`typeof X !== "undefined"\` if it's truly conditional.\n` +
    `  - Move the access inside useEffect/event handler (no render side-effect).\n`,
);
process.exit(1);
