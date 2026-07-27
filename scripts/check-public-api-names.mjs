#!/usr/bin/env node
/**
 * check-public-api-names.mjs — gate anti-rename de API pública (§5.13)
 *
 * Verifica que TODO nombre congelado en `src/_audit/public-api-names.json`
 * siga EXISTIENDO en lo que shippea (`dist/`). Un rename o borrado de una
 * clase, data-attr o token público deja un nombre del JSON sin definir en
 * dist → este gate falla. El JSON es el ancla congelada: se edita a mano y
 * su edición exige bump MAJOR + entrada en CHANGELOG (ver su `_doc`).
 *
 * ─── Por qué contra DIST y no src ───────────────────────────────────────
 * "Lo real es lo que sale". Un nombre que el build purga (o que solo vive
 * en un comentario CSS, strip-eado en la minificación) no es contrato. El
 * gate asume build previo — `verify:unit` lo encadena DESPUÉS de `build`,
 * por eso es un script y no un test de vitest (vitest corre pre-build y
 * vería un dist stale/ausente).
 *
 * ─── Por qué NO re-expande desde la doc ─────────────────────────────────
 * El test comprueba `JSON ⊆ dist`, nada más. Si re-derivara los nombres de
 * `docs/CSSAPI.mdx` en cada corrida, resucitaría el acoplamiento doc↔gate
 * que #17 rechazó (la doc se leyó UNA vez como semilla; lo congelado es el
 * JSON). El gate contrario —doc que promete clases que no shippean— es otro
 * gate (`doc ⊆ dist`), pendiente en el board.
 *
 * ─── Contrato de invocación ─────────────────────────────────────────────
 * • Invoker: `npm run test:public-api`, encadenado en `verify:unit` tras
 *   `build`.
 * • Entorno: `dist/styles/*.css` + `dist/*.js` (build previo).
 * • Fallback: ERROR (exit 1) si falta cualquier nombre. Sin allowlist.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rd = (p) => readFileSync(resolve(root, p), "utf8");
const has = (p) => existsSync(resolve(root, p));

const preflight = "dist/styles/igoded-components.css";
if (!has(preflight)) {
  console.error(
    `ERROR: ${preflight} no existe.\n` +
      `→ ejecuta \`npm run build\` antes, o invoca via \`npm run verify:unit\` ` +
      `que lo encadena tras el build.`,
  );
  process.exit(1);
}

const json = JSON.parse(rd("src/_audit/public-api-names.json"));

// Fuentes de EXISTENCIA = lo que shippea (dist).
const css =
  rd("dist/styles/igoded-components.css") + "\n" +
  rd("dist/styles/igoded-base.css") + "\n" +
  rd("dist/styles/igoded-design.css");
const cssClasses = new Set([...css.matchAll(/\.(ig-[a-z0-9-]+)/g)].map((m) => m[1]));
// Solo DECLARACIONES (`--ig-x:`), NO referencias `var(--ig-x)`: si un token
// congelado se borra pero otro token aún lo referencia, su nombre sigue
// apareciendo en el CSS — el gate debe cazar el borrado igual (codex P1).
const tokens = new Set(
  [...rd("dist/styles/igoded-tokens.css").matchAll(/(--ig-[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
);
// Escanear TODOS los chunks JS de dist (recursivo), no solo los 2 facades: el
// build multi-entry emite código compartido a chunks (p.ej. Toast-XXX.js), y un
// data-attr que caiga solo en un chunk compartido daría falso "missing" (codex P1).
function allJsChunks(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...allJsChunks(p));
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}
const bundlesText = allJsChunks(resolve(root, "dist")).map((p) => readFileSync(p, "utf8")).join("\n");
// Nombres EXACTOS, no substring: `data-state` renombrado a `data-stateful` no
// debe pasar por ser prefijo del nuevo nombre emitido (codex P2).
const bundleAttrs = new Set([...bundlesText.matchAll(/data-[a-z0-9-]+/g)].map((m) => m[0]));

const missing = [];
for (const c of json.classes) if (!cssClasses.has(c)) missing.push(`class  .${c}`);
for (const t of json.tokensTier2) if (!tokens.has(t)) missing.push(`token  ${t}`);
for (const a of json.dataAttributes) if (!bundleAttrs.has(a)) missing.push(`data-attr  ${a}`);
// classHooks: clases emitidas por JS SIN regla CSS (existen para targeting).
// literal → verifica el nombre entero; dynamic → solo el PREFIJO (ig-tooltip-place-*
// se ensambla en runtime, §141; los miembros los guardan la union Placement + review).
const hooks = json.classHooks ?? { literal: [], dynamic: [] };
for (const h of hooks.literal ?? []) {
  if (!bundlesText.includes(h)) missing.push(`hook  .${h} (literal, no emitido en JS)`);
}
for (const d of hooks.dynamic ?? []) {
  if (!bundlesText.includes(d.prefix)) {
    missing.push(`hook  ${d.prefix}* (prefijo no emitido en JS; cubre ${String((d.members ?? []).length)} miembros)`);
  }
}
// componentCustomProperties: custom properties que el JS ESCRIBE (inline style) y
// el CSS LEE con var(). No caben en `tokensTier2` porque el predicado de esa
// categoría lee DECLARACIONES de igoded-tokens.css, y estas no se declaran en
// ningún CSS — por eso `--ig-progress-percent` quedó fuera del freeze pese a
// estar documentada como patrón de consumo público (CSSAPI.mdx) y a que un ADR
// registra que allowlists CSP pueden depender de sus valores.
//
// Se comprueban las DOS mitades porque el contrato son las dos: si el JS deja de
// emitirla, el consumer que la lee se queda sin valor; si el CSS deja de leerla,
// el nombre ya no gobierna nada. Cualquiera de las dos ausencias es el breaking.
const cssAll = [
  "dist/styles/igoded-tokens.css",
  "dist/styles/igoded-components.css",
  "dist/styles/igoded-base.css",
  "dist/styles/igoded-design.css",
].filter(has).map(rd).join("\n");
for (const p of json.componentCustomProperties ?? []) {
  if (!bundlesText.includes(p)) missing.push(`custom-prop  ${p} (no emitida por JS)`);
  else if (!cssAll.includes(`var(${p}`)) missing.push(`custom-prop  ${p} (emitida, pero ya no la lee ningún CSS)`);
}

if (missing.length > 0) {
  console.error(
    `\n✖ public-api-names: ${String(missing.length)} nombre(s) congelado(s) NO existen en dist:\n`,
  );
  for (const m of missing) console.error(`  − ${m}`);
  console.error(
    `\nUn nombre público del freeze desapareció de dist = rename/borrado = BREAKING CHANGE.\n\n` +
      `Este gate solo comprueba INTEGRIDAD (que el freeze refleje dist). Editar el JSON hace\n` +
      `que vuelva a pasar — pero eso NO cierra un rename por sí solo. Si es INTENCIONAL, la\n` +
      `política §5.13 entera es: (1) actualiza src/_audit/public-api-names.json, (2) añade\n` +
      `entrada en CHANGELOG describiendo el breaking, (3) sube el MAJOR en la release. El (3)\n` +
      `lo respaldan el review del PR y el release-gate (#15), no este check.`,
  );
  process.exit(1);
}

const hookCount = (hooks.literal?.length ?? 0) + (hooks.dynamic ?? []).reduce((n, d) => n + (d.members?.length ?? 0), 0);
console.log(
  `✓ public-api-names: ${String(json.classes.length)} clases + ${String(hookCount)} hooks + ` +
    `${String(json.tokensTier2.length)} tokens + ` +
    `${String(json.dataAttributes.length)} data-attrs + ` +
    `${String((json.componentCustomProperties ?? []).length)} custom-props — todos presentes en dist.`,
);
process.exit(0);
