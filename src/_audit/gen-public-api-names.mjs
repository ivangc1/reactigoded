#!/usr/bin/env node
/**
 * gen-public-api-names.mjs — SEMBRADOR one-shot de public-api-names.json
 *
 * ⚠ NO es parte del pipeline. NO tiene npm script. NO es un botón de
 * regenerar (un `vitest -u` con pasos extra). La semilla se siembra UNA
 * vez: este script leyó docs/CSSAPI.mdx + dist/ para PROPONER el conjunto,
 * y el resultado (src/_audit/public-api-names.json) se curó y ratificó a
 * mano. A partir de ahí el JSON es el ANCLA; editarlo exige bump MAJOR (ver
 * su _doc). Este archivo se conserva solo para AUDITAR de dónde salió cada
 * nombre y para re-sembrar si algún día se re-decide el alcance con
 * intención explícita — nunca por reflejo tras un cambio de CSS.
 *
 * El gate que corre en CI es scripts/check-public-api-names.mjs (JSON ⊆ dist).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const roles6 = ["brand", "secondary", "success", "warning", "danger", "info"];

// ── Semilla: tablas de docs/CSSAPI.mdx (superficie de COMPONENTE) ──
// La capa utility (bg/text/border/flex/gap/gradient/glow/... y sus
// variantes de estado) queda FUERA por declaración (B), no por silencio.
// Estrechamientos deterministas:
//   1. fenced code blocks fuera — los ejemplos `<div class="ig-flex">`
//      ilustran, no definen contrato.
//   2. ejemplos utility con prefijo de estado (`hover:ig-`, `focus:ig-`)
//      fuera — son sintaxis del state.css, no clases de componente.
//   3. menciones de TOKENS (--ig-bg-muted) en prosa fuera — no son clases.
let doc = readFileSync(`${ROOT}/docs/CSSAPI.mdx`, "utf8");
// (0) La sección meta "Notas finales" en adelante NO define clases de
// componente: contiene la declaración de la capa utility, que LISTA las
// familias utility (`ig-flex`, `ig-bg-*`, …) como EXCLUSIÓN. Sin este corte,
// esa misma lista de exclusión contamina la semilla (`ig-flex` se colaría).
doc = doc.split(/^##\s+Notas finales/m)[0];
doc = doc.replace(/```[\s\S]*?```/g, "");             // (1)
doc = doc.replace(/[a-z][a-z-]*:ig-[a-z0-9-]+/g, ""); // (2)
doc = doc.replace(/--ig-[a-z0-9-]+/g, "");            // (3)

// ∩ de EXISTENCIA contra lo que SHIPPEA (dist), no src: un nombre que el
// build purga, o que solo vive en un comentario CSS (strip-eado en dist),
// NO se congela. Lo real es lo que sale.
const css =
  readFileSync(`${ROOT}/dist/styles/igoded-components.css`, "utf8") + "\n" +
  readFileSync(`${ROOT}/dist/styles/igoded-base.css`, "utf8") + "\n" +
  readFileSync(`${ROOT}/dist/styles/igoded-design.css`, "utf8");
const cssClasses = new Set([...css.matchAll(/\.(ig-[a-z0-9-]+)/g)].map((m) => m[1]));

const seed = new Set();
for (const m of doc.matchAll(/ig-[a-z0-9-]+-\{([^}]+)\}([a-z0-9-]*)/g)) {
  const full = m[0];
  const prefix = full.slice(0, full.indexOf("-{"));
  const content = m[1].trim();
  const suffix = m[2]; // texto TRAS `}` (p.ej. `-filled` en `.ig-card-{variant}-filled`); "" si no hay (codex P1)
  let members;
  if (content === "variant") members = roles6;
  else if (content.includes(",")) members = content.split(",").map((s) => s.trim());
  else members = [content];
  for (const mem of members) seed.add(`${prefix}-${mem}${suffix}`);
}
for (const m of doc.matchAll(/ig-[a-z0-9-]+/g)) seed.add(m[0]);

const classes = [...seed].filter((c) => cssClasses.has(c) && !c.endsWith("-")).sort();

// classHooks: clases PÚBLICAS que el DS EMITE por JS pero NO estiliza — existen
// SOLO para que el consumer las apunte (`[class^="ig-tooltip-place-"]`). El `∩ CSS`
// no las ve (sin regla), así que se curan a MANO: no son derivables ("prefijo en
// JS" congelaría fantasmas como ig-btn-md; solo la union de tipos del interpolado
// discrimina = parsear TS = board). Ratificados nombre a nombre.
//   - dynamic: `ig-tooltip-place-${placement}` — construidas; solo el PREFIJO está
//     en JS. El gate verifica el prefijo; los 4 miembros los guardan la union de
//     tipos `Placement` + el review (§141: indirección ensamblada, no automatizable).
//   - literal: `ig-step-interactive` — emitida literal; el gate la verifica entera.
const classHooks = {
  literal: ["ig-step-interactive"],
  dynamic: [
    "ig-tooltip-place-top", "ig-tooltip-place-right",
    "ig-tooltip-place-bottom", "ig-tooltip-place-left",
  ],
};

// data-attrs de ESTADO/tema que el DS emite como superficie observable
// (patrón Radix [data-state]/[data-side]/...). Verificado en dist/*.js.
// EXCLUIDOS: data-mode (valor del prop `attribute` de ThemeToggle, no un
// atributo del DS), data-placement (el DS lo split-ea en side+align, no lo
// emite), data-toast-container / data-tooltip-content (marcadores internos
// sin doc: portal root de Toast y marcador de contenido de Tooltip).
const dataAttributes = [
  "data-align", "data-disabled", "data-side",
  "data-state", "data-step-index", "data-theme",
].sort();

// tokens Tier-2 DERIVADOS de las REGLAS de DesignTokens.mdx §"Tres tiers"
// (L92-95), ∩ dist — NO un predicado sobre la forma. Un predicado inventado
// (`cardinals.includes` + escala alpha) dio 42 = 7 base Tier-2 + 35 alphas
// que son Tier-3 (L98) — categoría equivocada Y subconjunto. Cada regla de
// la doc es un patrón; sus miembros ∩ dist es el freeze. Tier-1 (-lux/-nox)
// y Tier-3 (alpha/glow/neutral/escalas) quedan fuera por tier.
const tokensCss = readFileSync(`${ROOT}/dist/styles/igoded-tokens.css`, "utf8");
const distTokens = new Set([...tokensCss.matchAll(/(--ig-[a-z0-9-]+)/g)].map((m) => m[1]));
const CARDINALS = ["vitreus", "axis", "cinis", "rutilus", "laurus", "malum", "kobalium"]; // semilla ratificada
const ROLES = ["brand", "secondary", "success", "warning", "danger", "info"]; // DesignTokens L93
const t2seed = new Set();
for (const c of CARDINALS) t2seed.add(`--ig-${c}`);        // --ig-{cardinal}
for (const r of ROLES) t2seed.add(`--ig-${r}`);            // --ig-{role}
// REGLA text-on: cada cardinal O rol usado como FONDO tiene su --ig-text-on-*;
// cinis no (es color de texto, no fondo). El `∩ dist` implementa "usado como
// fondo" — text-on-cinis no shippea, así que cae solo. La redacción "cardinal"
// de la doc se quedaba corta; los roles son miembros de la misma regla.
for (const c of [...CARDINALS, ...ROLES]) t2seed.add(`--ig-text-on-${c}`);
for (const s of ["base", "surface", "sunken", "elevated", "muted"]) t2seed.add(`--ig-bg-${s}`);
for (const s of ["heading", "body", "muted", "disabled"]) t2seed.add(`--ig-text-${s}`);
for (const s of ["subtle", "default", "strong"]) t2seed.add(`--ig-border-${s}`);
const tokensTier2 = [...t2seed].filter((t) => distTokens.has(t)).sort();
// auditoría: seed \ dist (la doc promete, dist no define) — opción-3 de tokens
const t2seedMinusDist = [...t2seed].filter((t) => !distTokens.has(t)).sort();
if (t2seedMinusDist.length > 0) console.log("tokens seed\\dist (bug doc):", t2seedMinusDist.join(", "));

const out = {
  _doc:
    "CONTRATO API PÚBLICA ESTABLE 1.0. Congela los NOMBRES públicos de COMPONENTE (clases CSS, classHooks, data-attributes, tokens Tier-2 semánticos). " +
    "classHooks = clases que el DS EMITE por JS SIN regla CSS (existen solo para targeting): ig-step-interactive (literal, verificado entero) + los 4 ig-tooltip-place-* de Tooltip. LÍMITE de los dinámicos: ig-tooltip-place-* se ENSAMBLA en runtime (indirección, ADR §141), así que el gate solo verifica que el PREFIJO se emita; los 4 miembros SON contrato, pero los guardan la union de tipos Placement + el review del PR, no la automatización. " +
    "POLÍTICA (para humanos): editar este fichero = breaking change → exige bump MAJOR + entrada en CHANGELOG. " +
    "ALCANCE AUTOMATIZADO (check-public-api-names.mjs): SOLO integridad — verifica que todo nombre de aquí existe en dist, cazando el rename ACCIDENTAL que olvida el contrato; NO caza el rename DELIBERADO (así es como se renombra: a propósito, con major) ni debe. El major y el CHANGELOG los respaldan el review del PR y el release-gate (ver #15). " +
    "El contrato estable es EXACTAMENTE lo aquí listado. " +
    "FUERA DEL FREEZE: la capa utility (ig-bg-*, ig-text-*, ig-border-*, ig-font-*, ig-flex, ig-gap-*, spacing, ig-gradient-*, ig-glow-*, " +
    "ig-ring-*, ig-fill-*, ig-stroke-*, ig-filter-* y sus variantes de estado hover:/focus:/... del state.css) es opt-in, shippeada y " +
    "documentada, pero EXPERIMENTAL: su vocabulario puede evolucionar SIN major hasta que se declare estable en el CHANGELOG. Queda fuera " +
    "por DECLARACIÓN explícita (CSSAPI.mdx + DesignTokens.mdx), no por silencio. Procedencia: clases raspadas de la PROSA de CSSAPI.mdx (menos code-blocks, prefijos de estado, menciones de token y 'Notas finales'); tokens Tier-2 derivados de las reglas de DesignTokens.mdx; todo ∩ dist; curado y RATIFICADO nombre a nombre.",
  version: 1,
  classes,
  classHooks,
  dataAttributes,
  tokensTier2,
};
writeFileSync(`${ROOT}/src/_audit/public-api-names.json`, JSON.stringify(out, null, 2) + "\n");
console.log(`classes: ${classes.length} | dataAttrs: ${dataAttributes.length} | tokensTier2: ${tokensTier2.length}`);
