#!/usr/bin/env node
/**
 * check-hex-drift.mjs — Capa 3.2 del debt doc
 *
 * Detecta hex literales hardcoded que han quedado stale tras una
 * recalibración de tokens. Patrón documentado:
 *
 *   - beta.16: vitreus reposicionado de H≈194° a H=207.5°
 *     (`#5eded5` → `#3ae2f7`). Tokens actualizados, pero `manager.ts`,
 *     stories Card, stories Avatar y SVG inline siguieron con el hex
 *     viejo. Detectado en auditoría manual de beta.18 y fixed en
 *     beta.19 (commit `4a1fecf`).
 *   - beta.16: axis recalibrado (`#d4c2f9` → `#d2bff7`).
 *   - beta.16: cinis ajustado (`#c3cbdb` → `#c4cada`).
 *
 * Cada vez que se recalibra un cardinal, ~10-15 hex hardcoded en
 * archivos no-CSS quedan stale silenciosamente y producen drift visual
 * entre catálogo y componentes reales. Ningún test los detecta.
 *
 * Heurística:
 *
 *   1. Parsear `src/styles/igoded-tokens.css` y extraer la tabla de
 *      tokens cardinales (`--ig-{cardinal}-{lux|nox}`,
 *      `--ig-fundus-{lux|nox}`) → set de hex VIGENTES.
 *   2. Grep `#[0-9a-fA-F]{6}` en archivos no-CSS donde puede haber
 *      drift: `src/components/**.{tsx,stories.tsx}`,
 *      `.storybook/**.{ts,tsx,html}`, `src/stories/**.{mdx,tsx}`,
 *      `README.md`, `docs/**.md`.
 *   3. Para cada hex encontrado, comprobar:
 *      - Si está en el set vigente → OK (es un valor del DS actual).
 *      - Si NO está pero tiene ΔE OKLab < 0.05 con un token vigente
 *        → "posible drift" (probablemente valor stale pre-recalibración
 *        del cardinal cromáticamente cercano).
 *      - Si NO está y ΔE ≥ 0.05 con todos los tokens → hex no
 *        relacionado con la paleta (color decorativo, ejemplo, etc.).
 *        No reportar.
 *   4. Allowlist explícita en `scripts/hex-drift-allowlist.json` para
 *      hex intencionales (transparencias, gradientes decorativos, hex
 *      cromáticamente cercanos a tokens pero usados deliberadamente).
 *
 * ─── Contrato de invocación ─────────────────────────────────────
 * • **Invoker**: `npm run test:hex-drift` (con `--strict`),
 *   encadenado en `verify:unit` pipeline. CI lo invoca como gate.
 * • **Entorno requerido**: culori (devDep);
 *   `src/styles/igoded-tokens.css`,
 *   archivos source (lectura solo, no modifica nada),
 *   `scripts/hex-drift-allowlist.json` (allowlist opcional).
 * • **Fallback / errores**: ERROR (exit 1) en `--strict` si hay
 *   drifts nuevos. WARN (exit 0) en modo soft. Si la allowlist no
 *   es JSON válido, lo ignora y trata todo como riesgo.
 *
 * Modo de uso:
 *
 *   node scripts/check-hex-drift.mjs           # soft (warn only)
 *   node scripts/check-hex-drift.mjs --strict  # error si hay drift
 *   node scripts/check-hex-drift.mjs --json    # output JSON
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative, sep } from "node:path";
import { parse, oklab } from "culori";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const TOKENS_CSS = resolve(repoRoot, "src/styles/igoded-tokens.css");
const ALLOWLIST_FILE = resolve(__dirname, "hex-drift-allowlist.json");

const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const JSON_OUT = args.includes("--json");

// Umbral ΔE OKLab para considerar "drift posible". 0.05 es el threshold
// usado en check-component-contrast (separación perceptual cardinal),
// suficiente para distinguir hex stale de un valor cromáticamente
// distinto.
const DRIFT_DELTA_E = 0.05;

// ─── Allowlist ─────────────────────────────────────────────────
let allowlistEntries = [];
try {
  const raw = readFileSync(ALLOWLIST_FILE, "utf8");
  allowlistEntries = JSON.parse(raw).entries ?? [];
} catch {
  // opcional
}
const allowlistSet = new Set(
  allowlistEntries.map((e) => `${e.hex.toLowerCase()}|${e.file}`),
);

// ─── Paso 1: extraer tokens vigentes desde igoded-tokens.css ─

const tokensCss = readFileSync(TOKENS_CSS, "utf8");
// Match `--ig-X-{lux|nox}: #aabbcc;` y `--ig-fundus-{lux|nox}: #aabbcc;`
const tokenRe =
  /--ig-([a-z]+)-(lux|nox)\s*:\s*(#[0-9a-fA-F]{6})/g;
const tokensByHex = new Map(); // hex (lowercase) → "ig-vitreus-lux"
const tokensList = []; // [{ hex, name, lab }]
let match;
while ((match = tokenRe.exec(tokensCss)) !== null) {
  const [, cardinal, theme, hex] = match;
  const lower = hex.toLowerCase();
  const tokenName = `--ig-${cardinal}-${theme}`;
  tokensByHex.set(lower, tokenName);
  const lab = oklab(parse(hex));
  if (lab) tokensList.push({ hex: lower, name: tokenName, lab });
}

// ─── Paso 2: walk source files buscando hex literales ──────────

const SOURCE_GLOBS = [
  "src/components",
  "src/stories",
  ".storybook",
  "docs",
];
const ALLOW_EXT = /\.(tsx?|mdx?|html|md)$/;

function walkSourceFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walkSourceFiles(full));
    } else if (ALLOW_EXT.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const sourceFiles = SOURCE_GLOBS.flatMap((rel) =>
  walkSourceFiles(resolve(repoRoot, rel)),
);
// README.md también
const readme = resolve(repoRoot, "README.md");
if (existsSync(readme)) sourceFiles.push(readme);

// Hex literal regex. Captura `#aabbcc` (6 chars). NO captura `#aabbccdd`
// (8 chars con alpha) ni `#abc` (3 chars short form) — esos rara vez
// son tokens del DS. Si hace falta cubrirlos en el futuro, ampliar.
const HEX_RE = /#([0-9a-fA-F]{6})\b/g;

// ─── Paso 3: cruzar ────────────────────────────────────────────

function deltaE(labA, labB) {
  return Math.sqrt(
    (labA.l - labB.l) ** 2 +
      (labA.a - labB.a) ** 2 +
      (labA.b - labB.b) ** 2,
  );
}

const findings = [];
const allowlisted = [];
let totalHexFound = 0;

for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    HEX_RE.lastIndex = 0;
    while ((m = HEX_RE.exec(line)) !== null) {
      totalHexFound++;
      const hex = "#" + m[1].toLowerCase();
      const relFile = relative(repoRoot, file).split(sep).join("/");
      // Si el hex es un token vigente, OK.
      if (tokensByHex.has(hex)) continue;
      // Si está allowlisted, ignorar.
      if (allowlistSet.has(`${hex}|${relFile}`)) {
        allowlisted.push({ hex, file: relFile, line: i + 1 });
        continue;
      }
      // Calcular ΔE con todos los tokens.
      const lab = oklab(parse(hex));
      if (!lab) continue;
      let nearest = null;
      let nearestDelta = Infinity;
      for (const t of tokensList) {
        const d = deltaE(lab, t.lab);
        if (d < nearestDelta) {
          nearestDelta = d;
          nearest = t;
        }
      }
      if (nearestDelta < DRIFT_DELTA_E && nearest) {
        findings.push({
          hex,
          file: relFile,
          line: i + 1,
          nearestToken: nearest.name,
          nearestHex: nearest.hex,
          deltaE: Number(nearestDelta.toFixed(4)),
        });
      }
      // Si ΔE ≥ DRIFT_DELTA_E, hex no relacionado con la paleta. No reportar.
    }
  }
}

// ─── Paso 4: reportar ──────────────────────────────────────────

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        findings,
        allowlisted,
        tokenCount: tokensList.length,
        totalHexScanned: totalHexFound,
      },
      null,
      2,
    ),
  );
  process.exit(STRICT && findings.length > 0 ? 1 : 0);
}

if (findings.length === 0) {
  console.log(
    `[hex-drift] OK — ${String(totalHexFound)} hex encontrados, ${String(tokensList.length)} tokens vigentes; ${String(allowlisted.length)} allowlisted; ningún drift detectado.`,
  );
  process.exit(0);
}

console.log(
  `[hex-drift] ${String(findings.length)} drift(s) posible(s) detectado(s) (ΔE OKLab < ${String(DRIFT_DELTA_E)}):`,
);
console.log("");
for (const f of findings) {
  console.log(
    `  - ${f.file}:${String(f.line)} → ${f.hex}`,
  );
  console.log(
    `    Token cercano \`${f.nearestToken}\` = ${f.nearestHex} (ΔE=${String(f.deltaE)}, drift muy probable)`,
  );
  console.log(
    `    Hint: sustituir por \`var(${f.nearestToken})\` o el hex actual ${f.nearestHex}.`,
  );
}
console.log("");
console.log(
  STRICT
    ? "Saliendo con error (--strict). Sustituir hex stale por var() del token, o añadir a hex-drift-allowlist.json con justificación."
    : "Modo soft: salir limpio. Pasar --strict para error en CI.",
);
process.exit(STRICT ? 1 : 0);
