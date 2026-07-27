#!/usr/bin/env node
/**
 * check-dist-dts.mjs — compila TODOS los `.d.ts` de `dist/` como un programa.
 *
 * ─── Por qué existe ─────────────────────────────────────────────────────
 * Las fixtures de consumer (`consumer-types`, `consumer-types-nodenext`,
 * `consumer-pack`, `rsc`) typechequean lo que se IMPORTA desde las entries
 * públicas. Eso deja fuera, por construcción, cualquier `.d.ts` que viaje en
 * el tarball sin ser alcanzable desde una entry — y ahí es donde se escondió
 * B34-1: `dist/components/Slot/index.d.ts` shippeó con 3×TS2305 (re-exports de
 * hermanos que `stripInternal` había vaciado a `export {}`), invisible para
 * todas las fixtures porque ningún consumer puede llegar a ese barrel.
 *
 * Un `.d.ts` roto en el tarball es un fallo real aunque hoy nadie lo importe:
 * `skipLibCheck: false` es una opción legítima del consumer, y algunos
 * bundlers y editores recorren el árbol de tipos entero.
 *
 * ─── Por qué DOS resoluciones ───────────────────────────────────────────
 * `Bundler` y `NodeNext` difieren en cómo resuelven specifiers y condiciones.
 * Un error puede aparecer en una y no en la otra, así que comprobar solo una
 * deja media superficie sin cubrir — el mismo razonamiento que ya sostiene las
 * dos fixtures `consumer-types` / `consumer-types-nodenext`.
 *
 * ─── Por qué `types: []` ────────────────────────────────────────────────
 * Load-bearing, no cosmético: sin él, los `@types/*` instalados en el repo
 * entran como ambients globales y TAPAN huecos que el consumer no tiene.
 * Comprobar el tarball con los tipos del repo dentro es comprobar otra cosa.
 *
 * ─── Contrato de invocación ─────────────────────────────────────────────
 * • Invoker: `npm run test:dist-dts`, encadenado en `verify:unit` justo
 *   DESPUÉS de `build` (necesita `dist/`), y como step propio de `verify.yml`
 *   — las dos cosas: encadenarlo solo en el script reproduciría A-CI-02, que
 *   es exactamente el drift que este repo ya sufrió dos veces.
 * • Enumeración con `fs`, no shell-globbing: `dist/**` en `run:` no es
 *   cross-platform y la matriz de CI incluye Windows (lección beta.24).
 * • Fallback: ERROR. Si descubre 0 ficheros también falla — un `dist/`
 *   ausente o vacío pasando en verde sería un gate que acredita nada.
 */
import { readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = resolve(root, "dist");

if (!existsSync(distRoot)) {
  console.error(
    "✖ check-dist-dts: no existe dist/. Este gate corre DESPUÉS de `npm run build`.\n" +
      "  Si lo ves en CI, el step está encadenado en el sitio equivocado.",
  );
  process.exit(1);
}

/** Enumera `dist/**\/*.d.ts` sin depender del shell. */
function collectDts(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectDts(full));
    else if (entry.name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

const files = collectDts(distRoot).sort();

if (files.length === 0) {
  console.error(
    "✖ check-dist-dts: 0 ficheros `.d.ts` en dist/.\n" +
      "  Un gate que no encuentra nada NO está pasando: está midiendo el vacío.",
  );
  process.exit(1);
}

const BASE = {
  strict: true,
  // El punto del gate: comprobar los tipos que viajan, no saltárselos.
  skipLibCheck: false,
  // Sin los @types/* del repo: el consumer no los tiene.
  types: [],
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
  jsx: ts.JsxEmit.ReactJSX,
};

const RESOLUTIONS = [
  {
    name: "Bundler",
    options: { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler },
  },
  {
    name: "NodeNext",
    options: { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext },
  },
];

const fmtHost = {
  getCanonicalFileName: (f) => f,
  getCurrentDirectory: () => root,
  getNewLine: () => "\n",
};

let totalErrors = 0;

for (const res of RESOLUTIONS) {
  const program = ts.createProgram(files, { ...BASE, ...res.options });
  // `getSemanticDiagnostics` sin fichero = todo el programa; se suman las
  // sintácticas porque un `.d.ts` corrupto ni siquiera parsea.
  const diags = [
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ];
  if (diags.length === 0) {
    console.log(`  ✓ ${res.name.padEnd(9)} ${String(files.length)} .d.ts sin errores`);
    continue;
  }
  totalErrors += diags.length;
  console.error(`\n✖ ${res.name}: ${String(diags.length)} error(es) en los .d.ts publicados\n`);
  console.error(ts.formatDiagnosticsWithColorAndContext(diags, fmtHost));
}

if (totalErrors > 0) {
  console.error(
    `\n✖ check-dist-dts: ${String(totalErrors)} error(es) en total.\n\n` +
      `Un \`.d.ts\` roto viaja al consumer aunque ninguna entry pública lo alcance:\n` +
      `\`skipLibCheck: false\` es una opción legítima y hay bundlers y editores que\n` +
      `recorren el árbol de tipos entero.\n\n` +
      `Causa típica: un doc-block a nivel de fichero terminado en \`@internal\`. TS lo\n` +
      `adhiere SOLO al primer statement, así que \`stripInternal\` vacía unos hermanos y\n` +
      `deja el barrel re-exportando de ellos. Si el módulo no es API, la salida limpia\n` +
      `es sacarlo del tarball en \`scripts/clean-internal-dist.mjs\`, no etiquetar\n` +
      `statement a statement.`,
  );
  process.exit(1);
}

console.log(
  `✓ dist-dts: ${String(files.length)} .d.ts × ${String(RESOLUTIONS.length)} resoluciones ` +
    `(${RESOLUTIONS.map((r) => r.name).join(", ")}) — sin errores, con skipLibCheck:false y types:[].`,
);
process.exit(0);
