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

const tplPath = join(here, "vercel/api/probe.template.ts");
const tpl = readFileSync(tplPath, "utf8");
const PLACEHOLDER = "    /*__PRESENCE__*/";
if (!tpl.includes(PLACEHOLDER)) {
  console.error(`✗ la plantilla no contiene el placeholder esperado`);
  process.exit(1);
}

const outTs = tpl.replace(PLACEHOLDER, lines);
writeFileSync(join(here, "vercel/api/probe.ts"), outTs);
console.log(
  `✓ probe.ts generado: ${CATALOG.length} nombres del catálogo, presence via typeof bare.`,
);
