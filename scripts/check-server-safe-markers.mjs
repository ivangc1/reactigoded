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

// Patrón canónico de typeof guard que confirma disponibilidad del
// API client-side. SOLO la forma POSITIVA cuenta:
//
//   ✓ typeof <api> !== "undefined"   → guarded (X está disponible)
//   ✓ typeof <api> != "undefined"    → guarded (variante laxa)
//   ✗ typeof <api> === "undefined"   → NO es guard. Dentro de ese
//                                       block, <api> está undefined;
//                                       accederlo lanza ReferenceError.
//
// Codex P1 round 6 sobre PR #90: el patrón anterior `[!=]==?` matcheaba
// AMBAS formas (negativa y positiva) y falsamente trataba el `===` como
// guard. Fix: solo `!==`/`!=`.
const TYPEOF_GUARD_PATTERN =
  /typeof\s+(document|window|navigator|process|Buffer|globalThis)\s*!==?\s*["']undefined["']/g;

/**
 * Devuelve `true` si la línea contiene una positive typeof guard para
 * el API dado (`typeof <api> !== "undefined"` o `!= "undefined"`).
 * Usado para same-line guard check.
 */
function hasSameLineGuard(code, api) {
  // Escape de api innecesario porque viene del set conocido del regex
  // CLIENT_API_PATTERN — solo letras y `T` mayúscula (Buffer).
  const re = new RegExp(
    `typeof\\s+${api}\\s*!==?\\s*["']undefined["']`,
  );
  return re.test(code);
}

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

  // Regla 2: no accesos DOM bare. Iteramos línea por línea con
  // tracking real de brace depth + guard stack. Codex P1 round 5
  // sobre PR #90: el look-back de 8 líneas era incorrecto porque no
  // distinguía guards activos de cerrados:
  //
  //   if (typeof window !== "undefined") {
  //     window.matchMedia();  // ← OK (guard activo)
  //   }
  //   window.alert();         // ← FUERA del guard, debería flaggearse
  //                              pero el look-back veía typeof 3 líneas atrás
  //
  // Fix: mantener un stack `guardStack: [{ api, depthOpened }]`. Al
  // detectar `typeof <api> !== "undefined"` en una línea con `{`,
  // pushear al stack con depth posterior. Al ver `}`, decrementar
  // depth y popear guards cuyo `depthOpened` sea mayor al depth
  // actual. Un acceso es guarded si: (a) misma línea tiene
  // `typeof <api>`, o (b) algún guard activo en stack matchea api.
  //
  // Pre-stripping: block comments multi-línea desaparecen del content
  // antes de split (codeContent). Line comments `// ...` se strippan
  // per-line en cada check.
  const codeContent = stripBlockCommentsPreservingLines(content);
  const lines = codeContent.split("\n");

  let depth = 0;
  const guardStack = []; // [{ api: string, depthOpened: number }]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmed = line.trim();
    // Ignora líneas que son comentarios completos o partes de JSDoc.
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

    const lineCode = stripLineComments(line);

    // Step 1: detectar acceso bare (sobre código sin line comments).
    const match = CLIENT_API_PATTERN.exec(lineCode);
    if (match) {
      const api = match[1];
      if (api) {
        // Guarded si same-line tiene POSITIVE typeof guard (`!==`)
        // O stack tiene guard activo para esa misma api.
        // Codex P1 round 6 sobre PR #90: `typeof X === "undefined"`
        // NO es guard — dentro de ese block X está undefined.
        const sameLineGuard = hasSameLineGuard(lineCode, api);
        const stackGuard = guardStack.some((g) => g.api === api);
        if (!sameLineGuard && !stackGuard) {
          violations.push({
            file: relPath,
            rule: "no-bare-dom-access",
            line: i + 1,
            detail: `acceso bare a \`${api}\` sin guard typeof activo: ${trimmed.slice(0, 80)}`,
          });
        }
      }
    }

    // Step 2: actualizar guard stack para próximas líneas. Si esta
    // línea contiene `typeof <api>` Y al menos un `{`, asumimos que
    // el `{` abre un block guard (heurística común: el `if (typeof
    // X) { ... }` o la apertura del block sigue inmediatamente).
    // Capturamos TODAS las APIs guarded en la línea (raro pero
    // posible: `if (typeof window !== "undefined" && typeof
    // document !== "undefined") { ... }`).
    const opens = (lineCode.match(/{/g) ?? []).length;
    const closes = (lineCode.match(/}/g) ?? []).length;

    if (opens > 0) {
      // Re-buscar typeof guards en lineCode (reset lastIndex porque
      // TYPEOF_GUARD_PATTERN es global).
      TYPEOF_GUARD_PATTERN.lastIndex = 0;
      let guardMatch;
      while ((guardMatch = TYPEOF_GUARD_PATTERN.exec(lineCode)) !== null) {
        const api = guardMatch[1];
        if (!api) continue;
        // Push con depthOpened = depth + 1 (porque el `{` aún no se
        // ha procesado al medir depth actual; depth se actualiza
        // abajo).
        guardStack.push({ api, depthOpened: depth + 1 });
      }
    }

    // Actualizar depth tras procesar la línea.
    depth += opens - closes;

    // Pop guards cuyo block ya cerró (depthOpened > depth actual).
    while (
      guardStack.length > 0 &&
      // @ts-ignore — guardStack.at(-1) garantizado no-undefined por length check.
      guardStack[guardStack.length - 1].depthOpened > depth
    ) {
      guardStack.pop();
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
