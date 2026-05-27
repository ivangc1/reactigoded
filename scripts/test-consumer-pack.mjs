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
 *   - `--ignore-scripts` en `npm pack`: skip `prepublishOnly`
 *     (`npm run verify`) — sin esto recursaría infinito (verify llamaría
 *     a pack que llamaría a verify).
 *   - `--ignore-scripts` en `npm install` del sandbox: defensive — el
 *     tarball de reactigoded NO declara postinstall ni similar, pero los
 *     transitive deps de @floating-ui/react o @types/* podrían declarar
 *     scripts arbitrarios. Sandbox = no nos importan.
 *   - `--no-package-lock`: lockfile del sandbox es ephemeral, no
 *     persistible, ahorra IO en `/tmp`.
 *   - Sandbox en `os.tmpdir()` (ext4 nativo en Linux/WSL, NTFS aislado
 *     en Windows) — mismo principio que `~/reactigoded` migration:
 *     evitar el path NTFS via `/mnt/c` que corrompe binarios.
 *
 * Cleanup garantizado en `finally`: sandbox borrado + tarball local
 * eliminado (npm pack lo deja en `cwd`).
 */
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readdirSync,
  cpSync,
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

/**
 * Wrapper para `execSync` que captura stdout y lo parsea como JSON.
 * stderr sigue fluyendo al terminal para que warnings de npm sean
 * visibles si los hay.
 */
function runJson(cmd, opts = {}) {
  const out = execSync(cmd, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
    ...opts,
  });
  return JSON.parse(out.trim());
}

/**
 * Elimina cualquier tarball `reactigoded-*.tgz` que haya quedado en
 * `repoRoot`. `npm pack` los deja en cwd; defensivo aunque siempre
 * limpiemos en `finally`.
 */
function cleanupRootTarballs() {
  for (const entry of readdirSync(repoRoot)) {
    if (entry.startsWith("reactigoded-") && entry.endsWith(".tgz")) {
      try {
        rmSync(join(repoRoot, entry), { force: true });
      } catch {
        /* best-effort */
      }
    }
  }
}

let sandbox;
let exitCode = 0;

try {
  // ─── 1. npm pack ────────────────────────────────────────────────
  // `--ignore-scripts` skipea `prepublishOnly` (verify) — sin esto el
  // gate recursaría infinito porque verify:unit llama a este script.
  console.log("\n[consumer-pack 1/5] npm pack --ignore-scripts");
  cleanupRootTarballs(); // por si quedó alguno de un run anterior fallido
  const packResult = runJson("npm pack --ignore-scripts --json", {
    cwd: repoRoot,
  });
  if (!Array.isArray(packResult) || packResult.length === 0) {
    throw new Error("npm pack --json devolvió output inesperado");
  }
  const tarballName = packResult[0].filename;
  if (typeof tarballName !== "string") {
    throw new Error("npm pack --json sin `filename` en el primer entry");
  }
  const tarballPath = resolve(repoRoot, tarballName);
  console.log(`Tarball generado: ${tarballName}`);

  // ─── 2. Crear sandbox ──────────────────────────────────────────
  // mkdtemp en `os.tmpdir()`: Linux/WSL = /tmp (ext4), macOS = /var/folders,
  // Windows = %TEMP%. Importante en WSL: NO usar repoRoot ni /mnt/c.
  sandbox = mkdtempSync(join(tmpdir(), SANDBOX_PREFIX));
  console.log(`\n[consumer-pack 2/5] Sandbox: ${sandbox}`);

  // ─── 3. Sandbox package.json + fixture ─────────────────────────
  // Versiones de peer deps: copiamos las del paquete real (rango
  // declarado en peerDependencies del package.json del repo) para
  // ejercitar la resolución que un consumer enterprise real haría.
  const repoPkg = JSON.parse(
    execSync("cat package.json", { cwd: repoRoot, encoding: "utf8" }),
  );
  const peers = repoPkg.peerDependencies ?? {};

  const sandboxPkg = {
    name: "reactigoded-consumer-pack-test",
    version: "0.0.0-test",
    private: true,
    type: "module",
    dependencies: {
      reactigoded: `file:${tarballPath}`,
      ...peers,
    },
    devDependencies: {
      typescript: repoPkg.devDependencies.typescript,
      "@types/react": repoPkg.devDependencies["@types/react"],
      "@types/react-dom": repoPkg.devDependencies["@types/react-dom"],
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
  cleanupRootTarballs();
}

process.exit(exitCode);
