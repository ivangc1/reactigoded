#!/usr/bin/env node
/**
 * build-state-css-fragments.mjs — post-RC1
 *
 * Parsea `src/styles/igoded-state-css.css` (7.4 MB / ~291k líneas
 * autogenerado de utility variants pseudo-class) y lo divide en
 * sub-módulos por pseudo-class para que consumers puedan importar
 * sólo lo que usan:
 *
 *   - `state/hover.css`           — `.hover\:ig-X:hover`
 *   - `state/focus.css`           — `.focus\:ig-X:focus`
 *   - `state/focus-visible.css`   — `.focus-visible\:ig-X:focus-visible`
 *   - `state/active.css`          — `.active\:ig-X:active`
 *   - `state/disabled.css`        — `.disabled\:ig-X:disabled`
 *   - `state/group-hover.css`     — `.ig-group:hover .group-hover\:ig-X`
 *   - `state/other.css`           — cualquier regla que no encaje
 *     (red de seguridad: si el state.css generador añade otra
 *     pseudo-class futura, sus reglas terminan aquí).
 *
 * Mantiene `src/styles/igoded-state-css.css` intacto como meta
 * (backward compat con consumers que ya importan
 * `reactigoded/styles/state.css`).
 *
 * ─── Contrato de invocación ─────────────────────────────────────
 * • **Invoker**: encadenado en el script `build` de package.json.
 *   Re-emite los fragmentos cada vez que se hace build, así no se
 *   quedan stale tras regenerar state.css.
 * • **Entorno requerido**: PostCSS (devDep). `src/styles/igoded-state-css.css`
 *   debe existir.
 * • **Fallback / errores**: cualquier I/O error propaga (exit no-cero).
 *   Si el parser falla con un selector raro, lo agrupa en `other.css`
 *   en lugar de abortar.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import postcss from "postcss";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const STATE_CSS = resolve(repoRoot, "src/styles/igoded-state-css.css");
const OUT_DIR = resolve(repoRoot, "src/styles/state");

if (!existsSync(STATE_CSS)) {
  console.error(`[state-fragments] no se encuentra ${STATE_CSS}`);
  process.exit(1);
}

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

// Categorías especiales que no se pueden detectar por pseudo-class
// simple: `group-hover` usa el selector descendiente
// `.ig-group:hover .group-hover\:...`. Lo chequeamos ANTES de la
// extracción genérica de pseudo-class para que `:hover` no se lo
// quede.
const SPECIAL_CATEGORIES = [
  {
    name: "group-hover",
    test: (sel) => sel.includes(".ig-group:hover"),
  },
];

// Pseudo-classes esperadas. Cualquier pseudo extra que aparezca en
// state.css se colapsa en la categoría detectada dinámicamente —
// el script no necesita actualización para nuevas pseudo. Si no
// detecta ninguna pseudo, va a `other` (selectores estructurales sin
// pseudo, raros pero posibles).
const KNOWN_PSEUDOS = [
  "focus-visible",
  "focus-within",
  "first-child",
  "last-child",
  "first-of-type",
  "last-of-type",
  "nth-child",
  "nth-of-type",
  "only-child",
  "placeholder-shown",
  "read-only",
  "read-write",
  "user-invalid",
  "hover",
  "focus",
  "active",
  "disabled",
  "checked",
  "indeterminate",
  "required",
  "optional",
  "invalid",
  "valid",
  "empty",
  "target",
  "in-range",
  "out-of-range",
  "default",
];

/**
 * Devuelve el pseudo-class del selector como nombre del bucket.
 *
 * IMPORTANTE: el state.css emite clases con escape de `:` (ej.
 * `.first\:ig-caret`) — el `\:` es CSS escape para que el `:` sea
 * parte del nombre de clase, NO un pseudo-class. Hay que ignorar
 * estos cuando detectamos pseudos.
 *
 * Estrategia: usar lookbehind negativo para excluir `\:` y luego
 * tomar el ÚLTIMO match (el pseudo real suele estar al final del
 * selector).
 */
function detectPseudo(selector) {
  // (?<!\\) = no precedido por `\`.
  const matches = [...selector.matchAll(/(?<!\\):([a-z][a-z-]*)/g)];
  if (matches.length === 0) return "other";
  // Último pseudo del selector (el más específico al elemento).
  const lastMatch = matches[matches.length - 1];
  if (!lastMatch) return "other";
  const p = lastMatch[1];
  if (!p) return "other";
  return KNOWN_PSEUDOS.includes(p) ? p : "other";
}

const buckets = new Map();
buckets.set("other", postcss.root());
for (const c of SPECIAL_CATEGORIES) buckets.set(c.name, postcss.root());
for (const p of KNOWN_PSEUDOS) buckets.set(p, postcss.root());

const css = readFileSync(STATE_CSS, "utf8");
const root = postcss.parse(css);

let totalRules = 0;
const counts = new Map();
counts.set("other", 0);
for (const c of SPECIAL_CATEGORIES) counts.set(c.name, 0);
for (const p of KNOWN_PSEUDOS) counts.set(p, 0);

root.walkRules((rule) => {
  totalRules++;
  let matched = null;
  // 1. Categorías especiales (group-hover) primero.
  for (const c of SPECIAL_CATEGORIES) {
    if (c.test(rule.selector)) {
      matched = c.name;
      break;
    }
  }
  // 2. Pseudo-class detectada dinámicamente.
  if (matched === null) {
    matched = detectPseudo(rule.selector);
  }
  buckets.get(matched).append(rule.clone());
  counts.set(matched, (counts.get(matched) ?? 0) + 1);
});

// Cabecera estandarizada por fragmento.
function header(name) {
  const TITLE = name.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  return `/*
═══════════════════════════════════════════════════════════════════════════════
IGODED STATE CSS — ${TITLE} (fragmento autogenerado)
═══════════════════════════════════════════════════════════════════════════════

Subset de \`igoded-state-css.css\` generado por
\`scripts/build-state-css-fragments.mjs\`. Permite a consumers
importar solo el subset de pseudo-classes que usan, sin cargar el
resto.

NO editar a mano: cualquier cambio se sobreescribe en el siguiente
build. Para modificar las reglas, editar \`igoded-state-css.css\` y
re-correr \`npm run build\`.
*/
`;
}

const allNames = [
  "other",
  ...SPECIAL_CATEGORIES.map((c) => c.name),
  ...KNOWN_PSEUDOS,
];
// Solo escribimos los buckets con al menos 1 regla — evita generar
// fragmentos vacíos que confundirían a consumers.
const writtenFiles = [];
for (const name of allNames) {
  if ((counts.get(name) ?? 0) === 0) continue;
  const bucket = buckets.get(name);
  const out = resolve(OUT_DIR, `${name}.css`);
  const content = header(name) + "\n" + bucket.toString();
  writeFileSync(out, content, "utf8");
  writtenFiles.push(name);
}

console.log(
  `[state-fragments] ${String(totalRules)} reglas distribuidas en ${String(writtenFiles.length)} fragmento(s):`,
);
for (const name of writtenFiles) {
  const c = counts.get(name) ?? 0;
  console.log(`  - state/${name}.css: ${String(c)} regla(s)`);
}
