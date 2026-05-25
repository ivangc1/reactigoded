#!/usr/bin/env node
// Reemplazo cross-platform de `rm -f` / `rm -rf` en npm scripts. Borra
// idempotentemente cada path recibido como argumento (relativo a CWD).
// Causa raíz que cierra: `rm` no existe en PowerShell/cmd.exe, así que
// `prepublishOnly` → `verify` → `verify:unit` reventaba en Windows
// antes de empezar (gate review beta.25 BLOCKER 1).
import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("clean.mjs: se esperaba al menos un path como argumento.");
  process.exit(2);
}

await Promise.all(
  targets.map((t) =>
    rm(resolve(process.cwd(), t), { recursive: true, force: true }),
  ),
);
