#!/usr/bin/env node
/**
 * check-css-scope-leaks.mjs — beta.21
 *
 * Guardrail estático que detecta riesgo de "scope-leak" en
 * `igoded-components.css`: una clase global de variant/state
 * (`.ig-X-foo` declarada SIN compound `.ig-X.ig-X-foo` ni descendant
 * `.ig-Y .ig-X-foo`) que se emite en >1 elemento de la jerarquía DOM
 * del mismo componente.
 *
 * Patrón histórico documentado:
 *
 *   - Divider beta.14: `.ig-divider-brand` pintaba el wrapper completo
 *     en variante "with text".
 *   - Stepper beta.20: `.ig-step-active` matcheaba `<span class="ig-step ig-step-active">`
 *     Y `<div class="ig-step-item ig-step-active">`, dejando el label
 *     en contraste 1.02. Fix: selector compound `.ig-step.ig-step-active`.
 *
 * Heurística:
 *
 *   1. Parsear CSS con PostCSS, listar reglas cuyo selector es solo una
 *      clase (`.ig-X-foo`) sin combinator (descendant, child, sibling)
 *      ni concatenación con otra clase. Esos son los CANDIDATOS a leak.
 *   2. Filtrar a candidatas que sean **modificadores de estado/variant**
 *      (sufijos típicos: `-active`, `-complete`, `-selected`,
 *      `-disabled`, `-danger`, `-error`, `-success`, `-warning`, …).
 *      Clases base de wrapper/slot (`.ig-stepper`, `.ig-accordion-header`,
 *      `.ig-pagination-item`) NO son riesgo de scope-leak: son
 *      arquitectura del componente, emitirlas en >1 elemento es
 *      intencional. El bug real ocurre cuando un modificador se aplica
 *      en wrapper Y child (caso Stepper beta.20: `.ig-step-active` en
 *      `<span class="ig-step ig-step-active">` Y en
 *      `<div class="ig-step-item ig-step-active">`).
 *   3. Por cada clase candidata filtrada, buscar en
 *      `src/components/<Component>/**.tsx` (excluyendo `.test.` y
 *      `.stories.`) las apariciones literales como token de className.
 *      Si en un mismo archivo aparece en ≥ 2 líneas distintas (proxy
 *      razonable de "≥ 2 elementos JSX que la emiten"), reportar.
 *   4. Salir con código no-cero si hay reports y `--strict`; con `--soft`
 *      (default) solo warn.
 *
 * Limitaciones documentadas:
 *
 *   - No captura "cascade reach" (clase global aplicada a un solo
 *     elemento que pinta también descendientes vía herencia color/bg
 *     o selectores `*`). Caso Divider beta.14 NO se captura aquí.
 *     Cobertura adicional: `check-component-contrast.mjs` con DOM real.
 *   - Heurística sobre líneas distintas: una clase emitida en una
 *     iteración (`.map()` rendereando varios items) podría tener N
 *     ocurrencias visuales pero solo 1 línea fuente. NO es leak en
 *     ese caso. Pero el script lo marcaría limpio. OK.
 *   - Si una clase aparece en un comentario JSDoc del .tsx, suma como
 *     ocurrencia (falso positivo). Mitigación: ignoramos líneas que
 *     empiecen por `//`, `*`, ` *`. No es perfecto.
 *
 * Modo de uso:
 *
 *   node scripts/check-css-scope-leaks.mjs           # soft (warn only)
 *   node scripts/check-css-scope-leaks.mjs --strict  # error si hay leaks
 *   node scripts/check-css-scope-leaks.mjs --json    # output JSON
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative, sep } from "node:path";
import postcss from "postcss";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const COMPONENTS_CSS = resolve(repoRoot, "src/styles/igoded-components.css");
const COMPONENTS_DIR = resolve(repoRoot, "src/components");
const ALLOWLIST_FILE = resolve(__dirname, "scope-leak-allowlist.json");

const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const JSON_OUT = args.includes("--json");

// ─── Allowlist de findings audited & intencionales ─────────────
let allowlistEntries = [];
try {
  const allowlistRaw = readFileSync(ALLOWLIST_FILE, "utf8");
  allowlistEntries = JSON.parse(allowlistRaw).entries ?? [];
} catch {
  // Allowlist opcional; si no existe el script funciona normal.
}
const allowlistSet = new Set(
  allowlistEntries.map((e) => `${e.class}|${e.file}`),
);

// ─── Paso 1: extraer clases candidatas a leak desde CSS ──────

/**
 * Devuelve true si el selector es una clase única (`.ig-X-foo`) sin
 * combinators, sin pseudo-clases que cambien la especificidad ni
 * concatenación con otra clase. Estos son los selectores "globales
 * sueltos" propensos a leak.
 */
function isLooseGlobalSelector(selector) {
  const trimmed = selector.trim();
  // Tiene combinator (espacio, >, +, ~) → no global suelto.
  if (/[\s>+~]/.test(trimmed)) return false;
  // Concatena con otra clase (`.ig-x.ig-y`) → ya está scopeado.
  // Contamos cuantos `.` hay; >1 = compound.
  const dotCount = (trimmed.match(/\./g) ?? []).length;
  if (dotCount !== 1) return false;
  // Empieza por `.ig-` (solo nuestras clases).
  if (!trimmed.startsWith(".ig-")) return false;
  // Excluye pseudo-elementos (`.ig-X::before`) — no aplican al elemento
  // mismo, no son riesgo de scope-leak relevante.
  if (trimmed.includes("::")) return false;
  // Pseudo-clases simples (`:hover`, `:focus-visible`) — sí cuentan
  // porque la clase base sigue pudiendo aplicar al elemento. Las
  // dejamos pasar (extraemos la clase base).
  return true;
}

/**
 * Extrae la clase base (sin pseudo-clases) de un selector
 * `.ig-X-foo:hover` → `ig-X-foo`.
 */
function extractClassName(selector) {
  const trimmed = selector.trim();
  // Quita el `.` inicial.
  let cls = trimmed.startsWith(".") ? trimmed.slice(1) : trimmed;
  // Quita pseudo-clase si existe.
  const colonIdx = cls.indexOf(":");
  if (colonIdx !== -1) cls = cls.slice(0, colonIdx);
  return cls;
}

const css = readFileSync(COMPONENTS_CSS, "utf8");
const root = postcss.parse(css);
const allLooseClasses = new Set();
root.walkRules((rule) => {
  // Un selector puede ser compuesto por comas: ".ig-a, .ig-b".
  // Cada uno se evalúa independientemente.
  const selectors = rule.selector.split(",");
  for (const sel of selectors) {
    if (isLooseGlobalSelector(sel)) {
      allLooseClasses.add(extractClassName(sel));
    }
  }
});

// Sufijos de modificador (estado/variant). Son los que pueden producir
// scope-leak real al combinarse en wrapper + child. Las clases base
// (`.ig-stepper`, `.ig-accordion`) sin estos sufijos son arquitectura
// del componente y no se filtran como riesgo.
const MODIFIER_SUFFIXES = [
  // Estados
  "-active",
  "-complete",
  "-selected",
  "-disabled",
  "-checked",
  "-open",
  "-collapsed",
  "-hidden",
  "-loading",
  "-readonly",
  "-focused",
  "-hover",
  "-pressed",
  // Variantes semánticas
  "-brand",
  "-secondary",
  "-success",
  "-warning",
  "-danger",
  "-error",
  "-info",
  // Apariencia
  "-filled",
  "-outline",
  "-glass",
  "-bordered",
  "-elevated",
  "-dashed",
  "-dotted",
  "-solid",
  // Tamaños y modificadores comunes
  "-sm",
  "-md",
  "-lg",
  "-xl",
  // Estado marcado
  "-mixed",
  "-indeterminate",
];

function isModifierClass(name) {
  return MODIFIER_SUFFIXES.some((sfx) => name.endsWith(sfx));
}

const candidateClasses = new Set(
  [...allLooseClasses].filter((c) => isModifierClass(c)),
);

// ─── Paso 2: por cada componente, contar líneas con la clase ─

/**
 * Walk recursivo de archivos `.tsx` (no `.test.`, no `.stories.`,
 * no `index.`).
 */
function walkComponentTsx(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walkComponentTsx(full));
    } else if (
      entry.endsWith(".tsx") &&
      !entry.endsWith(".test.tsx") &&
      !entry.endsWith(".stories.tsx")
    ) {
      out.push(full);
    }
  }
  return out;
}

const componentFiles = walkComponentTsx(COMPONENTS_DIR);

/**
 * Cuenta en cuántas líneas DISTINTAS aparece la clase como token
 * literal dentro del file. Ignora líneas de comentario simples
 * (`//`, `*`, ` *`) y bloques de comentario inline obvios.
 */
function countLinesWithClass(filePath, className) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  // Token boundary: la clase debe estar entre comillas o caracteres
  // que NO formen parte de otro identifier (-, _, alphanum). Para
  // clases que terminan en parte de otra (ej `ig-step` y `ig-step-active`)
  // necesitamos boundary estricto: la clase NO va seguida de `-` o
  // alfanumérico que extiendan el nombre.
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`);
  const linesHit = new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Salta comentarios simples.
    const trimmed = line.trim();
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*")
    ) {
      continue;
    }
    if (re.test(line)) linesHit.add(i);
  }
  return linesHit.size;
}

const findings = [];
const allowlisted = [];
for (const cls of candidateClasses) {
  for (const file of componentFiles) {
    const count = countLinesWithClass(file, cls);
    if (count >= 2) {
      const relFile = relative(repoRoot, file).split(sep).join("/");
      const key = `${cls}|${relFile}`;
      const entry = {
        class: cls,
        file: relFile,
        lineCount: count,
      };
      if (allowlistSet.has(key)) {
        allowlisted.push(entry);
      } else {
        findings.push(entry);
      }
    }
  }
}

// ─── Paso 3: reportar ─────────────────────────────────────────

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        findings,
        allowlisted,
        candidateCount: candidateClasses.size,
      },
      null,
      2,
    ),
  );
  process.exit(STRICT && findings.length > 0 ? 1 : 0);
}

if (findings.length === 0) {
  console.log(
    `[scope-leak] OK — ${String(candidateClasses.size)} clase(s) modificadora(s) revisadas; ${String(allowlisted.length)} en allowlist; ningún riesgo nuevo detectado.`,
  );
  process.exit(0);
}

console.log(
  `[scope-leak] ${String(findings.length)} riesgo(s) detectado(s) entre ${String(candidateClasses.size)} clase(s) candidata(s):`,
);
console.log("");
for (const f of findings) {
  console.log(
    `  - .${f.class} emitida en ${String(f.lineCount)} líneas distintas de ${f.file}`,
  );
  console.log(
    `    Recomendación: cambiar regla CSS de \`.${f.class}\` a selector compound (ej. \`.ig-X.${f.class}\`) que limite la regla al elemento intencionado.`,
  );
}
console.log("");
console.log(
  STRICT
    ? "Saliendo con error (--strict). Convertir a selector compound o suprimir falsos positivos editando el script."
    : "Modo soft: salir limpio. Pasar --strict para error en CI.",
);
process.exit(STRICT ? 1 : 0);
