/**
 * Declaration file for `check-server-safe-markers.mjs`. Solo describe la
 * superficie exportada para tests (`src/_audit/server-safe-gate.test.ts`);
 * el CLI no necesita types. Mantener en sync manualmente con el script.
 */

import type ts from "typescript";

export interface ServerSafeGateViolation {
  /** Path relativo al repoRoot del archivo analizado. */
  file: string;
  /**
   * Rule identifier que disparó la violation. Tres categorías:
   *   - `"no-bare-dom-access"`: acceso a client global sin guard activo.
   *   - `"no-dynamic-eval-sink"`: ref a `eval` / `Function`, o invocación de
   *     `.constructor` (Function constructor alcanzable desde cualquier base,
   *     p.ej. `[].constructor.constructor("code")()`) — bypass del AST.
   *   - `"no-use-client"`: `"use client"` coexistiendo con `@server-safe`.
   *   - `"unresolved-import"`: import relativo o alias que no resuelve a
   *     un archivo dentro de `src/`. El gate FALLA aquí (no skip silencioso)
   *     porque seguir un import sin saber dónde apunta reproduce el bypass
   *     que el smuggling check cierra.
   */
  rule:
    | "no-bare-dom-access"
    | "no-dynamic-eval-sink"
    | "no-use-client"
    | "unresolved-import"
    | string;
  /** 1-based line number del nodo problemático, si está disponible. */
  line?: number;
  /** Detalle humano de la violación + snippet de la línea. */
  detail: string;
  /**
   * Cadena de imports (paths relativos a repo root) desde el archivo
   * `@server-safe` entry hasta el archivo donde aparece la violation.
   * Solo presente cuando la violation viene de un descendiente transitivo
   * (length >= 2). Undefined cuando la violation está en el entry mismo.
   */
  chain?: string[];
}

/**
 * Analiza un único source file. Devuelve violations encontradas en ESE
 * archivo (no sigue imports). Para análisis con smuggling cross-módulo,
 * usar `checkFileWithImports`.
 *
 * @param content Source text.
 * @param relPath Path relativo (usado en el reporting).
 * @param preparsedSourceFile SourceFile pre-parseado opcional. El
 *   orquestador `checkFileWithImports` lo pasa para amortizar parseo
 *   compartido vía cache.
 */
export declare function checkSourceFile(
  content: string,
  relPath: string,
  preparsedSourceFile?: ts.SourceFile,
): ServerSafeGateViolation[];

/**
 * Resultado de resolver un module specifier. Cuatro outcomes:
 *   - `internal`: archivo dentro de `src/`. El orquestador desciende.
 *   - `external`: bare specifier sin alias match, o relativo que resuelve
 *     fuera de `src/`. El orquestador NO desciende — peer/out-of-scope.
 *   - `edge-denied`: builtin de Node (bare `fs`, prefijado `node:fs`, subpath
 *     `fs/promises`). Node-only por construcción, fuera de la intersección
 *     cross-runtime → el orquestador lo flaggea (no existe en el baseline Edge).
 *   - `unresolvable`: relativo/alias/subpath/dir-con-package.json/ext-no-asset
 *     que el gate no puede resolver o auditar. El orquestador emite una
 *     violation `unresolved-import` para fallar ruidosamente.
 */
export type ResolveImportResult =
  | { kind: "internal"; absPath: string }
  | { kind: "external" }
  | { kind: "edge-denied"; specifier: string }
  | { kind: "unresolvable"; reason: string };

export declare function resolveImportPath(
  specifier: string,
  importerAbsPath: string,
  tsconfigPaths: Array<{ prefix: string; targetPrefix: string }>,
  fileExists?: (absPath: string) => boolean,
  rootsOverride?: { repoRoot?: string; srcRoot?: string },
): ResolveImportResult;

export interface ModuleReference {
  /** Texto del specifier tal cual aparece en el source. */
  specifier: string;
  /**
   * Tipo de ref. `type-only` cubre `import type` y `export type`; el
   * orquestador no las sigue porque no generan runtime.
   */
  kind: "value" | "type-only";
  /** Posición del nodo specifier (útil para reporting futuro). */
  modulePos: number;
}

export declare function extractModuleReferences(
  sourceFile: ts.SourceFile,
): ModuleReference[];

export interface CheckFileWithImportsOptions {
  tsconfigPaths?: Array<{ prefix: string; targetPrefix: string }>;
  readFile?: (absPath: string) => string;
  fileExists?: (absPath: string) => boolean;
  parseCache?: Map<string, { sourceFile: ts.SourceFile; content: string }>;
  visited?: Set<string>;
  /** Solo uso interno (recursión). No setear desde el caller. */
  chain?: string[];
  /**
   * Override del repo root (default: directorio físico del repo). Solo
   * para tests con virtual FS — permite que la resolución de aliases
   * (`@/foo`) opere en un espacio simulado.
   */
  repoRoot?: string;
  /**
   * Override del src root (default: `${repoRoot}/src`). Solo para tests
   * — controla el check "inside src/" que decide si un import relativo
   * resuelto se sigue (interno) o se trata como external.
   */
  srcRoot?: string;
}

/**
 * Orquestador recursivo. Analiza `entryAbsPath` y todos sus value-imports
 * transitivos dentro de `src/`. Devuelve violations con `.chain` anotada
 * cuando provienen de un archivo descendiente.
 */
export declare function checkFileWithImports(
  entryAbsPath: string,
  options?: CheckFileWithImportsOptions,
): ServerSafeGateViolation[];

export declare function getTsconfigPaths(): Array<{
  prefix: string;
  targetPrefix: string;
}>;

/**
 * Whitelist fail-closed (beta.27 BLOCKER-1). Acceso bare a cualquier global
 * AUSENTE de este set se flaggea. Derivado de `globals` (builtins ES ∪
 * globals de Node) menos `INTENTIONAL_DENY` y los overclaims de `globals`
 * no provistos por el engine mínimo (Node 22.12). Reemplaza al antiguo
 * `CLIENT_GLOBALS` (denylist).
 */
export declare const SAFE_GLOBALS: ReadonlySet<string>;
/**
 * Globals que Node provee pero el gate deniega igual (portabilidad
 * multi-runtime / anti-bypass): `globalThis`, `global`, `process`, `Buffer`,
 * `navigator`, `localStorage`, `sessionStorage`, `eval`, `Function`.
 * Excluidos de `SAFE_GLOBALS`.
 */
export declare const INTENTIONAL_DENY: ReadonlySet<string>;
/**
 * Globals que `nodeBuiltin` lista (Node los provee) pero el runtime Edge más
 * estricto (Vercel Edge sin nodejs_compat) NO expone — derivados data-driven del
 * globalThis real (@edge-runtime/vm). Excluidos de `SAFE_GLOBALS`. #190.
 */
export declare const EDGE_MISSING_GLOBALS: ReadonlySet<string>;
export declare const DYNAMIC_EVAL_SINKS: ReadonlySet<string>;

/**
 * Bucket-1 allowlist member-level: por root host-populated (`performance`/`crypto`/`console`),
 * los miembros confirmados Edge-present contra `@edge-runtime/vm` (member ∉ set → denegado por
 * complemento). Pin de contenido en `server-safe-catalog-vs-node.test.ts` Test G; #190 lo re-deriva
 * vivo contra el VM. Ver ADR D1-P1 ("Namespaces host-populated").
 */
export declare const SAFE_PARTIAL_MEMBERS: Readonly<
  Record<string, ReadonlySet<string>>
>;
/** Bucket-2 denylist member-level: ops prohibidas por root (`WebAssembly` compile-family). */
export declare const PARTIAL_SAFE_GLOBAL_MEMBERS: Readonly<
  Record<string, ReadonlySet<string>>
>;
/** Ban-de-construcción (`new <root>.<member>(...)`): `WebAssembly.Module`. */
export declare const CONSTRUCTION_DENIED_MEMBERS: Readonly<
  Record<string, ReadonlySet<string>>
>;

/**
 * Detección AST del marker `@server-safe`. Recorre el AST completo: cuenta
 * el marker como presente solo si aparece en el JSDoc de un statement
 * top-level. FALLA RUIDOSO (throw) si aparece en posición ANIDADA (función
 * interna, método…) — antes ese caso pasaba inadvertido (fail-open
 * silencioso). beta.27 BLOCKER-1.
 *
 * @throws si el marker `@server-safe` está en una posición no soportada.
 */
export declare function isContentServerSafeMarked(
  content: string,
  relPath: string,
): boolean;

/**
 * NEAR-MISS del marker (M1): líneas donde `@server-safe` aparece en un block-comment NO-JSDoc (una estrella en
 * vez de dos) → TS no lo reconoce como tag → el fichero se salta sin auditar. Vacío si no hay near-miss.
 */
export declare function markerNearMissLines(sourceFile: ts.SourceFile): number[];
