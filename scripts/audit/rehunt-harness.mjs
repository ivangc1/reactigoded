// Harness compartido para el re-hunt adversarial del gate `@server-safe`.
// Reproducibilidad de las auditorías del gate por terceros (los REHUNT citan rutas absolutas de la máquina
// del autor; esto las versiona). NO se publica en el paquete npm (package.json `files` allowlista solo dist/).
//
// Uso:  import { checkSingle, checkGraph, passes } from "./rehunt-harness.mjs";
import {
  checkFileWithImports,
  checkSourceFile,
} from "../check-server-safe-markers.mjs";

// Chequea un entry @server-safe + sus deps (VFS). `extraFiles`: { "dirty.ts": "<src>", ... } se montan en
// /repo/src/<name>; el entry los importa como "./dirty". Devuelve el array de violaciones (length 0 = PASA).
export function checkGraph(entrySrc, extraFiles = {}) {
  const files = new Map([
    [
      "/repo/package.json",
      JSON.stringify({ name: "reactigoded", exports: { ".": "./dist/index.js" } }),
    ],
    ["/repo/src/c.tsx", entrySrc],
    ...Object.entries(extraFiles).map(([p, c]) => ["/repo/src/" + p, c]),
  ]);
  return checkFileWithImports("/repo/src/c.tsx", {
    tsconfigPaths: [{ prefix: "@/", targetPrefix: "src/" }],
    repoRoot: "/repo",
    srcRoot: "/repo/src",
    readFile: (p) => {
      const e = files.get(p);
      if (e === undefined) throw new Error("ENOENT " + p);
      return e;
    },
    fileExists: (p) => files.has(p),
  });
}

// Chequea un solo archivo (sin seguir imports). Útil para reads de globals / eval-sinks / partial-roots.
export function checkSingle(src, fileName = "c.tsx") {
  return checkSourceFile(src, fileName);
}

// ¿PASA el gate? (0 violaciones). Un fail-open candidato PASA algo que debería flaggear.
export function passes(violations) {
  return violations.length === 0;
}

// Resumen de reglas disparadas.
export function rules(violations) {
  return violations.map((v) => v.rule);
}
