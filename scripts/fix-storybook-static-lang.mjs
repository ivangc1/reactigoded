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
 * El runtime script sigue siendo necesario porque Storybook reescribe
 * `<title>` y puede tocar `lang` en navegaciones — runtime captura eso,
 * post-build captura el HTML inicial.
 *
 * Cross-platform Node (`fs.readFileSync` + regex).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const indexPath = resolve("storybook-static/index.html");
const iframePath = resolve("storybook-static/iframe.html");

if (!existsSync(indexPath)) {
  console.error(
    "[fix-lang] storybook-static/index.html no existe. ¿Olvidaste npm run build-storybook?",
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

console.log(`[fix-lang] OK — ${String(fixed)} archivo(s) modificado(s).`);
