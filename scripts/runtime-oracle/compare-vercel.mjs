#!/usr/bin/env node
/**
 * Compara Vercel Edge REAL (`vercel/api/probe.ts`, generado por gen-probe.mjs)
 * contra las premisas del gate `@server-safe` (#18). Cierra el ~5% que
 * `@edge-runtime/vm` no puede validar.
 *
 * El probe hornea un `typeof <bare>` por nombre del catálogo (único test fiel en
 * Vercel Edge — enumeración / `in` / `globalThis[x]` divergen del identificador
 * bare). Aquí solo se lee ese `presence` y se valida contra el catálogo + las
 * premisas pineadas.
 *
 * Uso:
 *   node scripts/runtime-oracle/compare-vercel.mjs https://<deploy>.vercel.app/api/probe
 *   node scripts/runtime-oracle/compare-vercel.mjs probe-output.json   # curl GET guardado
 *
 * FAIL-LOUD: exit 1 si hay drift (SAFE_GLOBAL ausente = falso negativo del gate;
 * EDGE_MISSING presente = sobre-estricto; premisa que no vale = catálogo mal
 * pineado; o el probe está desincronizado del catálogo → regenerar).
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

// Anti-stale: el probe horneado debe cubrir TODO el catálogo actual. Si el
// catálogo creció y no se regeneró/redeployó el probe, esto lo caza (no un
// falso verde por nombres que el probe nunca probó).
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

const drift = [];

// 1. SAFE_GLOBALS deben ESTAR (typeof bare != undefined) en el Edge real.
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
  `Vercel Edge probe — región: ${data.vercelRegion ?? "?"} · presence (typeof bare) de ${CATALOG_NAMES.length} nombres`,
);
console.log(
  `  SAFE_GLOBALS: ${SAFE_GLOBALS.size} pineados, ${safeMissing.length} ausentes`,
);
console.log(
  `  EDGE_MISSING_GLOBALS: ${EDGE_MISSING_GLOBALS.size} pineados, ${edgePresent.length} presentes`,
);
console.log(`  premisas: ${Object.keys(EXPECTED).length} chequeadas`);

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
