#!/usr/bin/env node
/**
 * Compara Vercel Edge REAL (`vercel/api/probe.ts`, generado por gen-probe.mjs)
 * contra el catálogo del gate `@server-safe` (#18). Cierra el ~5% que
 * `@edge-runtime/vm` no puede validar.
 *
 * El probe hornea un `typeof <bare>` por nombre del catálogo (único test fiel en
 * Vercel Edge — enumeración / `in` / `globalThis[x]` divergen del identificador
 * bare). Aquí se lee ese `presence` y se valida contra los tres sets + premisas.
 *
 * Semántica del veredicto:
 *   - SAFE_GLOBALS AUSENTE en Edge real  = DRIFT DURO (falso negativo: crash).
 *   - EDGE_MISSING_REAL PRESENTE en Edge  = DRIFT DURO (se restó de más).
 *   - premisa que no coincide              = DRIFT DURO.
 *   - EDGE_MISSING_GLOBALS PRESENTE       = WARNING blando. El gate deriva ese
 *     set de `@edge-runtime/vm` como sobre-aproximación conservadora; el propio
 *     gate documenta que restar SOLO añade strictness (fail-closed, nunca un FN).
 *     Relajarlo exige la intersección {workerd ∩ Deno ∩ Edge} = #190. No falla.
 *
 * Uso:
 *   node scripts/runtime-oracle/compare-vercel.mjs https://<deploy>.vercel.app/api/probe
 *   node scripts/runtime-oracle/compare-vercel.mjs probe-output.json   # curl GET guardado
 *
 * FAIL-LOUD: exit 1 si hay drift DURO o si el probe está desincronizado del
 * catálogo (regenerar con gen-probe.mjs + redeploy).
 */
import { readFileSync } from "node:fs";
import globalsPkg from "globals";
import {
  SAFE_GLOBALS,
  EDGE_MISSING_GLOBALS,
  EDGE_MISSING_REAL,
  BROWSER_ONLY_GUARD_GLOBALS,
  SAFE_PARTIAL_MEMBERS,
  PARTIAL_SAFE_GLOBAL_MEMBERS,
} from "../check-server-safe-markers.mjs";

const target = process.argv[2];
if (!target) {
  console.error(
    "uso: node scripts/runtime-oracle/compare-vercel.mjs <url-del-probe | probe-output.json>",
  );
  process.exit(1);
}

const CATALOG_NAMES = [
  ...new Set([...SAFE_GLOBALS, ...EDGE_MISSING_GLOBALS, ...EDGE_MISSING_REAL]),
];

let data;
if (/^https?:\/\//.test(target)) {
  const res = await fetch(target);
  if (!res.ok) {
    console.error(`✗ el probe respondió ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  data = await res.json();
} else {
  data = JSON.parse(readFileSync(target, "utf8"));
}

const presence = data.presence;
const premises = data.premises ?? {};

if (!presence || typeof presence !== "object") {
  console.error(
    "✗ el output no trae 'presence' (¿probe viejo sin regenerar?). Corre gen-probe.mjs + redeploy.",
  );
  process.exit(1);
}

// Anti-stale: el probe horneado debe cubrir TODO el catálogo actual.
const notProbed = CATALOG_NAMES.filter((n) => !(n in presence));
if (notProbed.length) {
  console.error(
    `✗ probe DESINCRONIZADO del catálogo: ${notProbed.length} nombres sin probar (regenera con gen-probe.mjs + redeploy): ${notProbed.slice(0, 12).join(", ")}${notProbed.length > 12 ? "…" : ""}`,
  );
  process.exit(1);
}

// Premisas pineadas (idénticas a las medidas en workerd 2026-07-17).
// codex P2: cada premisa PRESENT-but-throws se asserta en DOS ejes — que la API
// EXISTE (`typeof === "function"`) y que llamarla LANZA. Con solo `/THROWS/`, un
// runtime donde la API DESAPARECIERA también pasaría (la llamada sin guard daría
// `TypeError: ... is not a function`), y el oráculo iría verde aunque la
// remediación cambiara de "`?.()` NO protege" (present-but-throws → denylist) a
// "la ausencia SÍ protege" (absence → `?.()` basta). Esa distinción ES la
// clasificación del hazard, así que el par existe+lanza es obligatorio.
const EXPECTED = {
  eventLoopUtilization: (v) => v === "undefined", // elu absent (Node-only)
  createObjectURL: (v) => v === "function", // existe (par de createObjectURLCall)
  createObjectURLCall: (v) => /THROWS/.test(v), // …y lanza → present-but-throws
  revokeObjectURL: (v) => v === "function", // existe (par de revokeCall)
  revokeCall: (v) => /THROWS/.test(v), // …y lanza → present-but-throws
  waCompile: (v) => v === "function", // existe (par de waCompileCall)
  waCompileCall: (v) => /THROWS/.test(v), // …y lanza → CompileError (codegen)
  fnCtor: (v) => /THROWS/.test(v), // EvalError (eval-sink; Function es builtin)
  newURL: (v) => v === "OK", // URL construible (sanity)
};

const hardDrift = [];

// DURO 1: SAFE_GLOBALS deben ESTAR (typeof bare != undefined) en el Edge real.
const safeMissing = [...SAFE_GLOBALS].filter((n) => !presence[n]);
if (safeMissing.length)
  hardDrift.push(
    `SAFE_GLOBALS AUSENTES en Vercel Edge real (falso negativo del gate): ${safeMissing.join(", ")}`,
  );

// DURO 2: EDGE_MISSING_REAL deben FALTAR (se midieron ausentes; si aparecen, se
// restaron de más → SAFE se recortó sin motivo).
const edgeRealPresent = [...EDGE_MISSING_REAL].filter((n) => presence[n]);
if (edgeRealPresent.length)
  hardDrift.push(
    `EDGE_MISSING_REAL PRESENTES en Vercel Edge real (restado de más — revisar #18): ${edgeRealPresent.join(", ")}`,
  );

// DURO 3: premisas pineadas.
for (const [k, ok] of Object.entries(EXPECTED)) {
  if (!(k in premises)) {
    hardDrift.push(`premisa '${k}' ausente en el output del probe`);
  } else if (!ok(premises[k])) {
    hardDrift.push(
      `premisa '${k}' NO coincide: real='${premises[k]}' (esperado por el catálogo)`,
    );
  }
}

// DURO 4 (FAIL-OPEN): los BROWSER_ONLY_GUARD_GLOBALS deben estar AUSENTES. El
// gate los usa como PRUEBA de rama client-only y entonces DEJA DE AUDITARLA; si
// uno existe en Edge, esa rama corre en producción sin auditar.
const browserOnly = data.browserOnly ?? {};
// Anti-stale POR NOMBRE (no por "el bloque existe"): si el probe desplegado es
// anterior a una ampliación de BROWSER_ONLY_GUARD_GLOBALS, el bloque viejo sigue
// trayendo entradas y ninguna presente → verde ENGAÑOSO, con el guard nuevo sin
// probar y su rama client-only sin auditar. Mismo predicado que el `notProbed` de
// `presence`; aquí faltaba. (codex P2)
const boMissing = [...BROWSER_ONLY_GUARD_GLOBALS].filter(
  (n) => !(n in browserOnly),
);
const boPresent = Object.entries(browserOnly).filter(
  ([, v]) => v !== "undefined",
);
if (boMissing.length) {
  hardDrift.push(
    `probe DESINCRONIZADO en 'browserOnly': ${boMissing.length}/${BROWSER_ONLY_GUARD_GLOBALS.size} guards SIN PROBAR → la comprobación de fail-open NO cubre el set actual (regenera con gen-probe.mjs + redeploy): ${boMissing.slice(0, 12).join(", ")}${boMissing.length > 12 ? "…" : ""}`,
  );
}
if (boPresent.length) {
  hardDrift.push(
    `FAIL-OPEN: BROWSER_ONLY_GUARD_GLOBALS PRESENTES en Vercel Edge real — el gate los acepta como prueba de rama client-only y deja de auditarla, así que esa rama CORRE sin auditar: ${boPresent.map(([k, v]) => `${k}=${v}`).join(", ")}`,
  );
}

// DURO 5: los miembros del allowlist bucket-1 deben EXISTIR en Edge real (si uno
// falta, un módulo server-safe que lo use lanza → FN). El snapshot vigente venía
// de @edge-runtime/vm; esto lo contrasta contra el runtime real.
const memberDump = data.memberDump ?? {};
const memberExtras = [];
for (const [root, allowed] of Object.entries(SAFE_PARTIAL_MEMBERS)) {
  const real = memberDump[root];
  if (!Array.isArray(real)) {
    hardDrift.push(
      `memberDump['${root}'] ausente en el probe (regenera con gen-probe.mjs + redeploy)`,
    );
    continue;
  }
  const missing = [...allowed].filter((m) => !real.includes(m));
  if (missing.length)
    hardDrift.push(
      `bucket-1 allowlist con miembros AUSENTES en Edge real (FN: usarlos lanza): ${root}.{${missing.join(", ")}}`,
    );
  const extra = real.filter(
    (m) => !allowed.has(m) && !m.startsWith("_") && m !== "constructor",
  );
  if (extra.length) memberExtras.push([root, allowed.size, extra]);
}

// TIER 1 — FN NO MODELADO: los roots SAFE que el gate trata WHOLESALE (sin
// modelo de miembros) asumen "todos sus miembros existen en todo el mandato". Un
// miembro presente en el floor Node pero AUSENTE en Edge rompe esa asunción:
// `root.member()` pasa el gate y lanza en producción. El lado Node se calcula
// AQUÍ (compare corre en Node), el lado Edge viene del probe.
function dumpMembersLocal(o) {
  const s = new Set();
  let c = o;
  while (c && c !== Object.prototype) {
    for (const n of Object.getOwnPropertyNames(c)) s.add(n);
    c = Object.getPrototypeOf(c);
  }
  return [...s].sort();
}
const rootMembers = data.rootMembers ?? {};
const MODELED_ROOTS = new Set([
  ...Object.keys(SAFE_PARTIAL_MEMBERS),
  ...Object.keys(PARTIAL_SAFE_GLOBAL_MEMBERS),
]);
const wholesaleGaps = [];
for (const [root, edgeMembers] of Object.entries(rootMembers)) {
  if (MODELED_ROOTS.has(root)) continue; // ya tiene modelo bucket-1/2
  const local = globalThis[root];
  if (local === undefined || local === null) continue; // no está en Node → nada que comparar
  const missingInEdge = dumpMembersLocal(local).filter(
    (m) => !edgeMembers.includes(m) && !m.startsWith("_"),
  );
  if (missingInEdge.length) wholesaleGaps.push([root, missingInEdge]);
}

// TIER 2 — superficie completa (provenance): permite re-derivar EDGE_MISSING
// desde el Edge REAL en vez de desde @edge-runtime/vm.
// Anti-stale POR NOMBRE, igual que `presence` y `browserOnly`: sin esto, un probe
// anterior a la expansión deja los bloques vacíos, los checks tier 1/2 no corren
// y el compare da VERDE sin haber medido nada de esto (promesa-sin-gate).
const fullSurface = data.fullSurface ?? {};
const UNIVERSE = [
  ...new Set(
    ["builtin", "nodeBuiltin", "browser", "worker", "serviceworker", "es2025"]
      .filter((k) => globalsPkg[k])
      .flatMap((k) => Object.keys(globalsPkg[k])),
  ),
].filter((n) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n));
const fsMissing = UNIVERSE.filter((n) => !(n in fullSurface));
if (fsMissing.length)
  hardDrift.push(
    `probe DESINCRONIZADO en 'fullSurface': ${fsMissing.length}/${UNIVERSE.length} nombres SIN PROBAR → el barrido de superficie completa NO cubre el universo actual (regenera con gen-probe.mjs + redeploy)`,
  );
if (!Object.keys(rootMembers).length)
  hardDrift.push(
    "probe sin bloque 'rootMembers' → el chequeo de FN no-modelado (Node vs Edge por root) NO se ejecutó (regenera con gen-probe.mjs + redeploy)",
  );
const fsTotal = Object.keys(fullSurface).length;
const fsPresent = Object.values(fullSurface).filter(Boolean).length;

// BLANDO: EDGE_MISSING (vm-derivado) presentes = sobre-estrictez segura → #190.
const edgeMissingPresent = [...EDGE_MISSING_GLOBALS].filter((n) => presence[n]);

// Report
console.log(
  `Vercel Edge probe — región: ${data.vercelRegion ?? "?"} · presence (typeof bare) de ${CATALOG_NAMES.length} nombres`,
);
console.log(
  `  SAFE_GLOBALS: ${SAFE_GLOBALS.size} pineados, ${safeMissing.length} ausentes`,
);
console.log(
  `  EDGE_MISSING_REAL: ${EDGE_MISSING_REAL.size} pineados, ${edgeRealPresent.length} presentes`,
);
console.log(
  `  EDGE_MISSING (vm-derivado): ${EDGE_MISSING_GLOBALS.size} pineados, ${edgeMissingPresent.length} presentes`,
);
console.log(`  premisas: ${Object.keys(EXPECTED).length} chequeadas`);
console.log(
  `  BROWSER_ONLY (fail-open): ${BROWSER_ONLY_GUARD_GLOBALS.size} pineados, ${BROWSER_ONLY_GUARD_GLOBALS.size - boMissing.length} probados, ${boPresent.length} presentes`,
);

if (fsTotal)
  console.log(
    `  superficie completa (globals): ${fsTotal} probados, ${fsPresent} presentes en Edge real`,
  );
console.log(
  `  roots volcados (miembros): ${Object.keys(rootMembers).length} · sin modelo bucket-1/2: ${Object.keys(rootMembers).filter((r) => !MODELED_ROOTS.has(r)).length}`,
);

if (wholesaleGaps.length) {
  console.log(
    `\n⚠ CANDIDATOS a FN NO MODELADO — roots SAFE tratados WHOLESALE con miembros que están en el floor Node pero NO en Edge real (el gate permite \`root.member()\` y lanzaría en producción):`,
  );
  for (const [root, missing] of wholesaleGaps)
    console.log(
      `  ${root} (${missing.length}): ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? " …" : ""}`,
    );
}

if (memberExtras.length) {
  console.log(
    `\n⚠ miembros PRESENTES en Edge real fuera del allowlist bucket-1 (candidatos a FP corregible → #190; el gate hoy los flaggea):`,
  );
  for (const [root, allowedN, extra] of memberExtras)
    console.log(
      `  ${root}: allowlist ${allowedN} · en Edge real ${allowedN + extra.length} → extra (${extra.length}): ${extra.join(", ")}`,
    );
}

if (edgeMissingPresent.length) {
  console.log(
    `\n⚠ ${edgeMissingPresent.length} EDGE_MISSING presentes en Vercel Edge real (sobre-estrictez SEGURA, fail-closed; candidatos a relajar en #190 tras {workerd ∩ Deno ∩ Edge}):`,
  );
  console.log(`  ${edgeMissingPresent.join(", ")}`);
}

if (hardDrift.length) {
  console.error(`\n✗ DRIFT DURO vs Vercel Edge real (${hardDrift.length}):`);
  for (const d of hardDrift) console.error(`  - ${d}`);
  console.error(
    `\nEl catálogo del gate diverge del Edge real → revisar SAFE_GLOBALS / EDGE_MISSING_REAL / premisas.`,
  );
  process.exit(1);
}

console.log(
  `\n✓ Vercel Edge real coincide con el catálogo del gate (0 falsos negativos, premisas OK) — fidelidad confirmada (95→98%).`,
);
