/**
 * Limpia clases huérfanas del state-css que apuntan a tokens eliminados.
 *
 * Tras eliminar `.ig-modal-*` y `--ig-modal-*` de `igoded-design.css`, las
 * utilities pseudo-class autogeneradas en `igoded-state-css.css` (tipo
 * `.hover\:ig-modal-md`, `.first\:ig-modal-md`, etc.) referencian variables
 * inexistentes y son código muerto. Este script las elimina con postcss
 * (parser CSS real, evita romper agrupaciones de selectores compartidos).
 *
 * Ejecutar: `node scripts/strip-orphan-css.mjs`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import postcss from "postcss";

const __dirname = dirname(fileURLToPath(import.meta.url));
const input = resolve(__dirname, "../src/styles/igoded-state-css.css");
const css = readFileSync(input, "utf8");
const root = postcss.parse(css);

const ORPHAN_PATTERN = /ig-modal-(sm|md|lg|xl|w-sm|w-md|w-lg|w-xl)\b/;

let removedSelectors = 0;
let removedRules = 0;

root.walkRules((rule) => {
  const original = rule.selectors;
  const remaining = original.filter((s) => !ORPHAN_PATTERN.test(s));
  removedSelectors += original.length - remaining.length;

  if (remaining.length === 0) {
    rule.remove();
    removedRules++;
  } else if (remaining.length !== original.length) {
    rule.selectors = remaining;
  }
});

const out = root.toString();
writeFileSync(input, out, "utf8");

const beforeLines = css.split("\n").length;
const afterLines = out.split("\n").length;
console.log(`Selectores ig-modal eliminados: ${String(removedSelectors)}`);
console.log(`Reglas completas eliminadas: ${String(removedRules)}`);
console.log(`Tamaño: ${String(css.length)} → ${String(out.length)} bytes`);
console.log(`Líneas: ${String(beforeLines)} → ${String(afterLines)}`);
