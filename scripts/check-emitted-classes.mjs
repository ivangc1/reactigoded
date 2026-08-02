#!/usr/bin/env node
/**
 * check-emitted-classes.mjs — gate INVERSO del freeze (gate 1.0.0, F3).
 *
 * `check-public-api-names.mjs` comprueba `freeze ⊆ dist`: que ningún nombre
 * congelado haya desaparecido. Eso caza el rename accidental, pero NO caza lo
 * contrario — un nombre nuevo que el DS empieza a emitir y que nadie congela.
 * Ese hueco es exactamente C-1: `ig-caption-bottom`, `ig-table-auto`,
 * `ig-skeleton-container` e `ig-table-scroll-region` llevaban emitidas desde
 * siempre y fuera del contrato, y las encontró una auditoría, no un gate.
 *
 * Este gate cierra la otra dirección: **emitido ⊆ freeze ∪ exclusiones con
 * razón escrita**.
 *
 * ─── Por qué sobre la EMISIÓN JS y no sobre el CSS ──────────────────────
 * La tentación es comprobar las clases del CSS shippeado. No se puede, y no
 * es opinión — está medido:
 *   • `dist/styles/**` declara ~2.600 clases `ig-*`; congeladas hay 336.
 *   • La exclusión de la capa utility que documenta `CSSAPI.mdx` es una lista
 *     ABIERTA (acaba en «…»), no un predicado: aplicándola al literal quedan
 *     ~1.800 clases sin cubrir, con familias enteras sin enumerar
 *     (`ig-w-*`, `ig-p-*`, `ig-rounded-*`, `ig-grid-*`…).
 *   • Y no hay discriminador estructural: **0** `@layer` en el CSS emitido, y
 *     1.696 de esas ~1.800 conviven con las congeladas en el mismo fichero.
 *     «Tener variante de estado» tampoco separa: 62 de las 336 congeladas la
 *     tienen.
 * Formularlo sobre el CSS obligaría a curar ~1.800 nombres para nada. El
 * espacio DECIDIBLE es el de emisión: lo que el JS del DS pone en un
 * `className`. Ahí hay ~350 nombres, cada uno con su sitio, y el contrato
 * público vive justo ahí — una clase que el DS no emite no es su contrato,
 * es vocabulario de la capa utility que el consumer escribe a mano.
 *
 * ─── Fail-closed por construcción, no por enumeración ───────────────────
 * Las clases ensambladas (`` `ig-table-${layout}` ``) se expanden con el
 * CHECKER de TypeScript: si el tipo de la expresión es una unión finita de
 * literales, se enumeran sus miembros. Si NO lo es, el gate **falla** en vez
 * de saltarse el sitio. Un ensamblaje que no se puede derivar es un agujero
 * en el contrato, no una excepción.
 *
 * Matiz medido: solo se exige derivar la expresión cuando cae DENTRO de un
 * token de clase. `` `.ig-step[data-step-index="${String(idx)}"]` `` no lo
 * está —el literal previo acaba en `="`— así que `ig-step` se deriva entero
 * y el valor del atributo no afecta a ningún nombre de clase.
 *
 * ─── Contrato de invocación ─────────────────────────────────────────────
 * • Invoker: `npm run test:emitted-classes`, encadenado en `verify:unit`.
 *   Corre sobre `src` con el `tsconfig.build.json` real (137 ficheros: los que
 *   entran al build, sin tests ni stories), así que NO necesita `dist/`.
 * • Fallback: ERROR (exit 1) ante un nombre emitido sin cubrir o un
 *   ensamblaje no derivable. Sin allowlist implícita: las exclusiones se
 *   declaran abajo, con nombre y razón.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, join } from "node:path";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Nombres que el JS emite y que NO son contrato público. Cada uno con su
 * razón: una exclusión sin razón escrita es el silencio que este gate existe
 * para eliminar (es literalmente el defecto E31-F6).
 */
const EXCLUSIONES = new Map([
  // (vacío hoy: todo lo que el DS emite está congelado. Si añades una entrada
  // aquí, escribe POR QUÉ ese nombre no es contrato — no basta con que
  // moleste.)
]);

const cfgPath = join(root, "tsconfig.build.json");
const cfg = ts.readConfigFile(cfgPath, ts.sys.readFile);
if (cfg.error) {
  console.error(`✖ emitted-classes: no se pudo leer ${cfgPath}`);
  process.exit(1);
}
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();

/** `ig-…` que NO viene precedido de `--` (eso sería una custom property). */
const TOKEN_CLASE = /(?<!-)\big-[a-z0-9]+(?:-[a-z0-9]+)*/g;
const TOKEN_PROP = /--ig-[a-z0-9]+(?:-[a-z0-9]+)*/g;
/** El literal previo termina a mitad de un token de clase. */
const CORTADO = /(?:^|[\s"'`.:[])ig-[a-z0-9-]*$/;

/** @type {Map<string, string>} nombre → primer sitio donde se emite */
const clases = new Map();
/** @type {Map<string, string>} */
const props = new Map();
/** @type {string[]} */
const noDerivables = [];

const sitio = (sf, node) =>
  `${relative(root, sf.fileName)}:${String(sf.getLineAndCharacterOfPosition(node.getStart()).line + 1)}`;

function cosechar(texto, sf, node) {
  for (const m of texto.matchAll(TOKEN_CLASE)) if (!clases.has(m[0])) clases.set(m[0], sitio(sf, node));
  for (const m of texto.matchAll(TOKEN_PROP)) if (!props.has(m[0])) props.set(m[0], sitio(sf, node));
}

/** Cadenas posibles de una expresión, o `null` si el tipo no es finito. */
function expandir(expr) {
  const salida = [];
  const visitar = (ty) => {
    if (ty.isUnion()) {
      ty.types.forEach(visitar);
      return;
    }
    if (ty.isStringLiteral()) {
      salida.push(ty.value);
      return;
    }
    // `undefined`/`null` dentro de un template renderizan su nombre, pero en
    // la práctica el DS los usa como "sin sufijo"; contarlos como cadena
    // vacía es lo conservador: genera el nombre BASE, que sí debe estar
    // congelado.
    if (ty.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) {
      salida.push("");
      return;
    }
    salida.push(null);
  };
  visitar(checker.getTypeAtLocation(expr));
  return salida.includes(null) ? null : salida;
}

for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile) continue;
  if (!sf.fileName.startsWith(join(root, "src"))) continue;

  const visitar = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (node.text.includes("ig-")) cosechar(node.text, sf, node);
    } else if (ts.isTemplateExpression(node)) {
      let variantes = [node.head.text];
      let previo = node.head.text;
      let ok = true;
      for (const span of node.templateSpans) {
        const valores = expandir(span.expression);
        if (valores === null) {
          // Solo es un agujero si el hueco cae DENTRO de un token de clase.
          if (CORTADO.test(previo)) {
            noDerivables.push(
              `${sitio(sf, node)}  ${node.getText().replace(/\s+/g, " ").slice(0, 80)}`,
            );
            ok = false;
            break;
          }
          // Fuera de un token: se corta la cadena y se sigue con lo que venga
          // después, que vuelve a ser derivable por sí solo.
          cosechar(variantes.join("\n"), sf, node);
          variantes = [span.literal.text];
          previo = span.literal.text;
          continue;
        }
        const nuevas = [];
        for (const base of variantes) for (const v of valores) nuevas.push(base + v + span.literal.text);
        variantes = nuevas;
        previo = span.literal.text;
      }
      if (ok) cosechar(variantes.join("\n"), sf, node);
    }
    ts.forEachChild(node, visitar);
  };
  visitar(sf);
}

// ─── Comparación contra el freeze ───────────────────────────────────────

const freeze = JSON.parse(readFileSync(join(root, "src/_audit/public-api-names.json"), "utf8"));
const congeladas = new Set([
  ...freeze.classes,
  ...(freeze.classHooks?.literal ?? []),
  ...(freeze.classHooks?.dynamic ?? []).flatMap((d) => d.members ?? []),
]);
const congeladasProps = new Set(freeze.componentCustomProperties ?? []);

const clasesFuera = [...clases.keys()].filter((n) => !congeladas.has(n) && !EXCLUSIONES.has(n)).sort();
const propsFuera = [...props.keys()].filter((n) => !congeladasProps.has(n) && !EXCLUSIONES.has(n)).sort();

const problemas = clasesFuera.length + propsFuera.length + noDerivables.length;

if (problemas === 0) {
  console.log(
    `✓ emitted-classes: ${String(clases.size)} clases + ${String(props.size)} custom-props emitidas ` +
      `por JS, todas cubiertas por el freeze` +
      (EXCLUSIONES.size > 0 ? ` (+${String(EXCLUSIONES.size)} exclusión(es) declarada(s))` : "") +
      `. 0 ensamblajes no derivables.`,
  );
  process.exit(0);
}

console.error(`\n✖ emitted-classes: ${String(problemas)} problema(s).\n`);

if (clasesFuera.length > 0) {
  console.error(`  ${String(clasesFuera.length)} clase(s) que el DS EMITE y el freeze no cubre:\n`);
  for (const n of clasesFuera) console.error(`    − .${n}    ← ${clases.get(n) ?? "?"}`);
  console.error("");
}
if (propsFuera.length > 0) {
  console.error(`  ${String(propsFuera.length)} custom propert(y|ies) emitida(s) sin congelar:\n`);
  for (const n of propsFuera) console.error(`    − ${n}    ← ${props.get(n) ?? "?"}`);
  console.error("");
}
if (noDerivables.length > 0) {
  console.error(`  ${String(noDerivables.length)} ensamblaje(s) de clase NO derivable(s):\n`);
  for (const s of noDerivables) console.error(`    − ${s}`);
  console.error("");
}

console.error(
  `Un nombre que el DS emite y el contrato no nombra es contrato de facto: el consumer\n` +
    `lo ve en el DOM y lo usa. Este gate existe porque las 4 clases de C-1 llevaban años\n` +
    `así, y las encontró una auditoría en vez de CI.\n\n` +
    `Salidas válidas, ninguna silenciosa:\n` +
    `  (a) congelarlo en src/_audit/public-api-names.json — es contrato, asúmelo;\n` +
    `  (b) declararlo en EXCLUSIONES de este fichero CON su razón escrita;\n` +
    `  (c) dejar de emitirlo.\n\n` +
    `Si lo que falla es un ensamblaje no derivable: el tipo de la expresión no es una\n` +
    `unión finita de literales, así que nadie puede saber qué nombres salen de ahí. Acota\n` +
    `el tipo, o mueve el nombre a un literal. No se puede congelar lo que no se puede\n` +
    `enumerar.`,
);
process.exit(1);
