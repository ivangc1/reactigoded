/**
 * Declaration file for `check-server-safe-markers.mjs`. Solo describe la
 * superficie exportada para tests (`src/_audit/server-safe-gate.test.ts`);
 * el CLI no necesita types. Mantener en sync manualmente con el script.
 */

export interface ServerSafeGateViolation {
  /** Path relativo al repoRoot del archivo analizado. */
  file: string;
  /** Rule identifier que disparó la violation. */
  rule: "no-bare-dom-access" | "no-dynamic-eval-sink" | string;
  /** 1-based line number del nodo problemático, si está disponible. */
  line?: number;
  /** Detalle humano de la violación + snippet de la línea. */
  detail: string;
}

export declare function checkSourceFile(
  content: string,
  relPath: string,
): ServerSafeGateViolation[];

export declare const CLIENT_GLOBALS: ReadonlySet<string>;
export declare const DYNAMIC_EVAL_SINKS: ReadonlySet<string>;
