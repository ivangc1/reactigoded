// @vitest-environment node
//
// Forzamos environment `node` (no jsdom): este test verifica el
// runtime real de Node. El default `jsdom` del proyecto polyfilla
// `window`, `document`, `localStorage`, etc. — todos darían "existe"
// como global y los asserts de presencia/ausencia serían triviales.
// Bajo `node` el globalThis es el real, exponiendo solo lo que Node
// realmente provee.

/**
 * #150 (reformulado en beta.27 BLOCKER-1): verificación del catálogo
 * server-safe — ahora modelo FAIL-CLOSED (whitelist) `SAFE_GLOBALS` — vs
 * el runtime real de Node.
 *
 * El gate pasó de una DENYLIST (~46 nombres browser-only) a una WHITELIST:
 * acceso bare a cualquier identificador NO resuelto en scope y AUSENTE de
 * `SAFE_GLOBALS` se flaggea. `SAFE_GLOBALS = (ES builtins ∪ globals de
 * Node) − INTENTIONAL_DENY`. Eso invierte la dirección de fallo: un global
 * DOM nuevo se caza solo en vez de pasar silencioso (START-1, cruce A+B).
 *
 * Este test ancla el modelo al engine mínimo y blinda sus invariantes:
 *
 *   A. ENGINE-MIN ANCHOR. Cada nombre de `SAFE_GLOBALS` debe resolver como
 *      binding real en el Node que ejecuta el test. `globals.nodeBuiltin`
 *      puede listar globals añadidos DESPUÉS de Node 22.12.0 (engine
 *      mínimo declarado). Como este test corre en cada celda de la matriz
 *      CI (#151, ubuntu/windows × Node 22.12/24), la celda 22.12 falla si
 *      la whitelist incluye algo que el engine mínimo NO provee — un
 *      consumer en 22.12 recibiría un falso negativo (global tratado como
 *      seguro que en realidad lanza ReferenceError). El anclaje es a 22.12,
 *      no al Node donde corre el dev.
 *
 *   B. DENIAL INVARIANT. Ningún `INTENTIONAL_DENY` está en `SAFE_GLOBALS`.
 *      Las denegaciones (Node los provee pero se flaggean igual) tienen que
 *      ganar siempre — si una se colara en SAFE, reabriría su bypass.
 *
 *   C. BYPASS ANTI-REGRESIÓN. Globals client-only conocidos NO están en
 *      `SAFE_GLOBALS` (siguen flaggeándose). Incluye el START-1 (HTMLElement,
 *      self, CSS) que la denylist de 46 dejaba pasar.
 *
 *   D. STABLE OVERLAP. Los overlaps Node estables documentados (no los
 *      experimentales) SÍ los provee el runtime — documenta por qué se
 *      deniegan a pesar de existir.
 *
 * Codex sugirió la semilla de este gate en el cruce beta.26 (MEDIUM-2);
 * el cruce A+B claudegate6 lo reorientó al modelo fail-closed.
 */
import { describe, it, expect } from "vitest";
import {
  SAFE_GLOBALS,
  INTENTIONAL_DENY,
} from "../../scripts/check-server-safe-markers.mjs";

/** ¿`name` resuelve como binding global en el runtime actual? Usamos `in`
 *  (no `typeof`) porque `typeof globalThis.undefined === "undefined"` daría
 *  un falso "ausente" para el global `undefined`. */
function isRuntimeGlobal(name: string): boolean {
  return name in (globalThis as object);
}

/**
 * Overlaps Node ESTABLES: Node los provee como global y el gate los
 * deniega igual (portabilidad multi-runtime / anti-bypass). Subset de
 * `INTENTIONAL_DENY` que excluye los experimentales (`localStorage`,
 * `sessionStorage`, behind `--experimental-webstorage`) y los eval sinks
 * (`eval`, `Function`, que son builtins ES, no "overlaps Node").
 */
const STABLE_NODE_OVERLAPS = ["globalThis", "process", "Buffer", "navigator"];

/**
 * Globals client-only que DEBEN seguir flaggeándose (ausentes de SAFE).
 * Incluye el START-1 del cruce A+B (HTMLElement, self, CSS, customElements)
 * que la denylist de 46 NO cubría.
 */
const MUST_STAY_FLAGGED = [
  "window",
  "document",
  "HTMLElement",
  "Element",
  "self",
  "CSS",
  "customElements",
  "localStorage",
  "sessionStorage",
  "IntersectionObserver",
  "matchMedia",
  "XMLHttpRequest",
  "DOMParser",
  "Worker",
  // `global`: alias runtime-equivalente de `globalThis` en Node. Si entra en
  // SAFE (vía `globals.nodeBuiltin`) reabre el bypass dynamic-eval +
  // `global.process.env`. Cruce A+B, FN-hunt.
  "global",
  // `setImmediate`/`clearImmediate`: Node-only, no Web-standard. Stub que lanza
  // en Vercel Edge. Denegados por el stance edge-baseline (workflow honest-
  // construct). Los otros deferred-timers (setTimeout/setInterval/
  // queueMicrotask) SÍ son web-standard y SÍ están en SAFE.
  "setImmediate",
  "clearImmediate",
];

/**
 * Contenido EXACTO esperado de `SAFE_GLOBALS` (120 nombres, ordenados). Es
 * un PIN del contrato: cualquier cambio en el set (bump de `globals`,
 * denegación nueva, overclaim) debe actualizar esta lista CONSCIENTEMENTE.
 * Sin el pin, un minor bump de `globals` (`^17.6.0`) podría añadir un nombre
 * floor-present pero client-unsafe sin que los Tests A/B/C lo cacen (Test A
 * solo caza nombres ausentes del runtime, no los presentes-pero-unsafe).
 * Cruce A+B claudegate6, robustez del freeze.
 */
const SAFE_GLOBALS_PIN = [
  "AbortController", "AbortSignal", "AggregateError", "Array", "ArrayBuffer", "Atomics",
  "BigInt", "BigInt64Array", "BigUint64Array", "Blob", "Boolean", "BroadcastChannel",
  "ByteLengthQueuingStrategy", "CompressionStream", "CountQueuingStrategy", "Crypto", "CryptoKey", "CustomEvent",
  "DOMException", "DataView", "Date", "DecompressionStream", "Error", "EvalError",
  "Event", "EventTarget", "File", "FinalizationRegistry", "Float32Array", "Float64Array",
  "FormData", "Headers", "Infinity", "Int16Array", "Int32Array", "Int8Array",
  "Intl", "Iterator", "JSON", "Map", "Math", "MessageChannel",
  "MessageEvent", "MessagePort", "NaN", "Navigator", "Number", "Object",
  "Performance", "PerformanceEntry", "PerformanceMark", "PerformanceMeasure", "PerformanceObserver", "PerformanceObserverEntryList",
  "PerformanceResourceTiming", "Promise", "Proxy", "RangeError", "ReadableByteStreamController", "ReadableStream",
  "ReadableStreamBYOBReader", "ReadableStreamBYOBRequest", "ReadableStreamDefaultController", "ReadableStreamDefaultReader", "ReferenceError", "Reflect",
  "RegExp", "Request", "Response", "Set", "SharedArrayBuffer", "String",
  "SubtleCrypto", "Symbol", "SyntaxError", "TextDecoder", "TextDecoderStream", "TextEncoder",
  "TextEncoderStream", "TransformStream", "TransformStreamDefaultController", "TypeError", "URIError", "URL",
  "URLSearchParams", "Uint16Array", "Uint32Array", "Uint8Array", "Uint8ClampedArray", "WeakMap",
  "WeakRef", "WeakSet", "WebAssembly", "WebSocket", "WritableStream", "WritableStreamDefaultController",
  "WritableStreamDefaultWriter", "atob", "btoa", "clearInterval", "clearTimeout", "console",
  "crypto", "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent", "escape",
  "fetch", "isFinite", "isNaN", "parseFloat", "parseInt", "performance",
  "queueMicrotask", "setInterval", "setTimeout", "structuredClone", "undefined", "unescape",
];

/**
 * Overclaims de `globals`: nombres que `globals@17.x` lista pero Node 22.12
 * (engine floor) NO provee. Deben estar restados de SAFE_GLOBALS — si no, un
 * componente que los referencie bare petaría en un consumer sobre el floor.
 */
const GLOBALS_OVERCLAIMS = [
  "AsyncDisposableStack",
  "CloseEvent",
  "DisposableStack",
  "ErrorEvent",
  "Float16Array",
  "Storage",
  "SuppressedError",
  "URLPattern",
];

describe("SAFE_GLOBALS whitelist vs Node runtime (#150, fail-closed)", () => {
  it("A. cada SAFE_GLOBAL resuelve en el Node actual (engine-min anchor)", () => {
    const absent: string[] = [];
    for (const name of SAFE_GLOBALS) {
      if (!isRuntimeGlobal(name)) absent.push(name);
    }
    // En la celda Node 22.12 de la matriz CI, cualquier nombre listado por
    // `globals` pero ausente en el engine mínimo aparece aquí → forzamos
    // reclasificación antes de tagear.
    expect(absent).toEqual([]);
  });

  it("B. ningún INTENTIONAL_DENY está en SAFE_GLOBALS (denials ganan)", () => {
    const leaked: string[] = [];
    for (const name of INTENTIONAL_DENY) {
      if (SAFE_GLOBALS.has(name)) leaked.push(name);
    }
    expect(leaked).toEqual([]);
  });

  it("C. globals client-only conocidos NO están en SAFE (anti-regresión bypass)", () => {
    const leaked = MUST_STAY_FLAGGED.filter((name) => SAFE_GLOBALS.has(name));
    expect(leaked).toEqual([]);
  });

  it("D. Node provee los overlaps estables documentados", () => {
    // Si una versión soportada deja de proveer alguno (p.ej. `Buffer`
    // deprecation en una release futura), el set debería simplificarse —
    // quitar el entry de INTENTIONAL_DENY y del comment del catálogo.
    const missing = STABLE_NODE_OVERLAPS.filter(
      (name) => !isRuntimeGlobal(name),
    );
    expect(missing).toEqual([]);
    // Y todos siguen siendo denegaciones intencionales (no se borraron).
    const undocumented = STABLE_NODE_OVERLAPS.filter(
      (name) => !INTENTIONAL_DENY.has(name),
    );
    expect(undocumented).toEqual([]);
  });

  it("E. SAFE_GLOBALS coincide EXACTAMENTE con el pin del contrato", () => {
    // Pin de contenido: si `globals` (bump) o las denegaciones cambian el
    // set, este test falla y obliga a revisar conscientemente. Caza el caso
    // que Test A no ve: un nombre AÑADIDO que SÍ existe en el floor pero es
    // client-unsafe (p.ej. una Web API que Node estabiliza pero que rompe en
    // Workers/Deno). En ese caso, decidir: ¿añadir a INTENTIONAL_DENY o
    // aceptar en el pin?
    expect([...SAFE_GLOBALS].sort()).toEqual([...SAFE_GLOBALS_PIN].sort());
  });

  it("F. los GLOBALS_OVERCLAIMS están restados de SAFE_GLOBALS", () => {
    // Invariante directo (no solo el indirecto de Test A en la celda 22.12):
    // los nombres que el floor no provee no deben estar en la whitelist.
    const leaked = GLOBALS_OVERCLAIMS.filter((name) => SAFE_GLOBALS.has(name));
    expect(leaked).toEqual([]);
  });
});
