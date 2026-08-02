#!/usr/bin/env node
/**
 * check-public-api-exports.mjs — inventario NOMINAL de exports (gate 1.0.0, F2).
 *
 * ─── Por qué existe ─────────────────────────────────────────────────────
 * `check-public-api-names.mjs` congela clases CSS, data-attrs y tokens. Los
 * NOMBRES DE EXPORT —lo primero que rompe un consumer— no tenían ancla:
 *
 *   • 75 de los 97 value-exports tienen ancla INCIDENTAL, porque alguna
 *     fixture los importa. Incidental no es contrato: depende de que a nadie
 *     se le ocurra simplificar la fixture.
 *   • Los otros 22 valores y 133 de los 142 tipos no tienen ancla ninguna.
 *     155 nombres en total.
 *
 * Y está PROBADO por mutación, no inferido: retirando
 * `export type { NavbarLogoProps }` del barrel, las dos fixtures de consumer
 * siguen pasando con exit 0 mientras un consumer real rompe con TS2724. Una
 * fixture congela lo que usa, no la superficie.
 *
 * ─── Qué congela ────────────────────────────────────────────────────────
 * Por cada entry del `exports` map con superficie TS (`.`, `./server-safe`,
 * `./cn`): el conjunto de nombres exportados, separando **valores** de
 * **tipos**. La separación importa: convertir un valor en type-only rompe a
 * quien lo importaba como valor aunque el nombre siga ahí, y al revés.
 *
 * ─── Qué es fallo y qué no ──────────────────────────────────────────────
 * • Falta un nombre congelado, o cambió de clase (valor ↔ tipo) → **FALLO**.
 *   Eso es breaking y exige MAJOR.
 * • Aparece un nombre nuevo → **aviso, no fallo**. Añadir superficie es una
 *   minor legítima; convertirlo en error obligaría a tocar el freeze en cada
 *   feature, que es la fricción que hace que la gente desactive los gates. Se
 *   imprime para que la actualización del inventario sea consciente y no se
 *   quede en silencio.
 *
 * ─── Contrato de invocación ─────────────────────────────────────────────
 * • Invoker: `npm run test:public-api-exports`, encadenado en `verify:unit`
 *   DESPUÉS de `build` (lee `dist/**\/*.d.ts`).
 * • `--seed` reescribe el inventario en el JSON. Sembrar es un acto
 *   deliberado: el JSON es el ancla, y regenerarlo a la ligera convierte el
 *   gate en un espejo que siempre dice que sí.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = join(root, "src/_audit/public-api-names.json");
const SEED = process.argv.includes("--seed");

/** Entries del `exports` map que tienen superficie TypeScript. */
const ENTRIES = {
  ".": "dist/index.d.ts",
  "./server-safe": "dist/server-safe.d.ts",
  "./cn": "dist/utils/cn.d.ts",
};

const faltan = Object.entries(ENTRIES).filter(([, rel]) => !existsSync(join(root, rel)));
if (faltan.length > 0) {
  console.error(
    `✖ public-api-exports: no existe ${faltan.map(([, r]) => r).join(", ")}.\n` +
      `  Este gate corre DESPUÉS de \`npm run build\`.`,
  );
  process.exit(1);
}

const program = ts.createProgram(
  Object.values(ENTRIES).map((r) => join(root, r)),
  {
    strict: true,
    skipLibCheck: true,
    types: [],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    noEmit: true,
  },
);
const checker = program.getTypeChecker();

/** Un re-export declarado `export type { X }` (o `export { type X }`). */
function esReexportSoloTipo(d) {
  if (!ts.isExportSpecifier(d)) return false;
  // `d.parent` = NamedExports, `d.parent.parent` = ExportDeclaration.
  return d.isTypeOnly || d.parent.parent.isTypeOnly;
}

/**
 * ¿El símbolo tiene significado de VALOR en runtime?
 *
 * Ojo con el orden de las comprobaciones: `getAliasedSymbol` ATRAVIESA el
 * `export type`, así que un `export type { NavbarLogo }` —que borra el
 * componente del runtime— seguiría devolviendo los flags de la función
 * original y se clasificaría como valor. Medido con el control de esta misma
 * mutación: el gate la daba por buena. Por eso la marca type-only se mira
 * ANTES y gana.
 */
function esValor(sym) {
  const decls = sym.declarations ?? [];
  if (decls.length > 0 && decls.every(esReexportSoloTipo)) return false;
  if ((sym.flags & ts.SymbolFlags.Value) !== 0) return true;
  if ((sym.flags & ts.SymbolFlags.Alias) !== 0) {
    try {
      return (checker.getAliasedSymbol(sym).flags & ts.SymbolFlags.Value) !== 0;
    } catch {
      return false;
    }
  }
  return false;
}

/** @type {Record<string, {values: string[], types: string[]}>} */
const actual = {};
for (const [entry, rel] of Object.entries(ENTRIES)) {
  const sf = program.getSourceFile(join(root, rel));
  const sym = sf ? checker.getSymbolAtLocation(sf) : undefined;
  if (!sym) {
    console.error(`✖ public-api-exports: ${rel} no resuelve como módulo.`);
    process.exit(1);
  }
  const values = [];
  const types = [];
  for (const e of checker.getExportsOfModule(sym)) {
    (esValor(e) ? values : types).push(e.getName());
  }
  actual[entry] = { values: values.sort(), types: types.sort() };
}

const json = JSON.parse(readFileSync(JSON_PATH, "utf8"));

if (SEED) {
  // Se inserta tras `componentCustomProperties` para que el JSON conserve un
  // orden legible; `JSON.stringify` respeta el orden de inserción.
  const nuevo = {};
  for (const [k, v] of Object.entries(json)) {
    nuevo[k] = v;
    if (k === "componentCustomProperties") nuevo.exports = actual;
  }
  if (!nuevo.exports) nuevo.exports = actual;
  writeFileSync(JSON_PATH, `${JSON.stringify(nuevo, null, 2)}\n`);
  const total = Object.values(actual).reduce((n, e) => n + e.values.length + e.types.length, 0);
  console.log(
    `✓ public-api-exports: inventario sembrado — ${String(total)} nombres en ` +
      `${String(Object.keys(actual).length)} entries.`,
  );
  for (const [entry, e] of Object.entries(actual)) {
    console.log(`    ${entry.padEnd(15)} ${String(e.values.length)} valores · ${String(e.types.length)} tipos`);
  }
  process.exit(0);
}

const congelado = json.exports;
if (!congelado) {
  console.error(
    `✖ public-api-exports: falta la categoría \`exports\` en ${JSON_PATH}.\n` +
      `  Siémbrala una vez con: node scripts/check-public-api-exports.mjs --seed`,
  );
  process.exit(1);
}

const rotos = [];
const nuevos = [];

for (const [entry, esperado] of Object.entries(congelado)) {
  const hoy = actual[entry];
  if (!hoy) {
    rotos.push(`entry \`${entry}\` desapareció del inventario (¿se quitó del \`exports\` map?)`);
    continue;
  }
  const hoyValues = new Set(hoy.values);
  const hoyTypes = new Set(hoy.types);

  for (const n of esperado.values) {
    if (hoyValues.has(n)) continue;
    rotos.push(
      hoyTypes.has(n)
        ? `${entry} · \`${n}\` pasó de VALOR a solo-tipo — rompe a quien lo importaba como valor`
        : `${entry} · \`${n}\` (valor) ya no se exporta`,
    );
  }
  for (const n of esperado.types) {
    if (hoyTypes.has(n)) continue;
    rotos.push(
      hoyValues.has(n)
        ? `${entry} · \`${n}\` pasó de tipo a VALOR — cambia su significado en \`import type\``
        : `${entry} · \`${n}\` (tipo) ya no se exporta`,
    );
  }

  const congelados = new Set([...esperado.values, ...esperado.types]);
  for (const n of [...hoy.values, ...hoy.types]) {
    if (!congelados.has(n)) nuevos.push(`${entry} · ${n}`);
  }
}

if (rotos.length > 0) {
  console.error(`\n✖ public-api-exports: ${String(rotos.length)} nombre(s) del contrato ya no se sostienen:\n`);
  for (const r of rotos) console.error(`  − ${r}`);
  console.error(
    `\nUn export que desaparece o cambia de clase es lo PRIMERO que rompe a un consumer, y\n` +
      `las fixtures no lo cazan: congelan lo que usan, no la superficie. Está medido — quitar\n` +
      `\`export type { NavbarLogoProps }\` deja las dos fixtures en verde mientras un consumer\n` +
      `real rompe con TS2724.\n\n` +
      `Si el cambio es INTENCIONAL: actualiza el inventario (\`--seed\`), añade la entrada al\n` +
      `CHANGELOG y sube MAJOR. La política §5.13 completa está en el \`_doc\` del JSON.`,
  );
  process.exit(1);
}

const total = Object.values(congelado).reduce((n, e) => n + e.values.length + e.types.length, 0);
console.log(
  `✓ public-api-exports: ${String(total)} nombres congelados presentes con su misma clase ` +
    `(valor/tipo) en ${String(Object.keys(congelado).length)} entries.`,
);
if (nuevos.length > 0) {
  console.log(
    `\nℹ ${String(nuevos.length)} export(s) NUEVO(s), fuera del inventario. Añadir superficie es\n` +
      `  una minor legítima, así que esto no es fallo — pero el inventario se queda corto hasta\n` +
      `  que lo siembres (\`npm run test:public-api-exports -- --seed\`):\n`,
  );
  for (const n of nuevos) console.log(`    + ${n}`);
}
process.exit(0);
