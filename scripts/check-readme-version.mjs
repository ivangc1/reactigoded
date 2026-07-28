#!/usr/bin/env node
/**
 * check-readme-version.mjs — el README dice la versión que se publica (A-DOC-01).
 *
 * ─── Por qué existe ─────────────────────────────────────────────────────
 * El guard anterior vivía inline en `release.yml` y era
 * `grep -qF "$PKG" README.md`: un substring match sobre el fichero entero.
 * Con `PKG=1.0.0` eso matchea dentro de `1.0.0-rc.1`, y también dentro de un
 * rango como `^1.0.0`. O sea que la **estable podría publicarse con el README
 * entero hablando de un release candidate** y el guard daría verde. Y ni
 * siquiera hacía falta que el número apareciera: bastaba con que apareciese
 * como trozo de otro.
 *
 * ─── Qué comprueba ──────────────────────────────────────────────────────
 * 1. **Ubicación estructurada**: la versión vive en un marcador
 *    `<!-- readme-version: X -->`, no en cualquier sitio del texto. Comparar
 *    contra un marcador es comparar contra un dato; buscar un número suelto
 *    en 400 líneas de prosa es adivinar.
 * 2. **Coherencia de prerelease**: si `package.json` NO es prerelease, el
 *    README no puede contener vocabulario de prerelease (`release candidate`,
 *    `@rc`, `prerelease`, `@beta`). Es la mitad que el guard viejo no tenía y
 *    la que de verdad protege el día del 1.0.0.
 *
 * ─── Contrato de invocación ─────────────────────────────────────────────
 * • Invoker: `npm run test:readme-version`, encadenado en `verify:unit`, y
 *   como step de `release.yml` antes de publicar.
 * • Fallback: ERROR (exit 1). No necesita `dist/`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const readme = readFileSync(join(root, "README.md"), "utf8");

const version = String(pkg.version);
const esPrerelease = version.includes("-");

const errores = [];

// (1) Marcador estructurado.
const marcador = /<!--\s*readme-version:\s*([^\s>]+)\s*-->/.exec(readme);
if (!marcador) {
  errores.push(
    `falta el marcador \`<!-- readme-version: ${version} -->\` en README.md.\n` +
      `    Es el ancla del gate: sin él solo se puede buscar el número suelto por el texto,\n` +
      `    que es justo lo que fallaba (A-DOC-01).`,
  );
} else if (marcador[1] !== version) {
  errores.push(
    `el marcador del README dice \`${marcador[1]}\` y package.json dice \`${version}\`.\n` +
      `    Actualiza la sección de Instalación en el mismo commit del bump.`,
  );
}

// (2) Vocabulario de prerelease en una estable.
if (!esPrerelease) {
  const prohibidos = [/release candidate/i, /\brc\.\d/i, /@rc\b/, /prerelease/i, /@beta\b/];
  const encontrados = prohibidos
    .map((re) => re.exec(readme))
    .filter((m) => m !== null)
    .map((m) => m[0]);
  if (encontrados.length > 0) {
    errores.push(
      `\`${version}\` no es prerelease, pero el README todavía habla como si lo fuera: ` +
        `${[...new Set(encontrados)].map((s) => `«${s}»`).join(", ")}.\n` +
        `    Un consumer que llega al README de la estable no debe leer instrucciones de rc.`,
    );
  }
}

if (errores.length > 0) {
  console.error(`\n✖ readme-version: ${String(errores.length)} problema(s):\n`);
  for (const e of errores) console.error(`  − ${e}\n`);
  process.exit(1);
}

console.log(
  `✓ readme-version: el README declara \`${version}\`` +
    (esPrerelease ? " (prerelease)." : " y no contiene vocabulario de prerelease."),
);
process.exit(0);
