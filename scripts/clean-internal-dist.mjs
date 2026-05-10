#!/usr/bin/env node
/**
 * Limpia archivos internos de `dist/` que no deben publicarse al
 * tarball. Razón: `tsc -p tsconfig.build.json` con `exclude` deja
 * fuera `src/test-utils/`, `src/stories/`, etc. del SET inicial,
 * pero si esos archivos son alcanzables desde un import del grafo
 * (por ejemplo `src/components/Card.tsx` importa `@/utils/env`),
 * tsc los emite igualmente porque los necesita resolver.
 *
 * Este script es post-build y elimina:
 *   - dist/test-utils/         (helpers de test, no API pública)
 *   - dist/stories/            (matrix de stories, no API)
 *   - dist/utils/env.*         (helper interno isDev())
 *   - dist/utils/mergeDescribedBy.*  (helper interno a11y)
 *   - dist/utils/useIsoLayoutEffect.* (helper interno SSR-safe)
 *   - dist/utils/useA11yWarnInput.* (helper interno a11y, capa 1.1)
 *   - dist/utils/useLandmarkRegistry.* (helper interno a11y, capa 1.2)
 *   - dist/utils/useTopLevelLandmarkCheck.* (helper interno a11y, capa 1.3)
 *   - dist/utils/*.test.*      (por si alguno se cuela)
 *
 * Lo que sí publicamos de dist/utils/: solo `cn.{js,d.ts,...}` que
 * algunos consumers usan inline (decisión beta.X registrada en
 * docs/DS_AUTOSUFFICIENCY_DEBT.md).
 *
 * ─── Contrato de invocación ─────────────────────────────────────
 * • **Invoker**: encadenado en el script `build` de package.json
 *   (`tsc -p tsconfig.build.json && vite build && node scripts/clean-internal-dist.mjs`).
 *   También corre via `npm run build` y como dependencia indirecta
 *   de `npm pack`/`npm publish` cuando `prepack` lo activa.
 * • **Entorno requerido**: `dist/` debe existir tras tsc + vite build.
 *   Los paths que limpia son los listados arriba; si tsc deja de
 *   emitir alguno, el script lo ignora (no falla).
 * • **Fallback / errores**: cross-platform via `fs.rmSync` y `unlinkSync`
 *   con `force: true`. Si un archivo no existe, no aborta. Cualquier
 *   error de I/O propaga (exit no-cero) — interrumpe el build.
 */
import { rmSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distDir = resolve(repoRoot, "dist");

if (!existsSync(distDir)) {
  console.log("[clean-internal-dist] dist/ no existe, nada que limpiar.");
  process.exit(0);
}

let removed = 0;

function rmDir(rel) {
  const abs = join(distDir, rel);
  if (existsSync(abs)) {
    rmSync(abs, { recursive: true, force: true });
    console.log(`[clean-internal-dist] removed dir: ${rel}`);
    removed += 1;
  }
}

function rmFilesByPrefix(rel, prefixes) {
  const abs = join(distDir, rel);
  if (!existsSync(abs)) return;
  const entries = readdirSync(abs);
  for (const entry of entries) {
    if (prefixes.some((p) => entry.startsWith(p))) {
      const full = join(abs, entry);
      if (statSync(full).isFile()) {
        unlinkSync(full);
        console.log(`[clean-internal-dist] removed file: ${rel}/${entry}`);
        removed += 1;
      }
    }
  }
}

// Directorios completos no API.
rmDir("test-utils");
rmDir("stories");

// Files internos en dist/utils/ — sólo cn.* es público.
//
// L-08 (gate review): los 3 hooks de a11y warn-only quedaban
// accesibles vía subpath import aunque no estaban en `exports`
// field del package.json. Son implementation details de capa 1
// del DS auto-suficiente — el consumer no debe consumirlos
// directamente. Se eliminan post-build para que el tarball NO los
// publique.
const INTERNAL_UTILS_PREFIXES = [
  "mergeDescribedBy.",
  "useIsoLayoutEffect.",
  "useA11yWarnInput.",
  "useLandmarkRegistry.",
  "useTopLevelLandmarkCheck.",
];
rmFilesByPrefix("utils", INTERNAL_UTILS_PREFIXES);

// Defensa: si tsc emite por error los `.d.ts` ambient root-level
// (`_internal-env`, `vite-env`), eliminarlos. Hoy tsc NO los emite
// (es .d.ts → no source) pero un cambio futuro de configuración podría
// regresar el comportamiento. Mantener el guardrail aquí es barato.
rmFilesByPrefix(".", ["_internal-env.", "vite-env."]);

// Por si alguno de los archivos *.test.* se cuela en dist/.
function rmTestArtifactsRecursive(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      rmTestArtifactsRecursive(full);
    } else if (entry.includes(".test.")) {
      unlinkSync(full);
      console.log(
        `[clean-internal-dist] removed test artifact: ${full.slice(repoRoot.length + 1)}`,
      );
      removed += 1;
    }
  }
}
rmTestArtifactsRecursive(distDir);

console.log(`[clean-internal-dist] OK — ${String(removed)} entradas eliminadas.`);
