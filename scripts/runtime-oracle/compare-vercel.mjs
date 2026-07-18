#!/usr/bin/env node
/**
 * Compara Vercel Edge REAL (`vercel/api/probe.ts`) contra las premisas del gate
 * `@server-safe` (#18). Cierra el ~5% que `@edge-runtime/vm` no puede validar.
 *
 * PRESENCE via POST: la enumeración de globals NO es fiable en Vercel Edge (el
 * objeto-global es exótico — URL/Blob/fetch NO salen en getOwnPropertyNames ni
 * en el prototype-walk, aunque existan). Por eso mandamos los nombres del
 * catálogo (SAFE_GLOBALS ∪ EDGE_MISSING_GLOBALS) al probe via POST y él
 * responde `name in globalThis` en el runtime real — la semántica de "presente"
 * correcta.
 *
 * Uso (dos modos):
 *   node scripts/runtime-oracle/compare-vercel.mjs https://<deploy>.vercel.app/api/probe
 *       → POST: manda el catálogo, mide en el Edge real (necesita red).
 *   node scripts/runtime-oracle/compare-vercel.mjs probe-output.json
 *       → fichero de una respuesta POST guardada (debe traer `presence`).
 *
 * FAIL-LOUD: exit 1 si hay drift (SAFE_GLOBAL ausente = falso negativo del gate;
 * EDGE_MISSING presente = sobre-estricto; premisa que no vale = catálogo mal
 * pineado).
 */
import { readFileSync } from "node:fs";
import {
  SAFE_GLOBALS,
  EDGE_MISSING_GLOBALS,
} from "../check-server-safe-markers.mjs";

const target = process.argv[2];
if (!target) {
  console.error(
    "uso: node scripts/runtime-oracle/compare-vercel.mjs <url-del-probe | probe-output.json>",
  );
  process.exit(1);
}

const CATALOG_NAMES = [...new Set([...SAFE_GLOBALS, ...EDGE_MISSING_GLOBALS])];

let data;
if (/^https?:\/\//.test(target)) {
  const res = await fetch(target, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ names: CATALOG_NAMES }),
  });
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
    "✗ el output no trae 'presence'. Pasa la URL del probe (modo POST) para que compare mande el catálogo, o un JSON de una respuesta POST.",
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

const drift = [];

// 1. SAFE_GLOBALS deben ESTAR (name in globalThis) en el Edge real.
const safeMissing = [...SAFE_GLOBALS].filter((n) => !presence[n]);
if (safeMissing.length)
  drift.push(
    `SAFE_GLOBALS AUSENTES en Vercel Edge real (falso negativo del gate): ${safeMissing.join(", ")}`,
  );

// 2. EDGE_MISSING_GLOBALS deben FALTAR.
const edgePresent = [...EDGE_MISSING_GLOBALS].filter((n) => presence[n]);
if (edgePresent.length)
  drift.push(
    `EDGE_MISSING_GLOBALS PRESENTES en Vercel Edge real (gate sobre-estricto, FP): ${edgePresent.join(", ")}`,
  );

// 3. Premisas pineadas.
for (const [k, ok] of Object.entries(EXPECTED)) {
  if (!(k in premises)) {
    drift.push(`premisa '${k}' ausente en el output del probe`);
  } else if (!ok(premises[k])) {
    drift.push(
      `premisa '${k}' NO coincide: real='${premises[k]}' (esperado por el catálogo)`,
    );
  }
}

// Report
console.log(
  `Vercel Edge probe — región: ${data.vercelRegion ?? "?"} · presence de ${CATALOG_NAMES.length} nombres del catálogo`,
);
console.log(
  `  SAFE_GLOBALS: ${SAFE_GLOBALS.size} pineados, ${safeMissing.length} ausentes`,
);
console.log(
  `  EDGE_MISSING_GLOBALS: ${EDGE_MISSING_GLOBALS.size} pineados, ${edgePresent.length} presentes`,
);
console.log(`  premisas: ${Object.keys(EXPECTED).length} chequeadas`);
// Desambiguación lexical-vs-property (typeof bare) para los ausentes vía `in`:
// si un ausente sale con bare != "undefined" → es global léxico usable (gate OK).
if (safeMissing.length) {
  const bare = Object.fromEntries(
    Object.entries(premises).filter(([k]) => k.startsWith("bare")),
  );
  console.log(`  typeof bare (desambiguación): ${JSON.stringify(bare)}`);
}

if (drift.length) {
  console.error(`\n✗ DRIFT vs Vercel Edge real (${drift.length}):`);
  for (const d of drift) console.error(`  - ${d}`);
  console.error(
    `\nEl catálogo del gate diverge del Edge real → revisar SAFE_GLOBALS / EDGE_MISSING_GLOBALS / premisas.`,
  );
  process.exit(1);
}

console.log(
  `\n✓ Vercel Edge real coincide con el catálogo del gate — fidelidad confirmada (95→98%).`,
);
