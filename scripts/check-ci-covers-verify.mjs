#!/usr/bin/env node
/**
 * check-ci-covers-verify.mjs — todo comando de `verify` corre en CI.
 *
 * ─── Por qué existe ─────────────────────────────────────────────────────
 * `.github/workflows/verify.yml` NO invoca `npm run verify`: reimplementa su
 * cadena step a step, para que el log de Actions muestre qué gate falló y para
 * poder documentar cada uno con su razón histórica. El precio de esa decisión
 * es que las dos listas pueden divergir en silencio, y ya han divergido DOS
 * veces:
 *   • pre-beta.25 — `test:state-css-exclusion` estaba en `verify:unit` y no en
 *     CI. Lo cazó por casualidad un cruce de gate reviews.
 *   • gate 1.0.0 (A-CI-02) — `test:public-api` estaba en `verify:unit` y no en
 *     CI. Una mutación del JSON de freeze pasaba los checks requeridos y solo
 *     habría muerto en `prepublishOnly`: con el tag protegido ya creado.
 *
 * La primera se cerró POR CASO (añadir el step). La segunda demuestra que
 * cerrar por caso no cierra la clase. Este gate cierra el ESPACIO: si un
 * comando entra en la cadena de `verify` y nadie lo añade al workflow, falla
 * aquí — en el PR que lo introduce, no dos releases después.
 *
 * ─── Decisiones de diseño ───────────────────────────────────────────────
 * • **Equivalencia alias↔comando en los dos sentidos.** `npm run verify:size`
 *   y `size-limit` son el mismo trabajo; compararlos como cadenas daría un
 *   falso positivo. Cada comando se normaliza a su forma expandida.
 * • **Exenciones NOMBRADAS, nunca omisión silenciosa.** Lo que se decide no
 *   cubrir lleva su razón escrita aquí abajo. Una exención sin razón es un
 *   hueco disfrazado de decisión.
 * • **FAIL-CLOSED ante lo que no sepa parsear.** Si un step usa un escalar de
 *   bloque (`run: |`) el gate aborta en vez de ignorarlo. Hoy los `run:` de
 *   `verify.yml` son todos de una línea, pero `release.yml` sí usa bloques:
 *   la asunción es frágil y por eso se comprueba en vez de asumirse.
 *
 * ─── Contrato de invocación ─────────────────────────────────────────────
 * • Invoker: `npm run test:ci-covers-verify`, encadenado en `verify:unit`.
 *   (Sí, este gate se verifica a sí mismo: si alguien lo saca de la cadena,
 *   deja de haber quien compruebe la cadena — por eso también es un step
 *   explícito del workflow, como todos los demás.)
 * • Fallback: ERROR. Un comando no cubierto es fallo; un `run:` no parseable
 *   también.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const WORKFLOW = ".github/workflows/verify.yml";

/**
 * Exenciones con razón. Clave = comando expandido tal como aparece en la
 * cadena; valor = por qué NO necesita step propio en CI.
 */
const EXENCIONES = new Map([
  [
    "node scripts/clean.mjs tsconfig.tsbuildinfo",
    "CI parte de un checkout limpio y ningún tsconfig declara `incremental`/" +
      "`tsBuildInfoFile`, así que el fichero que borra no existe. Divergencia " +
      "sin hueco de cobertura.",
  ],
]);

/** Trocea el cuerpo de un script en comandos encadenados con `&&`. */
function trocear(nombreScript) {
  const cuerpo = pkg.scripts?.[nombreScript];
  if (typeof cuerpo !== "string") throw new Error(`no existe el script '${nombreScript}'`);
  return cuerpo.split("&&").map((s) => s.trim()).filter(Boolean);
}

/**
 * Un comando de la cadena queda cubierto si el workflow lo ejecuta, sea por su
 * forma expandida (`size-limit`) o por cualquier alias de package.json que
 * resuelva a ella (`npm run verify:size`).
 */
function formasEquivalentes(comando) {
  const formas = new Set([comando]);
  for (const [nombre, cuerpo] of Object.entries(pkg.scripts ?? {})) {
    if (cuerpo === comando) formas.add(`npm run ${nombre}`);
  }
  return formas;
}

const workflowTexto = readFileSync(resolve(root, WORKFLOW), "utf8");
const workflow = parseYaml(workflowTexto);

const stepsRun = [];
for (const job of Object.values(workflow.jobs ?? {})) {
  for (const step of job.steps ?? []) {
    if (typeof step.run !== "string") continue;
    if (step.run.includes("\n")) {
      console.error(
        `✖ check-ci-covers-verify: el step '${String(step.name ?? "<sin nombre>")}' de ${WORKFLOW} usa un\n` +
          `  \`run\` multilínea. Este gate solo sabe razonar sobre comandos de una línea, y\n` +
          `  tratar lo que no entiende como "cubierto" sería justamente el fail-open que\n` +
          `  existe para cerrar. Extrae el comando a un script de package.json, o enseña a\n` +
          `  este gate a parsear bloques.`,
      );
      process.exit(1);
    }
    stepsRun.push(step.run.trim());
  }
}

/**
 * Recorre la cadena y devuelve los comandos que CI no ejecuta.
 *
 * La recursión PARA en cuanto un alias aparece como step: si el workflow corre
 * `npm run build`, corre también sus seis sub-comandos, y exigir un step por
 * cada uno sería un falso positivo. Lo que se mide es "¿ejecuta CI este
 * trabajo?", no "¿está esta cadena de texto en el YAML?".
 */
function faltantes(nombreScript, visto = new Set()) {
  if (stepsRun.includes(`npm run ${nombreScript}`)) return { faltan: [], cubiertos: 1 };
  if (visto.has(nombreScript)) throw new Error(`ciclo de scripts en '${nombreScript}'`);
  visto.add(nombreScript);

  const faltan = [];
  let cubiertos = 0;
  for (const trozo of trocear(nombreScript)) {
    const alias = /^npm run ([\w:-]+)$/.exec(trozo);
    if (alias) {
      const sub = faltantes(alias[1], new Set(visto));
      faltan.push(...sub.faltan);
      cubiertos += sub.cubiertos;
      continue;
    }
    if (EXENCIONES.has(trozo)) continue;
    if ([...formasEquivalentes(trozo)].some((f) => stepsRun.includes(f))) cubiertos += 1;
    else faltan.push(trozo);
  }
  return { faltan, cubiertos };
}

const { faltan, cubiertos } = faltantes("verify");

if (faltan.length > 0) {
  console.error(
    `\n✖ check-ci-covers-verify: ${String(faltan.length)} comando(s) de \`npm run verify\` NO corren en ${WORKFLOW}:\n`,
  );
  for (const c of faltan) console.error(`  − ${c}`);
  console.error(
    `\nUn gate que solo vive en \`verify:unit\` se ejecuta en \`prepublishOnly\` — es decir,\n` +
      `DESPUÉS de crear el tag protegido, que este repo no puede borrar ni mover. En la\n` +
      `práctica es un gate que no bloquea nada.\n\n` +
      `Salidas válidas: (a) añadir el step a ${WORKFLOW}; (b) si de verdad no debe correr\n` +
      `en CI, añadirlo a EXENCIONES en este fichero CON su razón escrita. Lo que no vale\n` +
      `es dejarlo fuera en silencio: esta clase de drift ya ha ocurrido dos veces.`,
  );
  process.exit(1);
}

console.log(
  `✓ ci-covers-verify: ${String(cubiertos)} comando(s) de \`verify\` cubiertos por ${WORKFLOW}` +
    ` (+${String(EXENCIONES.size)} exento(s) con razón declarada).`,
);
process.exit(0);
