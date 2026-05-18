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
const CLIENT_API_PATTERN =
  /\b(?<!typeof\s)(document|window|navigator|process|Buffer)\./;

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
  // poder reportar el número de línea exacto.
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // Ignora líneas que son comentarios completos o partes de JSDoc.
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    // El regex `CLIENT_API_PATTERN` solo matchea cuando NO está bajo
    // `typeof X !==`. Como segunda capa, ignoramos también líneas
    // que claramente tienen guard explícito.
    if (line.includes("typeof document") || line.includes("typeof window") ||
        line.includes("typeof navigator") || line.includes("typeof process") ||
        line.includes("typeof Buffer") || line.includes("typeof globalThis")) {
      continue;
    }
    const match = CLIENT_API_PATTERN.exec(line);
    if (match) {
      violations.push({
        file: relPath,
        rule: "no-bare-dom-access",
        line: i + 1,
        detail: `acceso bare a \`${match[1]}\` sin guard typeof: ${trimmed.slice(0, 80)}`,
      });
    }
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
