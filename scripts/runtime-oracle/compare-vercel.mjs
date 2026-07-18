#!/usr/bin/env node
/**
 * Compara el output del probe de Vercel Edge REAL (`vercel/api/probe.ts`)
 * contra las premisas del gate `@server-safe` (#18). Cierra el ~5% que
 * `@edge-runtime/vm` no puede validar (fuga de globals Node-shared).
 *
 * Uso:
 *   1. Deploy del probe (ver `vercel/README.md`) → URL de producción.
 *   2. `curl <url>/api/probe > /tmp/edge.json`
 *   3. `node scripts/runtime-oracle/compare-vercel.mjs /tmp/edge.json`
 *
 * FAIL-LOUD: exit 1 si hay drift (un SAFE_GLOBAL ausente en Edge real = falso
 * negativo del gate; un EDGE_MISSING presente = sobre-estricto; una premisa
 * que no vale = catálogo mal pineado).
 */
import { readFileSync } from "node:fs";
import {
  SAFE_GLOBALS,
  EDGE_MISSING_GLOBALS,
} from "../check-server-safe-markers.mjs";

const path = process.argv[2];
if (!path) {
  console.error("uso: node scripts/runtime-oracle/compare-vercel.mjs <probe-output.json>");
  process.exit(1);
}

const data = JSON.parse(readFileSync(path, "utf8"));
const names = new Set(data.globalThisNames ?? []);
const premises = data.premises ?? {};

// Premisas pineadas (idénticas a las medidas en workerd 2026-07-17). El Edge
// real de Vercel DEBE coincidir; si no, el catálogo del gate necesita revisión.
const EXPECTED = {
  eventLoopUtilization: (v) => v === "undefined", // elu absent (Node-only)
  createObjectURLCall: (v) => /THROWS/.test(v), // present-but-throws
  revokeCall: (v) => /THROWS/.test(v), // present-but-throws
  waCompileCall: (v) => /THROWS/.test(v), // CompileError (codegen disallowed)
  fnCtor: (v) => /THROWS/.test(v), // EvalError (eval-sink)
  newURL: (v) => v === "OK", // URL construible (sanity)
};

const drift = [];

// 1. SAFE_GLOBALS deben ESTAR en el Edge real (si falta uno, un módulo
//    server-safe que lo use bare CRASHEA en producción Vercel Edge).
const safeMissing = [...SAFE_GLOBALS].filter((n) => !names.has(n));
if (safeMissing.length)
  drift.push(`SAFE_GLOBALS AUSENTES en Vercel Edge real (falso negativo del gate): ${safeMissing.join(", ")}`);

// 2. EDGE_MISSING_GLOBALS deben FALTAR (si está uno, el gate es sobre-estricto:
//    lo flaggea pero en Edge real sí existe — FP corregible, no crash).
const edgePresent = [...EDGE_MISSING_GLOBALS].filter((n) => names.has(n));
if (edgePresent.length)
  drift.push(`EDGE_MISSING_GLOBALS PRESENTES en Vercel Edge real (gate sobre-estricto, FP): ${edgePresent.join(", ")}`);

// 3. Premisas pineadas
for (const [k, ok] of Object.entries(EXPECTED)) {
  if (!(k in premises)) {
    drift.push(`premisa '${k}' ausente en el output del probe`);
  } else if (!ok(premises[k])) {
    drift.push(`premisa '${k}' NO coincide: real='${premises[k]}' (esperado por el catálogo)`);
  }
}

// Report
console.log(`Vercel Edge probe — región: ${data.vercelRegion ?? "?"} · ${names.size} globals`);
console.log(`  SAFE_GLOBALS: ${SAFE_GLOBALS.size} pineados, ${safeMissing.length} ausentes`);
console.log(`  EDGE_MISSING_GLOBALS: ${EDGE_MISSING_GLOBALS.size} pineados, ${edgePresent.length} presentes`);
console.log(`  premisas: ${Object.keys(EXPECTED).length} chequeadas`);

if (drift.length) {
  console.error(`\n✗ DRIFT vs Vercel Edge real (${drift.length}):`);
  for (const d of drift) console.error(`  - ${d}`);
  console.error(`\nEl catálogo del gate diverge del Edge real → revisar SAFE_GLOBALS / EDGE_MISSING_GLOBALS / premisas.`);
  process.exit(1);
}

console.log(`\n✓ Vercel Edge real coincide con el catálogo del gate — fidelidad confirmada (95→98%).`);
