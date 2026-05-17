#!/usr/bin/env node
/**
 * check-state-css-exclusion.mjs — H-07/D9 gate
 *
 * Verifica que `dist/index.js` y `dist/index.cjs` (los bundles React
 * publicados al consumer típico) NO contengan referencias a las
 * utilities pseudo-class del `state.css`. Estas utilities son CSS-only
 * opt-in para HTML-utility-first prototyping (story canónica
 * `CSS-Only-Prototyping.stories.tsx`); jamás deberían filtrarse al
 * bundle JS porque (a) son 713 KB gzip standalone, suficiente para
 * romper la TTI del consumer si entran al bundle React, y (b) los
 * componentes del DS no las usan — son una vía paralela que el
 * consumer importa explícitamente si la necesita.
 *
 * H-07 decision (beta.21 RC1 gate review): se conservó `state.css`
 * con story canónica + budget separado (`igoded-state-css.css`
 * 800 KB) en lugar de retirar el módulo. Esta gate es el seguro: si
 * un componente del DS empieza accidentalmente a importar / referenciar
 * clases con prefijo `hover:ig-`, `focus:ig-`, etc., el bundle JS
 * crece silenciosamente y este script lo caza pre-publish.
 *
 * ─── Heurística ────────────────────────────────────────────────
 * Los prefijos NO son una lista hardcodeada. Se derivan dinámicamente
 * leyendo cada `dist/styles/state/*.css` y extrayendo el prefijo real
 * usado en las clases:
 *
 *   .first\:ig-caret-…:first-child{…}   →  prefijo "first"
 *   .hover\:ig-bg-brand:hover{…}        →  prefijo "hover"
 *   .focus-visible\:ig-ring-…:focus-visible{…}  →  prefijo "focus-visible"
 *   .ig-group:hover .group-hover\:ig-… {…}      →  prefijo "group-hover"
 *
 * Esto cierra dos errores del check inicial (codex P1+P2 sobre PR #83):
 *
 *   1. Lista hardcodeada incompleta: faltaban focus-visible,
 *      focus-within, group-hover, peer-*, target, etc. Cualquier
 *      pseudo nueva que `build-state-css-fragments.mjs` empiece a
 *      emitir queda cubierta automáticamente.
 *   2. Names mal mapeados: el archivo `first-child.css` contiene
 *      clases con prefijo `first:ig-` (Tailwind-style shorthand
 *      del selector `:first-child`). Buscar `first-child:ig-` no
 *      matchea ninguna clase real. Derivar del CSS source elimina
 *      la asimetría file-name vs class-name.
 *
 * En las clases CSS source el `\:` es un escape para que el `:` sea
 * parte del nombre de clase, NO un pseudo-class. En JS strings el
 * literal final es `prefix:ig-…` SIN escape — ese es el patrón que
 * grepamos en `dist/index.js` y `dist/index.cjs`.
 *
 * ─── Contrato de invocación ────────────────────────────────────
 * • **Invoker**: `npm run test:state-css-exclusion`, encadenado en
 *   `verify:unit` pipeline. CI lo invoca como gate.
 * • **Entorno requerido**: `dist/index.js` + `dist/index.cjs` +
 *   `dist/styles/state/*.css` (asume build previo; `verify:unit`
 *   corre `npm run build` antes de este gate).
 * • **Fallback / errores**: ERROR (exit 1) si encuentra cualquier
 *   match. No hay allowlist: una sola coincidencia ya rompe el
 *   invariante de H-07.
 *
 * Modo de uso:
 *
 *   node scripts/check-state-css-exclusion.mjs
 *
 * No acepta flags — el invariante es binario (match = fail).
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const BUNDLES = [
  resolve(repoRoot, "dist/index.js"),
  resolve(repoRoot, "dist/index.cjs"),
];
const STATE_FRAGMENTS_DIR = resolve(repoRoot, "dist/styles/state");

// Pre-flight: bundles + fragments existen.
for (const bundlePath of BUNDLES) {
  if (!existsSync(bundlePath)) {
    console.error(
      `ERROR: bundle no existe: ${bundlePath}\n` +
        `→ ejecuta \`npm run build\` antes de este gate, o invoca via ` +
        `\`npm run verify:unit\` que lo encadena.`,
    );
    process.exit(1);
  }
}
if (!existsSync(STATE_FRAGMENTS_DIR)) {
  console.error(
    `ERROR: dir de fragments no existe: ${STATE_FRAGMENTS_DIR}\n` +
      `→ ejecuta \`npm run build\` antes de este gate.`,
  );
  process.exit(1);
}

/**
 * Extrae el set de prefijos reales usados en los fragmentos
 * `dist/styles/state/*.css`. Cada fragmento contiene reglas tipo
 * `.{prefix}\:ig-…{...}` — extraemos `{prefix}` con regex sobre el
 * escape `\:` literal (el escape vive en el byte stream del archivo
 * CSS final, no se resuelve hasta el parsing del browser).
 *
 * Ignoramos `other.css` (red de seguridad del build script para
 * reglas sin pseudo detectable — su contenido es heterogéneo y
 * puede no tener el patrón class-prefix).
 */
function discoverPrefixesFromFragments(dir) {
  const prefixes = new Set();
  // Pattern: `.<prefix>\:ig-` donde <prefix> es secuencia de [a-z0-9-].
  // El `\\:` en JS regex matchea el `\:` literal en el CSS final.
  const prefixRe = /\.([a-z][a-z0-9-]*)\\:ig-/g;
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".css") && f !== "other.css",
  );
  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf8");
    let match;
    while ((match = prefixRe.exec(content)) !== null) {
      const prefix = match[1];
      if (prefix) prefixes.add(prefix);
    }
  }
  return [...prefixes].sort();
}

const STATE_PREFIXES = discoverPrefixesFromFragments(STATE_FRAGMENTS_DIR);

if (STATE_PREFIXES.length === 0) {
  console.error(
    `ERROR: no se detectó ningún prefijo de state.css en ${STATE_FRAGMENTS_DIR}.\n` +
      `→ probable corrupción del build o regex desfasado. Revisa los ` +
      `fragments manualmente.`,
  );
  process.exit(1);
}

// `${prefix}:ig-` — patrón literal en JS strings (sin escape de `:`).
const PATTERNS = STATE_PREFIXES.map((prefix) => `${prefix}:ig-`);

let allOk = true;
const violations = [];

for (const bundlePath of BUNDLES) {
  const content = readFileSync(bundlePath, "utf8");

  for (const pattern of PATTERNS) {
    if (content.includes(pattern)) {
      allOk = false;
      const idx = content.indexOf(pattern);
      const start = Math.max(0, idx - 40);
      const end = Math.min(content.length, idx + pattern.length + 40);
      const snippet = content.slice(start, end).replace(/\n/g, "\\n");
      violations.push({
        bundle: bundlePath.replace(repoRoot + "/", ""),
        pattern,
        position: idx,
        snippet,
      });
    }
  }
}

if (allOk) {
  console.log(
    `✓ state.css excluded from JS bundles (${String(BUNDLES.length)} bundles, ${String(PATTERNS.length)} prefixes checked: ${STATE_PREFIXES.join(", ")})`,
  );
  process.exit(0);
}

console.error("\nstate.css UTILITIES detected in JS bundle(s):\n");
for (const v of violations) {
  console.error(
    `  ${v.bundle} @ offset ${String(v.position)}\n` +
      `    pattern: ${v.pattern}\n` +
      `    context: …${v.snippet}…\n`,
  );
}
console.error(
  `${String(violations.length)} violation(s). state.css utilities deben quedar ` +
    `fuera del bundle JS (H-07/D9). Si un componente del DS empezó a usarlas ` +
    `por error, refactor a clase de componente. Si es intencional (raro), ` +
    `actualizar este gate + decision doc.`,
);
process.exit(1);
