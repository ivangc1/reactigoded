/** GENERADO por scripts/runtime-oracle/gen-probe.mjs desde el catálogo del gate
 * (SAFE_GLOBALS ∪ EDGE_MISSING_GLOBALS). NO editar probe.ts a mano — editar ESTA
 * plantilla (probe.template.ts) y regenerar con `node ../../gen-probe.mjs`.
 *
 * PRESENCE via `typeof <identificador-bare>` — el ÚNICO test fiel en Vercel Edge.
 * El objeto-global es exótico y MIENTE por toda vía indirecta (medido, lhr1):
 *   - getOwnPropertyNames / prototype-walk: 59 nombres, omite URL/Blob/fetch.
 *   - `name in globalThis` (has): false para URL/Blob/fetch/performance…
 *   - `globalThis[name]` (get): resuelve URL/Blob pero NO performance (undefined).
 *   - `typeof <bare>`: performance→object, URL→function… = como resuelve el código.
 * Como el bare exige el identificador LITERAL en el source y Edge bloquea eval, se
 * codegenera un `typeof` por nombre del catálogo (drift-proof).
 *
 * DEPLOY: ver ../README.md. `vercel dev` NO sirve (usa @edge-runtime/vm, el 95%).
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

// WASM.compile es ASYNC (Promise que RECHAZA, no lanza síncronamente): AWAIT.
async function tryAwait(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return "OK";
  } catch (e) {
    const err = e as { constructor?: { name?: string }; message?: string };
    return `THROWS ${err.constructor?.name ?? "Error"}: ${String(err.message)}`;
  }
}

export default async function handler(): Promise<Response> {
  const g = globalThis as Any;

  // PRESENCE — un `typeof <bare>` por nombre del catálogo (generado). El caso
  // `undefined` se fija a true: es primitivo del lenguaje (siempre disponible),
  // pero `typeof undefined === "undefined"` rompería la heurística.
  const presence: Record<string, boolean> = {
    "AbortController": typeof AbortController !== "undefined",
    "AbortSignal": typeof AbortSignal !== "undefined",
    "AggregateError": typeof AggregateError !== "undefined",
    "Array": typeof Array !== "undefined",
    "ArrayBuffer": typeof ArrayBuffer !== "undefined",
    "Atomics": typeof Atomics !== "undefined",
    "BigInt": typeof BigInt !== "undefined",
    "BigInt64Array": typeof BigInt64Array !== "undefined",
    "BigUint64Array": typeof BigUint64Array !== "undefined",
    "Blob": typeof Blob !== "undefined",
    "Boolean": typeof Boolean !== "undefined",
    "BroadcastChannel": typeof BroadcastChannel !== "undefined",
    "ByteLengthQueuingStrategy": typeof ByteLengthQueuingStrategy !== "undefined",
    "CompressionStream": typeof CompressionStream !== "undefined",
    "CountQueuingStrategy": typeof CountQueuingStrategy !== "undefined",
    "Crypto": typeof Crypto !== "undefined",
    "CryptoKey": typeof CryptoKey !== "undefined",
    "CustomEvent": typeof CustomEvent !== "undefined",
    "DOMException": typeof DOMException !== "undefined",
    "DataView": typeof DataView !== "undefined",
    "Date": typeof Date !== "undefined",
    "DecompressionStream": typeof DecompressionStream !== "undefined",
    "Error": typeof Error !== "undefined",
    "EvalError": typeof EvalError !== "undefined",
    "Event": typeof Event !== "undefined",
    "EventTarget": typeof EventTarget !== "undefined",
    "File": typeof File !== "undefined",
    "FinalizationRegistry": typeof FinalizationRegistry !== "undefined",
    "Float32Array": typeof Float32Array !== "undefined",
    "Float64Array": typeof Float64Array !== "undefined",
    "FormData": typeof FormData !== "undefined",
    "Headers": typeof Headers !== "undefined",
    "Infinity": typeof Infinity !== "undefined",
    "Int16Array": typeof Int16Array !== "undefined",
    "Int32Array": typeof Int32Array !== "undefined",
    "Int8Array": typeof Int8Array !== "undefined",
    "Intl": typeof Intl !== "undefined",
    "Iterator": typeof Iterator !== "undefined",
    "JSON": typeof JSON !== "undefined",
    "Map": typeof Map !== "undefined",
    "Math": typeof Math !== "undefined",
    "MessageChannel": typeof MessageChannel !== "undefined",
    "MessageEvent": typeof MessageEvent !== "undefined",
    "MessagePort": typeof MessagePort !== "undefined",
    "NaN": typeof NaN !== "undefined",
    "Navigator": typeof Navigator !== "undefined",
    "Number": typeof Number !== "undefined",
    "Object": typeof Object !== "undefined",
    "Performance": typeof Performance !== "undefined",
    "PerformanceEntry": typeof PerformanceEntry !== "undefined",
    "PerformanceMark": typeof PerformanceMark !== "undefined",
    "PerformanceMeasure": typeof PerformanceMeasure !== "undefined",
    "PerformanceObserver": typeof PerformanceObserver !== "undefined",
    "PerformanceObserverEntryList": typeof PerformanceObserverEntryList !== "undefined",
    "PerformanceResourceTiming": typeof PerformanceResourceTiming !== "undefined",
    "Promise": typeof Promise !== "undefined",
    "Proxy": typeof Proxy !== "undefined",
    "RangeError": typeof RangeError !== "undefined",
    "ReadableByteStreamController": typeof ReadableByteStreamController !== "undefined",
    "ReadableStream": typeof ReadableStream !== "undefined",
    "ReadableStreamBYOBReader": typeof ReadableStreamBYOBReader !== "undefined",
    "ReadableStreamBYOBRequest": typeof ReadableStreamBYOBRequest !== "undefined",
    "ReadableStreamDefaultController": typeof ReadableStreamDefaultController !== "undefined",
    "ReadableStreamDefaultReader": typeof ReadableStreamDefaultReader !== "undefined",
    "ReferenceError": typeof ReferenceError !== "undefined",
    "Reflect": typeof Reflect !== "undefined",
    "RegExp": typeof RegExp !== "undefined",
    "Request": typeof Request !== "undefined",
    "Response": typeof Response !== "undefined",
    "Set": typeof Set !== "undefined",
    "String": typeof String !== "undefined",
    "SubtleCrypto": typeof SubtleCrypto !== "undefined",
    "Symbol": typeof Symbol !== "undefined",
    "SyntaxError": typeof SyntaxError !== "undefined",
    "TextDecoder": typeof TextDecoder !== "undefined",
    "TextDecoderStream": typeof TextDecoderStream !== "undefined",
    "TextEncoder": typeof TextEncoder !== "undefined",
    "TextEncoderStream": typeof TextEncoderStream !== "undefined",
    "TransformStream": typeof TransformStream !== "undefined",
    "TransformStreamDefaultController": typeof TransformStreamDefaultController !== "undefined",
    "TypeError": typeof TypeError !== "undefined",
    "URIError": typeof URIError !== "undefined",
    "URL": typeof URL !== "undefined",
    "URLSearchParams": typeof URLSearchParams !== "undefined",
    "Uint16Array": typeof Uint16Array !== "undefined",
    "Uint32Array": typeof Uint32Array !== "undefined",
    "Uint8Array": typeof Uint8Array !== "undefined",
    "Uint8ClampedArray": typeof Uint8ClampedArray !== "undefined",
    "WeakMap": typeof WeakMap !== "undefined",
    "WeakRef": typeof WeakRef !== "undefined",
    "WeakSet": typeof WeakSet !== "undefined",
    "WebAssembly": typeof WebAssembly !== "undefined",
    "WebSocket": typeof WebSocket !== "undefined",
    "WritableStream": typeof WritableStream !== "undefined",
    "WritableStreamDefaultController": typeof WritableStreamDefaultController !== "undefined",
    "WritableStreamDefaultWriter": typeof WritableStreamDefaultWriter !== "undefined",
    "atob": typeof atob !== "undefined",
    "btoa": typeof btoa !== "undefined",
    "clearInterval": typeof clearInterval !== "undefined",
    "clearTimeout": typeof clearTimeout !== "undefined",
    "console": typeof console !== "undefined",
    "crypto": typeof crypto !== "undefined",
    "decodeURI": typeof decodeURI !== "undefined",
    "decodeURIComponent": typeof decodeURIComponent !== "undefined",
    "encodeURI": typeof encodeURI !== "undefined",
    "encodeURIComponent": typeof encodeURIComponent !== "undefined",
    "escape": typeof escape !== "undefined",
    "fetch": typeof fetch !== "undefined",
    "isFinite": typeof isFinite !== "undefined",
    "isNaN": typeof isNaN !== "undefined",
    "parseFloat": typeof parseFloat !== "undefined",
    "parseInt": typeof parseInt !== "undefined",
    "performance": typeof performance !== "undefined",
    "queueMicrotask": typeof queueMicrotask !== "undefined",
    "setInterval": typeof setInterval !== "undefined",
    "setTimeout": typeof setTimeout !== "undefined",
    "structuredClone": typeof structuredClone !== "undefined",
    "undefined": true, // primitivo del lenguaje; siempre presente (typeof undefined==="undefined")
    "unescape": typeof unescape !== "undefined",
  };

  // Premisas (hazards) medidas con identificadores BARE — como el código real,
  // no vía globalThis[x] (que en Edge diverge, p.ej. globalThis.performance).
  const premises: Record<string, string> = {
    performance: typeof performance,
    eventLoopUtilization:
      typeof performance !== "undefined"
        ? typeof (performance as Any).eventLoopUtilization
        : "no-performance",
    createObjectURL:
      typeof URL !== "undefined" ? typeof URL.createObjectURL : "no-URL",
    consoleTable:
      typeof console !== "undefined" ? typeof (console as Any).table : "no-console",
    waCompile:
      typeof WebAssembly !== "undefined" ? typeof WebAssembly.compile : "no-WA",
    // #18 / codex P2: la doc de Vercel lista `DOMException` como Web Standard API,
    // pero el probe lo midió AUSENTE bare. En ESTE runtime las 3 vías DIVERGEN
    // (medido: `globalThis.performance` es undefined pero bare `performance` da
    // "object"; `URL` resuelve por get aunque `in globalThis` dé false), así que
    // se miden las tres por separado para los 3 de EDGE_MISSING_REAL. El gate
    // decide sobre la REFERENCIA BARE — que es lo que revienta en runtime — no
    // sobre "la API existe por alguna vía".
    domExceptionBare: typeof DOMException,
    domExceptionGet: typeof (globalThis as Any).DOMException,
    domExceptionNewBare: tryCall(() => void new DOMException("x")),
    weakRefBare: typeof WeakRef,
    weakRefGet: typeof (globalThis as Any).WeakRef,
    weakRefNewBare: tryCall(() => void new WeakRef({})),
    finalizationRegistryBare: typeof FinalizationRegistry,
    finalizationRegistryGet: typeof (globalThis as Any).FinalizationRegistry,
    finalizationRegistryNewBare: tryCall(
      () => void new FinalizationRegistry(() => {}),
    ),
    newURL: tryCall(() => void new URL("https://a.b/c")),
    createObjectURLCall: tryCall(() =>
      void (URL as Any).createObjectURL(new Blob(["x"])),
    ),
    revokeCall: tryCall(() => (URL as Any).revokeObjectURL("blob:x")),
    waCompileCall: await tryAwait(() =>
      WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])),
    ),
    fnCtor: tryCall(() => void new Function("return 1")),
    consoleTableCall: tryCall(() => (console as Any).table([{ a: 1 }])),
  };

  const out = {
    runtime: "vercel-edge",
    vercelRegion: g.process?.env?.VERCEL_REGION ?? null,
    // Evidencia del objeto-global exótico: enumeración da ~59 y omite URL/Blob/fetch.
    ownGlobalThisNames: Object.getOwnPropertyNames(g).sort(),
    presence,
    premises,
  };

  return new Response(JSON.stringify(out, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
