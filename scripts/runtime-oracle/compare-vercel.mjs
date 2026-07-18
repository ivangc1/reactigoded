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
import {
  SAFE_GLOBALS,
  EDGE_MISSING_GLOBALS,
  EDGE_MISSING_REAL,
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
const EXPECTED = {
  eventLoopUtilization: (v) => v === "undefined", // elu absent (Node-only)
  createObjectURLCall: (v) => /THROWS/.test(v), // present-but-throws
  revokeCall: (v) => /THROWS/.test(v), // present-but-throws
  waCompileCall: (v) => /THROWS/.test(v), // CompileError (codegen disallowed)
  fnCtor: (v) => /THROWS/.test(v), // EvalError (eval-sink)
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
