#!/usr/bin/env node
/**
 * Post-build: arregla `<html lang="...">` en el HTML estático generado
 * por Storybook. El script runtime de `managerHead` (en
 * `.storybook/main.ts`) lo arregla para SR/Googlebot/crawlers que
 * ejecutan JS, pero crawlers/auditorías sin JS ven el HTML servido.
 *
 * Este script complementa `managerHead` para cerrar B-04 al 100%:
 *
 *   - link previews (Slack, Discord, archive.org)
 *   - no-JS axe-core scans
 *   - `view-source`
 *   - pre-paint accessibility audits
 *   - lighthouse SEO con JS deshabilitado
 *
 * Quien lo invoca: `npm run build-storybook` (encadenado con `&&`).
 * Espera el output default de Storybook (`storybook-static/`); NO
 * acepta `--output-dir` por diseño consciente.
 *
 * Si Chromatic u otro caller buildea Storybook a `/tmp/...`, ese caller
 * NO debe encadenar este script (ver `chromatic.config.json` que
 * apunta a `build-storybook:chromatic`, sin lang fix). Si encadenas
 * a un caller con custom output dir, este script falla con error
 * explícito en stderr — eso es la red de seguridad para detectar la
 * regresión silenciosa de B-04.
 *
 * Cross-platform Node (`fs.readFileSync` + regex).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const outDir = resolve("storybook-static");
const indexPath = resolve(outDir, "index.html");
const iframePath = resolve(outDir, "iframe.html");

console.log(
  `[fix-lang] Aplicando lang="es" al artefacto de Storybook en ${outDir}.`,
);

if (!existsSync(indexPath)) {
  console.error(
    `[fix-lang] ERROR: ${indexPath} no existe. Esperado tras 'storybook build'. ` +
      `Si esto se ejecuta desde un workflow donde Storybook genera el output ` +
      `en otro path (ej. Chromatic con --output-dir=/tmp/...), ese flujo NO ` +
      `debe encadenar este script — usa 'build-storybook:chromatic' o invoca ` +
      `'storybook build' directamente. Ver chromatic.config.json.`,
  );
  process.exit(1);
}

let fixed = 0;
for (const path of [indexPath, iframePath]) {
  if (!existsSync(path)) continue;
  const html = readFileSync(path, "utf8");
  // 1. Si ya hay un atributo `lang="..."`, sustituye su valor por "es".
  const replaced = html.replace(
    /<html\b([^>]*)\blang=(["'])[^"']*\2/,
    '<html$1lang="es"',
  );
  // 2. Si no había atributo `lang`, lo inserta detrás del `<html`.
  const finalHtml =
    replaced === html ? html.replace(/<html\b/, '<html lang="es"') : replaced;
  if (finalHtml !== html) {
    writeFileSync(path, finalHtml);
    console.log(`[fix-lang] ${path} -> lang="es"`);
    fixed += 1;
  }
}

console.log(
  `[fix-lang] OK — ${String(fixed)} archivo(s) modificado(s) en ${outDir}.`,
);
