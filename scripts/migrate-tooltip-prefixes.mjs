/**
 * Migra clases ig-tooltip-{placement|variant} a prefijos únicos
 * ig-tooltip-place-* / ig-tooltip-color-* para evitar colisión semántica
 * con futuras placements/variants.
 *
 * Cambio breaking pre-1.0.0. Toca igoded-components.css y, si tuviera,
 * igoded-state-css.css.
 *
 * Uso: `node scripts/migrate-tooltip-prefixes.mjs`
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import postcss from "postcss";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACEMENTS = new Set(["top", "right", "bottom", "left"]);
const VARIANTS = new Set([
  "brand",
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
]);

const TARGETS = [
  "../src/styles/igoded-components.css",
  "../src/styles/igoded-state-css.css",
];

let renamedTotal = 0;

for (const target of TARGETS) {
  const path = resolve(__dirname, target);
  if (!existsSync(path)) continue;
  const css = readFileSync(path, "utf8");
  const root = postcss.parse(css);

  root.walkRules((rule) => {
    rule.selectors = rule.selectors.map((sel) =>
      sel.replace(/\.ig-tooltip-([a-z]+)(?![a-z-])/g, (match, suffix) => {
        if (PLACEMENTS.has(suffix)) {
          renamedTotal++;
          return `.ig-tooltip-place-${suffix}`;
        }
        if (VARIANTS.has(suffix)) {
          renamedTotal++;
          return `.ig-tooltip-color-${suffix}`;
        }
        return match;
      }),
    );
  });

  writeFileSync(path, root.toString(), "utf8");
}

console.log(`Selectores Tooltip renombrados: ${renamedTotal}`);
