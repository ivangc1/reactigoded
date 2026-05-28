#!/usr/bin/env node
/**
 * test-consumer-pack.mjs — MEDIUM-1 gate beta.26.
 *
 * Tarball-real-install gate. Hace `npm pack` → instala el tarball en un
 * sandbox temporal → corre `tsc --noEmit` sobre un fixture que importa
 * desde `"reactigoded"` (root + subpaths).
 *
 * Diferencia vs `test:consumer-types(:nodenext)`:
 *   - Aquellos usan `compilerOptions.paths` para apuntar a `dist/`
 *     directamente. NO ejercitan resolución vía `node_modules` ni la
 *     interpretación del `exports` field por npm/node real.
 *   - Este script: pack + install + tsc valida el flow END-TO-END que
 *     un consumer real va a hacer. Caza issues que solo emergen con la
 *     publicación real:
 *       (a) `exports` field map aplicado por node/npm (subpaths
 *           `./server-safe`, `./cn`).
 *       (b) Peer deps resueltos por npm (incluida la cadena
 *           `@floating-ui/react` ^0.27 pre-1.0).
 *       (c) `.d.ts` paths resueltos desde `node_modules/reactigoded/`
 *           bajo NodeNext (sin trampolín de `paths` que enmascare
 *           extensiones relative ESM).
 *
 * Patrón histórico que justifica el gate: Codex/Claude del cruce beta.25
 * propusieron `test:consumer-pack` precisamente porque `test:consumer-types`
 * pre-existente NO cazaba el bug NodeNext .d.ts (alias `@/` no resueltos
 * en .d.ts publicados — 259 errores TS2834 reproducidos por Codex en su
 * sandbox real con tarball, invisibles con `paths`). El presente gate
 * cubre esa categoría retroactivamente y previene regresiones similares
 * en el refactor Slot DS-wide upcoming.
 *
 * Invocación:
 *   - `npm run test:consumer-pack` (asume `dist/` ya construido).
 *   - Encadenado en `verify:unit` después de `test:consumer-types:nodenext`.
 *   - Encadenado en CI como step independiente (verify.yml).
 *
 * Flags y comportamiento:
 *   - `--ignore-scripts` en `npm pack`: best-effort. En npm 10 (CI Node
 *     22.12.0) el flag NO se respeta para `pack` y el script `prepare`
 *     (`patch-package`) corre igual. Lo dejamos por si npm lo arregla,
 *     pero NO dependemos de ello.
 *   - `--pack-destination=<tmpdir>`: en lugar de parsear el stdout de
 *     `npm pack --json` (frágil — `prepare` puede meter output pre-JSON
 *     y romper `JSON.parse`), pedimos a npm que escriba el `.tgz` en un
 *     directorio temporal. Luego un `readdirSync` localiza el archivo
 *     único. Inmune a output de scripts.
 *   - `--ignore-scripts` en `npm install` del sandbox: defensive — el
 *     tarball de reactigoded NO declara postinstall ni similar, pero los
 *     transitive deps de @floating-ui/react o @types/* podrían declarar
 *     scripts arbitrarios. Sandbox = no nos importan.
 *   - `--no-package-lock`: lockfile del sandbox es ephemeral, no
 *     persistible, ahorra IO en `/tmp`.
 *   - Sandbox y pack-destination ambos en `os.tmpdir()` (ext4 nativo en
 *     Linux/WSL, NTFS aislado en Windows) — mismo principio que
 *     `~/reactigoded` migration: evitar el path NTFS via `/mnt/c` que
 *     corrompe binarios. Y crítico: nunca el tarball en `repoRoot`
 *     (`npm pack` por defecto lo deja en cwd, lo cual obligaba a un
 *     cleanup post-hoc frágil).
 *
 * Cleanup garantizado en `finally`: sandbox borrado + pack-destination
 * borrado. No quedan artifacts en repoRoot.
 */
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readdirSync,
  cpSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const fixtureDir = resolve(repoRoot, "fixtures/consumer-pack");

const SANDBOX_PREFIX = "reactigoded-consumer-pack-";

/**
 * Wrapper para `execSync` que imprime el comando + propaga stdio del
 * proceso hijo. Si el comando falla, `execSync` lanza y el catch del
 * caller convierte el error en exit 1 con mensaje claro.
 */
function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

let sandbox;
let packDest;
let exitCode = 0;

try {
  // ─── 1. npm pack ────────────────────────────────────────────────
  // `--ignore-scripts` skipea `prepublishOnly` (verify) que llamaría a
  // este script en bucle infinito. NOTA: en npm 10 (CI Node 22.12.0)
  // el flag NO se respeta para `pack`, y el script `prepare`
  // (`patch-package`) corre igual. Eso es OK funcionalmente
  // (patch-package es idempotente) pero rompe `npm pack --json` porque
  // mete output pre-JSON al stdout.
  //
  // Solución: `--pack-destination=<tmpdir>` escribe el `.tgz` a un
  // directorio temporal. Luego `readdirSync` lo localiza. Sin parsear
  // stdout. Inmune a output de scripts. Bonus: no dejamos tarball en
  // repoRoot.
  packDest = mkdtempSync(join(tmpdir(), "reactigoded-pack-dest-"));
  console.log(
    `\n[consumer-pack 1/5] npm pack --ignore-scripts --pack-destination ${packDest}`,
  );
  run(`npm pack --ignore-scripts --pack-destination "${packDest}"`, {
    cwd: repoRoot,
  });
  const tarballs = readdirSync(packDest).filter(
    (f) => f.startsWith("reactigoded-") && f.endsWith(".tgz"),
  );
  if (tarballs.length !== 1) {
    throw new Error(
      `Esperaba 1 tarball en ${packDest}, encontré ${tarballs.length}: ${tarballs.join(", ") || "(ninguno)"}`,
    );
  }
  const tarballPath = join(packDest, tarballs[0]);
  console.log(`Tarball: ${tarballs[0]}`);

  // ─── 2. Crear sandbox ──────────────────────────────────────────
  // mkdtemp en `os.tmpdir()`: Linux/WSL = /tmp (ext4), macOS = /var/folders,
  // Windows = %TEMP%. Importante en WSL: NO usar repoRoot ni /mnt/c.
  sandbox = mkdtempSync(join(tmpdir(), SANDBOX_PREFIX));
  console.log(`\n[consumer-pack 2/5] Sandbox: ${sandbox}`);

  // ─── 3. Sandbox package.json + fixture ─────────────────────────
  // Versiones EXACTAS instaladas en el node_modules del repo (resueltas
  // por el lockfile principal). Garantiza que el gate use exactamente
  // las mismas versiones de peers + tooling que el resto del CI del repo.
  //
  // Codex P2 round 1 sobre #108: usar rangos (`react: ">=19.0.0"` o incluso
  // `^19.2.6`) hacía que el gate resolviera versiones distintas cada
  // ejecución según lo que estuviera publicado en npm — releases futuras
  // (e.g., React 20, FUI 0.28) podrían romper el gate sin que el repo
  // cambiase. El gate debe ser DETERMINISTA respecto al estado del repo;
  // las versiones exactas leídas de node_modules cumplen ese contrato.
  function installedVersion(name) {
    const pkgPath = join(repoRoot, "node_modules", name, "package.json");
    return JSON.parse(readFileSync(pkgPath, "utf8")).version;
  }

  const sandboxPkg = {
    name: "reactigoded-consumer-pack-test",
    version: "0.0.0-test",
    private: true,
    type: "module",
    dependencies: {
      reactigoded: `file:${tarballPath}`,
      "@floating-ui/react": installedVersion("@floating-ui/react"),
      clsx: installedVersion("clsx"),
      react: installedVersion("react"),
      "react-dom": installedVersion("react-dom"),
    },
    devDependencies: {
      typescript: installedVersion("typescript"),
      "@types/react": installedVersion("@types/react"),
      "@types/react-dom": installedVersion("@types/react-dom"),
    },
  };
  writeFileSync(
    join(sandbox, "package.json"),
    JSON.stringify(sandboxPkg, null, 2),
  );

  cpSync(join(fixtureDir, "app.tsx"), join(sandbox, "app.tsx"));
  cpSync(
    join(fixtureDir, "tsconfig.bundler.json"),
    join(sandbox, "tsconfig.bundler.json"),
  );
  cpSync(
    join(fixtureDir, "tsconfig.nodenext.json"),
    join(sandbox, "tsconfig.nodenext.json"),
  );

  // ─── 4. npm install en sandbox ─────────────────────────────────
  // Flags:
  //   --ignore-scripts: defensive frente a postinstall de transitive deps.
  //   --no-audit / --no-fund: silencia ruido irrelevante.
  //   --no-package-lock: lockfile ephemeral, no se persiste.
  //   --legacy-peer-deps: replica el flag usado en CI principal (verify.yml).
  console.log("\n[consumer-pack 3/5] npm install en sandbox");
  run(
    "npm install --ignore-scripts --no-audit --no-fund --no-package-lock --legacy-peer-deps",
    { cwd: sandbox },
  );

  // ─── 5. tsc Bundler ────────────────────────────────────────────
  // Resolución `moduleResolution: Bundler` — emula consumer vite/webpack
  // típico. Cazas: `.d.ts` autocontradictorios (e.g., destructuring de
  // props @internal que stripInternal borró — Codex BLOCKER 3 beta.25).
  console.log("\n[consumer-pack 4/5] tsc --noEmit (Bundler resolution)");
  run("npx tsc -p tsconfig.bundler.json --noEmit", { cwd: sandbox });

  // ─── 6. tsc NodeNext ───────────────────────────────────────────
  // Resolución `moduleResolution: NodeNext` — emula consumer ESM estricto
  // con `type:module`. Cazas: specifiers relative sin extensión en `.d.ts`
  // publicados (TS2834 — Codex catch del cruce beta.25, 259 errores
  // reproducidos pre-fix).
  console.log("\n[consumer-pack 5/5] tsc --noEmit (NodeNext resolution)");
  run("npx tsc -p tsconfig.nodenext.json --noEmit", { cwd: sandbox });

  console.log(
    "\n✓ consumer-pack gate passed (tarball install + tsc bundler + tsc NodeNext)",
  );
} catch (err) {
  console.error("\n✗ consumer-pack gate FAILED");
  if (err instanceof Error && err.message) {
    console.error(err.message);
  } else {
    console.error(String(err));
  }
  exitCode = 1;
} finally {
  if (sandbox) {
    try {
      rmSync(sandbox, { recursive: true, force: true });
    } catch (e) {
      console.warn(`Sandbox cleanup failed: ${e.message}`);
    }
  }
  if (packDest) {
    try {
      rmSync(packDest, { recursive: true, force: true });
    } catch (e) {
      console.warn(`Pack-destination cleanup failed: ${e.message}`);
    }
  }
}

process.exit(exitCode);
