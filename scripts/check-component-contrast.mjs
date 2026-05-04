#!/usr/bin/env node
/**
 * Guardrail CI: valida invariantes del DS sin levantar navegador.
 *
 *   (1) ERROR: WCAG ≥ 4.5 en cada par bg/color resuelto en ambos temas
 *       para cada regla de igoded-components.css que declare ambos.
 *   (2) ERROR: Geometría OKLCH dual: ΔH ≤ 10° entre {cardinal}-lux y
 *       {cardinal}-nox; L_lux ≈ 0.32 ± 0.04; L_nox ≈ 0.84 ± 0.04;
 *       L_lux + L_nox ≈ 1.16 ± 0.08.
 *   (3) ERROR/WARN: Separación perceptual ΔE OKLab entre cardinales de
 *       UI activa (excluye cinis, que es texto del cuerpo). ERROR si el
 *       par cae bajo `error_threshold` (0.05) salvo allowlist explícita;
 *       WARN si está bajo `warn_threshold` (0.10) o si un par
 *       allowlisted ha derivado más de (1 - drift_tolerance) por debajo
 *       de su valor de decisión. Allowlist en
 *       `scripts/perceptual-allowlist.json`. Modo `--print-perceptual-table`
 *       imprime los 42 valores y sale.
 *
 * Diseñado para correr en CI (rápido, sin browser). Complementa el
 * runner storybook+axe que valida contraste en el DOM real.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import postcss from "postcss";
import { parse, formatHex, oklch, oklab, wcagContrast } from "culori";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const TOKENS_FILE = resolve(repoRoot, "src/styles/igoded-tokens.css");
const COMPONENTS_FILE = resolve(repoRoot, "src/styles/igoded-components.css");
const ALLOWLIST_FILE = resolve(__dirname, "perceptual-allowlist.json");

const CARDINALS = [
  "vitreus",
  "axis",
  "cinis",
  "rutilus",
  "laurus",
  "malum",
  "kobalium",
];

// Cardinales que se usan como bg de componente. Cinis se excluye porque
// es texto del cuerpo: la confusión perceptual real ocurre entre
// cardinales que aparecen como fondos contiguos, no contra texto.
const UI_CARDINALS = CARDINALS.filter((c) => c !== "cinis");

const allowlistData = JSON.parse(readFileSync(ALLOWLIST_FILE, "utf8"));

const printTable = process.argv.includes("--print-perceptual-table");

function pairKey(a, b) {
  return [a, b].sort().join("-");
}

// ─── Lectura de tokens ──────────────────────────────────────────────
//
// Resolvemos --ig-* leyendo el CSS y procesando dos pasadas: primero
// los hex literales (fundus-{lux,nox}, cardinales-{lux,nox}, neutral-*,
// los bg-* que sean hex) y después las cadenas var(--...) hasta llegar
// a un literal o a un color-mix.
//
// Para cada tema light/dark resolvemos un mapa independiente respetando
// la prioridad: [data-theme=THEME] > :root.

function readTokenLayer(css, layer) {
  // layer: "light" | "dark" | "root"
  const map = new Map();
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    const sel = rule.selector.replace(/\s+/g, " ").trim();
    let match = false;
    if (layer === "root" && sel === ":root") match = true;
    if (layer === "light" && sel === '[data-theme="light"]') match = true;
    if (layer === "dark" && sel === '[data-theme="dark"]') match = true;
    if (!match) return;
    rule.walkDecls((decl) => {
      if (!decl.prop.startsWith("--ig-")) return;
      const name = decl.prop.slice(2); // "ig-..."
      map.set(name, decl.value.trim());
    });
  });
  return map;
}

function buildResolver(rootMap, themeMap) {
  // value es la cadena cruda del CSS; resolvemos var() hasta hex.
  const merged = new Map([...rootMap, ...themeMap]);

  function resolve(value, depth = 0) {
    if (depth > 10) return null;
    const trimmed = value.trim();
    // Hex literal directo
    if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
    // color-mix: parse mínimo `color-mix(in <space>, <c1> <p1?>, <c2> <p2?>)`
    const mixMatch = trimmed.match(/^color-mix\(\s*in\s+([a-z]+)\s*,\s*(.+?)\s*\)$/i);
    if (mixMatch) {
      const space = mixMatch[1];
      const args = splitMixArgs(mixMatch[2]);
      if (args.length !== 2) return null;
      const [a, b] = args.map(parseMixComponent);
      if (!a || !b) return null;
      const ca = resolve(a.color, depth + 1);
      const cb = resolve(b.color, depth + 1);
      if (!ca || !cb) return null;
      return mixColors(space, ca, a.percent, cb, b.percent);
    }
    // var(--ig-*)
    const varMatch = trimmed.match(/^var\(\s*--([\w-]+)\s*(?:,\s*(.+))?\)$/);
    if (varMatch) {
      const ref = varMatch[1];
      if (merged.has(ref)) return resolve(merged.get(ref), depth + 1);
      if (varMatch[2]) return resolve(varMatch[2], depth + 1);
      return null;
    }
    // keywords
    if (trimmed === "white") return "#ffffff";
    if (trimmed === "black") return "#000000";
    if (trimmed === "transparent") return null;
    return null;
  }

  return { resolve, merged };
}

function splitMixArgs(str) {
  // Split por coma respetando paréntesis anidados (var(...), color-mix(...)).
  const out = [];
  let depth = 0;
  let buf = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function parseMixComponent(s) {
  // "<color>" | "<color> <p>%"
  const m = s.match(/^(.+?)(?:\s+(\d+(?:\.\d+)?)%)?$/);
  if (!m) return null;
  return { color: m[1].trim(), percent: m[2] ? Number(m[2]) / 100 : null };
}

function mixColors(space, hexA, pA, hexB, pB) {
  const a = parse(hexA);
  const b = parse(hexB);
  if (!a || !b) return null;
  // Por defecto color-mix usa 50/50 si solo uno tiene %; si ninguno, 50/50.
  let weightA = pA;
  let weightB = pB;
  if (weightA == null && weightB == null) {
    weightA = 0.5;
    weightB = 0.5;
  } else if (weightA == null) {
    weightA = 1 - weightB;
  } else if (weightB == null) {
    weightB = 1 - weightA;
  }
  // Mezcla en oklch o srgb (las dos que usamos en tokens).
  if (space === "oklch") {
    const la = oklch(a);
    const lb = oklch(b);
    if (!la || !lb) return null;
    // Hue es circular [0, 360). Una mezcla lineal entre 350° y 10°
    // pasa por 180° (camino largo) en vez de por 0° (camino corto).
    // Tomamos el path angular más corto: si |dh| > 180, ajustamos
    // sumando/restando 360 antes de promediar.
    const ha = la.h ?? 0;
    const hb = lb.h ?? 0;
    let dh = hb - ha;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
    const hMixed = (ha + dh * weightB + 360) % 360;
    const out = {
      mode: "oklch",
      l: la.l * weightA + lb.l * weightB,
      c: (la.c ?? 0) * weightA + (lb.c ?? 0) * weightB,
      h: hMixed,
    };
    return formatHex(out);
  }
  // srgb fallback
  const out = {
    mode: "rgb",
    r: a.r * weightA + b.r * weightB,
    g: a.g * weightA + b.g * weightB,
    b: a.b * weightA + b.b * weightB,
  };
  return formatHex(out);
}

function buildThemeMap(themeKey) {
  const css = readFileSync(TOKENS_FILE, "utf8");
  const rootMap = readTokenLayer(css, "root");
  const themeMap = readTokenLayer(css, themeKey);
  const { resolve, merged } = buildResolver(rootMap, themeMap);
  const out = new Map();
  for (const [k, v] of merged) {
    const hex = resolve(v);
    if (hex) out.set(k, hex);
  }
  return out;
}

// ─── Check 1: WCAG en igoded-components.css ─────────────────────────
//
// LIMITACIÓN CONOCIDA: este script audita pares bg+color dentro del
// MISMO bloque CSS (mismo selector). NO resuelve cascada cruzada — un
// caso típico es texto cuyo `color` viene de una regla anidada (ej.
// `.parent.active .child`) sobre un fondo definido en una regla global
// (ej. `.active`) donde el matching del wrapper es accidental por
// scope incorrecto.
//
// Para esos casos, la cobertura está en storybook + axe corriendo en
// chromium real, que sí resuelve la cascada del DOM completo.
//
// Caso histórico que justifica esta nota: bug Stepper beta.20
// (.ig-step-active sin scope matcheaba el wrapper .ig-step-item
// pintándolo con axis-nox; el .ig-step-label heredaba cinis-nox vía
// regla más específica → contraste 1.02 invisible para este script).

function extractRoleFromColorVar(value) {
  // Captura el primer var(--ig-XXXX) presente en `value`.
  const m = value.match(/var\(\s*--(ig-[\w-]+)\s*\)/);
  return m ? m[1] : null;
}

function findContrastViolations(themeMap, themeName) {
  const css = readFileSync(COMPONENTS_FILE, "utf8");
  const root = postcss.parse(css);
  const errors = [];
  root.walkRules((rule) => {
    // Reglas :disabled / [disabled] / [aria-disabled] están exentas WCAG 1.4.3.
    if (/:disabled\b|\[disabled\]|\[aria-disabled="true"\]/.test(rule.selector)) {
      return;
    }
    let bgRef = null;
    let bgValue = null;
    let colorRef = null;
    rule.walkDecls((decl) => {
      if (decl.prop === "background-color" || decl.prop === "background") {
        const ref = extractRoleFromColorVar(decl.value);
        if (ref) {
          bgRef = ref;
          bgValue = decl.value;
        }
      }
      if (decl.prop === "color") {
        const ref = extractRoleFromColorVar(decl.value);
        if (ref) colorRef = ref;
      }
    });
    if (!bgRef || !colorRef) return;
    // Patrón "tinted/outline": bg semi-transparente (color-mix con transparent)
    // usando el mismo cardinal que el color del texto. El contraste real
    // depende del bg padre (bg-base/surface) — el runner storybook+axe lo
    // valida en DOM real. Aquí no podemos resolverlo sin contexto.
    const bgIsTransparentMix =
      /color-mix\([^)]*\btransparent\b/.test(bgValue ?? "") ||
      /\b(?:transparent|alpha-\d+)\b/.test(bgValue ?? "");
    if (bgIsTransparentMix) return;
    const bg = themeMap.get(bgRef);
    const fg = themeMap.get(colorRef);
    if (!bg || !fg) return;
    const ratio = wcagContrast(parse(bg), parse(fg));
    if (ratio < 4.5) {
      errors.push(
        `${rule.selector} [${themeName}]: --${bgRef}=${bg} + --${colorRef}=${fg} = ${ratio.toFixed(2)} (< 4.5)`,
      );
    }
  });
  return errors;
}

// ─── Check 2: geometría OKLCH dual ─────────────────────────────────

function hueDelta(a, b) {
  // Δ angular más corto en grados.
  const ha = a.h ?? 0;
  const hb = b.h ?? 0;
  let d = Math.abs(ha - hb) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function checkPaletteGeometry(lightMap, darkMap) {
  const errors = [];
  for (const c of CARDINALS) {
    const luxHex = lightMap.get(`ig-${c}-lux`) ?? darkMap.get(`ig-${c}-lux`);
    const noxHex = lightMap.get(`ig-${c}-nox`) ?? darkMap.get(`ig-${c}-nox`);
    if (!luxHex || !noxHex) {
      errors.push(`Cardinal ${c}: tokens lux/nox no resueltos`);
      continue;
    }
    const lux = oklch(parse(luxHex));
    const nox = oklch(parse(noxHex));
    if (!lux || !nox) {
      errors.push(`Cardinal ${c}: parse OKLCH falló`);
      continue;
    }
    const dH = hueDelta(lux, nox);
    if (dH > 10) {
      errors.push(`Cardinal ${c}: ΔH=${dH.toFixed(1)}° > 10° (par no es inversión real)`);
    }
    if (Math.abs(lux.l - 0.32) > 0.04) {
      errors.push(`Cardinal ${c}: L_lux=${lux.l.toFixed(3)} fuera de 0.32±0.04`);
    }
    if (Math.abs(nox.l - 0.84) > 0.04) {
      errors.push(`Cardinal ${c}: L_nox=${nox.l.toFixed(3)} fuera de 0.84±0.04`);
    }
    const sum = lux.l + nox.l;
    if (Math.abs(sum - 1.16) > 0.08) {
      errors.push(`Cardinal ${c}: L_lux+L_nox=${sum.toFixed(3)} fuera de 1.16±0.08`);
    }
  }
  return errors;
}

// ─── Check 3: separación perceptual ΔE OKLab + allowlist + drift ──

function computeDeltaE(hexA, hexB) {
  const oa = oklab(parse(hexA));
  const ob = oklab(parse(hexB));
  if (!oa || !ob) return null;
  return Math.sqrt(
    (oa.l - ob.l) ** 2 + (oa.a - ob.a) ** 2 + (oa.b - ob.b) ** 2,
  );
}

function checkPerceptualSeparation(lightMap, darkMap) {
  const errors = [];
  const warnings = [];
  const tableRows = [];
  for (const [theme, map] of [
    ["light", lightMap],
    ["dark", darkMap],
  ]) {
    for (let i = 0; i < UI_CARDINALS.length; i++) {
      for (let j = i + 1; j < UI_CARDINALS.length; j++) {
        const a = UI_CARDINALS[i];
        const b = UI_CARDINALS[j];
        const hexA = map.get(`ig-${a}`);
        const hexB = map.get(`ig-${b}`);
        if (!hexA || !hexB) continue;
        const dE = computeDeltaE(hexA, hexB);
        if (dE == null) continue;
        const key = pairKey(a, b);
        const allowed = allowlistData.allowlist.find(
          (e) => e.pair === key && e.theme === theme,
        );

        if (printTable) {
          tableRows.push({
            theme,
            pair: key,
            dE,
            allowed: !!allowed,
            ref: allowed ? allowed.deltaE_at_decision : null,
          });
          continue;
        }

        if (dE < allowlistData.error_threshold) {
          if (!allowed) {
            errors.push(
              `${theme} ${key}: ΔE=${dE.toFixed(4)} < ${allowlistData.error_threshold} (no allowlisted)`,
            );
          } else if (
            dE < allowed.deltaE_at_decision * allowlistData.drift_tolerance
          ) {
            const driftPct = (1 - allowlistData.drift_tolerance) * 100;
            errors.push(
              `${theme} ${key}: ΔE=${dE.toFixed(4)} (drift > ${driftPct.toFixed(0)}% desde ${allowed.deltaE_at_decision} en ${allowed.decision_date})`,
            );
          } else {
            warnings.push(
              `${theme} ${key}: ΔE=${dE.toFixed(4)} (allowlisted, ref=${allowed.deltaE_at_decision})`,
            );
          }
        } else if (dE < allowlistData.warn_threshold) {
          if (
            allowed &&
            dE < allowed.deltaE_at_decision * allowlistData.drift_tolerance
          ) {
            const driftPct = (1 - allowlistData.drift_tolerance) * 100;
            errors.push(
              `${theme} ${key}: ΔE=${dE.toFixed(4)} (drift > ${driftPct.toFixed(0)}% desde ${allowed.deltaE_at_decision} en ${allowed.decision_date})`,
            );
          } else {
            warnings.push(
              `${theme} ${key}: ΔE=${dE.toFixed(4)} (bajo warn=${allowlistData.warn_threshold})`,
            );
          }
        }
      }
    }
  }
  return { errors, warnings, tableRows };
}

// ─── Main ──────────────────────────────────────────────────────────

const lightMap = buildThemeMap("light");
const darkMap = buildThemeMap("dark");

if (printTable) {
  const { tableRows } = checkPerceptualSeparation(lightMap, darkMap);
  console.log(
    `# Separación perceptual ΔE OKLab — ${tableRows.length} pares (${UI_CARDINALS.length} cardinales UI × 2 temas)\n`,
  );
  for (const theme of ["light", "dark"]) {
    console.log(`## ${theme.toUpperCase()}`);
    console.log("| Par | ΔE | Estado |");
    console.log("|-----|-------|--------|");
    const rows = tableRows.filter((r) => r.theme === theme).sort(
      (a, b) => a.dE - b.dE,
    );
    for (const r of rows) {
      const tag = r.allowed
        ? `allowlisted (ref=${r.ref})`
        : r.dE < allowlistData.warn_threshold
          ? `bajo warn=${allowlistData.warn_threshold}`
          : "ok";
      console.log(`| ${r.pair} | ${r.dE.toFixed(4)} | ${tag} |`);
    }
    console.log("");
  }
  process.exit(0);
}

const perceptual = checkPerceptualSeparation(lightMap, darkMap);

const errors = [
  ...findContrastViolations(lightMap, "light"),
  ...findContrastViolations(darkMap, "dark"),
  ...checkPaletteGeometry(lightMap, darkMap),
  ...perceptual.errors,
];

if (perceptual.warnings.length) {
  console.warn("⚠ Separación perceptual baja entre cardinales UI:\n");
  for (const w of perceptual.warnings) console.warn("  - " + w);
  console.warn(
    `\n  Pares allowlisted o bajo warn (${allowlistData.warn_threshold}). No bloquean CI; revisar al planificar nuevos cardinales.\n`,
  );
}

if (errors.length) {
  console.error("✗ Contrast/palette guardrails failed:\n");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(
  `✓ WCAG ≥ 4.5 en ambos temas, geometría OKLCH OK (${CARDINALS.length} cardinales) y ΔE OKLab evaluado en ${UI_CARDINALS.length} cardinales UI con allowlist (${allowlistData.allowlist.length} excepciones documentadas).`,
);
