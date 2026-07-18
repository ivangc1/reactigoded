#!/usr/bin/env node
/**
 * Genera `vercel/api/probe.ts` desde `vercel/api/probe.template.ts` + el catálogo
 * del gate (`SAFE_GLOBALS` union `EDGE_MISSING_GLOBALS`), inyectando un
 * `typeof <bare>` literal por cada nombre en el placeholder de la plantilla.
 *
 * Por qué codegen: en Vercel Edge el objeto-global es exótico y solo el
 * `typeof <identificador-bare>` mide la presencia como la ve el código real
 * (enumeración / `in` / `globalThis[x]` divergen). El bare exige el identificador
 * literal en el source y Edge bloquea eval → se genera desde el catálogo, así el
 * probe NUNCA queda desincronizado del gate.
 *
 * Uso: node scripts/runtime-oracle/gen-probe.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  SAFE_GLOBALS,
  EDGE_MISSING_GLOBALS,
  EDGE_MISSING_REAL,
  BROWSER_ONLY_GUARD_GLOBALS,
  INTENTIONAL_DENY,
} from "../check-server-safe-markers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CATALOG = [
  ...new Set([...SAFE_GLOBALS, ...EDGE_MISSING_GLOBALS, ...EDGE_MISSING_REAL]),
].sort();

// Todos deben ser identificadores JS válidos para probarse bare.
const ID = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const bad = CATALOG.filter((n) => !ID.test(n));
if (bad.length) {
  console.error(
    "✗ nombres del catálogo que NO son identificadores bare-probables:",
    bad,
  );
  process.exit(1);
}

const lines = CATALOG.map((n) =>
  n === "undefined"
    ? `    "undefined": true, // primitivo del lenguaje; siempre presente (typeof undefined==="undefined")`
    : `    ${JSON.stringify(n)}: typeof ${n} !== "undefined",`,
).join("\n");

// Bloques auxiliares del hunt (#18): browser-only (fail-open si alguno existe en
// Edge) e intentional-deny (informativo). Aquí interesa el `typeof` CRUDO (string)
// para distinguir "object"/"function"/"undefined", no un booleano.
function typeofBlock(names, label) {
  const bad = [...names].filter((n) => !ID.test(n));
  if (bad.length) {
    console.error(`✗ ${label}: nombres no bare-probables:`, bad);
    process.exit(1);
  }
  return [...names]
    .sort()
    .map((n) => `    ${JSON.stringify(n)}: typeof ${n},`)
    .join("\n");
}
const browserOnlyLines = typeofBlock(
  BROWSER_ONLY_GUARD_GLOBALS,
  "BROWSER_ONLY_GUARD_GLOBALS",
);
const deniedLines = typeofBlock(INTENTIONAL_DENY, "INTENTIONAL_DENY");

const tplPath = join(here, "vercel/api/probe.template.ts");
const tpl = readFileSync(tplPath, "utf8");
const SLOTS = [
  ["    /*__PRESENCE__*/", lines],
  ["    /*__BROWSER_ONLY__*/", browserOnlyLines],
  ["    /*__DENIED__*/", deniedLines],
];
let outTs = tpl;
for (const [slot, body] of SLOTS) {
  if (!outTs.includes(slot)) {
    console.error(`✗ la plantilla no contiene el placeholder '${slot.trim()}'`);
    process.exit(1);
  }
  outTs = outTs.replace(slot, body);
}
writeFileSync(join(here, "vercel/api/probe.ts"), outTs);
console.log(
  `✓ probe.ts generado: ${CATALOG.length} catálogo · ${BROWSER_ONLY_GUARD_GLOBALS.size} browser-only · ${INTENTIONAL_DENY.size} denied · presence via typeof bare.`,
);
