/**
 * Oráculo de runtime — probe de Vercel Edge REAL (#18, cierra el ~5% que
 * `@edge-runtime/vm` no puede validar).
 *
 * `@edge-runtime/vm` es un sandbox sobre Node: filtra globals Node-shared
 * (`performance.eventLoopUtilization`, `URL.createObjectURL`,
 * `WebAssembly.Module`…) que en el Vercel Edge REAL no existen o lanzan. El
 * runtime-oracle mide workerd + Deno fielmente, pero Vercel Edge PRODUCCIÓN
 * es su propio runtime — este probe es el único oráculo fiel para él.
 *
 * Devuelve:
 *   - `globalThisNames`: los nombres ALCANZABLES en `globalThis` (own +
 *     cadena de prototipos) en el Edge real → se compara contra `SAFE_GLOBALS`
 *     (deben ESTAR) y `EDGE_MISSING_GLOBALS` (deben FALTAR) con
 *     `scripts/runtime-oracle/compare-vercel.mjs`.
 *   - `premises`: las mismas sondas que `worker.js` (typeof + call/await-if-throws)
 *     → confirma que las premisas pineadas (createObjectURL THROWS, WASM.compile
 *     THROWS, new Function THROWS, elu absent…) valen también en Vercel Edge.
 *
 * DEPLOY: ver `scripts/runtime-oracle/vercel/README.md`. `vercel dev` NO sirve
 * (usa `@edge-runtime/vm`, el 95%); hace falta un deploy de PRODUCCIÓN.
 */
export const config = { runtime: "edge" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function tryCall(fn: () => void): string {
  try {
    fn();
    return "OK";
  } catch (e) {
    const err = e as { constructor?: { name?: string }; message?: string };
    return `THROWS ${err.constructor?.name ?? "Error"}: ${String(err.message)}`;
  }
}

// WASM.compile / instantiate son ASÍNCRONOS: devuelven una Promise que RECHAZA
// (no lanzan síncronamente). Hay que AWAITearla — el probe anterior las metía en
// un `tryCall` síncrono y veía un "OK" falso. `worker.js` (workerd) sí las
// awaitea → THROWS. Este helper replica esa semántica en el Edge real.
async function tryAwait(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return "OK";
  } catch (e) {
    const err = e as { constructor?: { name?: string }; message?: string };
    return `THROWS ${err.constructor?.name ?? "Error"}: ${String(err.message)}`;
  }
}

// `Object.getOwnPropertyNames(globalThis)` NO enumera los globals que el Edge
// instala en el PROTOTIPO (ServiceWorkerGlobalScope.prototype →
// WorkerGlobalScope.prototype → EventTarget.prototype → …): `URL`, `Blob`,
// `fetch`, `TextEncoder`, `setTimeout`, `AbortController`, e incluso built-ins
// ES como `undefined`/`NaN` viven ahí, no como `own` del wrapper JSG. Caminar la
// cadena de prototipos hasta `Object.prototype` da el set REAL de nombres
// alcanzables — equivale exactamente a `name in globalThis`, que es la semántica
// de "presente" que el gate necesita. (own-names daba 59 y omitía URL/Blob/fetch,
// contradiciendo las propias premisas que sí los ejecutan.)
function reachableGlobalNames(g: object): string[] {
  const names = new Set<string>();
  let o: object | null = g;
  while (o && o !== Object.prototype) {
    for (const n of Object.getOwnPropertyNames(o)) names.add(n);
    o = Object.getPrototypeOf(o) as object | null;
  }
  return [...names].sort();
}

export default async function handler(): Promise<Response> {
  const g = globalThis as Any;

  const premises: Record<string, string> = {
    // typeof (presence)
    performance: typeof g.performance,
    eventLoopUtilization: typeof g.performance?.eventLoopUtilization,
    createObjectURL: typeof g.URL?.createObjectURL,
    canParse: typeof g.URL?.canParse,
    Blob: typeof g.Blob,
    consoleTable: typeof g.console?.table,
    WebAssembly: typeof g.WebAssembly,
    waCompile: typeof g.WebAssembly?.compile,
    process: typeof g.process,
    Buffer: typeof g.Buffer,
    setImmediate: typeof g.setImmediate,
    // call-if-throws (present-but-throws hazards, síncronos)
    newURL: tryCall(() => void new g.URL("https://a.b/c")),
    createObjectURLCall: tryCall(() =>
      void g.URL.createObjectURL(new g.Blob(["x"])),
    ),
    revokeCall: tryCall(() => g.URL.revokeObjectURL("blob:x")),
    // await-if-throws (WASM.compile es async — ver tryAwait). codegen disallowed
    // en Edge estricto → CompileError esperado (igual que workerd).
    waCompileCall: await tryAwait(() =>
      g.WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])),
    ),
    fnCtor: tryCall(() => void new Function("return 1")),
    consoleTableCall: tryCall(() => g.console.table([{ a: 1 }])),
    setImmediateCall: tryCall(() => g.setImmediate(() => {})),
  };

  const out = {
    runtime: "vercel-edge",
    // Vercel expone la región y la versión del runtime en headers/env; los
    // capturamos si están para pinear la medición.
    vercelRegion: g.process?.env?.VERCEL_REGION ?? null,
    // own-names para referencia + diagnóstico del delta prototipo.
    ownGlobalThisNames: Object.getOwnPropertyNames(g).sort(),
    globalThisNames: reachableGlobalNames(g),
    premises,
  };

  return new Response(JSON.stringify(out, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
