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
 * PRESENCE via POST: la ENUMERACIÓN de globals NO es fiable en Vercel Edge —
 * el objeto-global es exótico y los WinterCG (URL/Blob/fetch/setTimeout…) NO
 * aparecen en `getOwnPropertyNames` NI en la cadena de prototipos, aunque
 * `new URL()` funcione (`ownGlobalThisNames == globalThisNames == 59`). El único
 * test fiable de "presente" es `name in globalThis`. El caller
 * (compare-vercel.mjs, dueño del catálogo) manda los nombres via POST {names}
 * y aquí se prueban con `in` en el runtime real.
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

// WASM.compile es ASÍNCRONO (Promise que RECHAZA, no lanza síncronamente): hay
// que AWAITearla. worker.js (workerd) sí la awaitea → THROWS.
async function tryAwait(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return "OK";
  } catch (e) {
    const err = e as { constructor?: { name?: string }; message?: string };
    return `THROWS ${err.constructor?.name ?? "Error"}: ${String(err.message)}`;
  }
}

// Se conserva para EVIDENCIAR el gap de enumeración: en Vercel Edge sale idéntico
// a `ownGlobalThisNames` (URL/Blob/fetch ausentes) aunque existan y funcionen.
function reachableGlobalNames(g: object): string[] {
  const names = new Set<string>();
  let o: object | null = g;
  while (o && o !== Object.prototype) {
    for (const n of Object.getOwnPropertyNames(o)) names.add(n);
    o = Object.getPrototypeOf(o) as object | null;
  }
  return [...names].sort();
}

export default async function handler(req: Request): Promise<Response> {
  const g = globalThis as Any;

  // PRESENCE (POST {names:[...]}) — `name in globalThis` en el Edge real, el único
  // test fiable dado el objeto-global exótico (ver cabecera).
  let presence: Record<string, boolean> | null = null;
  if (req.method === "POST") {
    try {
      const body = (await req.json()) as { names?: unknown };
      const names = Array.isArray(body.names) ? (body.names as unknown[]) : [];
      presence = {};
      for (const n of names) if (typeof n === "string") presence[n] = n in g;
    } catch {
      presence = null;
    }
  }

  const premises: Record<string, string> = {
    // typeof por globalThis (presence property-side)
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
    // typeof BARE (identificador real, NO globalThis[x]) — desambigua
    // lexical-vs-property: si `in` dice ausente pero el bare dice present → global
    // léxico usable (gate OK); si AMBOS ausentes → hueco real de Vercel Edge.
    // (typeof de un identificador no declarado devuelve "undefined" sin lanzar.)
    barePerformance: typeof performance,
    bareURL: typeof URL,
    bareFetch: typeof fetch,
    bareSetTimeout: typeof setTimeout,
    bareQueueMicrotask: typeof queueMicrotask,
    bareStructuredClone: typeof structuredClone,
    bareTextEncoder: typeof TextEncoder,
    // call/await-if-throws (present-but-throws hazards)
    newURL: tryCall(() => void new g.URL("https://a.b/c")),
    createObjectURLCall: tryCall(() =>
      void g.URL.createObjectURL(new g.Blob(["x"])),
    ),
    revokeCall: tryCall(() => g.URL.revokeObjectURL("blob:x")),
    waCompileCall: await tryAwait(() =>
      g.WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])),
    ),
    fnCtor: tryCall(() => void new Function("return 1")),
    consoleTableCall: tryCall(() => g.console.table([{ a: 1 }])),
    setImmediateCall: tryCall(() => g.setImmediate(() => {})),
  };

  const out = {
    runtime: "vercel-edge",
    vercelRegion: g.process?.env?.VERCEL_REGION ?? null,
    // Enumeración (evidencia del gap): en Vercel Edge ambos salen idénticos y
    // omiten URL/Blob/fetch. Por eso `presence` (vía `in`) es la fuente real.
    ownGlobalThisNames: Object.getOwnPropertyNames(g).sort(),
    globalThisNames: reachableGlobalNames(g),
    presence,
    premises,
  };

  return new Response(JSON.stringify(out, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
