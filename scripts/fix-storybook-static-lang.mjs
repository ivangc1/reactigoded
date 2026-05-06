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
 * ─── Contrato de invocación ─────────────────────────────────────
 * • **Invoker**: encadenado en `build-storybook` de package.json
 *   (`storybook build && node scripts/fix-storybook-static-lang.mjs`).
 *   NO se invoca desde `build-storybook:chromatic` (Chromatic
 *   buildea a `/tmp/...` con `--output-dir`; ver
 *   `chromatic.config.json`).
 * • **Entorno requerido**: existencia de `./storybook-static/index.html`
 *   y `./storybook-static/iframe.html`. NO acepta `--output-dir`
 *   por diseño consciente — si Chromatic u otro caller con custom
 *   output dir lo encadena, este script falla con error explícito en
 *   stderr (red de seguridad para detectar regresión silenciosa de
 *   B-04).
 * • **Fallback / errores**: si los HTML faltan → exit 1 con mensaje
 *   indicando que `build-storybook` no se ejecutó antes. Si el regex
 *   no encuentra `<html lang="...">` → exit 0 con log informativo
 *   (Storybook ya emite `lang="es"` correctamente, no hay que
 *   parchear).
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
