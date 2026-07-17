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
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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
const tokens = new Set(
  [...rd("dist/styles/igoded-tokens.css").matchAll(/(--ig-[a-z0-9-]+)/g)].map((m) => m[1]),
);
const bundles = ["dist/index.js", "dist/server-safe.js"]
  .filter(has)
  .map(rd)
  .join("\n");

const missing = [];
for (const c of json.classes) if (!cssClasses.has(c)) missing.push(`class  .${c}`);
for (const t of json.tokensTier2) if (!tokens.has(t)) missing.push(`token  ${t}`);
for (const a of json.dataAttributes) if (!bundles.includes(a)) missing.push(`data-attr  ${a}`);

if (missing.length > 0) {
  console.error(
    `\n✖ public-api-names: ${String(missing.length)} nombre(s) congelado(s) NO existen en dist:\n`,
  );
  for (const m of missing) console.error(`  − ${m}`);
  console.error(
    `\nUn nombre público del freeze desapareció de dist = rename/borrado = breaking change.\n` +
      `Si es intencional: bump MAJOR + edita src/_audit/public-api-names.json + CHANGELOG.`,
  );
  process.exit(1);
}

console.log(
  `✓ public-api-names: ${String(json.classes.length)} clases + ` +
    `${String(json.tokensTier2.length)} tokens + ` +
    `${String(json.dataAttributes.length)} data-attrs — todos presentes en dist.`,
);
process.exit(0);
