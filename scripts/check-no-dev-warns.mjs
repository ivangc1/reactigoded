#!/usr/bin/env node
/**
 * Guardrail B-07 (post-RC1 refined, #151 cross-platform).
 *
 * Verifica que el bundle publicado `dist/index.js` NO contiene
 * `console.warn`/`console.error` con prefijo `[reactigoded]` —
 * indicador de un warn/error dev-only que no respeta el guard
 * `import.meta.env.DEV` y por tanto sobrevive al DCE de
 * Vite (define + OXC/rolldown) en producción.
 *
 * Historia:
 *
 * - B-07 (beta.21): los warns dev del DS migraron de `isDev()` a
 *   `import.meta.env.DEV` para que Vite (define + OXC/rolldown) los podara. Si una
 *   regresión introduce un `console.warn` sin guard, llega al bundle.
 * - Post-RC1 (Tooltip Floating UI): la assertion blanket
 *   `grep -c 'console\.'` mezclaba dos clases:
 *     (1) dev-warns nuestros que deben podarse en producción.
 *     (2) errores runtime legítimos de terceros (ej. tabbable dispara
 *         `console.error` cuando detecta un radio button mal
 *         configurado en runtime — info útil en producción que no
 *         debe podarse aunque pudiéramos).
 *   La intención original del guardrail era detectar (1).
 *   Restringimos el match al prefijo `[reactigoded]` (firma única
 *   de nuestros warns) — cubrimos exactamente el caso de regresión
 *   nuestra y dejamos pasar los logs propios de deps.
 * - #151 (beta.27): el shell construct
 *   `test "$(grep -cF '[reactigoded]' dist/index.js)" = "0"`
 *   funcionaba en bash/POSIX pero requería `shell: bash` en el runner
 *   Windows. Migrado a script Node — cero dependencia de shell, cross-
 *   platform genuino. Mismo razonamiento que `clean.mjs` (POSIX `rm`
 *   → Node `fs/promises rm`) que cerró el blocker beta.24.
 *
 * Implementación: lectura del bundle como UTF-8, búsqueda literal del
 * substring `[reactigoded]` con `String.prototype.indexOf` en loop.
 * Resultado:
 *   - 0 ocurrencias → exit 0 (gate verde).
 *   - >0 ocurrencias → exit 1 con detalle.
 *
 * Invocación:
 *   - `npm run test:no-dev-warns` (encadenado en `verify.yml`).
 *   - CI lo invoca tras `npm run build`, antes de `verify:size`.
 *
 * No flags — invariante binario.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = resolve(__dirname, "..", "dist", "index.js");
const NEEDLE = "[reactigoded]";

const content = readFileSync(BUNDLE_PATH, "utf8");

let count = 0;
let pos = -1;
const matches = [];
while ((pos = content.indexOf(NEEDLE, pos + 1)) !== -1) {
  count += 1;
  // Captura ~40 chars de contexto alrededor del match (para reporting).
  const start = Math.max(0, pos - 20);
  const end = Math.min(content.length, pos + NEEDLE.length + 40);
  matches.push(content.slice(start, end));
}

if (count === 0) {
  console.log(
    `✓ Bundle has no dev warns (0 occurrences of "${NEEDLE}" in dist/index.js)`,
  );
  process.exit(0);
}

console.error(
  `\n✗ Bundle has ${String(count)} dev warn(s) leaking to production:\n`,
);
for (const m of matches) {
  console.error(`  ${m.replace(/\s+/g, " ").trim()}`);
}
console.error(
  `\nFix: cualquier console.warn/error con prefijo "${NEEDLE}" debe vivir bajo guard \`import.meta.env.DEV\` para que Vite (define + OXC/rolldown) lo pode del bundle de producción. Ver patrón en src/components/Slider/Slider.tsx, src/components/Pagination/Pagination.tsx.`,
);
process.exit(1);
