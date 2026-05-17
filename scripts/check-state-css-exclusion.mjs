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
 * Las utilities de `state.css` usan el patrón `prefix\:ig-…` en
 * source CSS (escape de `:` para que el selector parsee), que
 * compila a `prefix:ig-…` en la cadena final del CSS. En JS las
 * clases nunca llevan el escape — si un consumer pasara una de
 * estas clases como `className`, aparecería como literal
 * `"hover:ig-…"`. Por tanto el gate busca exactamente esos
 * prefijos en el bundle JS.
 *
 * Prefijos cubiertos (un fragmento por pseudo-class en
 * `dist/styles/state/`):
 *   hover, focus, active, disabled, checked, default, empty,
 *   first-child, last-child.
 *
 * ─── Contrato de invocación ────────────────────────────────────
 * • **Invoker**: `npm run test:state-css-exclusion`, encadenado en
 *   `verify:unit` pipeline. CI lo invoca como gate.
 * • **Entorno requerido**: `dist/index.js` + `dist/index.cjs`
 *   (asume build previo; `verify:unit` corre `npm run build`
 *   antes de este gate).
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
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const BUNDLES = [
  resolve(repoRoot, "dist/index.js"),
  resolve(repoRoot, "dist/index.cjs"),
];

// Prefijos de state.css (cada uno corresponde a un fragmento publicado
// en `dist/styles/state/<prefix>.css`).
const STATE_PREFIXES = [
  "hover",
  "focus",
  "active",
  "disabled",
  "checked",
  "default",
  "empty",
  "first-child",
  "last-child",
];

// `${prefix}:ig-` — patrón literal en JS strings (sin escape de `:`).
const PATTERNS = STATE_PREFIXES.map((prefix) => `${prefix}:ig-`);

let allOk = true;
const violations = [];

for (const bundlePath of BUNDLES) {
  if (!existsSync(bundlePath)) {
    console.error(
      `ERROR: bundle no existe: ${bundlePath}\n` +
        `→ ejecuta \`npm run build\` antes de este gate, o invoca via ` +
        `\`npm run verify:unit\` que lo encadena.`,
    );
    process.exit(1);
  }

  const content = readFileSync(bundlePath, "utf8");

  for (const pattern of PATTERNS) {
    if (content.includes(pattern)) {
      allOk = false;
      // Encontrar la posición + un fragmento de contexto para el reporte.
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
    `✓ state.css excluded from JS bundles (${BUNDLES.length} bundles, ${PATTERNS.length} prefixes checked)`,
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
