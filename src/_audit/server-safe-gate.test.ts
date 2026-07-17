/**
 * server-safe-gate.test.ts — beta.25 BLOCKER 4.
 *
 * El gate `scripts/check-server-safe-markers.mjs` se hardenizó en
 * beta.25 con:
 *   - CLIENT_GLOBALS ampliado (~15 globales browser-only nuevos:
 *     localStorage, screen, IntersectionObserver, etc.).
 *   - DYNAMIC_EVAL_SINKS nuevo (eval, Function) para cazar bypasses
 *     que evalúan código desde string en runtime.
 *
 * Este test valida con fixtures **negativos** que cada bypass conocido
 * es cazado. Si una regresión rebaja el gate (e.g., quita Function de
 * DYNAMIC_EVAL_SINKS), aquí salta.
 *
 * Convención: cada fixture es un componente sintético con marker
 * `@server-safe` y un patrón problemático. La aserción es siempre
 * `violations.length > 0` (no exigimos un count exacto porque la
 * sintaxis puede generar más de un hit por patrón — ej. doble accept
 * en property + identifier).
 */
import { describe, it, expect } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import ts from "typescript";
import { transformSync } from "esbuild";
import {
  SAFE_GLOBALS,
  INTENTIONAL_DENY,
  EDGE_MISSING_GLOBALS,
  DYNAMIC_EVAL_SINKS,
  checkSourceFile,
  checkFileWithImports,
  resolveImportPath,
  discoverServerSafeSourceFiles,
  isContentServerSafeMarked,
  markerNearMissLines,
} from "../../scripts/check-server-safe-markers.mjs";

/**
 * Diagnostic codes que tsc emite al type-chequear `src` aislado (con lib.dom,
 * como el build). Usado por el invariante de capa: ciertos bypasses NO son del
 * gate porque tsc los rechaza ANTES. Pincha esa dependencia en CI.
 */
function tscDiagnosticCodes(src: string, strict = true): number[] {
  const fileName = "layer-probe.tsx";
  const sf = ts.createSourceFile(
    fileName,
    src,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TSX,
  );
  const host = ts.createCompilerHost({});
  const orig = host.getSourceFile.bind(host);
  host.getSourceFile = (name, ...rest) =>
    name === fileName ? sf : orig(name, ...rest);
  const program = ts.createProgram([fileName], {
    strict,
    noEmit: true,
    jsx: ts.JsxEmit.Preserve,
    target: ts.ScriptTarget.ES2022,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
  }, host);
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file && d.file.fileName === fileName)
    .map((d) => d.code);
}

function fixture(body: string): string {
  return `
/** @server-safe */
export function Probe() {
  ${body}
  return null;
}
`;
}

describe("server-safe gate — CLIENT_GLOBALS catálogo ampliado (beta.25)", () => {
  it.each([
    ["localStorage", `const x = localStorage.getItem("k");`],
    ["sessionStorage", `const x = sessionStorage.length;`],
    ["location", `const u = location.href;`],
    ["history", `history.back();`],
    ["screen", `const w = screen.width;`],
    ["IntersectionObserver", `const io = new IntersectionObserver(() => {});`],
    ["ResizeObserver", `const ro = new ResizeObserver(() => {});`],
    ["MutationObserver", `const mo = new MutationObserver(() => {});`],
    ["XMLHttpRequest", `const xhr = new XMLHttpRequest();`],
    ["indexedDB", `const r = indexedDB.open("db");`],
    ["caches", `caches.open("v1");`],
    ["FileReader", `const r = new FileReader();`],
    ["getComputedStyle", `const s = getComputedStyle(document.body);`],
    ["getSelection", `const s = getSelection();`],
    ["matchMedia", `const m = matchMedia("(prefers-color-scheme: dark)");`],
    ["scrollTo", `scrollTo(0, 0);`],
    ["scrollBy", `scrollBy(0, 10);`],
    ["alert", `alert("hi");`],
    ["confirm", `confirm("ok?");`],
    ["prompt", `prompt("name?");`],
    ["print", `print();`],
    ["open", `open("/docs");`],
    ["close", `close();`],
    ["EventSource", `const es = new EventSource("/events");`],
    ["Notification", `new Notification("hi");`],
    ["visualViewport", `const h = visualViewport.height;`],
    ["Animation", `const a = new Animation();`],
    ["KeyframeEffect", `const k = new KeyframeEffect(document.body, []);`],
    ["DOMParser", `const p = new DOMParser();`],
    ["XPathEvaluator", `const x = new XPathEvaluator();`],
    ["Image", `const img = new Image();`],
    ["Audio", `const audio = new Audio();`],
    ["Worker", `const worker = new Worker("/worker.js");`],
    ["SharedWorker", `const worker = new SharedWorker("/worker.js");`],
    ["customElements", `customElements.define("x-probe", class extends HTMLElement {});`],
    ["speechSynthesis", `speechSynthesis.cancel();`],
  ])(
    "caza acceso bare a `%s` en render path",
    (api, body) => {
      const violations = checkSourceFile(fixture(body), `${api}.fixture.tsx`);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some((v) => v.detail.includes(api))).toBe(true);
    },
  );

  it("SAFE_GLOBALS (fail-closed) NO incluye browser globals conocidos", () => {
    // Modelo whitelist (beta.27 BLOCKER-1): un nombre AUSENTE de
    // SAFE_GLOBALS es lo que lo hace flaggeable. Estos browser-only no
    // deben colarse en el safe-set — si lo hicieran, reabrirían su bypass.
    for (const name of [
      "localStorage",
      "screen",
      "matchMedia",
      "DOMParser",
      "Worker",
      "IntersectionObserver",
      "window",
      "document",
    ]) {
      expect(SAFE_GLOBALS.has(name)).toBe(false);
    }
  });
});

/**
 * #164: navigator wholesale denylist. `navigator` es uno de los 4
 * entries del catálogo original (beta.24) que TAMBIÉN existen como
 * global en Node 22.12+ (Node lo añadió en v21). El gate lo flaggea
 * AUNQUE Node lo provea, por la asimetría documentada en el comment
 * del catálogo (`scripts/check-server-safe-markers.mjs`, post-#150):
 *
 *   "navigator: añadido a Node en v21 (Node 22.12+ lo provee), pero
 *   su forma es un SUBSET del browser navigator (no geolocation, no
 *   mediaDevices, sí userAgent/language). Semántica inestable entre
 *   runtimes (browser vs Node vs Workers) → gate fuerza guard
 *   explícito o evitar la API en `@server-safe`."
 *
 * Antes de este bloque, navigator estaba en CLIENT_GLOBALS desde día
 * 1 pero CERO fixtures del audit lo probaban. Si una regresión sacara
 * `navigator` del set (consciente o accidentalmente), nada saltaba.
 * Este bloque cierra el cabo: el catálogo Y la decisión wholesale Y
 * el test que la blinda están alineados.
 *
 * Wholesale = todas las formas de acceso son flag-eadas, sin allowlist
 * por property name. Razón: allowlistar `navigator.userAgent` y bloquear
 * `navigator.geolocation` requiere mantenimiento N×M (cada nueva web
 * API en Node potencialmente añade allowlist entries), y la ergonomía
 * del consumer en `@server-safe` no justifica el coste — la
 * alternativa segura (`typeof navigator !== "undefined" && navigator.X`)
 * funciona en todos los runtimes sin cambios.
 */
describe("server-safe gate — navigator wholesale denylist (#164 beta.27)", () => {
  it.each([
    // APIs que existen en BROWSER + NODE (subset compartido).
    ["userAgent", `const ua = navigator.userAgent;`],
    ["language", `const lang = navigator.language;`],
    ["languages", `const langs = navigator.languages;`],
    // APIs browser-only (no en Node).
    ["geolocation", `const g = navigator.geolocation;`],
    ["mediaDevices", `const md = navigator.mediaDevices;`],
    ["clipboard", `const c = navigator.clipboard;`],
    ["serviceWorker", `const sw = navigator.serviceWorker;`],
    // Cualquier chained access — la regla es wholesale.
    [
      "userAgent.includes",
      `const isChrome = navigator.userAgent.includes("Chrome");`,
    ],
  ])(
    "caza `navigator.%s` wholesale (sin allowlist por property name)",
    (property, body) => {
      const violations = checkSourceFile(
        fixture(body),
        `navigator-${property}.fixture.tsx`,
      );
      expect(violations.length).toBeGreaterThan(0);
      // El detail referencia `navigator`, no la property específica —
      // confirma que es el global el que dispara, no un per-property
      // allowlist mismatched.
      expect(violations.some((v) => v.detail.includes("navigator"))).toBe(true);
    },
  );

  it("caza referencia bare a `navigator` (sin property access)", () => {
    const body = `const n = navigator; void n;`;
    const violations = checkSourceFile(
      fixture(body),
      "navigator-bare.fixture.tsx",
    );
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.detail.includes("navigator"))).toBe(true);
  });

  it("`navigator` es denegación intencional (anti-regresión del wholesale denylist)", () => {
    // En el modelo fail-closed `navigator` lo provee Node 22.12+ pero se
    // deniega igual (subset inestable entre runtimes). Vive en
    // INTENTIONAL_DENY y por tanto está EXCLUIDO de SAFE_GLOBALS. Junto con
    // `src/__tests__/server-safe-catalog-vs-node.test.ts` (#150, Test B:
    // INTENTIONAL_DENY ∩ SAFE = ∅), el invariante queda blindado por dos
    // lados.
    expect(INTENTIONAL_DENY.has("navigator")).toBe(true);
    expect(SAFE_GLOBALS.has("navigator")).toBe(false);
  });
});

/**
 * EDGE-MISSING (codex P1 + #190): globals que Node provee pero el runtime Edge
 * más estricto (Vercel Edge sin nodejs_compat) NO expone — un read bare lanza
 * ReferenceError ahí. SAFE = (builtin ∪ nodeBuiltin) ∩ edgeGlobalThis; estos
 * quedan FUERA. Los edge-available (TextEncoder, URL, streams, structuredClone…)
 * siguen clean (no over-subtract). Invariante de catálogo en #150 Test F.
 */
describe("server-safe gate — Edge-missing Node globals (codex P1, baseline edge)", () => {
  it.each([
    ["BroadcastChannel", `const x = BroadcastChannel; void x;`],
    ["new MessageChannel()", `const c = new MessageChannel(); void c;`],
    ["MessagePort", `const p: typeof MessagePort = MessagePort; void p;`],
    ["Navigator", `const n = Navigator; void n;`],
    ["PerformanceObserver", `const o = new PerformanceObserver(() => {}); void o;`],
    ["CompressionStream", `const s = new CompressionStream("gzip"); void s;`],
    ["CustomEvent", `const e = new CustomEvent("x"); void e;`],
  ])("FLAGGEA el global Edge-missing: %s", (_label, body) => {
    const v = checkSourceFile(fixture(body), "edge-missing.fixture.tsx");
    expect(v.length).toBeGreaterThan(0);
  });

  it.each([
    ["TextEncoder", `const x = new TextEncoder(); void x;`],
    ["URL", `const u = new URL("http://x"); void u;`],
    ["ReadableStream", `const r = new ReadableStream(); void r;`],
    ["structuredClone", `const c = structuredClone({}); void c;`],
    ["fetch", `const f = fetch; void f;`],
    ["crypto.subtle", `const s = crypto.subtle; void s;`],
  ])("edge-available sigue clean (no over-subtract): %s", (_label, body) => {
    expect(checkSourceFile(fixture(body), "edge-ok.fixture.tsx")).toEqual([]);
  });

  it("EDGE_MISSING está excluido de SAFE_GLOBALS", () => {
    const leaked = [...EDGE_MISSING_GLOBALS].filter((n) => SAFE_GLOBALS.has(n));
    expect(leaked).toEqual([]);
    expect(EDGE_MISSING_GLOBALS.has("BroadcastChannel")).toBe(true);
  });
});

describe("server-safe gate — DYNAMIC_EVAL_SINKS (eval / Function bypasses)", () => {
  it("caza `eval(...)` directo", () => {
    const v = checkSourceFile(
      fixture(`eval("window.foo");`),
      "eval-direct.fixture.tsx",
    );
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((it) => it.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it("caza `Function(...)` constructor sin new", () => {
    const v = checkSourceFile(
      fixture(`const f = Function("return window")();`),
      "Function-call.fixture.tsx",
    );
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((it) => it.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it("caza `new Function(...)` constructor", () => {
    const v = checkSourceFile(
      fixture(`const f = new Function("return window");`),
      "new-Function.fixture.tsx",
    );
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((it) => it.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  // deepest re-hunt: el string-handler de los timers es eval implícito del navegador; en
  // Node lanza TypeError (no soportado) → crash SSR. El gate cazaba eval/Function pero no el
  // string-timer (timer en SAFE_GLOBALS, 1er-arg no inspeccionado).
  it.each([
    ['setTimeout("código", 0)', `setTimeout("window.scrollTo(0,0)", 0);`],
    ['setInterval("código", n)', `setInterval("window.x = 1", 100);`],
    ['globalThis.setTimeout("código")', `globalThis.setTimeout("eval me", 0);`],
    ["setTimeout(`template`, 0)", "setTimeout(`window.x`, 0);"],
    // codex P2: el callee se desenvuelve value-transparente (coma/erased).
    ['(0, setTimeout)("código", 0)', `(0, setTimeout)("window.x", 0);`],
    ['(setTimeout as any)("código", 0)', `(setTimeout as any)("window.x", 0);`],
    // codex P2 (2561d6b): ALIAS sintáctico del timer global. El timer está en SAFE_GLOBALS → su
    // read no flaggea aguas arriba (≠ eval) → sin resolver el alias sería fail-open.
    ['alias const later=setTimeout; later("código")', `const later = setTimeout; later("window.x", 0);`],
    ['alias cadena a=setTimeout,b=a; b("código")', `const a = setTimeout; const b = a; b("window.x", 0);`],
    ['alias later=globalThis.setInterval; later("código")', `const later = globalThis.setInterval; later("window.x", 0);`],
    ['alias por assignment later=setTimeout; later("código")', `let later: any; later = setTimeout; later("window.x", 0);`],
    ['alias comma-wrapped (0,later)("código")', `const later = setTimeout; (0, later)("window.x", 0);`],
    // codex P2 (ab77e8c): el shadow del nombre-timer debe ser SCOPE-AWARE — un `setTimeout` local
    // en un scope HERMANO/interno NO oculta un alias del global real declarado fuera de ese scope.
    ['alias global pese a wrapper en bloque hermano', `const later = setTimeout; { const setTimeout = (s: string) => s; void setTimeout; } later("window.x", 0);`],
    // codex P2 (ead1ad5): Function.prototype.{call,apply} sobre el timer — el read del timer es
    // SAFE → no se caza aguas arriba; sin esto `setTimeout.call(null,"c")` bypassea.
    ['setTimeout.call(null, "código")', `setTimeout.call(null, "window.x", 0);`],
    ['setInterval.call(null, "código")', `setInterval.call(null, "window.x", 0);`],
    ['setTimeout.apply(null, ["código"])', `setTimeout.apply(null, ["window.x", 0]);`],
    ['globalThis.setTimeout.call(null, "código")', `globalThis.setTimeout.call(null, "window.x", 0);`],
    ['alias later.call(null, "código")', `const later = setTimeout; later.call(null, "window.x", 0);`],
    ['alias later.apply(null, ["código"])', `const later = setTimeout; later.apply(null, ["window.x", 0]);`],
    // codex P2 (b22a600, #133): `.bind` es otro wrapper de Function.prototype — el handler queda
    // PRE-bindeado en arguments[1] y al invocar la fn ligada llama setTimeout(handler,…).
    ['setTimeout.bind(null, "código", 0)()', `setTimeout.bind(null, "window.x", 0)();`],
    ['setInterval.bind(null, "código")()', `setInterval.bind(null, "window.x")();`],
    ['alias later.bind(null, "código")()', `const later = setTimeout; later.bind(null, "window.x", 0)();`],
    ['bind almacenado (fail-closed)', `const b = setTimeout.bind(null, "window.x"); void b;`],
    // codex P2 (2870236, #133): BIND-only — `.bind(null)` sin handler bindeado; el string llega en
    // la llamada externa. La fn ligada sigue siendo un timer.
    ['bind-only setTimeout.bind(null)("código")', `setTimeout.bind(null)("window.x", 0);`],
    ['bind-only alias fn=setTimeout.bind(null); fn("código")', `const fn = setTimeout.bind(null); fn("window.x");`],
    // codex P2 (2870236, #133): alias de timer por DESTRUCTURING / array-index.
    ['array-destr const [later]=[setTimeout]', `const [later] = [setTimeout]; later("window.x", 0);`],
    ['array-index const later=[setTimeout][0]', `const later = [setTimeout][0]; later("window.x", 0);`],
    ['obj-destr const {a:later}={a:setTimeout}', `const { a: later } = { a: setTimeout }; later("window.x", 0);`],
    ['obj-default const {later=setTimeout}={}', `const { later = setTimeout } = {} as any; (later as any)("window.x", 0);`],
    // codex P2 (59afad2, #133): alias por ASSIGNMENT-destructuring (object necesita paréntesis).
    ['assign ({later}={later:setTimeout})', `let later: any; ({ later } = { later: setTimeout }); later("window.x", 0);`],
    ['assign ({a:later}={a:setTimeout})', `let later: any; ({ a: later } = { a: setTimeout }); later("window.x", 0);`],
    ['assign [later]=[setTimeout]', `let later: any; [later] = [setTimeout]; later("window.x", 0);`],
    // codex P2 (a94f607, #133): cadena de alias en el MISMO statement (left-to-right).
    ['chain const a=setTimeout, b=a; b(str)', `const a = setTimeout, b = a; b("window.x", 0);`],
    ['chain const a=setTimeout, b=a, c=b; c(str)', `const a = setTimeout, b = a, c = b; c("window.x", 0);`],
    // codex P2 (f32a946, #133): alias declarado en el HEADER de un for (el body corre en server).
    ['for(const later=setTimeout;;){later(str);break}', `for (const later = setTimeout; ; ) { later("window.x", 0); break; }`],
    ['for(const a=setTimeout, b=a;;){b(str);break}', `for (const a = setTimeout, b = a; ; ) { b("window.x", 0); break; }`],
    // codex P2 (2601bf6, #133): alias usado en un declarador POSTERIOR del mismo statement.
    ['const later=setTimeout, id=later(str)', `const later = setTimeout, id = later("window.x", 0); void id;`],
    // codex P2: var en el for-header (visible en el body por hoisting).
    ['for(var later=setTimeout;;){later(str);break}', `for (var later = setTimeout; ; ) { later("window.x", 0); break; }`],
    // codex P2: default renombrado en assignment-destructuring.
    ['({x:later=setTimeout}={}); later(str)', `let later: any; ({ x: later = setTimeout } = {} as any); later("window.x", 0);`],
    // codex P2 (c2eec1a, #133): key COMPUTADA value-transparente + default de array-assignment.
    ['const {["t"]:later}={t:setTimeout}; later(str)', `const { ["t"]: later } = { t: setTimeout } as any; later("window.x", 0);`],
    ['[later=setTimeout]=[]; later(str)', `let later: any; [later = setTimeout] = [] as any; later("window.x", 0);`],
    // codex P2 / §141 (7350d2c, #133): assignment-EXPRESSION embebida en operadores value-transparentes
    // (`=` dentro de `&&`/`,`/`||`/`??`/`?:`) — root intacto + operadores ya ratificados = lado CAZAR.
    ['embedded && (later=setTimeout) && later(str)', `let later: any; void ((later = setTimeout) && later("window.x", 0));`],
    ['embedded comma (later=setTimeout, later(str))', `let later: any; void ((later = setTimeout, later("window.x", 0)));`],
    ['embedded || (later=setTimeout) || later(str)', `let later: any; void ((later = setTimeout) || later("window.x", 0));`],
    ['embedded ?: c?(later=setTimeout)&&later(str):0', `let later: any; const c = (globalThis as any).c; void (c ? ((later = setTimeout) && later("window.x", 0)) : 0);`],
    // codex P2 (3f27e0c, #133): assignment embebida en el CALLEE (se evalúa antes del sink-check del call).
    ['embedded en callee ((later=setTimeout), later)(str)', `let later: any; void (((later = setTimeout), later)("window.x", 0));`],
    ['embedded en callee ((later=setTimeout) && later)(str)', `let later: any; void (((later = setTimeout) && later)("window.x", 0));`],
    // codex P2 (eb9d71c, #133): cadena de aliases embebidos en la MISMA expresión (left-to-right).
    ['chain embebida (later=setTimeout, a=later, a)(str)', `let later: any; let a: any; void ((later = setTimeout, a = later, a)("window.x", 0));`],
    // codex P2 (069d4c8, #133): assignment embebida en un expr-statement PERSISTE a statements
    // posteriores (la asignación ya ejecutó).
    ['cross-stmt (later=setTimeout, 0); later(str)', `let later: any; (later = setTimeout, 0); later("window.x", 0);`],
    ['cross-stmt (later=setTimeout) && 0; later(str)', `let later: any; (later = setTimeout) && 0; later("window.x", 0);`],
    // codex P2 (9d5ba3a, #133, exhaustive): import-equals alias / embedded en declarador / for-init expr.
    ['import-equals later=setTimeout; later(str)', `import later = setTimeout; later("window.x", 0);`],
    ['declarador const _=(later=setTimeout), id=later(str)', `let later: any; const _ = (later = setTimeout), id = later("window.x", 0); void _; void id;`],
    ['for-init expr (later=setTimeout; later(str);)', `let later: any; for (later = setTimeout; later("window.x", 0); ) { break; }`],
    // codex P2 (9abe984, #133): handler vía SPREAD de array-literal.
    ['spread setTimeout(...["código", 0])', `setTimeout(...["window.x", 0]);`],
    ['spread alias later(...["código"])', `const later = setTimeout; later(...["window.x"]);`],
    // codex P2 (3b7b6ba, #133): spread en .call/.bind + Reflect.apply.
    ['spread setTimeout.call(...[null, "código"])', `setTimeout.call(...[null, "window.x"]);`],
    ['spread setTimeout.bind(...[null, "código"])()', `(setTimeout.bind(...[null, "window.x"]))();`],
    ['Reflect.apply(setTimeout, undefined, ["código"])', `Reflect.apply(setTimeout, undefined, ["window.x"]);`],
    ['Reflect.apply(alias, u, ["código"])', `const later = setTimeout; Reflect.apply(later, undefined, ["window.x"]);`],
    // codex P2 (5eee12d, #133): spread DENTRO del array de apply + callee array-indexado.
    ['setTimeout.apply(null, [...["código"]])', `setTimeout.apply(null, [...["window.x"]]);`],
    ['Reflect.apply(setTimeout, u, [...["código"]])', `Reflect.apply(setTimeout, undefined, [...["window.x"]]);`],
    ['array-indexed callee [setTimeout][0]("código")', `[setTimeout][0]("window.x", 0);`],
    // codex P2 (c23f5a7, #133): ALTERNATIVAS value-transparentes de array-literal en el spread.
    ['spread alt setTimeout(...(c?["a",0]:["b",0]))', `const c = (0 as unknown as boolean); setTimeout(...(c ? ["window.x", 0] : ["document.y", 0]));`],
    ['spread alt .call(...(c?[null,"a"]:[null,"b"]))', `const c = (0 as unknown as boolean); setTimeout.call(...(c ? [null, "window.x"] : [null, "document.y"]));`],
    ['alt .apply(null, c?["a"]:["b"])', `const c = (0 as unknown as boolean); setTimeout.apply(null, c ? ["window.x"] : ["document.y"]);`],
    ['alt one-branch-string c?["a"]:[fn]', `const c = (0 as unknown as boolean); setTimeout(...(c ? ["window.x"] : [() => {}]));`],
    // codex P2 (0e1467a, #133): ramas de spread de LONGITUD DISTINTA desplazan los args trailing.
    ['diff-len ...(c?[]:[fn]), "código"', `const c = (0 as unknown as boolean); setTimeout(...(c ? [] : [() => {}]), "window.x");`],
    ['diff-len apply inner-spread [...(c?[]:[fn]), "código"]', `const c = (0 as unknown as boolean); setTimeout.apply(null, [...(c ? [] : [() => {}]), "window.x"]);`],
    // codex P2 (4823f3a, #133): el modelo de candidatos branch-aware en TODAS las posiciones.
    ['nested inner-spread setTimeout(...[...(c?["x"]:[])])', `const c = (0 as unknown as boolean); setTimeout(...[...(c ? ["window.x"] : [])]);`],
    ['cond-spread .apply(...(c?[null,["x"]]:[]))', `const c = (0 as unknown as boolean); setTimeout.apply(...(c ? [null, ["window.x"]] : []));`],
    ['cond-spread Reflect.apply(...(c?[setTimeout,u,["x"]]:[]))', `const c = (0 as unknown as boolean); Reflect.apply(...(c ? [setTimeout, undefined, ["window.x"]] : []));`],
    // codex P2 (d4dfdd0, #133): receiver VALUE-TRANSPARENTE del timer.
    ['VT receiver (0, globalThis).setTimeout("x")', `(0, globalThis).setTimeout("window.x", 0);`],
    ['VT receiver (c?window:self).setTimeout("x")', `const c = (0 as unknown as boolean); (c ? window : self).setTimeout("window.x", 0);`],
    // codex P2 (3e1b30e, #133): VT receiver vía ALIAS / .call / .bind (exprIsTimerValued, paridad).
    ['VT receiver alias const l=(0,globalThis).setTimeout; l("x")', `const l = (0, globalThis).setTimeout; l("window.x", 0);`],
    ['VT receiver .call ((0,globalThis).setTimeout).call(null,"x")', `((0, globalThis).setTimeout).call(null, "window.x");`],
    // codex P2 (372903e, #133): base de proyección [X][i] value-transparente.
    ['VT projection base (c?[setTimeout]:[setTimeout])[0]("x")', `const c = (0 as unknown as boolean); (c ? [setTimeout] : [setTimeout])[0]("window.x", 0);`],
    // codex P2 (7614b51, #133): VT Reflect.apply receiver + alternativas de literal en alias estructural.
    ['VT Reflect.apply receiver (0,Reflect).apply(setTimeout,null,["x"])', `(0, Reflect).apply(setTimeout, null, ["window.x"]);`],
    ['literal-alt alias const {l}=c?{l:setTimeout}:{l:setInterval}; l("x")', `const c = (0 as unknown as boolean); const { l } = c ? { l: setTimeout } : { l: setInterval }; l("window.x", 0);`],
    // codex P2 (79b8fc1, #133): keys con ALTERNATIVAS + for-of pattern default.
    ['computed-key alt const {[c?"l":"n"]:l}={l:setTimeout,n:fn}; l("x")', `const c = (0 as unknown as boolean); const { [c ? "l" : "n"]: l } = { l: setTimeout, n: () => {} } as any; l("window.x", 0);`],
    ['for-of pattern default for ({l=setTimeout} of rows){ l("x") }', `let l: any; for ({ l = setTimeout } of [] as any[]) { l("window.x", 0); }`],
  ])("caza el string-handler de timer como eval-sink: %s", (_label, body) => {
    const v = checkSourceFile(fixture(body), "str-timer.fixture.tsx");
    expect(v.some((it) => it.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  // codex P2 (3b97676/d4dfdd0, #133): DEFAULT de PARÁMETRO o de binding-element que aliasa un timer.
  it.each([
    ["param default function run(later=setTimeout)", `export function run(later: any = setTimeout){ return later("window.x", 0); }`],
    ["param default threaded run(a=setTimeout, b=a)", `export function run(a: any = setTimeout, b: any = a){ void a; return b("window.x", 0); }`],
    ["binding-element default run({later=setTimeout})", `export function run({ later = setTimeout }: any){ return later("window.x", 0); }`],
    // codex P2 (7614b51, #133): CATCH-pattern default que aliasa un timer.
    ["catch ({later=setTimeout}){ later(str) }", `export function run(){ try {} catch ({ later = setTimeout }: any) { return later("window.x", 0); } }`],
  ])("caza el timer aliasado por un DEFAULT de parámetro: %s", (_l, body) => {
    const v = checkSourceFile(`/** @server-safe */\n${body}`, "param-timer.fixture.tsx");
    expect(v.some((it) => it.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it("NO flaggea setTimeout con callback función (no string)", () => {
    const v = checkSourceFile(fixture(`setTimeout(() => { let n = 0; n += 1; void n; }, 0);`), "fn-timer.fixture.tsx");
    expect(v).toEqual([]);
  });

  // §141 BOUNDARY del assignment-alias embebido: el set value-transparente EXCLUYE calls/IIFE — un
  // RHS que exige evaluar un call es data-flow → RESIDUAL (no flag). Y un eval-sink embebido sigue
  // cazándose por su propio path (el read de `Function`), no exento por el reconocimiento de alias.
  it("NO flaggea (residual): el RHS de la asignación embebida atraviesa un call", () => {
    const code = `/** @server-safe */\nexport function f() { let x: any; return (x = (() => setTimeout)()) && x("window.x", 0); }`;
    expect(checkSourceFile(code, "embed-residual.fixture.tsx")).toEqual([]);
  });

  it("SÍ flaggea un eval-sink embebido `(F = Function) && F(...)()` (por el read de Function)", () => {
    const code = `/** @server-safe */\nexport function f() { let F: any; return (F = Function) && F("return 1")(); }`;
    expect(checkSourceFile(code, "embed-evalsink.fixture.tsx").some((x) => x.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it("NO flaggea una asignación embebida que NO es un root (sin timer/partial)", () => {
    const code = `/** @server-safe */\nexport function f() { let x: any; const y: any = (s: string) => s; return (x = 1) && y("s"); }`;
    expect(checkSourceFile(code, "embed-fp.fixture.tsx")).toEqual([]);
  });

  // codex P2 (review genérico): import.meta es un namespace host/build con whitelist fail-closed de
  // miembros (estándar ∪ Vite); dirname/filename Node-only se deniegan, env/url/hot/glob se permiten.
  it("partición de miembros de `import.meta` (allow url/env/hot/glob; deny dirname/filename/resolve)", () => {
    const any = (b: string) =>
      checkSourceFile(`/** @server-safe */\nexport const f = (c: boolean) => ${b};`, "im.fixture.tsx").length > 0;
    // DENY (Node-only / incertidumbre-Edge), dot + bracket-literal + alternativa:
    expect(any(`import.meta.dirname`)).toBe(true);
    expect(any(`import.meta.filename`)).toBe(true);
    expect(any(`(import.meta as any).resolve("x")`)).toBe(true);
    expect(any(`(import.meta as any)["dirname"]`)).toBe(true);
    expect(any(`(import.meta as any)[c ? "url" : "dirname"]`)).toBe(true);
    // ALLOW (estándar ∪ Vite):
    expect(any(`import.meta.url`)).toBe(false);
    expect(any(`(import.meta as any).env.DEV`)).toBe(false);
    expect(any(`(import.meta as any).hot`)).toBe(false);
    // glob: el ACCESO al miembro es Edge-safe (el namespace lo puebla el build) — PASA.
    expect(any(`(import.meta as any).glob`)).toBe(false);
    // PERO el CALL `import.meta.glob(...)` es bulk-import por patrón: el gate no puede expandir el glob
    // (readdir + micromatch de Vite = subsistema §373 renunciado) → los módulos quedarían sin auditar →
    // FAIL-CLOSED, ORTOGONAL al acceso permitido (acceso-allowed ≠ módulos-auditados). codex-diligencia.
    expect(any(`(import.meta as any).glob("./*")`)).toBe(true);
    expect(any(`(import.meta as any).glob("./*", { eager: true })`)).toBe(true);
    expect(any(`(import.meta as any).globEager("./*")`)).toBe(true);
    expect(any(`(import.meta as any)["glob"]("./*")`)).toBe(true); // bracket-literal
    // EAGER vs LAZY en cuerpo cliente-diferido (codex P1): Vite baja el EAGER glob a imports estáticos
    // top-level → carga en module-eval SSR/Edge AUNQUE el callback nunca corra → flaggeado IGUAL. El LAZY
    // es on-call → en un callback es client-side → PASA (paridad con dynamic import).
    const inEffect = (body: string) =>
      checkSourceFile(`/** @server-safe */\nimport { useEffect } from "react";\nexport function C() { useEffect(() => { ${body} }, []); return null; }`, "glob.fixture.tsx").length > 0;
    expect(inEffect(`(import.meta as any).glob("./*", { eager: true });`)).toBe(true); // eager → SSR
    expect(inEffect(`(import.meta as any).globEager("./*");`)).toBe(true); // globEager → SSR
    expect(inEffect(`const o = {} as any; (import.meta as any).glob("./*", o);`)).toBe(true); // opts no-literal → fail-closed eager
    // BARRIDO de node-kinds de las opts: cualquier forma NO-provablemente-lazy → fail-closed eager (codex P1
    // spread + barrido proactivo shorthand/computed; el chequeo viejo solo miraba PropertyAssignment-con-nombre):
    expect(inEffect(`(import.meta as any).glob("./*", { ...{ eager: true } });`)).toBe(true); // spread
    expect(inEffect(`const o = {} as any; (import.meta as any).glob("./*", { ...o });`)).toBe(true); // spread-var
    expect(inEffect(`const eager = true; (import.meta as any).glob("./*", { eager });`)).toBe(true); // shorthand
    expect(inEffect(`(import.meta as any).glob("./*", { ["eager"]: true });`)).toBe(true); // computed-key
    expect(inEffect(`const k = "eager"; (import.meta as any).glob("./*", { [k]: true });`)).toBe(true); // computed-var
    expect(inEffect(`const v = true; (import.meta as any).glob("./*", { eager: v });`)).toBe(true); // valor variable
    // …pero opciones no-eager (incl. shorthand) NO disparan eager → sigue lazy → exento:
    expect(inEffect(`const query = "?raw"; (import.meta as any).glob("./*", { query });`)).toBe(false);
    expect(inEffect(`(import.meta as any).glob("./*", { import: "default", eager: false });`)).toBe(false);
    expect(inEffect(`(import.meta as any).glob("./*");`)).toBe(false); // lazy → on-call client
    expect(inEffect(`(import.meta as any).glob("./*", { eager: false });`)).toBe(false); // lazy explícito
    // R10 OVERTURN (#4 revertido, adjudicación Fable): `import.meta[<computado>]` DIRECTO tiene indirección
    // CERO (root conocido, key no probable ∈ allowlist) → default-deny fail-closed, PARIDAD con el hermano
    // `performance[c]`. El SILENT previo era un fail-open del selector (import.meta ∉ SAFE_PARTIAL_MEMBERS),
    // NO §141. Ver ADR D1-P1 "#4-OVERTURNED R10". (§141 GENUINO restante: assembled/spread-variable/own-copy.)
    expect(
      checkSourceFile(`/** @server-safe */\nexport const f = (k: string) => (import.meta as any)[k];`, "im2.fixture.tsx").length,
    ).toBe(1);
  });

  // RAÍZ C (re-hunt rc.1 + Fable cross-review): `import.meta` no estaba enrolado en la maquinaria
  // partial-root (exprPartialRoot solo reconocía roots-IDENTIFIER), así que el DESTRUCTURE
  // (`const {resolve}=import.meta`) y el CONST-ALIAS (`const m=import.meta; m.resolve()`) evadían el
  // check (el directo `import.meta.resolve` sí se cazaba). Se enrola como root-sentinel con dispatch
  // de POLARIDAD (import.meta = ALLOWLIST, no denylist) — el riesgo crítico que Fable marcó.
  it("destructure/const-alias de import.meta se cazan con polaridad ALLOWLIST preservada (root C)", () => {
    const flags = (b: string) =>
      checkSourceFile(`/** @server-safe */\n${b}`, "imroot.fixture.tsx").length > 0;
    // Fail-open cerrado — destructure de miembro Node-only:
    expect(flags(`const { dirname } = import.meta;\nexport const d = dirname;`)).toBe(true); // C1 idiom Node 20.11+
    expect(flags(`const { resolve } = import.meta;\nexport const r = () => resolve("./x");`)).toBe(true); // C2
    expect(flags(`const { filename } = import.meta;\nexport const f = filename;`)).toBe(true);
    // Const-alias del objeto entero → miembro Node-only:
    expect(flags(`const m = import.meta;\nexport const r = () => m.resolve("./x");`)).toBe(true); // C3
    // Assignment-pattern:
    expect(flags(`let resolve: any;\nexport const r = () => { ({ resolve } = import.meta); return resolve; };`)).toBe(true);
    // POLARIDAD (fixtures obligatorios de Fable) — allowlist preservada a través de destructure Y alias:
    expect(flags(`const { url } = import.meta;\nexport const u = url;`)).toBe(false); // allowlist
    expect(flags(`const m = import.meta;\nexport const u = m.url;`)).toBe(false); // allowlist vía alias
    expect(flags(`const m = import.meta;\nexport const x = m.loQueSea;`)).toBe(true); // desconocido → deny (allowlist NO se vuelve denylist)
    // §141 ratificado: object-rest (data-flow por la copia) — NO cerrable, NO debe FP con la polaridad allowlist:
    expect(flags(`const { ...rest } = import.meta;\nexport const x = rest;`)).toBe(false);
    // El directo sigue cazado UNA sola vez (sin doble-flag por el enrolado):
    expect(
      checkSourceFile(`/** @server-safe */\nexport const d = import.meta.dirname;`, "imdirect.fixture.tsx").length,
    ).toBe(1);
    // NO regresión: los roots-identifier conservan su polaridad DENYLIST (rest no es FP ahí):
    expect(flags(`const { ...r } = WebAssembly;\nexport const x = r;`)).toBe(false);
    expect(flags(`const { now } = performance;\nexport const n = now;`)).toBe(false);
  });

  it("detección de `import.meta.glob` desenvuelve la KEY erased del bracket (`[\"glob\" as const]`, `[(\"glob\")]`) → fail-closed; key variable/no-glob siguen no-glob (codex P2)", () => {
    const detects = (b: string) =>
      checkSourceFile(
        `/** @server-safe */
export function C(k: string){ ${b} return null; }`,
        "gk.fixture.tsx",
      ).some((v) => v.rule === "unresolved-import");
    // DETECTAN (la key erased se borra al mismo `import.meta["glob"]` que el gate fail-cierra):
    expect(detects(`const m = import.meta.glob("./x.ts", { eager: true }); void m;`)).toBe(true);
    expect(detects(`const m = import.meta["glob"]("./x.ts", { eager: true }); void m;`)).toBe(true);
    expect(detects(`const m = (import.meta as any)["glob" as const]("./x.ts", { eager: true }); void m;`)).toBe(true);
    expect(detects(`const m = (import.meta as any)[("glob")]("./x.ts", { eager: true }); void m;`)).toBe(true);
    expect(detects(`const m = import.meta[("globEager")!]("./x.ts"); void m;`)).toBe(true);
    // NO-glob (correctos): key VARIABLE = §141 data-flow (Vite tampoco la glob-ea → runtime error universal);
    // key no-glob:
    expect(detects(`const m = import.meta[k]("./x.ts"); void m;`)).toBe(false);
    expect(detects(`const m = import.meta["foo"]("./x.ts"); void m;`)).toBe(false);
  });

  it("clasificación EAGER de `import.meta.glob` es fail-closed ante erased en las opciones (objeto/clave/valor `as const`, spread → eager bajo guard); solo `{eager:false}` CRUDO prueba lazy — simetría con el fix de la key (Auditor-B)", () => {
    // Bajo guard client-only (`typeof window`): un LAZY se suprime, un EAGER flaggea (Vite lo hoistea a
    // module-top → corre server-side). Así la mis-clasificación eager→lazy sería un fail-open visible.
    const flagsUnderGuard = (opts: string) =>
      checkSourceFile(
        `/** @server-safe */
export function C(){ if (typeof window !== "undefined") { const m = import.meta.glob("./x.ts"${opts}); void m; } return null; }`,
        "ge.fixture.tsx",
      ).some((v) => v.rule === "unresolved-import");
    // LAZY (suprimido bajo guard) — SOLO el `eager:false` CRUDO lo prueba:
    expect(flagsUnderGuard(``)).toBe(false);
    expect(flagsUnderGuard(`, { eager: false }`)).toBe(false);
    // EAGER (Vite hoistea → FLAG aunque esté bajo guard) — el default fail-closed cubre TODO erased:
    expect(flagsUnderGuard(`, { eager: true }`)).toBe(true);
    expect(flagsUnderGuard(`, { eager: true } as const`)).toBe(true); // OBJETO erased
    expect(flagsUnderGuard(`, { ["eager" as const]: true }`)).toBe(true); // CLAVE erased
    expect(flagsUnderGuard(`, { eager: (true as const) }`)).toBe(true); // VALOR erased
    expect(flagsUnderGuard(`, { eager: (false as const) }`)).toBe(true); // false erased → over-flag benigno (fail-closed)
    expect(flagsUnderGuard(`, { ...({} as Record<string, unknown>) }`)).toBe(true); // spread → no prueba not-eager
  });

  // codex P2 + Auditor-B: `process.env` ENDURECIDO a deny. `process` es present-but-partial
  // (NON_ABSENCE_DENIALS): en el baseline edge estricto (Workers/Deno sin compat) `process` es undeclared →
  // `process.env.FOO` tira ReferenceError sobre el bare `process` en ESM strict-mode. El contrato @server-safe
  // de una librería PUBLICADA = MCD de runtimes del consumidor = estricto → deny; `import.meta.env` (cross-
  // runtime, mecanismo SEPARADO) es el idiom portable y SIGUE allow. Permit-guarded (`typeof process !==
  // "undefined"`) = futuro (server-global narrowing, polaridad espejo de window).
  it("partición de `process` (deny env/cwd/binding/bare/dynKey — baseline estricto; import.meta.env allow aparte)", () => {
    const any = (b: string) =>
      checkSourceFile(`/** @server-safe */\nexport const f = (c: boolean) => ${b};`, "pr.fixture.tsx").length > 0;
    // `process.env` DENEGADO (el bare `process` revienta antes de `.env` en el baseline estricto; los wrappers
    // VT/erased PRESERVAN el bare `process` denegado → flaggean igual). Antes era allow (ratificación B, revertida):
    expect(any(`process.env.NODE_ENV`)).toBe(true);
    expect(any(`process["env"]`)).toBe(true);
    expect(any(`(process as any).env.NODE_ENV`)).toBe(true); // cast
    expect(any(`(process).env`)).toBe(true); // parens
    expect(any(`(process as any)["env"]`)).toBe(true); // cast + bracket-literal
    expect(any(`((process as any) as any).env`)).toBe(true); // doble cast
    expect(any(`(0, process).env`)).toBe(true); // coma VT
    expect(any(`(c ? process : ({} as any)).env`)).toBe(true); // ternario VT
    // resto de `process` (sin cambio):
    expect(any(`process.cwd()`)).toBe(true);
    expect(any(`(process as any).cwd()`)).toBe(true);
    expect(any(`(0, process).cwd()`)).toBe(true);
    expect(any(`(process as any).binding("fs")`)).toBe(true);
    expect(any(`process`)).toBe(true);
    expect(any(`(process as any)[c ? "env" : "cwd"]`)).toBe(true);
    expect(checkSourceFile(`/** @server-safe */\nexport const f = (k: string) => (process as any)[k];`, "pr2.fixture.tsx").length > 0).toBe(true);
    // CONTROL Auditor-B: `import.meta.env` (análogo PORTABLE, mecanismo SEPARADO) SIGUE allow — el harden NO lo mueve:
    expect(any(`import.meta.env.NODE_ENV`)).toBe(false);
    expect(any(`import.meta.env.DEV`)).toBe(false);
  });

  // codex P2 (review genérico): TRES buckets. crypto/console = bucket 1 (allowlist Edge-present,
  // eran FAIL-OPEN); WebAssembly = bucket 2 (denylist, sin tocar); Intl = bucket 3 (wholesale, sin tabla).
  it("buckets de namespaces host-populated (crypto/console allowlist; Intl wholesale)", () => {
    const any = (b: string) =>
      checkSourceFile(`/** @server-safe */\nexport const f = () => ${b};`, "bk.fixture.tsx").length > 0;
    // crypto WHOLESALE (revertido): el global Web Crypto = {subtle,getRandomValues,randomUUID} IDÉNTICO
    // en browser+Node+Edge → cero miembro divergente. createHash/timingSafeEqual NO existen en el global
    // de NINGÚN runtime (node:crypto MÓDULO) → (crypto as any).createHash() lanza idéntico = UNIVERSAL-crash
    // out-of-mandate (el npm test del contributor lo caza). Por presencia, crypto.* PASA wholesale:
    expect(any(`(crypto as any).timingSafeEqual(0 as any, 0 as any)`)).toBe(false);
    expect(any(`(crypto as any).createHash("sha256")`)).toBe(false);
    expect(any(`crypto.randomUUID()`)).toBe(false);
    expect(any(`crypto.subtle`)).toBe(false);
    expect(any(`crypto.getRandomValues(new Uint8Array(8))`)).toBe(false);
    // console bucket 1 — set DERIVADO del oráculo @edge-runtime/primitives (12 Edge-present). DENY el
    // constructor Node-only `Console` + los que están en spec WHATWG pero AUSENTES en Edge (era fail-open):
    expect(any(`new (console as any).Console({ write() {} }, { write() {} })`)).toBe(true);
    expect(any(`(console as any).profile("x")`)).toBe(true);
    expect(any(`(console as any).table([])`)).toBe(true); // spec WHATWG pero NO Edge-present
    expect(any(`(console as any).group("g")`)).toBe(true);
    expect(any(`(console as any).clear()`)).toBe(true);
    expect(any(`console.log("x")`)).toBe(false);
    expect(any(`console.warn("x")`)).toBe(false);
    expect(any(`console.error("x")`)).toBe(false);
    expect(any(`console.info("x"); console.debug("y"); console.trace("z")`)).toBe(false);
    // crypto wholesale: destructuring de cualquier miembro PASA (incl. el universal createHash):
    expect(checkSourceFile(`/** @server-safe */\nexport function f(){ const { createHash } = crypto as any; return createHash("x"); }`, "bk2.fixture.tsx")).toEqual([]);
    expect(checkSourceFile(`/** @server-safe */\nexport function f(){ const { randomUUID } = crypto; return randomUUID(); }`, "bk3.fixture.tsx")).toEqual([]);
    // Intl bucket 3 — wholesale (NO allowlist; DurationFormat allowed = correcto):
    expect(any(`new Intl.NumberFormat()`)).toBe(false);
    expect(any(`new (Intl as any).DurationFormat()`)).toBe(false);
    // WebAssembly bucket 2 — denylist intacto:
    expect(any(`WebAssembly.compile(new Uint8Array())`)).toBe(true);
    expect(any(`WebAssembly.validate(new Uint8Array())`)).toBe(false);
  });

  // PIN de la tabla 3-RUNTIME (audit de mandato — "¿solo crypto es universal?"). Cada candidato fue
  // probado en los TRES runtimes: Chromium real (Playwright, http://localhost + COOP/COEP — about:blank
  // da falsos-undefined para APIs secure-context-gated), Node, y @edge-runtime/vm. REGLA: funciona en
  // browser O Node pero rompe en Edge/server = DIVERGENCIA → el gate lo CAZA (única defensa, el npm test
  // del contributor no lo ve). Rompe en los TRES idéntico = UNIVERSAL-crash → out-of-mandate, el gate NO
  // lo caza (el npm test del contributor ya lo caza). Tabla verificada (browser / Node / Edge):
  //   crypto.createHash/timingSafeEqual   ausente / ausente / ausente   → UNIVERSAL → PASA
  //   (0,crypto.getRandomValues)() unbound throws  / OK     / throws     → DIVERGENCIA(Node-OK) → FLAG
  //   measureUserAgentSpecificMemory      PRESENTE / ausente / ausente   → client-vs-server → FLAG
  //   navigator.geolocation/clipboard     PRESENTE / ausente / ausente   → client-vs-server → FLAG
  //   setTimeout("code")                  EVALÚA   / throws / throws      → eval-sink/c-vs-s → FLAG
  //   console.table/group/clear/dirxml    presente / presente / ausente  → Node-vs-Edge → FLAG
  //   performance.eventLoopUtilization    ausente  / presente / ausente  → Node-vs-Edge → FLAG
  //   (0,performance.now)() unbound       throws   / throws / throws      → UNIVERSAL → PASA
  // REGENERAR: scratchpad/vm (@edge-runtime/vm) + Playwright chromium http://localhost COOP/COEP + Node.
  it("H. clasificación de mandato pineada contra la tabla 3-runtime (divergencia→FLAG, universal→PASA)", () => {
    const F = (b: string) =>
      checkSourceFile(`/** @server-safe */\nexport const C = () => ${b};`, "h.fixture.tsx").length > 0;
    // UNIVERSAL-crash (rompe en los 3) → out-of-mandate → PASA:
    expect(F(`(crypto as any).createHash("sha256")`)).toBe(false);
    expect(F(`(crypto as any).timingSafeEqual(0 as any, 0 as any)`)).toBe(false);
    expect(F(`(0, performance.now)()`)).toBe(false);
    // CONTROL — el PASA de createHash es por WHOLESALE, no por una causa frágil (el eje invocación
    // NO contamina el eje presencia, y el `as any` NO vuelve el root irresoluble):
    //  (a) createHash/zBogus NO estaban en el viejo allowlist {subtle,randomUUID,getRandomValues} →
    //      si crypto siguiera bucket-1 (re-denegado por la puerta de RECEIVER_BOUND), esto sería FLAG.
    //      PASA ⟹ wholesale-de-presencia (isDeniedPartialMember cae a `return false`, no a la rama allow).
    expect(F(`(crypto as any).zBogusNonExistentMember`)).toBe(false);
    //  (b) crypto SÍ resuelve como root a través del cast (el unbound flaggea) → el PASA de createHash
    //      es por wholesale, NO porque `as any` rompa la resolución del root (si lo rompiera, esto = PASA):
    expect(F(`(0, (crypto as any).getRandomValues)(new Uint8Array(4))`)).toBe(true);
    // DIVERGENCIA (browser O Node sí, Edge no) → in-mandate → FLAG:
    expect(F(`(0, crypto.getRandomValues)(new Uint8Array(4))`)).toBe(true); // Node-OK/Edge-throws (detach por operador)
    // unbound vía Function.prototype.call/apply/bind (codex P1 @159148b) — MISMA divergencia que el operador,
    // contiguo en-sitio (no data-flow). Espectro {call/apply/bind}×{dotted,bracket,optional} verificado 3-runtime
    // (Node-OK/Edge-throws). Simétrico con `.constructor.call/.apply/.bind` (rama eval-sink).
    expect(F(`crypto.getRandomValues.call(null, new Uint8Array(4))`)).toBe(true);
    expect(F(`crypto.randomUUID.apply(null, [])`)).toBe(true);
    expect(F(`crypto.getRandomValues.bind(null)(new Uint8Array(4))`)).toBe(true); // bind invocado en-sitio
    expect(F(`crypto.getRandomValues.bind(null).bind(null)(new Uint8Array(4))`)).toBe(true); // .bind ENCADENADO (unwrapBindChain, simétrico con construcción)
    // `.call`/`.apply` COMO MEMBER alcanzado como detach-target (vía .bind o operador) — `boundMemberOf` ve
    // a través (son los métodos de Function que INVOCAN el receiver). codex P1 @39e593b.
    expect(F(`((crypto.randomUUID.call as any).bind(crypto.randomUUID))(null)`)).toBe(true); // .call vía .bind (codex)
    expect(F(`(0, crypto.getRandomValues.call)(null, new Uint8Array(4))`)).toBe(true); // .call vía operador
    expect(F(`(crypto.getRandomValues.call as any).call(crypto.getRandomValues, null, new Uint8Array(4))`)).toBe(true); // .call.call (see-through recursivo)
    // CARACTERIZACIÓN del eje composición {call,apply,bind} (cerrado por CONSTRUCCIÓN, no nodo-a-nodo):
    // (1) branded en posición RECEIVER (el `.expression` de los ops) → DECIDIBLE estructuralmente por
    // `peelReceiverChain` (iterativo, SIN cap) a CUALQUIER profundidad/orden. El depth-guard de 8 era una
    // frontera-FALSA (dejaba pasar 9+); la profundidad tiene final (el member base) → se cierra hasta el fondo.
    expect(F(`crypto.getRandomValues${".bind(null)".repeat(20)}(new Uint8Array(4))`)).toBe(true); // .bind ×20 (profundidad)
    expect(F(`crypto.getRandomValues.bind(null).call(null, new Uint8Array(4))`)).toBe(true); // bind-then-call (interleaving)
    expect(F(`crypto.getRandomValues.bind(null).bind(null).call(null, new Uint8Array(4))`)).toBe(true); // bind²-then-call
    // (2a) en composición {call,apply,bind}, branded en posición ARGUMENTO (`.bind`-vía-`.call`, `(.bind).bind`):
    // el branded se rutea por el arg de un Function-method al `this` de OTRO → requiere EVALUAR el resultado de
    // una invocación, no pattern-matching estructural → §141 RESIDUAL genuino (mismo cruce que `const r=X.m;r()`).
    expect(F(`((crypto.getRandomValues.bind as any).call(crypto.getRandomValues, null))(new Uint8Array(4))`)).toBe(false); // .bind-vía-.call
    expect(F(`((crypto.getRandomValues.bind as any).bind(crypto.getRandomValues))(null)(new Uint8Array(4))`)).toBe(false); // (.bind).bind(X.m)
    // (2b) Reflect.construct(T,…)≡new T(...) / Reflect.apply(T,…)≡T.apply(...) — constructos FUERA de new/
    // {call,apply,bind} (saltan los checks NewExpression/detach). T (arg0) EN-SITIO → DECIDIBLE con los mismos
    // resolvers → FLAG (cerrado, codex P1; el gate ya modelaba Reflect para el eval-sink). T NO-en-sitio
    // (alias `const rc=Reflect.construct`, target-alias, `Reflect.get`-key-string) = data-flow residual → PASA.
    expect(F(`Reflect.apply(crypto.getRandomValues, null, [new Uint8Array(4)])`)).toBe(true); // Reflect.apply target en-sitio
    expect(F(`Reflect.construct(WebAssembly.Module, [new Uint8Array(4)])`)).toBe(true); // Reflect.construct target en-sitio
    expect(
      checkSourceFile(`/** @server-safe */\nexport const C = () => { const rc = Reflect.construct; return rc(WebAssembly.Module, [new Uint8Array(4)]); };`, "rc.fixture.tsx").length > 0,
    ).toBe(false); // Reflect alias → data-flow residual
    expect(F(`crypto.getRandomValues["call"](null, new Uint8Array(4))`)).toBe(true); // bracket-literal
    expect(F(`crypto.getRandomValues?.call?.(null, new Uint8Array(4))`)).toBe(true); // optional
    expect(F(`(performance as any).measureUserAgentSpecificMemory()`)).toBe(true); // browser-only
    expect(F(`(navigator as any).geolocation`)).toBe(true); // browser-only (navigator denied root)
    expect(F(`(console as any).table([])`)).toBe(true); // Node-present/Edge-absent
    expect(F(`(performance as any).eventLoopUtilization()`)).toBe(true); // Node-only
    expect(
      checkSourceFile(`/** @server-safe */\nexport const C = () => { setTimeout("code", 0); };`, "h2.fixture.tsx").length > 0,
    ).toBe(true); // browser-evals, Node/Edge throw → eval-sink
    // FAMILIA VALUE-SURVIVAL — el VALOR peligroso alcanza la operación a través de operadores VT
    // (ternario/coma/&&/||), resuelto por `valueSurvivalLeaves`/`valueTransparentLeaves`. CADA fila
    // PROBADA conductualmente VT-envuelta (no por lectura). Gaps cerrados: construcción (codex P1
    // @fdd3fe5), import.meta + dynamic-import-ternario (barrido VT). Distinto del eje receiver-detach (split).
    expect(F(`new (c ? WebAssembly.Module : WebAssembly.Module)(b)`)).toBe(true); // new-Module VT-envuelto
    expect(F(`new (0, WebAssembly.Module)(b)`)).toBe(true); // coma
    expect(F(`new ((WebAssembly.Module as any).bind(null, b))()`)).toBe(true); // .bind → constructor ligado construye el original (codex P1 @c4d8176)
    expect(F(`new ((WebAssembly.Module as any).bind(null).bind(null))()`)).toBe(true); // .bind encadenado
    expect(F(`new ((c ? WebAssembly.Module : (X as any)).bind(null, b))()`)).toBe(true); // VT-antes-del-bind
    // SUBCLASE anónima EN-SITIO: `new (class extends X.Module {})(b)` ≡ super(b) ≡ new X.Module(b) (codex P1
    // @df596d6). El `class X extends X.Module {}` NOMBRADO + `new X(b)` = data-flow residual (X variable).
    expect(F(`new (class extends WebAssembly.Module {})(b)`)).toBe(true); // anon class extends ctor-denied
    expect(F(`new (class extends (WebAssembly.Module as any) {})(b)`)).toBe(true); // extends cast
    expect(F(`new (class extends (c ? WebAssembly.Module : (Object as any)) {})(b)`)).toBe(true); // extends VT
    expect(
      checkSourceFile(`/** @server-safe */\nexport const C = () => { class X extends (WebAssembly.Module as any) {} return new X(new Uint8Array(8)); };`, "cls.fixture.tsx").length > 0,
    ).toBe(false); // named class = data-flow residual
    expect(F(`(c ? import.meta : ({} as any)).dirname`)).toBe(true); // import.meta root VT-envuelto
    expect(F(`(0, import.meta).filename`)).toBe(true); // import.meta coma
    expect(F(`(0, [].constructor.constructor)("x")()`)).toBe(true); // .constructor weaponizado VT-envuelto
    // Function ctor vía `super()` en subclase ANÓNIMA inline `extends <fn>.constructor` (codex P1, análogo
    // eval-sink de la subclase WebAssembly.Module): al construir, super invoca el Function ctor. NAMED = data-flow.
    expect(F(`new (class extends ((()=>{}).constructor as any) { constructor(){ super("return 1"); } })()`)).toBe(true);
    expect(F(`new (class extends ((()=>{}).constructor as any) {})("return 1")`)).toBe(true); // default derived ctor
    expect(F(`Reflect.construct(class extends ((()=>{}).constructor as any) { constructor(){super("x");} }, [])`)).toBe(true);
    expect(
      checkSourceFile(`/** @server-safe */\nexport const C = () => { class X extends ((() => {}).constructor as any) {} return new X("x"); };`, "fnsub.fixture.tsx").length > 0,
    ).toBe(false); // NAMED class = data-flow residual
    expect(F(`new (class extends (([].constructor) as any) {})()`)).toBe(false); // [].constructor = Array, no Function
    // NESTING anónimo: eval-sink en el heritage INTERNO de una clase construida (la externa delega a super
    // → la interna se construye → su super invoca Function). classExpressionIsConstructed recurre por la
    // cadena de heritage anónima. codex P1 (sub-hueco del cruce, diligencia).
    expect(F(`new (class extends (class extends ((()=>{}).constructor as any) {}) {})()`)).toBe(true);
    expect(F(`new (class extends (class extends (Array as any) {}) {})()`)).toBe(false); // base segura = no eval-sink
    expect(F(`setTimeout("code", 0)`)).toBe(true); // string-timer eval-sink
    expect(F(`(0, setTimeout)("code", 0)`)).toBe(true); // string-timer callee VT-envuelto
    expect(
      checkSourceFile(`/** @server-safe */\nexport const C = async (c: boolean) => await import(c ? "fs" : "other");`, "h4.fixture.tsx").length > 0,
    ).toBe(true); // dynamic-import specifier ternario MULTI-hoja (gap del barrido: length===1 → fail-closed any-leaf)
    // Controles del detach call/apply/bind — NO deben flaggear (frontera correcta):
    expect(
      checkSourceFile(`/** @server-safe */\nexport const C = () => { const f = crypto.getRandomValues.bind(null); return f(new Uint8Array(4)); };`, "h3.fixture.tsx").length > 0,
    ).toBe(false); // bind-extraído cross-statement = data-flow §141 residual
    expect(F(`console.log.call(null, "x")`)).toBe(false); // .call sobre método NO receiver-bound (console no brand-checkea)
    // Línea base allowed (no candidatos):
    expect(F(`crypto.getRandomValues(new Uint8Array(4))`)).toBe(false); // bound
    expect(F(`performance.now()`)).toBe(false); // bound
    expect(F(`console.log("x")`)).toBe(false);
  });

  // codex P2 (review genérico): `performance` ES bucket-1 — la INSTANCIA existe en Edge (VM:
  // typeof==="object", now() corre; ADR §270). El allowlist NO se deriva de oráculo (las 3 fuentes
  // locales están contaminadas para performance: doc omite, primitives passthrough, VM hereda perf_hooks).
  // ALLOW = solo lo confirmable por CONVERGENCIA sin fidelidad-perf_hooks: {now, timeOrigin}. El resto al
  // complemento denegado bajo INCIERTO=deny (#190 producción). eventLoopUtilization cerrado por
  // CONSTRUCCIÓN (complemento), no por denylist → resiste que el VM lo dé como "function".
  it("performance bucket-1 — root Edge-present, allowlist {now,timeOrigin}, resto deny por complemento (codex P2)", () => {
    const flag = (b: string) =>
      checkSourceFile(`/** @server-safe */\nexport const f = () => ${b};`, "perf-b1.fixture.tsx").some((x) => x.rule === "no-bare-dom-access");
    // ALLOW (Web-core, convergencia) — corrige el FP de tratar performance como denied-root:
    expect(flag(`performance.now()`)).toBe(false);
    expect(flag(`performance.timeOrigin`)).toBe(false);
    // DENY por complemento — el fail-open original (Node-only) cerrado por construcción:
    expect(flag(`performance.eventLoopUtilization()`)).toBe(true);
    expect(flag(`performance.timerify(() => {})`)).toBe(true);
    // DENY conservador bajo incierto (mark/measure probablemente Edge-present, SIN fuente fiable → #190):
    expect(flag(`performance.mark("x")`)).toBe(true);
    expect(flag(`performance.getEntriesByType("mark")`)).toBe(true);
    // bare root sigue safe (la instancia existe en Edge):
    expect(checkSourceFile(`/** @server-safe */\nexport const c = performance;`, "perf-bare.fixture.tsx")).toEqual([]);
  });

  // codex P2 + Auditor-B: miembro COMPUTADO sobre raíz parcial default-deny (performance/console) —
  // `performance[m]()` con `m` variable saltaba el check (memberCandidates=[] → resolvedPartialRoot=null) →
  // fail-open. Fail-closed por PARIDAD con el literal-desconocido (NO se resuelve `m` = no §141). Reusa
  // exprPartialRoot (alias) + safelyProbed (polaridad de probe) → traps verificadas en la tabla de paridad.
  it("miembro COMPUTADO de raíz parcial default-deny → fail-closed (paridad con literal-desconocido); safe-probes/alias/opt-chain heredados; crypto/WebAssembly/destructure fuera de alcance (codex P2)", () => {
    const flag = (b: string) =>
      checkSourceFile(
        `/** @server-safe */
export const f = (c: boolean, k: string, m: string, buf: any) => { ${b} };`,
        "pcomp.fixture.tsx",
      ).some((x) => x.rule === "no-bare-dom-access");
    // COMPUTADO (var/param/ternario-enumerado) → FLAG: el miembro no-probado no se demuestra ∈ allowlist:
    expect(flag(`const x = "eventLoopUtilization"; return performance[x]();`)).toBe(true);
    expect(flag(`return performance[k]();`)).toBe(true);
    expect(flag(`return performance[c ? "now" : "x"]();`)).toBe(true);
    expect(flag(`console[m]("s"); return 0;`)).toBe(true);
    // ALIAS → hereda alias-tracking de exprPartialRoot (paridad con `p.eventLoopUtilization()` que ya flaggea):
    expect(flag(`const p = performance; return p[m]();`)).toBe(true);
    // SAFE-PROBES (no ejecutan) → PASA, preservados:
    expect(flag(`return typeof performance[m];`)).toBe(false);
    expect(flag(`return m in performance;`)).toBe(false);
    expect(flag(`return performance?.[m]?.();`)).toBe(false); // opt-chain corta sobre miembro ausente
    // opt-ACCESS con call NO-opcional → ejecuta → FLAG (paridad con `performance?.eventLoopUtilization()`):
    expect(flag(`return performance?.[m]();`)).toBe(true);
    // literal-safe NO se afecta (sin over-flag):
    expect(flag(`console.log("s"); return 0;`)).toBe(false);
    expect(flag(`return performance.now();`)).toBe(false);
    // FUERA de alcance (intactos): crypto WHOLESALE; WebAssembly DENYLIST (fail-open hermano, su propio P2);
    // destructure de miembro COMPUTADO (§141 data-flow; el destructure LITERAL sí lo caza c.1c):
    expect(flag(`return crypto[m](buf);`)).toBe(false);
    expect(flag(`return (WebAssembly as any)[m]();`)).toBe(false);
    expect(flag(`const { [k]: x } = performance; return x();`)).toBe(false);
  });

  // codex P2 (review genérico): bucket 2 separado por OPERACIÓN — `WebAssembly.Module` ban-de-
  // CONSTRUCCIÓN (`new`), NO member-read (el valor es Edge-safe). Era FP sobre instanceof/static-methods.
  it("WebAssembly.Module: construcción denegada, valor Edge-safe (codex P2)", () => {
    const any = (b: string) =>
      checkSourceFile(`/** @server-safe */\nexport function C(wasm: any){ ${b} }`, "wam.fixture.tsx").length > 0;
    // VALOR Edge-safe — NO flaggea (los casos exactos de codex):
    expect(any(`return wasm instanceof WebAssembly.Module;`)).toBe(false);
    expect(any(`return WebAssembly.Module.imports(wasm);`)).toBe(false);
    expect(any(`return WebAssembly.Module.exports(wasm);`)).toBe(false);
    expect(any(`const M = WebAssembly.Module; return M;`)).toBe(false);
    // CONSTRUCCIÓN sigue cazada — el FP-fix NO abrió fail-open:
    expect(any(`return new WebAssembly.Module(new Uint8Array());`)).toBe(true);
    expect(any(`return new (WebAssembly as any)["Module"](new Uint8Array());`)).toBe(true);
    expect(any(`const WA = WebAssembly; return new WA.Module(new Uint8Array());`)).toBe(true);
    // Auditoría otros constructores — Edge-safe (no compilan bytes):
    expect(any(`return new WebAssembly.Memory({ initial: 1 });`)).toBe(false);
    expect(any(`return new WebAssembly.Instance(wasm);`)).toBe(false);
    // §141 residual: member-alias de Module → construcción por indirección, no cazada.
    expect(any(`const M = WebAssembly.Module; return new M(new Uint8Array());`)).toBe(false);
  });

  // codex P2 + Auditor-B: constructor COMPUTADO de raíz construct-denied — `new WebAssembly[m]()` con m
  // variable saltaba el check (accessedMemberNames=[]) → fail-open HERMANO del default-deny. Polaridad
  // ESPEJO: en denylist el peligro es CONSTRUIR (no leer), así que fail-closed SOLO en `new`/Reflect.
  // construct; el value-read/instanceof computado se PRESERVA Edge-safe (la fila decisiva de CC).
  it("constructor COMPUTADO de raíz construct-denied (WebAssembly) → fail-closed en `new`/Reflect.construct; value-read preservado; call-computado-read-ban + member-alias = residual §141 (codex P2)", () => {
    const flag = (b: string) =>
      checkSourceFile(
        `/** @server-safe */
export const f = (c: boolean, m: string, bytes: any, wasm: any) => { ${b} };`,
        "wac.fixture.tsx",
      ).some((x) => x.rule === "no-bare-dom-access");
    // CONSTRUCCIÓN computada → FLAG (m podría ser Module; NO se resuelve m = no §141):
    expect(flag(`return new WebAssembly[m](bytes);`)).toBe(true);
    expect(flag(`return new WebAssembly[c ? "Module" : "Memory"](bytes);`)).toBe(true);
    expect(flag(`return Reflect.construct(WebAssembly[m], [bytes]);`)).toBe(true);
    // VALUE-READ / instanceof computado → PASA (preservado: el valor es Edge-safe, solo `new` compila):
    expect(flag(`const C = WebAssembly[m]; return C;`)).toBe(false);
    expect(flag(`return wasm instanceof WebAssembly[m];`)).toBe(false);
    // LITERAL sin regresión: Module-construct FLAG; Memory-construct / value-read PASA:
    expect(flag(`return new WebAssembly.Module(bytes);`)).toBe(true);
    expect(flag(`return new WebAssembly.Memory({ initial: 1 });`)).toBe(false);
    expect(flag(`const M = WebAssembly.Module; return M;`)).toBe(false);
    // RESIDUAL nombrado (NO cubierto, distinto del construct-ban): call computado de read-ban + member-alias §141:
    expect(flag(`return WebAssembly[m](bytes);`)).toBe(false);
    expect(flag(`const M = WebAssembly[m]; return new M(bytes);`)).toBe(false);
  });

  // codex P1 (review genérico): método branded host bucket-1 (RECEIVER_BOUND_MEMBERS) llamado UNBOUND
  // lanza TypeError (this detachado). Edge-específico (crypto: OK-Node/throw-Edge). Set VT split SOLO aquí:
  // operadores this-detaching (,/&&/||/??/?:/=) detachan; parens/cast preservan.
  it("llamada UNBOUND de método branded host: detach-por-operador cazado, bound/console/data-flow no (codex P1)", () => {
    const any = (b: string) =>
      checkSourceFile(`/** @server-safe */\nexport const C = () => ${b};`, "ub.fixture.tsx").length > 0;
    const stmt = (b: string) =>
      checkSourceFile(`/** @server-safe */\nexport const C = () => { ${b} };`, "ub2.fixture.tsx").length > 0;
    // FAIL-OPEN Edge-específico (crypto) — CAZADO en todas las formas this-detaching:
    expect(any(`(0, crypto.getRandomValues)(new Uint8Array(4))`)).toBe(true);
    expect(any(`(crypto.getRandomValues || (() => {}))(new Uint8Array(4))`)).toBe(true);
    expect(any(`(true ? crypto.randomUUID : (() => ""))()`)).toBe(true);
    expect(any(`(0, (crypto as any)["randomUUID"])()`)).toBe(true);
    expect(stmt(`const c = crypto; return (0, c.getRandomValues)(new Uint8Array(4));`)).toBe(true);
    // REGLA = receiver-bound Y EDGE-ESPECÍFICO (OK-Node/throw-Edge). UNIVERSAL (throw/reject en Node
    // TAMBIÉN) = out-of-mandate F4 (el contributor lo caza en su npm test, no es divergencia-Edge):
    expect(any(`(0, performance.now)()`)).toBe(false); // sync-throw en Node → universal → PASA
    expect(
      checkSourceFile(`/** @server-safe */\nexport async function C(){ return await (0, crypto.subtle.digest)("SHA-256", new Uint8Array()); }`, "ubn.fixture.tsx").length > 0,
    ).toBe(false); // crypto.subtle.* async-reject ERR_INVALID_THIS en Node → universal → PASA (nested, MISMA regla)
    // BOUND (receiver en-sitio; parens/cast preservan `this`) — PASA, 0-FP:
    expect(any(`crypto.getRandomValues(new Uint8Array(4))`)).toBe(false);
    expect(any(`(crypto.getRandomValues)(new Uint8Array(4))`)).toBe(false);
    expect(any(`(crypto.getRandomValues as any)(new Uint8Array(4))`)).toBe(false);
    expect(any(`crypto.randomUUID()`)).toBe(false);
    // console NO es receiver-bound (callable-unbound, escribe a stream) — PASA, sin FP:
    expect(any(`(0, console.log)("x")`)).toBe(false);
    expect(any(`(0, console.error)("x")`)).toBe(false);
    // RESIDUAL data-flow §141: detached-NO-invocado + var-extract → el receiver se pierde por value-tracking:
    expect(stmt(`const f = (0, crypto.getRandomValues); return f;`)).toBe(false);
    expect(stmt(`const r = crypto.getRandomValues; return r(new Uint8Array(4));`)).toBe(false);
  });

  it("caza `import(<literal builtin>)` dinámico; deja residual el variable/createRequire (codex P1)", () => {
    const has = (body: string) =>
      checkSourceFile(`/** @server-safe */\n${body}`, "dynimp.fixture.tsx").some(
        (v) => v.rule === "no-node-builtin",
      );
    expect(has(`export async function f(){ return await import("fs"); }`)).toBe(true);
    expect(has(`export async function f(){ return await import("node:fs"); }`)).toBe(true);
    expect(has(`export async function f(){ return await import("fs/promises"); }`)).toBe(true);
    expect(has(`export async function f(){ return await import((0, "fs")); }`)).toBe(true);
    // residuales §141 / exentos:
    expect(has(`export async function f(s: string){ return await import(s); }`)).toBe(false);
    expect(has(`export async function f(){ return await import("./local"); }`)).toBe(false);
    expect(has(`export async function f(){ return await import("react"); }`)).toBe(false);
  });

  it("NO deniega un bare `test` (prefix-only: solo `node:test` es builtin) (codex P1)", () => {
    // `import "test"` no es un builtin (solo `node:test`) → resolver no lo marca edge-denied; aquí
    // basta confirmar que el specifier bare `test` NO se clasifica como builtin.
    expect(
      resolveImportPath("test", "/repo/src/c.tsx", [], () => false, {
        repoRoot: "/repo",
        srcRoot: "/repo/src",
      }).kind,
    ).not.toBe("edge-denied");
    expect(
      resolveImportPath("node:test", "/repo/src/c.tsx", [], () => false, {
        repoRoot: "/repo",
        srcRoot: "/repo/src",
      }).kind,
    ).toBe("edge-denied");
  });

  it("builtin-detection con precisión de subpath (oráculo `module.isBuiltin`, sin base-split): `fs/promises` denied, `buffer/foo` (colisión npm) external, `node:buffer/foo` unresolvable (codex P2)", () => {
    const kind = (spec: string) =>
      resolveImportPath(spec, "/repo/src/c.tsx", [], () => false, {
        repoRoot: "/repo",
        srcRoot: "/repo/src",
      }).kind;
    // subpaths builtin REALES → edge-denied (isBuiltin los caza por sí solo, incl. prefijo+subpath):
    expect(kind("fs/promises")).toBe("edge-denied");
    expect(kind("node:fs/promises")).toBe("edge-denied");
    expect(kind("stream/web")).toBe("edge-denied");
    // subpath de PAQUETE npm que COLISIONA con nombre builtin → external (over-deny arreglado; el base-split
    // lo denegaba, pero `isBuiltin("buffer/foo")`=false — buffer no tiene ese subpath):
    expect(kind("buffer/foo")).toBe("external");
    expect(kind("stream/foo")).toBe("external");
    expect(kind("events/bar")).toBe("external");
    // con `node:` (fuerza builtin, pero no lo es → Node tira ERR_UNKNOWN_BUILTIN_MODULE) → unresolvable por el
    // scheme-guard (fail-closed), NUNCA external silencioso:
    expect(kind("node:buffer/foo")).toBe("unresolvable");
    expect(kind("node:stream/foo")).toBe("unresolvable");
  });

  it("NO flaggea spread de timer con callback función o variable (codex P2)", () => {
    expect(checkSourceFile(fixture(`setTimeout(...[() => {}, 0]);`), "spread-fn.fixture.tsx")).toEqual([]);
    expect(checkSourceFile(fixture(`const args: any = ["x"]; setTimeout(...args);`), "spread-var.fixture.tsx")).toEqual([]);
    // Reflect.apply con timer pero args VARIABLE = data-flow residual; con no-timer = exento (codex P2).
    expect(checkSourceFile(fixture(`const a: any = ["x"]; Reflect.apply(setTimeout, undefined, a);`), "reflect-var.fixture.tsx")).toEqual([]);
    expect(checkSourceFile(fixture(`const fn: any = (s: string) => s; Reflect.apply(fn, undefined, ["x"]);`), "reflect-nontimer.fixture.tsx")).toEqual([]);
    // array-indexed callee con timer SOMBREADO localmente = no es el global → exento (codex P2).
    expect(checkSourceFile(fixture(`const setTimeout: any = (s: string) => s; [setTimeout][0]("x");`), "shadow-arr-timer.fixture.tsx")).toEqual([]);
    // alternativa de spread con TODAS las ramas función/número = sin string handler → exento (codex P2).
    expect(checkSourceFile(fixture(`const c = (0 as unknown as boolean); setTimeout(...(c ? [() => {}] : [() => {}]));`), "alt-fn.fixture.tsx")).toEqual([]);
    // ramas de longitud distinta con trailing NO-string + spread de VARIABLE = exento/residual (codex P2).
    expect(checkSourceFile(fixture(`const c = (0 as unknown as boolean); setTimeout(...(c ? [] : [() => {}]), () => {});`), "alt-difflen-fn.fixture.tsx")).toEqual([]);
    expect(checkSourceFile(fixture(`const args: any[] = []; setTimeout(...args, "x");`), "var-spread-trailing.fixture.tsx")).toEqual([]);
  });

  it("NO flaggea destructuring ARRAY/anidado de un miembro SAFE (log) (codex P2)", () => {
    expect(checkSourceFile(fixture(`const [{ log }] = [console]; void log();`), "arr-safe-member.fixture.tsx")).toEqual([]);
  });

  it("NO flaggea parámetro SIN default ni con default seguro (param es opaco en runtime) (codex P2)", () => {
    // Sin default → el arg es opaco (no resoluble parser-puro) → exento.
    expect(checkSourceFile(`/** @server-safe */\nexport function run(later: any){ return later("x", 0); }`, "param-nodefault.fixture.tsx")).toEqual([]);
    expect(checkSourceFile(`/** @server-safe */\nexport function run({ compile }: any){ return compile(new Uint8Array()); }`, "param-pat-nodefault.fixture.tsx")).toEqual([]);
    // default a miembro SAFE / no-root → exento.
    expect(checkSourceFile(`/** @server-safe */\nexport function run(log: any = console.log){ return log(); }`, "param-safe.fixture.tsx")).toEqual([]);
    // receiver value-transparente NO-global / binding-element default seguro → exento (codex P2).
    expect(checkSourceFile(fixture(`const o: any = {}; (0, o).setTimeout("x", 0);`), "vt-recv-local.fixture.tsx")).toEqual([]);
    expect(checkSourceFile(`/** @server-safe */\nexport function run({ log = console.log }: any){ return log(); }`, "be-default-safe.fixture.tsx")).toEqual([]);
    // catch con default seguro / alternativas de literal TODAS no-timer → exento (codex P2).
    expect(checkSourceFile(fixture(`try {} catch ({ log = console.log }: any) { void log(); }`), "catch-safe.fixture.tsx")).toEqual([]);
    expect(checkSourceFile(fixture(`const c = (0 as unknown as boolean); const { l } = c ? { l: () => {} } : { l: () => {} }; void l("x");`), "alt-nontimer.fixture.tsx")).toEqual([]);
    // for-of member-extract con default a miembro SAFE (console.log) → exento (codex P2).
    expect(checkSourceFile(`/** @server-safe */\nexport function f() { let log: any; for ({ x: { log } = console } of [] as any[]) { log(); } }`, "forof-safe-member.fixture.tsx")).toEqual([]);
  });

  it("NO flaggea setTimeout.bind con callback función (no string)", () => {
    const v = checkSourceFile(fixture(`setTimeout.bind(null, () => {})();`), "bind-fn-timer.fixture.tsx");
    expect(v).toEqual([]);
  });

  // codex P2 (b22a600, #133): destructuring con DEFAULT de un miembro AUSENTE (console.measure
  // es undefined en el floor → el default se activa → seguro). Para un root PRESENT-throws el
  // miembro EXISTE → el default no se activa → sigue lanzando.
  it.each([
    ["perf.measure con default (rename)", `/** @server-safe */\nexport function f() { const { table: m = () => 0 } = console; return m(); }`],
    ["perf.measure con default (shorthand)", `/** @server-safe */\nexport function f() { const { table = () => 0 } = console as any; return table(); }`],
  ])("NO flaggea destructuring de un miembro AUSENTE con default seguro: %s", (_l, code) => {
    expect(checkSourceFile(code, "partial-default.fixture.tsx")).toEqual([]);
  });

  it("SÍ flaggea destructuring con default de un root PRESENT-throws (WebAssembly, el default no se activa)", () => {
    const code = `/** @server-safe */\nexport function f() { const { compile = () => 0 } = WebAssembly as any; return compile(new Uint8Array()); }`;
    expect(checkSourceFile(code, "wasm-default.fixture.tsx").some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  // codex P3 (f669bce): un binding LOCAL homónimo (import/función/const/param) NO es el timer
  // global → su string-arg no es eval del navegador. Respeto al shadow como la rama bare-id.
  it.each([
    ["función local setTimeout", `/** @server-safe */\nfunction setTimeout(s: string) { return s; }\nexport function f() { return setTimeout("x"); }`],
    ["const local setTimeout", `/** @server-safe */\nconst setTimeout = (s: string) => s;\nexport function f() { return setTimeout("x"); }`],
    ["import setTimeout wrapper", `/** @server-safe */\nimport { setTimeout } from "./timers";\nexport function f() { return setTimeout("x"); }`],
    ["param shadows setInterval", `/** @server-safe */\nexport function f(setInterval: (s: string) => void) { return setInterval("x"); }`],
  ])("NO flaggea un timer LOCAL shadowed con string-arg: %s", (_l, code) => {
    expect(checkSourceFile(code, "shadow-timer.fixture.tsx")).toEqual([]);
  });

  // codex P2 (2561d6b): el alias resuelto NO debe sobre-flaggear el caso seguro (callback función)
  // ni una variable homónima NO ligada a un timer.
  it.each([
    ["alias con callback función (no string)", `/** @server-safe */\nexport function f() { const later = setTimeout; return later(() => {}, 0); }`],
    ["binding homónimo NO-timer con string", `/** @server-safe */\nexport function f() { const later = (s: string) => s; return later("x"); }`],
    // codex P2 (50630d8): alias DERIVADO de un wrapper LOCAL homónimo — `function setTimeout(){}`
    // sombrea el global; `const later = setTimeout` aliasa el wrapper, no el global → no es eval.
    ["alias de wrapper-función shadowed (no global)", `/** @server-safe */\nfunction setTimeout(cb: string) { return cb; }\nexport function f() { const later = setTimeout; return later("x"); }`],
    ["alias de wrapper-const shadowed (no global)", `/** @server-safe */\nconst setTimeout = (s: string) => s;\nexport function f() { const later = setTimeout; return later("x"); }`],
    // codex P2 (ead1ad5): .call/.apply con callback FUNCIÓN (no string) o array no-literal = residual.
    ["timer.call con callback función", `/** @server-safe */\nexport function f() { return setTimeout.call(null, () => {}, 0); }`],
    ["timer.apply con array de función", `/** @server-safe */\nexport function f() { return setTimeout.apply(null, [() => {}, 0]); }`],
    ["timer.apply con array NO-literal (residual data-flow)", `/** @server-safe */\nexport function f() { const a: any = ["x"]; return setTimeout.apply(null, a); }`],
    ["wrapper.call shadowed (no es el global)", `/** @server-safe */\nconst setTimeout = (s: string) => s;\nexport function f() { return (setTimeout as any).call(null, "x"); }`],
  ])("NO flaggea: %s", (_l, code) => {
    expect(checkSourceFile(code, "timer-alias-neg.fixture.tsx")).toEqual([]);
  });

  it("caza `Reflect.construct(Function, [...])` (vía Function como arg)", () => {
    const v = checkSourceFile(
      fixture(
        `const f = Reflect.construct(Function, ["return window"]);`,
      ),
      "Reflect-construct.fixture.tsx",
    );
    expect(v.length).toBeGreaterThan(0);
    // Function aparece como identifier en posición de read (arg) → caza.
    expect(v.some((it) => it.detail.includes("Function"))).toBe(true);
  });

  it("caza `Reflect.construct(...[F.constructor, [...]])` con .constructor en SPREAD (codex P2)", () => {
    const v = checkSourceFile(
      fixture(`Reflect.construct(...[((() => {}) as any).constructor, ["return window"]])();`),
      "Reflect-construct-spread.fixture.tsx",
    );
    expect(v.some((it) => it.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it("caza `Reflect.construct(...(c ? [F.constructor, [...]] : []))` con .constructor en cond-spread (codex P2)", () => {
    const v = checkSourceFile(
      fixture(`const c = (0 as unknown as boolean); Reflect.construct(...(c ? [((() => {}) as any).constructor, ["return window"]] : []) as any)();`),
      "Reflect-construct-cond-spread.fixture.tsx",
    );
    expect(v.some((it) => it.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it("caza el CALLEE Reflect value-transparente `(0, Reflect.apply)(F.constructor, …)` (codex P2)", () => {
    const apply = checkSourceFile(
      fixture(`(0, Reflect.apply)(((() => {}) as any).constructor, null, ["return window"]);`),
      "Reflect-apply-vt-callee.fixture.tsx",
    );
    expect(apply.some((it) => it.rule === "no-dynamic-eval-sink")).toBe(true);
    const construct = checkSourceFile(
      fixture(`(0, Reflect.construct)(((() => {}) as any).constructor, ["return window"])();`),
      "Reflect-construct-vt-callee.fixture.tsx",
    );
    expect(construct.some((it) => it.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it("caza `globalThis.constructor.constructor(...)` (vía globalThis access)", () => {
    const v = checkSourceFile(
      fixture(`const w = globalThis.constructor.constructor("return window")();`),
      "globalThis-constructor.fixture.tsx",
    );
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((it) => it.detail.includes("globalThis"))).toBe(true);
  });

  it("DYNAMIC_EVAL_SINKS exporta el set esperado", () => {
    expect(DYNAMIC_EVAL_SINKS.has("eval")).toBe(true);
    expect(DYNAMIC_EVAL_SINKS.has("Function")).toBe(true);
  });
});

// ─── Virtual FS para tests cross-módulo (beta.26 HIGH-2) ──────────
//
// Construir fixtures multi-archivo en disco sería ruido en el árbol del
// repo. En su lugar inyectamos `readFile` + `fileExists` al orquestador
// con un Map<absPath, content>. El orquestador no diferencia disco real
// vs virtual mientras los paths sean absolutos coherentes.
//
// Convención: los paths simulan vivir bajo `/repo/src/...`. Los entries
// del Map deben incluir TANTAS extensiones como el resolver pueda probar
// (`.ts`, `.tsx`, `/index.ts`, `/index.tsx`) — pero solo la "real". El
// resolver itera la cascada y se queda con la primera que `fileExists`
// devuelva true. tsconfigPaths se inyecta también porque la cache real
// apunta a `repoRoot` físico.

interface VirtualEntry {
  content: string;
}
type VirtualFs = Map<string, VirtualEntry>;

function vfs(entries: Record<string, string>): VirtualFs {
  const map = new Map<string, VirtualEntry>();
  for (const [path, content] of Object.entries(entries)) {
    map.set(path, { content });
  }
  return map;
}

function runWithVfs(
  entryPath: string,
  files: VirtualFs,
  tsconfigPaths: Array<{ prefix: string; targetPrefix: string }> = [
    { prefix: "@/", targetPrefix: "src/" },
  ],
) {
  return checkFileWithImports(entryPath, {
    tsconfigPaths,
    // Roots virtuales: el orquestador real apunta al disco físico, pero
    // los fixtures simulan `/repo/...`. Inyectamos ambos para que la
    // resolución de alias y el check `inSrc` operen en el espacio virtual.
    repoRoot: "/repo",
    srcRoot: "/repo/src",
    readFile: (p: string) => {
      const entry = files.get(p);
      if (!entry) throw new Error(`[vfs] missing: ${p}`);
      return entry.content;
    },
    fileExists: (p: string) => files.has(p),
  });
}

describe("server-safe gate — smuggling cross-módulo (beta.26 HIGH-2)", () => {
  it("caza util sucio importado directamente (depth 1)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { format } from "./format";
        export function Probe() { return <span>{format()}</span>; }
      `,
      "/repo/src/components/Probe/format.ts": `
        export function format() { return window.innerWidth; }
      `,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    expect(violations.length).toBeGreaterThan(0);
    const smuggled = violations.find((v) =>
      v.file.endsWith("Probe/format.ts"),
    );
    expect(smuggled).toBeDefined();
    expect(smuggled?.chain).toEqual([
      "src/components/Probe/Probe.tsx",
      "src/components/Probe/format.ts",
    ]);
  });

  it("FALLA RUIDOSO si un hermano .mjs sombrea el .ts resuelto (gate-vs-Vite extension precedence, hunt final #173)", () => {
    // El gate resolvería helper.ts (limpio) pero Vite envía helper.mjs (sucio): `.mjs` rankea
    // antes que `.ts` en resolve.extensions. Sin guard = audita el archivo equivocado = bypass
    // cross-módulo (latente: 0 .mjs en src hoy). Fail-closed: resolución ambigua → unresolved.
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { v } from "./helper";
        export function Probe() { return <span>{v}</span>; }
      `,
      "/repo/src/components/Probe/helper.ts": `export const v = 1;`,
      "/repo/src/components/Probe/helper.mjs": `export const v = screen.width;`,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => /AMBIGUO/.test(v.detail))).toBe(true);
  });

  it("FALLA RUIDOSO si el @server-safe importa un archivo JS no auditable (`.mjs`/`.cjs`/`.jsx`, codex P1)", () => {
    // El gate audita SOLO .ts/.tsx. Seguir un .cjs reabriría el smuggling (el walker extrae imports
    // ESM, NO `require()`), y un .jsx/.mjs requeriría modelar su parser/edges → fail-closed: importar
    // JS-family desde el grafo @server-safe es unresolvable RUIDOSO (no se audita JS, no se asume safe).
    const dirty = `export const v = screen.width;`;
    for (const ext of ["mjs", "cjs", "js", "jsx", "cts", "mts"]) {
      const files = vfs({
        "/repo/src/components/Probe/Probe.tsx": `
          /** @server-safe */
          import { v } from "./helper.${ext}";
          export function Probe() { return <span>{v}</span>; }
        `,
        [`/repo/src/components/Probe/helper.${ext}`]: dirty,
      });
      const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some((v) => /no auditable/i.test(v.detail))).toBe(true);
    }
  });

  it("import por LOADER de bundler → external SEGÚN alcance (universal vs ext-restringido); loader-sobre-código `.ts` o query arbitraria → audita (codex P1/P2 + workflow-hunt)", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const assetExists = (p: string) => /\.(wasm|css|png|svg)$/.test(p);
    // UNIVERSAL (raw/url/worker/sharedworker): desvían CUALQUIER base (incl. `.ts`) — el valor importado es
    // string/URL/Worker, NO el módulo ejecutado → external sin mirar existencia ni extensión:
    for (const spec of ["./img.png?url", "./x.ts?raw", "./w.ts?worker", "./s.ts?sharedworker", "./edge.ts?worker"]) {
      expect(resolveImportPath(spec, "/repo/src/c.tsx", [], () => false, roots).kind).toBe("external");
    }
    // `?init` es EXT-RESTRINGIDO a `.wasm` (Vite wasmInitRE): sobre `.wasm` → external (short-circuit, sin
    // mirar existencia); sobre un `.ts` NO desvía nada → cae a resolve+audit (ver fail-open cerrado abajo):
    expect(resolveImportPath("./add.wasm?init", "/repo/src/c.tsx", [], () => false, roots).kind).toBe("external");
    // `?module` NO existe como query de Vite; `?inline` solo modifica CSS/asset — sobre un asset siguen siendo
    // external vía hasAssetExt tras DESLIGAR la query (requiere que el asset EXISTA, si no → fail-loud):
    expect(resolveImportPath("./add.wasm?module", "/repo/src/c.tsx", [], assetExists, roots).kind).toBe("external");
    expect(resolveImportPath("./styles.css?inline", "/repo/src/c.tsx", [], assetExists, roots).kind).toBe("external");
    // FAIL-OPEN CERRADO (workflow-hunt, verificado contra Vite 8 `ssrLoadModule` real): `?inline`/`?module`/
    // `?init` sobre un `.ts` EJECUTABLE NO son loaders — Vite transpila+ejecuta el .ts (cleanUrl quita la
    // query) → AUDITAR. Antes caían a external (whitelist over-broad) y el `process.cwd()` se saltaba la auditoría:
    const codeExists = (p: string) => p.endsWith("/edge.ts");
    for (const q of ["?inline", "?module", "?init"]) {
      expect(resolveImportPath(`./edge.ts${q}`, "/repo/src/c.tsx", [], codeExists, roots).kind).toBe("internal");
    }
    // …y end-to-end por el grafo: `./edge.ts?inline` arrastra la violación del módulo sucio (no se salta):
    const v = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nimport x from "./edge.ts?inline";\nexport function P() { return x; }`,
        "/repo/src/edge.ts": `export default process.cwd();`,
      }),
    );
    expect(v.some((x) => x.file.endsWith("edge.ts"))).toBe(true);
    // codex P1: query ARBITRARIA (`?v=1` cache-bust, NO loader) sobre un `.ts` EJECUTABLE → DESLIGA + AUDITA:
    expect(resolveImportPath("./edge.ts?v=1", "/repo/src/c.tsx", [], codeExists, roots).kind).toBe("internal");
    expect(resolveImportPath("./edge.ts?t=1&x=2", "/repo/src/c.tsx", [], codeExists, roots).kind).toBe("internal");
    // Asset SIN query que EXISTE (extensión no-código) → external:
    for (const spec of ["./add.wasm", "./styles.css", "./logo.svg"]) {
      expect(resolveImportPath(spec, "/repo/src/c.tsx", [], assetExists, roots).kind).toBe("external");
    }
    expect(resolveImportPath("@/styles.css", "/repo/src/c.tsx", [{ prefix: "@/", targetPrefix: "/repo/src/" }], assetExists, roots).kind).toBe("external");
    // Denegación crítica intacta: JS no-auditable → unresolvable; asset inexistente → fail-loud; builtin → edge-denied:
    expect(resolveImportPath("./legacy.js", "/repo/src/c.tsx", [], (p) => p.endsWith("legacy.js"), roots).kind).toBe("unresolvable");
    expect(resolveImportPath("./nope.wasm", "/repo/src/c.tsx", [], () => false, roots).kind).toBe("unresolvable");
    expect(resolveImportPath("node:fs", "/repo/src/c.tsx", [], () => false, roots).kind).toBe("edge-denied");
  });

  it("LOADER detectado con las regex REALES de Vite (no a-ojo): trailing-ws / `#`-fragment / `=`-form rompen el match → se AUDITA (workflow-final, vs Vite 8 real)", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const codeExists = (p: string) => p.endsWith("/x.ts");
    // A — trailing whitespace/C0 tras el token: Vite exige flag + `&`|fin; un trailing-ws rompe el match →
    //     transpila+EJECUTA el .ts → AUDITAR. El edge-trim del borde lo fabricaba como loader → external (fail-open):
    for (const q of ["?raw ", "?raw\t", "?url ", "?worker\t", "?sharedworker "]) {
      expect(resolveImportPath(`./x.ts${q}`, "/repo/src/c.tsx", [], codeExists, roots).kind).toBe("internal");
    }
    // B — `#`-fragment: Vite cleanUrl quita `?query` Y `#hash`; `#.wasm?init` NO es wasm-init (el lookbehind
    //     `(?<![?#].*)` lo descalifica) → la base real es el `.ts` → AUDITAR (no external por `baseIsWasm` falso):
    expect(resolveImportPath("./x.ts#.wasm?init", "/repo/src/c.tsx", [], codeExists, roots).kind).toBe("internal");
    expect(resolveImportPath("./x.ts#frag", "/repo/src/c.tsx", [], codeExists, roots).kind).toBe("internal");
    // C — `=`-form: la regex real (`(?:&|$)`) NO matchea `?raw=1` → EJECUTA → AUDITAR:
    expect(resolveImportPath("./x.ts?raw=1", "/repo/src/c.tsx", [], codeExists, roots).kind).toBe("internal");
    // Controles GENUINOS (Vite SÍ los honra → external):
    for (const q of ["?raw", "?url", "?worker", "?raw&v=1", "?v=1&raw"]) {
      expect(resolveImportPath(`./x.ts${q}`, "/repo/src/c.tsx", [], codeExists, roots).kind).toBe("external");
    }
    expect(resolveImportPath("./add.wasm?init", "/repo/src/c.tsx", [], () => false, roots).kind).toBe("external");
    // End-to-end por grafo: el `.ts` sucio tras un trailing-ws / `#`-fragment se AUDITA (no se salta):
    for (const q of ["?raw ", "#.wasm?init"]) {
      const v = runWithVfs(
        "/repo/src/c.tsx",
        vfs({
          "/repo/src/c.tsx": `/** @server-safe */\nimport x from "./x.ts${q}";\nexport function P() { return x; }`,
          "/repo/src/x.ts": `export default process.cwd();`,
        }),
      );
      expect(v.some((e) => e.file.endsWith("x.ts"))).toBe(true);
    }
  });

  it("import EXTENSIONLESS que resuelve a `.json` → external (Vite resolve.extensions + precedencia file-vs-dir), codex P2", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const has = (set: string[]) => (p: string) => set.includes(p);
    // FP cerrado: `./data` con data.json → external (JSON = datos, no código de render); dot + alias:
    expect(resolveImportPath("./data", "/repo/src/c.tsx", [], has(["/repo/src/data.json"]), roots).kind).toBe("external");
    expect(resolveImportPath("@/data", "/repo/src/c.tsx", [{ prefix: "@/", targetPrefix: "/repo/src/" }], has(["/repo/src/data.json"]), roots).kind).toBe("external");
    // Precedencia Vite: `<base>.json` FILE gana al dir-index (file-beats-dir):
    expect(resolveImportPath("./foo", "/repo/src/c.tsx", [], has(["/repo/src/foo.json", "/repo/src/foo/index.ts"]), roots).kind).toBe("external");
    // …pero PIERDE ante un source/JS FILE (más precedencia en resolve.extensions):
    expect(resolveImportPath("./mix", "/repo/src/c.tsx", [], has(["/repo/src/mix.ts", "/repo/src/mix.json"]), roots).kind).toBe("internal");
    expect(resolveImportPath("./jx", "/repo/src/c.tsx", [], has(["/repo/src/jx.js", "/repo/src/jx.json"]), roots).kind).toBe("unresolvable");
    // dir-index json: `dir/index.json` solo → external; `dir2/index.ts` gana a `dir2/index.json`:
    expect(resolveImportPath("./dir", "/repo/src/c.tsx", [], has(["/repo/src/dir/index.json"]), roots).kind).toBe("external");
    expect(resolveImportPath("./dir2", "/repo/src/c.tsx", [], has(["/repo/src/dir2/index.ts", "/repo/src/dir2/index.json"]), roots).kind).toBe("internal");
  });

  it("import de DIRECTORIO con `package.json` (redirect main/exports → posible CÓDIGO) NO se externaliza vía index.json → fail-closed (codex P2, vs Vite 8 real)", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const has = (set: string[]) => (p: string) => set.includes(p);
    const B = "/repo/src/pkg";
    // FAIL-OPEN CERRADO: Vite consulta `pkg/package.json` (main→edge.ts CÓDIGO) ANTES del dir-index; con un
    // `pkg/index.json` presente el gate lo externalizaba como asset SIN auditar el edge.ts que Vite EJECUTA
    // (verificado vs Vite 8 ssrLoadModule real). resolveImportPath no lee package.json (resolución de paquetes,
    // §373) → fail-closed RUIDOSO. Incl. cleanUrl(#frag/?x):
    const redirect = has([`${B}/package.json`, `${B}/edge.ts`, `${B}/index.json`]);
    for (const s of ["./pkg", "./pkg#frag", "./pkg?x"]) {
      expect(resolveImportPath(s, "/repo/src/c.tsx", [], redirect, roots).kind).toBe("unresolvable");
    }
    expect(resolveImportPath("@/pkg", "/repo/src/c.tsx", [{ prefix: "@/", targetPrefix: "src/" }], redirect, roots).kind).toBe("unresolvable");
    // Controles (no regresión): index.json SIN package.json → external (Vite carga el json); file-beats-dir
    // (`pkg.ts`/`pkg.json` archivo gana al dir) → internal/external; index.ts SIN package.json → internal:
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`${B}/index.json`]), roots).kind).toBe("external");
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has(["/repo/src/pkg.ts", `${B}/package.json`]), roots).kind).toBe("internal");
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has(["/repo/src/pkg.json", `${B}/package.json`]), roots).kind).toBe("external");
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`${B}/index.ts`]), roots).kind).toBe("internal");
    // End-to-end por grafo: un @server-safe que importa el dir-con-package.json se flaggea (no se salta como asset):
    const v = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nimport pkg from "./pkg";\nexport function P() { return pkg; }`,
        "/repo/src/pkg/package.json": `{ "main": "./edge.ts" }`,
        "/repo/src/pkg/edge.ts": `export default process.cwd();`,
        "/repo/src/pkg/index.json": `{}`,
      }),
    );
    expect(v.length).toBeGreaterThan(0);
  });

  it("frontera file-beats-dir del guard package.json: un hermano padre EN resolve.extensions suprime el guard; `.cjs`/`.cts` NO (codex P2, vs Vite 8.1 real)", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const has = (set: string[]) => (p: string) => set.includes(p);
    const B = "/repo/src/pkg";
    const pj = `${B}/package.json`;
    const edge = `${B}/edge.ts`; // package.json main→edge.ts (CÓDIGO) — sentinela de "Vite entró al dir"
    // FILE-winners AUDITABLES (`.ts`/`.tsx`): Vite carga `pkg.<ext>` (file-beats-dir), nunca entra al dir →
    // el gate audita ese archivo → internal. Prueba que el guard se SUPRIME con un file-winner padre:
    for (const ext of [".ts", ".tsx"]) {
      expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`/repo/src/pkg${ext}`, pj, edge]), roots).kind).toBe("internal");
    }
    // FILE-winners JS-family (`.mjs`/`.js`/`.mts`/`.jsx`): Vite carga el archivo (file-beats-dir) PERO el gate
    // no audita JS-family ni resuelve un parent bare JS → unresolvable (fail-closed, política JS-no-auditable
    // preexistente). NO external: el guard se suprime, pero la resolución JS-parent ya fail-cierra:
    for (const ext of [".mjs", ".js", ".mts", ".jsx"]) {
      expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`/repo/src/pkg${ext}`, pj, edge]), roots).kind).toBe("unresolvable");
    }
    // `.json` file-winner → Vite carga el json asset → external (file-beats-dir, guard suprimido):
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`/repo/src/pkg.json`, pj, edge]), roots).kind).toBe("external");
    // `.cjs`/`.cts` NO son file-winners (Vite los IGNORA y ENTRA al dir → corre edge.ts) → el guard DEBE
    // disparar → unresolvable. (Si alguien mete .cjs/.cts en VITE_RESOLVE_EXTS, el helper los vería como
    // file-winner y suprimiría el guard → este invariante rompe. Oráculo Vite 8.1: .cjs/.cts → DIR.)
    for (const ext of [".cjs", ".cts"]) {
      expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`/repo/src/pkg${ext}`, pj, edge]), roots).kind).toBe("unresolvable");
    }
  });

  it("file-beats-dir gana al `dir/index.json`: un parent source sibling COEXISTIENDO con pkg/index.json NO se externaliza — lockea resolvesToJsonAsset contra un short-circuit por index.json (codex P2, vs Vite 8.1 real)", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const has = (set: string[]) => (p: string) => set.includes(p);
    const B = "/repo/src/pkg";
    const idx = `${B}/index.json`;
    const pj = `${B}/package.json`;
    // Oráculo Vite 8.1: con un parent source file-winner presente, Vite corre el PARENT (file-beats-dir) e
    // IGNORA pkg/index.json (y package.json). resolvesToJsonAsset recorre VITE_RESOLVE_ORDER (parent-exts ANTES
    // de /index.json) → el parent se encuentra PRIMERO → NO externaliza. La señal BLOQUEANTE sería `external`
    // (Vite corre código no auditado); internal-vs-unresolvable es calibración. Esta celda (parent ∩ index.json)
    // no la tocaban los otros tests → guardia anti-regresión contra un futuro short-circuit por index.json:
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`/repo/src/pkg.ts`, idx]), roots).kind).toBe("internal");
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`/repo/src/pkg.tsx`, idx]), roots).kind).toBe("internal");
    // parent JS-family: Vite corre JS NO auditable → unresolvable (fail-closed; NUNCA external):
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`/repo/src/pkg.mjs`, idx]), roots).kind).toBe("unresolvable");
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`/repo/src/pkg.js`, idx]), roots).kind).toBe("unresolvable");
    // con package.json TAMBIÉN en el dir: el parent file-winner sigue ganando → mismo veredicto (no external):
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`/repo/src/pkg.ts`, pj, idx]), roots).kind).toBe("internal");
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`/repo/src/pkg.mjs`, pj, idx]), roots).kind).toBe("unresolvable");
    // CONTROL: sin parent sibling, solo index.json → external (Vite carga el json, no hay parent que correr):
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([idx]), roots).kind).toBe("external");
  });

  it("guard package.json dispara por PRESENCIA (sin index.json): package.json + index.ts/index.tsx/solo → unresolvable; sin package.json → internal (codex P2)", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const has = (set: string[]) => (p: string) => set.includes(p);
    const B = "/repo/src/pkg";
    // El guard fail-closea por PRESENCIA de package.json (no lee main → no sabe si apunta a ./index o a CÓDIGO),
    // SIN necesidad de index.json. Verdicto sin cambio vs el viejo guard 2c (ambos unresolvable):
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`${B}/package.json`, `${B}/index.ts`]), roots).kind).toBe("unresolvable");
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`${B}/package.json`, `${B}/index.tsx`]), roots).kind).toBe("unresolvable");
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`${B}/package.json`]), roots).kind).toBe("unresolvable");
    // CONTROL: el MISMO dir SIN package.json + index.ts → internal (auditado). Prueba que el flip lo dispara
    // el package.json, no el index:
    expect(resolveImportPath("./pkg", "/repo/src/c.tsx", [], has([`${B}/index.ts`]), roots).kind).toBe("internal");
  });

  it("subpath-import de package (`#edge`, leading `#`) → unresolvable: Vite lo resuelve vía package.json#imports (posible código), no leído por el gate (codex P2, §373, vs Vite 8 real)", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const yes = () => true;
    // Vite resuelve `#edge` vía package.json#imports → ./src/edge.ts EJECUTADO (verificado). cleanUrl borraría
    // el `#` inicial (→ "" → external = fail-open); el gate no lee package.json#imports (§373) → fail-closed.
    // ANTES del loader: un `#edge?raw` no debe tomar el atajo loader→external:
    for (const s of ["#edge", "#internal/foo", "#edge/sub", "#edge?raw"]) {
      expect(resolveImportPath(s, "/repo/src/c.tsx", [], yes, roots).kind).toBe("unresolvable");
    }
    // CONTROL: un `#` NO-inicial es un fragment de verdad → cleanUrl lo quita → resuelve la base (.ts → internal):
    const has = (set: string[]) => (p: string) => set.includes(p);
    expect(resolveImportPath("./x.ts#frag", "/repo/src/c.tsx", [], has(["/repo/src/x.ts"]), roots).kind).toBe("internal");
  });

  it("asset por ALLOWLIST de Vite (no deny-list): ext desconocida que Vite ejecuta como módulo → unresolvable; asset conocido → external (codex P2, vs Vite 8 real)", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const has = (set: string[]) => (p: string) => set.includes(p);
    // FAIL-OPEN CERRADO: una ext FUERA del allowlist de Vite (`.payload`/`.weirdext`/`.bin`/`.coffee`) NO es
    // asset — el resolver la resuelve y vite:load-fallback la lee como MÓDULO → la EJECUTA (verificado: un
    // `.payload` con JS válido corre). El deny-list anterior (no-JS/TS → asset) la externalizaba SIN auditar =
    // fail-open. Ahora → unresolvable fail-closed:
    for (const a of ["./edge.payload", "./x.weirdext", "./data.bin", "./mod.coffee"]) {
      expect(resolveImportPath(a, "/repo/src/c.tsx", [], has([`/repo/src/${a.slice(2)}`]), roots).kind).toBe("unresolvable");
    }
    // Assets CONOCIDOS de Vite (KNOWN_ASSET_TYPES verbatim + CSS_LANGS + json + wasm) → external (sin regresión):
    for (const a of ["./logo.svg", "./styles.css", "./img.png", "./p.jpeg", "./p.jpg", "./f.woff2", "./d.pdf", "./n.txt", "./s.scss", "./i.webp", "./data.json", "./add.wasm"]) {
      expect(resolveImportPath(a, "/repo/src/c.tsx", [], has([`/repo/src/${a.slice(2)}`]), roots).kind).toBe("external");
    }
  });

  it("meta: VITE_ASSET_RE + VITE_RESOLVE_EXTS siguen siendo el snapshot del Vite instalado — anti version-drift (Auditor-B)", () => {
    // VITE_ASSET_RE (= KNOWN_ASSET_TYPES verbatim) y VITE_RESOLVE_EXTS (= resolve.extensions default) son FOTOS
    // hardcodeadas de node_modules/vite/dist. Un bump de Vite que cambie esas listas re-abriría un fail-open (una
    // ext que pasó a no-asset → ejecutada → externalizada) o metería FPs, EN SILENCIO. Este meta-test re-extrae
    // las listas del dist instalado y las compara con las constantes → si Vite cambia el set, CI rompe RUIDOSO con
    // el diff exacto. Cierra de un golpe la clase de drift (resolve.extensions #173, asset-allowlist, assetsInclude #190).
    const dir = `${process.cwd()}/node_modules/vite/dist/node/chunks`;
    let knownRaw: string | null = null;
    let defExtRaw: string | null = null;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".js")) continue;
      const s = readFileSync(`${dir}/${file}`, "utf8");
      knownRaw ??= s.match(/KNOWN_ASSET_TYPES\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? null;
      defExtRaw ??= s.match(/DEFAULT_EXTENSIONS\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? null;
    }
    expect(knownRaw).toBeTruthy();
    expect(defExtRaw).toBeTruthy();
    const parse = (raw: string) =>
      [...raw.matchAll(/['"`]([^'"`,\s]+)['"`]/g)].map((m) => m[1]);
    // Lee los SNAPSHOTS hardcodeados del SOURCE del gate y compáralos con el dist (sin importar las constantes:
    // el .mjs sin .d.ts no las expone a TS). Si Vite bumpea y cambia el set, una de estas dos rompe RUIDOSO:
    const gate = readFileSync(
      `${process.cwd()}/scripts/check-server-safe-markers.mjs`,
      "utf8",
    );
    // (1) el literal VITE_ASSET_RE del gate embebe la lista EXACTA de KNOWN_ASSET_TYPES de Vite:
    expect(gate).toContain(parse(knownRaw as string).join("|"));
    // (2) VITE_RESOLVE_EXTS del gate == DEFAULT_EXTENSIONS de Vite menos `.json` (que el gate maneja aparte):
    const gateExtsRaw =
      gate.match(/const VITE_RESOLVE_EXTS\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? "";
    expect(parse(gateExtsRaw)).toEqual(
      parse(defExtRaw as string).filter((e) => e !== ".json"),
    );
  });

  it("import con ESQUEMA URL (`data:`/`http:`/`blob:`/`file:`) → unresolvable (carga código no auditable, NO peer), codex P2", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const no = () => false;
    // FAIL-OPEN cerrado: `data:` es JS inline ejecutable; http/blob/file cargan módulo remoto/dinámico:
    for (const spec of ["data:text/javascript,export default 1", "https://evil.com/m.js", "http://x/m.js", "blob:abc", "file:///x.js"]) {
      expect(resolveImportPath(spec, "/repo/src/c.tsx", [], no, roots).kind).toBe("unresolvable");
    }
    // Protocol-relative `//host/x` (hereda http/https) — la regex de esquema (letra+`:`) NO lo caza (empieza
    // con `//`) → fail-closed EXPLÍCITO por diseño (URL remota, no peer ni local). codex-diligencia (la 9ª
    // dimensión que el barrido del resolver destapó: el esquema-URL que la regex de esquema no ve).
    expect(resolveImportPath("//evil.com/x", "/repo/src/c.tsx", [], no, roots).kind).toBe("unresolvable");
    expect(resolveImportPath("//cdn.example/m.js?worker", "/repo/src/c.tsx", [], no, roots).kind).toBe("unresolvable");
    // codex P2 (eff6e1b): un esquema-URL que lleva un loader BARE en su PROPIA query NO debe tomar el atajo
    // loader→external del bloque `?query` — el rechazo de esquema corre ANTES. Sin esto, el módulo inline
    // (`process.cwd()`) se saltaba la auditoría (corre en Node-dev, rompe en Edge). Es el mismo eje de
    // ordenación que el `?query` over-broad: un check temprano no debe interceptar un rechazo posterior.
    const yes = () => true;
    for (const spec of [
      "data:text/javascript,export default process.cwd();//?raw", // el caso EXACTO de codex
      "data:text/javascript,x?url",
      "https://evil.com/m.js?worker",
      "blob:abc?raw",
    ]) {
      expect(resolveImportPath(spec, "/repo/src/c.tsx", [], no, roots).kind).toBe("unresolvable");
      // fail-closed POR DISEÑO: el rechazo de esquema gana aunque "exista" un archivo (corre antes de tryResolveFile):
      expect(resolveImportPath(spec, "/repo/src/c.tsx", [], yes, roots).kind).toBe("unresolvable");
    }
    // …y el control inverso sigue vivo: un loader LOCAL legítimo (sin esquema) → external (cae al `?query`):
    expect(resolveImportPath("./asset.png?url", "/repo/src/c.tsx", [], no, roots).kind).toBe("external");
    expect(resolveImportPath("@/x?worker", "/repo/src/c.tsx", [{ prefix: "@/", targetPrefix: "src/" }], no, roots).kind).toBe("external");
    // …pero un solo `/` (absoluto) NO es protocol-relative → no lo caza el check de `//`:
    expect(resolveImportPath("react", "/repo/src/c.tsx", [], no, roots).kind).toBe("external"); // control: peer sin esquema
    // Flujo completo por FORMA de entrega del literal (checkFileWithImports sigue el grafo): cast (caso de
    // codex), directo, static, template-sin-interp → todas FLAGGEAN; el cast/template no salvan el data::
    const flow = (entry: string) =>
      runWithVfs("/repo/src/c.tsx", vfs({ "/repo/src/c.tsx": `/** @server-safe */\n${entry}` })).length > 0;
    expect(flow(`export async function P() { return import(("data:text/javascript,export default process.cwd()") as string); }`)).toBe(true); // cast (codex)
    expect(flow(`export async function P() { return import("data:text/javascript,export default 1"); }`)).toBe(true); // directo
    expect(flow(`import x from "data:text/javascript,export default 1";\nexport const P = () => x;`)).toBe(true); // static
    expect(flow("export async function P() { return import(`data:text/javascript,export default 1`); }")).toBe(true); // template-sin-interp
    // Controles: peer (sin `:`) → external; builtin → edge-denied (NO afectados por el scheme-check):
    expect(resolveImportPath("react", "/repo/src/c.tsx", [], no, roots).kind).toBe("external");
    expect(resolveImportPath("@scope/pkg", "/repo/src/c.tsx", [], no, roots).kind).toBe("external");
    expect(resolveImportPath("lodash/fp", "/repo/src/c.tsx", [], no, roots).kind).toBe("external");
    expect(resolveImportPath("node:fs", "/repo/src/c.tsx", [], no, roots).kind).toBe("edge-denied");
  });

  it("self-reference por NOMBRE PROPIO (`reactigoded`, `reactigoded/x`) → unresolvable fail-closed, NO external silencioso: Vite lo resuelve vía package.json#exports a dist, fuera del src auditado (Auditor-B + CC)", () => {
    const files = (spec: string) =>
      vfs({
        "/repo/package.json": `{ "name": "reactigoded", "exports": { ".": "./dist/index.js" } }`,
        "/repo/src/c.tsx": `/** @server-safe */
import { z } from "${spec}";
export const y = z;`,
      });
    const isSelfRef = (spec: string) =>
      runWithVfs("/repo/src/c.tsx", files(spec)).some((v) =>
        /self-reference/.test(v.detail),
      );
    // self-import por el nombre propio → fail-closed (primer segmento == nombre del paquete):
    expect(isSelfRef("reactigoded")).toBe(true);
    expect(isSelfRef("reactigoded/components/Button")).toBe(true);
    // externos legítimos (incl. un nombre con el propio como PREFIJO) → NO tocados (external = sin violación):
    expect(runWithVfs("/repo/src/c.tsx", files("react"))).toEqual([]);
    expect(runWithVfs("/repo/src/c.tsx", files("clsx"))).toEqual([]);
    expect(runWithVfs("/repo/src/c.tsx", files("reactigoded-other"))).toEqual([]); // prefijo, no el paquete propio
    // el loader gana ANTES del check: `reactigoded?raw` = external (raw text, no ejecuta):
    expect(runWithVfs("/repo/src/c.tsx", files("reactigoded?raw"))).toEqual([]);
    // GUARD de `exports`: Node SOLO permite self-reference si el paquete declara `exports`; sin él, `import
    // "reactigoded"` desde dentro NO auto-resuelve (va a node_modules/external) → NO es vector → NO se caza:
    const sinExports = vfs({
      "/repo/package.json": `{ "name": "reactigoded" }`,
      "/repo/src/c.tsx": `/** @server-safe */
import { z } from "reactigoded";
export const y = z;`,
    });
    expect(runWithVfs("/repo/src/c.tsx", sinExports)).toEqual([]);
  });

  it("NORMALIZA whitespace/C0 borde + tab/LF/CR interno como el runtime ESM/WHATWG: ` data:…` → unresolvable (no external), parity con el sin-espacio (workflow-hunt)", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const no = () => false;
    const yes = () => true;
    // FAIL-OPEN CERRADO: un espacio/tab/newline INICIAL derrotaba los guards anclados en char[0] (`//` y la
    // regex de esquema) → ` data:…process.cwd()` caía a external SIN auditar; rolldown lo emite crudo al dist y
    // Node lo EJECUTA (verificado). El runtime recorta el borde → el gate lo modela → se ve como `data:`:
    for (const spec of [
      " data:text/javascript,export default process.cwd()", // espacio inicial (el caso del workflow)
      "\tdata:text/javascript,x", // tab inicial
      "\ndata:text/javascript,x", // newline inicial
      "  \t data:text/javascript,x", // run mixto
      "data:text/javascript,x   ", // whitespace FINAL
      "da\tta:text/javascript,x", // tab INTERNO (WHATWG lo elimina → `data:`)
    ]) {
      expect(resolveImportPath(spec, "/repo/src/c.tsx", [], no, roots).kind).toBe("unresolvable");
      // fail-closed POR DISEÑO: gana aunque "exista" un archivo (la normalización corre antes de resolver):
      expect(resolveImportPath(spec, "/repo/src/c.tsx", [], yes, roots).kind).toBe("unresolvable");
    }
    // El protocol-relative con espacio inicial también se recupera (tras recortar → `//host` → unresolvable):
    expect(resolveImportPath(" //evil.com/x", "/repo/src/c.tsx", [], no, roots).kind).toBe("unresolvable");
    // Control: un specifier LEGÍTIMO con whitespace de borde se recorta y resuelve+audita NORMAL (no FP, no
    // external nuevo): ` ./edge.ts ` → `./edge.ts` → internal; ` react` → `react` → external (peer):
    const codeExists = (p: string) => p.endsWith("/edge.ts");
    expect(resolveImportPath(" ./edge.ts ", "/repo/src/c.tsx", [], codeExists, roots).kind).toBe("internal");
    expect(resolveImportPath("  react", "/repo/src/c.tsx", [], no, roots).kind).toBe("external");
    // REGRESIÓN-FAIL-OPEN (breaker-adversarial): el strip de tab/LF/CR INTERNO es solo del parser URL, NO de
    // los TOKENS de loader-query (Vite los detecta por regex sobre el request CRUDO → `?ra\tw` ≠ raw → Vite
    // TRANSPILA+EJECUTA el .ts, idéntico a `?v=1`). Aplicar el strip global fabricaba un loader `raw` y mandaba
    // el .ts (con process.cwd()) a external SIN auditar. El split (edge-trim global + strip interno SOLO en
    // urlProbe para `//`/esquema) lo cierra → el .ts se AUDITA:
    const xExists = (p: string) => p.endsWith("/x.ts");
    // tab INTERNO (no es line-terminator): cleanUrl (postfixRE, sin `/s`) cruza el `\t` y stripea la query
    // → base `./x.ts` → Vite la transpila+EJECUTA → AUDITAR (internal), idéntico a Vite real:
    for (const tok of ["ra\tw", "shared\tworker", "x&ra\tw"]) {
      expect(resolveImportPath(`./x.ts?${tok}`, "/repo/src/c.tsx", [], xExists, roots).kind).toBe("internal");
    }
    // newline/CR INTERNO en la query: el `.` de postfixRE NO cruza line-terminators (igual que Vite, sin
    // `/s`) → cleanUrl NO stripea → se resuelve un archivo con `\n`/`\r` que NO existe → unresolvable. Vite
    // tampoco lo resuelve (crashea) → mismo fail-closed SEGURO, NO un fail-open:
    for (const tok of ["u\nrl", "work\rer"]) {
      expect(resolveImportPath(`./x.ts?${tok}`, "/repo/src/c.tsx", [], xExists, roots).kind).toBe("unresolvable");
    }
    // …mientras el loader GENUINO (sin char interno) sigue external; y `da\tta:` (tab interno en el ESQUEMA, que
    // el parser URL sí elimina) sigue cazándose vía urlProbe → unresolvable:
    expect(resolveImportPath("./x.ts?raw", "/repo/src/c.tsx", [], xExists, roots).kind).toBe("external");
    expect(resolveImportPath("da\tta:text/javascript,x", "/repo/src/c.tsx", [], no, roots).kind).toBe("unresolvable");
    // End-to-end por el grafo: `./x.ts?ra\tw` arrastra la violación del módulo sucio (no se salta la auditoría):
    const gv = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nimport v from "./x.ts?ra\tw";\nexport function P() { return v; }`,
        "/repo/src/x.ts": `export default process.cwd();`,
      }),
    );
    expect(gv.some((x) => x.file.endsWith("x.ts"))).toBe(true);
  });

  it("SIGUE el dynamic import RENDER-PATH con specifier literal (relativo/alias) y audita el módulo; deferred/variable/builtin por su vía (codex P1)", () => {
    const dirty = `export function cwd() { return process.cwd(); }`;
    // 1. FAIL-OPEN CERRADO: `await import("./x")` en el render audita ./x.ts (process.cwd → flag).
    let v = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nexport async function P() { const m = await import("./x"); return m.cwd(); }`,
        "/repo/src/x.ts": dirty,
      }),
    );
    expect(v.length).toBeGreaterThan(0);
    // 2. PARIDAD con el check de builtins: en cuerpo cliente-diferido (useEffect) NO se sigue (no FP).
    v = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nimport { useEffect } from "react";\nexport function P() { useEffect(() => { import("./x"); }, []); return null; }`,
        "/repo/src/x.ts": dirty,
      }),
    );
    expect(v).toEqual([]);
    // 3. builtin dynamic → UNA sola violation (flaggeado inline, NO empujado al colector → sin doble-flag).
    v = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nexport async function P() { await import("fs"); return null; }`,
      }),
    );
    expect(v.length).toBe(1);
    // 4. `import(variable)` = data-flow §141 residual → NO se sigue (no hay hoja literal).
    v = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nexport async function P() { const s = "./x"; const m = await import(s); return m.cwd(); }`,
        "/repo/src/x.ts": dirty,
      }),
    );
    expect(v).toEqual([]);
    // 5. limpio render dynamic import → PASA (no FP).
    v = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nexport async function P() { const m = await import("./clean"); return m.ok; }`,
        "/repo/src/clean.ts": `export const ok = 1;`,
      }),
    );
    expect(v).toEqual([]);
  });

  it("typeof-guard client-only suprime el follow de dynamic-import + glob LAZY (paridad con read directo / deferred-body); rama SERVER y eager siguen auditándose (codex P2)", () => {
    const run = (entry: string) =>
      runWithVfs(
        "/repo/src/c.tsx",
        vfs({
          "/repo/src/c.tsx": `/** @server-safe */\n${entry}`,
          "/repo/src/browser-only.ts": `export function f(){ return window.innerWidth; }`,
        }),
      );
    // FP CERRADO: un `import()` dinámico dentro de `if (typeof window !== "undefined")` solo corre en browser →
    // NO se sigue/audita (paridad con el read directo guardado, que activeGuards ya exime). codex P2:
    expect(
      run(`export async function C(){ if (typeof window !== "undefined") { await import("./browser-only"); } return null; }`),
    ).toEqual([]);
    // CONTROL render-path: sin guard → SÍ audita el módulo (window flaggeado):
    expect(
      run(`export async function C(){ await import("./browser-only"); return null; }`).length,
    ).toBeGreaterThan(0);
    // CONTROL NO-FAIL-OPEN: rama SERVER (`typeof window === "undefined"` then) → activeGuards vacío → SÍ audita:
    expect(
      run(`export async function C(){ if (typeof window === "undefined") { await import("./browser-only"); } return null; }`).length,
    ).toBeGreaterThan(0);
    // glob LAZY guardado → NO se sigue; EAGER guardado → SÍ (Vite lo hoistea a module-eval → corre server-side):
    expect(
      run(`export function C(){ if (typeof window !== "undefined") { const m = import.meta.glob("./browser-only.ts"); void m; } return null; }`),
    ).toEqual([]);
    expect(
      run(`export function C(){ if (typeof window !== "undefined") { const m = import.meta.glob("./browser-only.ts", { eager: true }); void m; } return null; }`).length,
    ).toBeGreaterThan(0);
    // FAIL-OPEN CERRADO (codex P2 sobre 6a32565): un guard sobre LOCAL/PARAM/module-decl es VACUO (siempre
    // defined → la rama corre en SSR) → NO es client-only → SÍ se audita. `activeGuards.size` lo inflaba; el
    // fix exige un guard de browser-GLOBAL real (no-local) vía hasClientOnlyGuard:
    expect(
      run(`export async function C(){ const ready = true; if (typeof ready !== "undefined") { await import("./browser-only"); } return null; }`).length,
    ).toBeGreaterThan(0); // guard LOCAL
    expect(
      run(`export async function C(p: unknown){ if (typeof p !== "undefined") { await import("./browser-only"); } return null; }`).length,
    ).toBeGreaterThan(0); // guard PARAM
    expect(
      run(`const ready = true;
export async function C(){ if (typeof ready !== "undefined") { await import("./browser-only"); } return null; }`).length,
    ).toBeGreaterThan(0); // guard MODULE-DECL leído call-time
    expect(
      run(`export function C(){ const ready = true; if (typeof ready !== "undefined") { const m = import.meta.glob("./browser-only.ts"); void m; } return null; }`).length,
    ).toBeGreaterThan(0); // glob LAZY con guard LOCAL (mismo bug, mismo fix)
    // FILA-TRAMPA (Auditor-B): `||`-con-local NO es client-only — `ready` (local) siempre existe → la rama
    // corre TAMBIÉN en SSR aunque `window` esté en activeGuards. collectConjunctionGuards NO recurre por `||`
    // (solo `&&`) → activeGuards VACÍO en el then → AUDITA, en paridad EXACTA con el read directo (que tampoco
    // lo suprime — la estructura del guard ya pesa el operador aguas arriba). import Y glob:
    expect(
      run(`export async function C(){ const ready = true; if (typeof window !== "undefined" || typeof ready !== "undefined") { await import("./browser-only"); } return null; }`).length,
    ).toBeGreaterThan(0);
    expect(
      run(`export function C(){ const ready = true; if (typeof window !== "undefined" || typeof ready !== "undefined") { const m = import.meta.glob("./browser-only.ts"); void m; } return null; }`).length,
    ).toBeGreaterThan(0);
    // AND-con-local: `window` GARANTIZADO → client-only → SUPRIME (el local extra NO des-cualifica):
    expect(
      run(`export async function C(){ const ready = true; if (typeof window !== "undefined" && typeof ready !== "undefined") { await import("./browser-only"); } return null; }`),
    ).toEqual([]);
    // else-de-`=== "undefined"`: el else es CLIENT (window presente) → SUPRIME el import (el then sería server):
    expect(
      run(`export async function C(){ if (typeof window === "undefined") { /* server */ } else { await import("./browser-only"); } return null; }`),
    ).toEqual([]);
    // FAIL-OPEN CERRADO (codex P2 sobre d74e114): un guard sobre un global NODE-PRESENT/edge-missing
    // (`BroadcastChannel`, `MessageChannel` ∈ EDGE_MISSING_GLOBALS) NO es client-only — `typeof X` es TRUE en
    // Node → la rama corre en Node SSR → SÍ se audita. Solo browser-only (ausente en Node Y Edge) suprime:
    expect(
      run(`export async function C(){ if (typeof BroadcastChannel !== "undefined") { await import("./browser-only"); } return null; }`).length,
    ).toBeGreaterThan(0);
    expect(
      run(`export function C(){ if (typeof MessageChannel !== "undefined") { const m = import.meta.glob("./browser-only.ts"); void m; } return null; }`).length,
    ).toBeGreaterThan(0);
    // AND mixto: `window` (browser-only) GARANTIZA client-only aunque haya un Node-present extra → suprime:
    expect(
      run(`export async function C(){ if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") { await import("./browser-only"); } return null; }`),
    ).toEqual([]);
    // CATEGORÍA Edge-present/Node-absent + DESCONOCIDOS (codex P2): `EdgeRuntime`/`caches`/`Deno`/unknown NO son
    // browser-only (el gate solo modela builtin∪node) → ∉ BROWSER_ONLY_GUARD_GLOBALS → AUDITAN. El default del
    // unknown es AUDITAR (fail-closed), no asumir client-only — enumeración del espacio, no casos sueltos:
    expect(
      run(`export async function C(){ if (typeof EdgeRuntime !== "undefined") { await import("./browser-only"); } return null; }`).length,
    ).toBeGreaterThan(0);
    expect(
      run(`export async function C(){ if (typeof caches !== "undefined") { await import("./browser-only"); } return null; }`).length,
    ).toBeGreaterThan(0);
    expect(
      run(`export async function C(){ if (typeof __UnknownGlobal__ !== "undefined") { await import("./browser-only"); } return null; }`).length,
    ).toBeGreaterThan(0);
    // browser-only del allowlist más allá de window/document (localStorage, MutationObserver) → suprimen:
    expect(
      run(`export async function C(){ if (typeof localStorage !== "undefined") { await import("./browser-only"); } return null; }`),
    ).toEqual([]);
    expect(
      run(`export async function C(){ if (typeof MutationObserver !== "undefined") { await import("./browser-only"); } return null; }`),
    ).toEqual([]);
    // ORTOGONALIDAD allowlist × población-de-set (Auditor-B): el `||`-con-local AUDITA con CUALQUIER allowlist-
    // member, no solo `window` — `collectConjunctionGuards` no recurre por `||` independientemente del global:
    expect(
      run(`export async function C(){ const ready = true; if (typeof localStorage !== "undefined" || typeof ready !== "undefined") { await import("./browser-only"); } return null; }`).length,
    ).toBeGreaterThan(0);
  });

  it("FALLA RUIDOSO 'no auditable' (no genérico 'no resolvió') si un import EXTENSIONLESS resuelve a JS-family Vite-resoluble (`.mjs`/`.js`/`.mts`/`.jsx`, codex P3)", () => {
    // Vite resuelve `./helper` → `helper.mts` (está en resolve.extensions). La cascada auditable
    // (.ts/.tsx) falla, pero el archivo EXISTE → el error genérico "no resolvió" MIENTE. Debe ser
    // el "JS no auditable" preciso (fail-closed), coherente con VITE_RESOLVE_EXTS que ya modela .mts.
    const dirty = `export const v = screen.width;`;
    for (const ext of ["mjs", "js", "mts", "jsx"]) {
      const files = vfs({
        "/repo/src/components/Probe/Probe.tsx": `
          /** @server-safe */
          import { v } from "./helper";
          export function Probe() { return <span>{v}</span>; }
        `,
        [`/repo/src/components/Probe/helper.${ext}`]: dirty,
      });
      const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
      expect(violations.some((v) => /no auditable/i.test(v.detail))).toBe(true);
      expect(violations.some((v) => /no resolvió/i.test(v.detail))).toBe(false);
    }
  });

  it("extensionless que resuelve a `.ts` LIMPIO sigue auditando (no se desvía al non-auditable), aun con .ts presente", () => {
    // El .ts auditable gana la cascada; el fallback non-auditable NO debe activarse cuando hay .ts.
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { v } from "./helper";
        export function Probe() { return <span>{v}</span>; }
      `,
      "/repo/src/components/Probe/helper.ts": `export const v = 1;`,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    expect(violations).toEqual([]);
  });

  it("FALLA RUIDOSO aunque el JS no auditable sea LIMPIO (no se sigue ni se asume safe, codex P1)", () => {
    // Un .cjs limpio podría hacer `require("./dirty.cjs")` que el gate NO sigue → no se asume safe.
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { v } from "./helper.cjs";
        export function Probe() { return <span>{v}</span>; }
      `,
      "/repo/src/components/Probe/helper.cjs": `module.exports = { v: 1 };`,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    expect(violations.some((v) => /no auditable/i.test(v.detail))).toBe(true);
  });

  it("FALLA RUIDOSO si el @server-safe importa un `.d.ts` (type-only, sin runtime que auditar, codex P2)", () => {
    // `.d.ts` termina en `.ts` pero es una DECLARACIÓN borrada — auditarla "pasaría" sin chequear
    // ningún runtime (falsa sensación de enforcement). Fail-closed: no auditable.
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { v } from "./types.d.ts";
        export function Probe() { return <span>{v}</span>; }
      `,
      "/repo/src/components/Probe/types.d.ts": `export declare const v: number;`,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    expect(violations.some((v) => /no auditable/i.test(v.detail))).toBe(true);
  });

  it("0-FP: extensión explícita `.ts`/`.tsx` (formato auditable) resuelve exacto sin fallo espurio (codex P2)", () => {
    // Seguir el consejo del gate con una extensión AUDITABLE explícita resuelve el archivo exacto
    // (Vite envía ese archivo; resolve.extensions solo aplica a imports SIN extensión).
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { v } from "./helper.ts";
        export function Probe() { return <span>{v}</span>; }
      `,
      "/repo/src/components/Probe/helper.ts": `export const v = 1;`,
      "/repo/src/components/Probe/helper.mjs": `export const v = screen.width;`,
    });
    // Resuelve helper.ts (explícito) — NO el .mjs hermano — y no reporta nada.
    expect(runWithVfs("/repo/src/components/Probe/Probe.tsx", files)).toEqual([]);
  });

  it("FALLA RUIDOSO si un FILE .mjs sombrea un DIRECTORY index resuelto (file-vs-directory, hunt scope-aware #173)", () => {
    // Vite prueba `helper.mjs` (archivo) ANTES que `helper/index.ts` (directorio) → file beats
    // directory. El gate resuelve el index limpio; Vite envía el .mjs sucio. Guard extendido.
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { fmt } from "./helper";
        export function Probe() { return <span>{fmt()}</span>; }
      `,
      "/repo/src/components/Probe/helper/index.ts": `export const fmt = () => 1;`,
      "/repo/src/components/Probe/helper.mjs": `export const fmt = () => screen.width;`,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    expect(violations.some((v) => /AMBIGUO/.test(v.detail))).toBe(true);
  });

  it("FALLA RUIDOSO si un INDEX hermano de mayor precedencia sombrea el index resuelto (helper/index.mjs vs helper/index.ts, codex P1)", () => {
    // Vite rankea por extensión TAMBIÉN dentro del directorio: `helper/index.mjs` gana a
    // `helper/index.ts`. El guard solo probaba `helper.<ext>` (file-vs-dir), no el index
    // hermano → el gate auditaba index.ts limpio mientras Vite envía index.mjs sucio = BYPASS.
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { fmt } from "./helper";
        export function Probe() { return <span>{fmt()}</span>; }
      `,
      "/repo/src/components/Probe/helper/index.ts": `export const fmt = () => 1;`,
      "/repo/src/components/Probe/helper/index.mjs": `export const fmt = () => navigator.geolocation;`,
    });
    expect(runWithVfs("/repo/src/components/Probe/Probe.tsx", files).length).toBeGreaterThan(0);
  });

  it("FALLA RUIDOSO si el dir resuelto tiene package.json (main/exports redirige Vite — deepest re-hunt)", () => {
    // El gate resuelve `./sub` → sub/index.ts (limpio), pero un sub/package.json con `main`/
    // `exports` redirige a Vite a OTRO archivo (clientside.ts sucio) que el gate no audita. El
    // resolver no lee package.json → fail-noisy si existe uno en el dir resuelto.
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { v } from "./sub";
        export function Probe() { return <span>{String(v)}</span>; }
      `,
      "/repo/src/components/Probe/sub/index.ts": `export const v = 1;`,
      "/repo/src/components/Probe/sub/package.json": `{ "main": "./clientside.ts" }`,
    });
    expect(runWithVfs("/repo/src/components/Probe/Probe.tsx", files).length).toBeGreaterThan(0);
  });

  it("FALLA RUIDOSO file-vs-directory anidado tras barrel (utils/inner/index.ts + utils/inner.mjs)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { v } from "./utils";
        export function Probe() { return <span>{String(v)}</span>; }
      `,
      "/repo/src/components/Probe/utils/index.ts": `export * from "./inner";`,
      "/repo/src/components/Probe/utils/inner/index.ts": `export const v = "clean";`,
      "/repo/src/components/Probe/utils/inner.mjs": `export const v = location.href;`,
    });
    expect(runWithVfs("/repo/src/components/Probe/Probe.tsx", files).length).toBeGreaterThan(0);
  });

  it("0-FP: directory index limpio SIN file hermano resuelve normal (sin fallo espurio)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { fmt } from "./helper";
        export function Probe() { return <span>{fmt()}</span>; }
      `,
      "/repo/src/components/Probe/helper/index.ts": `export const fmt = () => 1;`,
    });
    expect(runWithVfs("/repo/src/components/Probe/Probe.tsx", files)).toEqual([]);
  });

  it("0-FP: sin hermano de mayor precedencia, el .ts resuelve normal (sin fallo espurio)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { v } from "./helper";
        export function Probe() { return <span>{v}</span>; }
      `,
      "/repo/src/components/Probe/helper.ts": `export const v = 1;`,
    });
    expect(runWithVfs("/repo/src/components/Probe/Probe.tsx", files)).toEqual([]);
  });

  it("caza util sucio detrás de barrel re-export (`export * from`)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { dirty } from "./utils";
        export function Probe() { return <span>{dirty()}</span>; }
      `,
      "/repo/src/components/Probe/utils/index.ts": `
        export * from "./dirty";
      `,
      "/repo/src/components/Probe/utils/dirty.ts": `
        export function dirty() { return document.title; }
      `,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    const smuggled = violations.find((v) =>
      v.file.endsWith("utils/dirty.ts"),
    );
    expect(smuggled).toBeDefined();
    expect(smuggled?.chain).toEqual([
      "src/components/Probe/Probe.tsx",
      "src/components/Probe/utils/index.ts",
      "src/components/Probe/utils/dirty.ts",
    ]);
  });

  it("reporta cadena completa en profundidad 3+ (A→B→C→D)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { a } from "./a";
        export function Probe() { return <span>{a()}</span>; }
      `,
      "/repo/src/components/Probe/a.ts": `
        import { b } from "./b";
        export function a() { return b(); }
      `,
      "/repo/src/components/Probe/b.ts": `
        import { c } from "./c";
        export function b() { return c(); }
      `,
      "/repo/src/components/Probe/c.ts": `
        export function c() { return localStorage.getItem("x"); }
      `,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    const deep = violations.find((v) => v.file.endsWith("Probe/c.ts"));
    expect(deep).toBeDefined();
    expect(deep?.chain).toEqual([
      "src/components/Probe/Probe.tsx",
      "src/components/Probe/a.ts",
      "src/components/Probe/b.ts",
      "src/components/Probe/c.ts",
    ]);
  });

  it("inline `import { type X }` SÍ sigue bajo verbatimModuleSyntax (side-effect preservado, codex P1)", () => {
    // verbatimModuleSyntax (ACTIVO en este repo) PRESERVA `import { type A, type B } from "./m"`
    // como side-effect import `import "./m"` → el módulo SE EJECUTA en SSR (su `window.innerWidth`
    // top-level crashea). El check inline-specifier anterior asumía elisión (pre-verbatim) y NO
    // lo seguía = BYPASS cross-módulo. Solo `import type { … }` (clause-level) se borra entero.
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { type DirtyA, type DirtyB } from "./dirty-types";
        export function Probe(_a: DirtyA, _b: DirtyB) { return null; }
      `,
      "/repo/src/components/Probe/dirty-types.ts": `
        export type DirtyA = { w: number };
        export type DirtyB = { h: number };
        const _side = window.innerWidth;
      `,
    });
    const v = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    const leak = v.find((x) => x.file.endsWith("Probe/dirty-types.ts"));
    expect(leak).toBeDefined();
  });

  it("CLAUSE-level `import type { X }` SÍ se borra entero (no sigue, sound)", () => {
    // El clause-level `import type { … }` (a diferencia del inline) SÍ se elide bajo verbatim
    // → el módulo NO se carga → no se audita (sound, no FP).
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import type { DirtyA } from "./dirty-types";
        export function Probe(_a: DirtyA) { return null; }
      `,
      "/repo/src/components/Probe/dirty-types.ts": `
        export type DirtyA = { w: number };
        const _side = window.innerWidth;
      `,
    });
    const v = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    expect(v.find((x) => x.file.endsWith("Probe/dirty-types.ts"))).toBeUndefined();
  });

  it("inline `export { type X } from` en un barrel CARGADO SÍ sigue (side-effect, codex P1)", () => {
    // Un barrel cargado por un value-import que re-exporta `export { type Re } from "./dirty"`
    // PRESERVA la carga de "./dirty" bajo verbatim → su side-effect corre → debe seguirse.
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { realVal } from "./barrel";
        export function Probe() { return <span>{String(realVal)}</span>; }
      `,
      "/repo/src/components/Probe/barrel.ts": `
        export const realVal = 1;
        export { type Re } from "./dirty";
      `,
      "/repo/src/components/Probe/dirty.ts": `
        export type Re = { id: number };
        const _side = document.title;
      `,
    });
    const v = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    expect(v.find((x) => x.file.endsWith("Probe/dirty.ts"))).toBeDefined();
  });

  it("mixed `import { Value, type X }` SÍ sigue (algún specifier runtime)", () => {
    // Si CUALQUIER specifier es value, el módulo se carga en runtime →
    // hay que seguirlo. Test asegura que el "purely type-only" check
    // NO se confunde por la presencia de algunos `type` modifiers.
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { runtime, type Shape } from "./mixed";
        export function Probe(_s: Shape) { return <span>{runtime()}</span>; }
      `,
      "/repo/src/components/Probe/mixed.ts": `
        export type Shape = { x: number };
        export function runtime() { return document.title; }
      `,
    });
    const v = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    const hit = v.find((x) => x.file.endsWith("Probe/mixed.ts"));
    expect(hit).toBeDefined();
  });

  it("inline `export { type X } from` puro NO sigue (codex P2 round 1)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import type { Re } from "./barrel";
        export function Probe(_r: Re) { return null; }
      `,
      "/repo/src/components/Probe/barrel.ts": `
        export { type Re } from "./types";
      `,
      "/repo/src/components/Probe/types.ts": `
        export type Re = { id: number };
        const _side = window.innerWidth;
      `,
    });
    const v = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    const leak = v.find((x) => x.file.endsWith("Probe/types.ts"));
    expect(leak).toBeUndefined();
    const barrelHit = v.find((x) => x.file.endsWith("Probe/barrel.ts"));
    expect(barrelHit).toBeUndefined();
  });

  it("mixed `export { Value, type X } from` SÍ sigue", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { runtime } from "./barrel";
        export function Probe() { return <span>{runtime()}</span>; }
      `,
      "/repo/src/components/Probe/barrel.ts": `
        export { runtime, type Shape } from "./impl";
      `,
      "/repo/src/components/Probe/impl.ts": `
        export type Shape = { x: number };
        export function runtime() { return localStorage.getItem("k"); }
      `,
    });
    const v = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    const deep = v.find((x) => x.file.endsWith("Probe/impl.ts"));
    expect(deep).toBeDefined();
  });

  it("`import type` NO sigue al módulo runtime-sucio (no ruido)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import type { DirtyShape } from "./dirty-types";
        export function Probe(_p: DirtyShape) { return null; }
      `,
      // Aunque este módulo TOQUE window en runtime, no debe analizarse
      // porque el único import desde Probe es `import type`. En un .d.ts
      // o módulo con solo declares no habría runtime, pero el principio
      // aplica igual: una import type-only no genera load del módulo.
      "/repo/src/components/Probe/dirty-types.ts": `
        export type DirtyShape = { w: number };
        const _side = window.innerWidth;
      `,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    const leak = violations.find((v) =>
      v.file.endsWith("Probe/dirty-types.ts"),
    );
    expect(leak).toBeUndefined();
  });

  it("alias `@/utils/foo` sucio se caza igual que relativo", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { measure } from "@/utils/measure";
        export function Probe() { return <span>{measure()}</span>; }
      `,
      "/repo/src/utils/measure.ts": `
        export function measure() { return matchMedia("(prefers-color-scheme: dark)").matches; }
      `,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    const aliasHit = violations.find((v) =>
      v.file.endsWith("src/utils/measure.ts"),
    );
    expect(aliasHit).toBeDefined();
    expect(aliasHit?.chain).toEqual([
      "src/components/Probe/Probe.tsx",
      "src/utils/measure.ts",
    ]);
  });

  it("import de `node:*` emite `no-node-builtin` (Node-only, ausente en Edge) (codex P2)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { readFileSync } from "node:fs";
        export function Probe() { return <span>{readFileSync("/tmp/x", "utf8")}</span>; }
      `,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    const nodeBuiltin = violations.find((v) => v.rule === "no-node-builtin");
    expect(nodeBuiltin).toBeDefined();
    expect(nodeBuiltin?.detail).toContain("node:fs");
  });

  it("`import type` de `node:*` NO emite (erased) (codex P2)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import type { Stats } from "node:fs";
        export function Probe() { const s = null as unknown as Stats; return <span>{String(s)}</span>; }
      `,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    expect(violations.find((v) => v.rule === "no-node-builtin")).toBeUndefined();
  });

  // codex P1 (review genérico): el oráculo `module.isBuiltin` cubre el BARE specifier (`fs`, el caso
  // COMÚN) y los subpaths (`fs/promises`), no solo el esquema `node:`.
  it.each([
    ["bare fs", `import { readFileSync } from "fs";`],
    ["bare path", `import { join } from "path";`],
    ["subpath fs/promises", `import { readFile } from "fs/promises";`],
    ["prefijado node:crypto", `import { randomUUID } from "node:crypto";`],
  ])("import de builtin Node `%s` emite `no-node-builtin`", (_l, imp) => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        ${imp}
        export function Probe() { return <span/>; }
      `,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    expect(violations.some((v) => v.rule === "no-node-builtin")).toBe(true);
  });

  it("import relativo no resoluble emite `unresolved-import` (no skip silencioso)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { ghost } from "./does-not-exist";
        export function Probe() { return <span>{ghost()}</span>; }
      `,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    const unresolved = violations.find((v) => v.rule === "unresolved-import");
    expect(unresolved).toBeDefined();
    expect(unresolved?.detail).toContain("does-not-exist");
  });

  it("alias `@/foo` no resoluble emite `unresolved-import` (no skip silencioso)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { ghost } from "@/utils/ghost";
        export function Probe() { return <span>{ghost()}</span>; }
      `,
    });
    const violations = runWithVfs("/repo/src/components/Probe/Probe.tsx", files);
    const unresolved = violations.find((v) => v.rule === "unresolved-import");
    expect(unresolved).toBeDefined();
    expect(unresolved?.detail).toContain("ghost");
  });

  it("peer/built-in (`react`, `clsx`) son `external`, no se siguen", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { useRef } from "react";
        import clsx from "clsx";
        export function Probe() {
          const r = useRef(null);
          return <span ref={r} className={clsx("a", "b")} />;
        }
      `,
    });
    // No fixtures para react/clsx → si el resolver intentara seguirlos,
    // el readFile virtual lanzaría. Test pasa si no lanza.
    expect(() =>
      runWithVfs("/repo/src/components/Probe/Probe.tsx", files),
    ).not.toThrow();
  });

  it("ciclo de imports no causa infinite loop (visited corta)", () => {
    const files = vfs({
      "/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { a } from "./a";
        export function Probe() { return <span>{a()}</span>; }
      `,
      "/repo/src/components/Probe/a.ts": `
        import { b } from "./b";
        export function a() { return b(); }
      `,
      "/repo/src/components/Probe/b.ts": `
        // Ciclo: b re-importa a. El gate debe terminar (no recurse infinito).
        import { a } from "./a";
        export function b() { return typeof a; }
      `,
    });
    // El test pasa si el gate termina en tiempo razonable. No esperamos
    // violations: el ciclo es código limpio (no toca client globals).
    expect(() =>
      runWithVfs("/repo/src/components/Probe/Probe.tsx", files),
    ).not.toThrow();
  });

  it("compartir parseCache entre entries amortiza re-parse", () => {
    // Dos entries que importan el mismo util limpio. Con parseCache
    // compartida, el util se parsea UNA vez. Sin cache, dos veces. El
    // test verifica el comportamiento observable: si re-procesamos el
    // mismo entry, las violations son idénticas (no estado pegajoso).
    const files = vfs({
      "/repo/src/components/A/A.tsx": `
        /** @server-safe */
        import { shared } from "@/utils/shared";
        export function A() { return <span>{shared()}</span>; }
      `,
      "/repo/src/components/B/B.tsx": `
        /** @server-safe */
        import { shared } from "@/utils/shared";
        export function B() { return <span>{shared()}</span>; }
      `,
      "/repo/src/utils/shared.ts": `
        export function shared() { return "ok"; }
      `,
    });
    const parseCache = new Map();
    const tsconfigPaths = [{ prefix: "@/", targetPrefix: "src/" }];
    const opts = {
      tsconfigPaths,
      repoRoot: "/repo",
      srcRoot: "/repo/src",
      readFile: (p: string) => {
        const e = files.get(p);
        if (!e) throw new Error(`[vfs] missing: ${p}`);
        return e.content;
      },
      fileExists: (p: string) => files.has(p),
      parseCache,
    };
    const a = checkFileWithImports("/repo/src/components/A/A.tsx", {
      ...opts,
      visited: new Set(),
    });
    const b = checkFileWithImports("/repo/src/components/B/B.tsx", {
      ...opts,
      visited: new Set(),
    });
    expect(a).toEqual([]);
    expect(b).toEqual([]);
    // 3 files parseados, no 4 (shared.ts está cacheado).
    expect(parseCache.size).toBe(3);
  });
});

describe("server-safe gate — no falsos positivos en código limpio", () => {
  it("componente sin client APIs no produce violations", () => {
    const code = `
/** @server-safe */
export function Pure({ label }: { label: string }) {
  return <span>{label}</span>;
}
`;
    const v = checkSourceFile(code, "pure.fixture.tsx");
    expect(v).toEqual([]);
  });

  it("componente que NO está marcado @server-safe se ignora aunque use globals", () => {
    // El gate solo evalúa archivos marcados; sin marker, checkSourceFile
    // sigue corriéndose desde el test (no filtra), pero el patrón
    // operacional del CLI sí filtra por marker. Aquí validamos solo
    // que checkSourceFile NO crashea con código sin marker.
    const code = `
export function Client() {
  const x = window.localStorage;
  return null;
}
`;
    expect(() => checkSourceFile(code, "client.fixture.tsx")).not.toThrow();
  });
});

/**
 * Anti-regresión #151 codex P1: el resolver de imports tiene que
 * funcionar con paths que llevan Windows drive letter (`D:/repo/...`).
 *
 * `path.posix.resolve` NO trata `D:/foo` como absoluto (POSIX no sabe
 * de drive letters) → prepende cwd → path roto del tipo
 * `<cwd>/D:/foo/src/utils/cn`. La fix vive en `crossOsResolve` del
 * script (extrae la drive como prefijo, ejecuta `pathPosix.resolve`
 * sobre el resto POSIX, re-prepende drive). Este describe ejercita
 * el path completo (alias + relativo + inSrc check + violations
 * reporting) con roots virtuales que tienen drive letter — el bug
 * del codex se manifiesta como "unresolvable" en todos los imports.
 *
 * Si una regresión vuelve a `pathPosix.resolve` directo sobre paths
 * con drive letter, los 4 tests aquí saltan en CUALQUIER OS (no hace
 * falta Windows runner — el bug es lógico, no de plataforma).
 */
function runWithWindowsVfs(
  entryPath: string,
  files: VirtualFs,
  tsconfigPaths: Array<{ prefix: string; targetPrefix: string }> = [
    { prefix: "@/", targetPrefix: "src/" },
  ],
) {
  return checkFileWithImports(entryPath, {
    tsconfigPaths,
    repoRoot: "D:/a/repo",
    srcRoot: "D:/a/repo/src",
    readFile: (p: string) => {
      const entry = files.get(p);
      if (!entry) throw new Error(`[vfs-win] missing: ${p}`);
      return entry.content;
    },
    fileExists: (p: string) => files.has(p),
  });
}

describe("server-safe gate — Windows drive letter paths (#151 codex P1 anti-regresión)", () => {
  it("alias `@/utils/foo` resuelve con projectRoot `D:/a/repo` (no prepende cwd)", () => {
    const files = vfs({
      "D:/a/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { fmt } from "@/utils/fmt";
        export function Probe() { return fmt(window.location.href); }
      `,
      "D:/a/repo/src/utils/fmt.ts": `
        export function fmt(s: string) {
          return document.cookie + s;
        }
      `,
    });
    const violations = runWithWindowsVfs(
      "D:/a/repo/src/components/Probe/Probe.tsx",
      files,
    );
    // El alias debe haber resuelto Y la cadena haber descendido a
    // fmt.ts donde se caza el document.cookie. Si el resolver volviera
    // a la versión pre-fix con `pathPosix.resolve("D:/a/repo", ...)`,
    // el path saldría como `<cwd>/D:/a/repo/src/utils/fmt` → no resolvió
    // → violation 'unresolved-import' en vez de la violation real del
    // bypass transitivo.
    expect(violations.some((v) => v.rule === "unresolved-import")).toBe(false);
    const transitive = violations.find((v) =>
      v.file.endsWith("utils/fmt.ts"),
    );
    expect(transitive).toBeDefined();
    expect(transitive?.chain).toEqual([
      "src/components/Probe/Probe.tsx",
      "src/utils/fmt.ts",
    ]);
  });

  it("relativo `./inner` con importerAbsPath Windows resuelve correctamente", () => {
    const files = vfs({
      "D:/a/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { foo } from "./inner";
        export function Probe() { return foo(); }
      `,
      "D:/a/repo/src/components/Probe/inner.ts": `
        export function foo() { return window.location.href; }
      `,
    });
    const violations = runWithWindowsVfs(
      "D:/a/repo/src/components/Probe/Probe.tsx",
      files,
    );
    expect(violations.some((v) => v.rule === "unresolved-import")).toBe(false);
    const transitive = violations.find((v) => v.file.endsWith("Probe/inner.ts"));
    expect(transitive).toBeDefined();
  });

  it("inSrc check distingue archivos fuera de `D:/a/repo/src/` y los trata como external", () => {
    // Un archivo en `D:/a/repo/scripts/` está FUERA de src — debería
    // ser tratado como external (no seguir) sin emitir violations.
    const files = vfs({
      "D:/a/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { runtime } from "../../../scripts/runtime";
        export function Probe() { return runtime(); }
      `,
      "D:/a/repo/scripts/runtime.ts": `
        // Fuera de src: si el resolver lo siguiera (debido a un bug
        // en inSrc check) cazaría el window aquí. El comportamiento
        // correcto es "external", no seguir.
        export function runtime() { return window.localStorage; }
      `,
    });
    const violations = runWithWindowsVfs(
      "D:/a/repo/src/components/Probe/Probe.tsx",
      files,
    );
    // 0 violations: el import out-of-src se marca external y no se
    // sigue, y el archivo entry no tiene client API access.
    expect(violations).toEqual([]);
  });

  it("alias no resoluble reporta path POSIX con drive letter preservada (no `<cwd>/D:/...`)", () => {
    const files = vfs({
      "D:/a/repo/src/components/Probe/Probe.tsx": `
        /** @server-safe */
        import { missing } from "@/utils/does-not-exist";
        export function Probe() { return missing(); }
      `,
    });
    const violations = runWithWindowsVfs(
      "D:/a/repo/src/components/Probe/Probe.tsx",
      files,
    );
    const unresolved = violations.find((v) => v.rule === "unresolved-import");
    expect(unresolved).toBeDefined();
    // El reason debe contener el path relativo correcto, NO un path
    // inflado tipo `<cwd>/D:/a/repo/...`. Pre-fix: el detail tenía
    // basura tipo "D:/a/repo/src\\utils\\..." o el cwd prefijado.
    expect(unresolved?.detail).toContain("src/utils/does-not-exist");
    expect(unresolved?.detail).not.toMatch(/D:\/a\/repo\/D:/);
  });
});

/**
 * Modelo fail-closed (beta.27 BLOCKER-1, cruce A+B claudegate6). El gate
 * pasó de denylist (~46 nombres) a whitelist `SAFE_GLOBALS`: acceso bare a
 * cualquier global NO en el safe-set se flaggea. Estos tests blindan:
 *   1. El START-1 (HTMLElement, self, CSS, …) que la denylist dejaba pasar.
 *   2. Que el class-extends RUNTIME sigue cazándose (no se excluyó como
 *      type-only por error).
 *   3. Que las exclusiones type-space (`isNonReferencePosition` reglas
 *      11-13) NO generan falsos positivos.
 */
describe("server-safe gate — modelo fail-closed (beta.27 BLOCKER-1)", () => {
  it.each([
    ["HTMLElement bare (START-1)", `const T = HTMLElement; void T;`],
    ["self bare (START-1)", `const s = self; void s;`],
    ["CSS.supports (no estaba en denylist-46)", `CSS.supports("display", "grid");`],
    ["Element bare", `const E = Element; void E;`],
    ["customElements", `customElements.get("x-foo");`],
  ])("caza %s (gap que la denylist de 46 dejaba pasar)", (_label, body) => {
    const v = checkSourceFile(fixture(body), "fail-closed.fixture.tsx");
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it("caza `class X extends HTMLElement` (heritage RUNTIME, no se excluye como type-only)", () => {
    // Regla 12 de isNonReferencePosition excluye el `extends` de una
    // INTERFACE y el `implements` de una clase (type-only), pero NO el
    // `extends` de una CLASE — es una ref runtime real. Un custom element
    // en código server-safe DEBE flaggearse.
    const code = `/** @server-safe */\nexport class XProbe extends HTMLElement {}`;
    const v = checkSourceFile(code, "class-extends.fixture.tsx");
    expect(v.some((x) => x.detail.includes("HTMLElement"))).toBe(true);
  });

  it.each([
    ["ES builtins", `const m = new Map(); return Promise.resolve(m);`],
    [
      "globals Node (URL/fetch/crypto)",
      `const u = new URL("x", "http://a"); void fetch(u); return crypto.randomUUID();`,
    ],
    // Event SÍ está en el baseline Edge (CustomEvent NO — ver el bloque
    // "Edge-missing Node globals"; se subió a EDGE_MISSING_GLOBALS).
    ["Event (en Edge baseline)", `const e = new Event("x"); void e;`],
    ["import.meta.env (regla 13)", `if (import.meta.env.DEV) { void 0; }`],
  ])("NO genera falso positivo en %s", (_label, body) => {
    const v = checkSourceFile(fixture(body), "no-fp.fixture.tsx");
    expect(v).toEqual([]);
  });

  it("NO genera falso positivo en posiciones de tipo (interface extends Omit, React.ReactNode)", () => {
    // Reglas 11 (QualifiedName) + 12 (interface heritage). Tipos borrados.
    const code = `
/** @server-safe */
import type React from "react";
export interface ProbeProps extends Omit<{ a: 1; b: 2 }, "a"> {
  children?: React.ReactNode | undefined;
}
export function Probe(_p: ProbeProps) { return null; }
`;
    const v = checkSourceFile(code, "type-pos.fixture.tsx");
    expect(v).toEqual([]);
  });
});

/**
 * Marker `@server-safe` fail-loud (beta.27 BLOCKER-1). La detección pasó de
 * mirar solo `sourceFile.statements` (top-level) a recorrer el AST completo
 * y FALLAR RUIDOSO si el marker aparece en posición anidada — antes ese
 * caso pasaba inadvertido (fail-open silencioso: el dev cree que el archivo
 * se audita y no es así).
 */
describe("server-safe gate — marker @server-safe fail-loud (beta.27 BLOCKER-1)", () => {
  it("detecta marker en statement top-level", () => {
    const code = `/** @server-safe */\nexport const X = () => 1;`;
    expect(isContentServerSafeMarked(code, "ok.tsx")).toBe(true);
  });

  it("archivo sin marker devuelve false", () => {
    const code = `export const X = () => 1;`;
    expect(isContentServerSafeMarked(code, "none.tsx")).toBe(false);
  });

  it("FALLA RUIDOSO si el marker está en una función anidada (no fail-open)", () => {
    const code = `export function Outer() {\n  /** @server-safe */\n  function inner() { return 1; }\n  return inner();\n}`;
    expect(() => isContentServerSafeMarked(code, "nested.tsx")).toThrow(
      /posición no soportada/,
    );
  });

  it("FALLA RUIDOSO si el marker está en un arrow anidado", () => {
    const code = `export const Outer = () => {\n  /** @server-safe */\n  const inner = () => 1;\n  return inner;\n};`;
    expect(() => isContentServerSafeMarked(code, "nested-arrow.tsx")).toThrow(
      /posición no soportada/,
    );
  });

  it("two-block JSDoc: marker en el PRIMERO de dos bloques se detecta (no fail-open)", () => {
    const code = `/** @server-safe */\n/** otra cosa */\nexport const X = () => 1;`;
    expect(isContentServerSafeMarked(code, "two-block.tsx")).toBe(true);
  });

  it("two-block JSDoc: marker en el SEGUNDO bloque también", () => {
    const code = `/** otra cosa */\n/** @server-safe */\nexport const X = () => 1;`;
    expect(isContentServerSafeMarked(code, "two-block-2.tsx")).toBe(true);
  });

  it("prosa `@server-safe` mid-sentence NO marca ni lanza (top-level)", () => {
    // TS parsea `@server-safe` como tag aunque esté embebido en prosa; el
    // filtro de posición canónica (inicio de línea JSDoc) lo descarta.
    const code = `/** Este componente todavía no es @server-safe del todo */\nexport const X = () => 1;`;
    expect(isContentServerSafeMarked(code, "prose.tsx")).toBe(false);
  });

  it("prosa `@server-safe` en JSDoc anidado NO lanza fail-loud FALSO", () => {
    const code = `export function Outer() {\n  /** helper interno, no es @server-safe por sí solo */\n  function inner() { return 1; }\n  return inner();\n}`;
    expect(() => isContentServerSafeMarked(code, "prose-nested.tsx")).not.toThrow();
    expect(isContentServerSafeMarked(code, "prose-nested.tsx")).toBe(false);
  });

  it("zero-width space antes del @ NO silencia el marker (footgun accidental)", () => {
    // Un ZWSP (U+200B) colado por copy-paste antes del `@` hacía que el
    // archivo dejara de auditarse en silencio. El prefijo se normaliza.
    const code = `/**\u200B@server-safe*/\nexport const X = () => 1;`;
    expect(isContentServerSafeMarked(code, "zwsp.tsx")).toBe(true);
  });

  it("ZWSP embebido en prosa sigue SIN marcar (no se cuela por la normalización)", () => {
    const code = `/** texto \u200B@server-safe en prosa */\nexport const X = () => 1;`;
    expect(isContentServerSafeMarked(code, "zwsp-prose.tsx")).toBe(false);
  });

  // RAÍZ G (re-hunt rc.1) + M2 (line-start, ratificada 2026-07-04): un `@server-safe` que sigue a OTRO tag JSDoc
  // en la MISMA línea (`@internal @server-safe`) era un fail-open SILENCIOSO en el predecesor. BLOCKER-1 lo hizo
  // MARCAR; M2 lo hace HIGIENE fail-loud ("línea propia") — la invariante (un tag parseado NUNCA es no-op
  // silencioso) se mantiene, ahora exigiendo line-start. `@server-safe` en su propia línea (aunque haya otros
  // tags en OTRAS líneas del bloque) marca; tag hermano en la MISMA línea o prosa antes → fail-loud.
  it("tag hermano `@internal @server-safe` en la MISMA línea → higiene M2 (línea propia), NO marca en silencio", () => {
    const code = `/** @internal @server-safe */\nexport function Card() { return 1; }`;
    expect(() => isContentServerSafeMarked(code, "sibling-tag.tsx")).toThrow(
      /NO está en línea propia/,
    );
  });

  it("varios tags hermanos en la misma línea `@packageDocumentation @beta @server-safe` → higiene M2", () => {
    const code = `/** @packageDocumentation @beta @server-safe */\nexport const X = 1;`;
    expect(() =>
      isContentServerSafeMarked(code, "multi-sibling.tsx"),
    ).toThrow(/NO está en línea propia/);
  });

  it("tag hermano en OTRA línea + `@server-safe` en LÍNEA PROPIA (multi-línea) → SÍ marca (line-start)", () => {
    const code = `/**\n * @internal\n * @server-safe\n */\nexport const X = 1;`;
    expect(isContentServerSafeMarked(code, "sibling-multiline.tsx")).toBe(true);
  });

  it("mixto `@internal foo @server-safe` (tag + prosa) LANZA fail-loud (embebido en prosa)", () => {
    // Invariante: un tag parseado ni marca ni falla en silencio. Con un tag
    // hermano PERO prosa entre medias, la intención es ambigua → fail-loud.
    const code = `/** @internal foo @server-safe */\nexport const X = 1;`;
    expect(() => isContentServerSafeMarked(code, "mixed-prose.tsx")).toThrow(
      /embebido en prosa/,
    );
  });

  // codex P2 (rc.1): un JSDoc SIN node.jsDoc host (suelto entre elementos de un array) con una
  // mención en PROSA ANTES del marker line-start real. El scan por comment-ranges (no-AST) usaba
  // `.exec` single-match → veía solo la prosa (tolerada) y el line-start quedaba SILENT (fail-open
  // del invariante fail-loud). Ahora itera TODAS las ocurrencias hasta la primera line-start.
  it("prosa `@server-safe` + marker line-start en JSDoc unattached (sin host) → fail-loud, no silent", () => {
    const code = `export const arr = [1,\n/** See @server-safe docs.\n * @server-safe */\n2];`;
    expect(() =>
      isContentServerSafeMarked(code, "unattached-prose-then-marker.tsx"),
    ).toThrow(/posición no soportada/);
  });

  it("multi-mención TODA en prosa en JSDoc unattached (ninguna line-start) → tolera, no lanza", () => {
    const code = `export const arr = [1,\n/** foo @server-safe bar @server-safe baz */\n2];`;
    expect(isContentServerSafeMarked(code, "unattached-all-prose.tsx")).toBe(false);
  });
});

/**
 * Dynamic eval sink vía Function constructor alcanzable por `.constructor`
 * (beta.27 BLOCKER-1, cruce A+B FN-hunt). El gate cazaba el escape solo
 * cuando la base era un identificador denegado (`globalThis.constructor.*`);
 * con base literal/SAFE pasaba. Se flaggea la invocación de `.constructor`
 * salvo cuando la base es un literal PROVABLEMENTE no-función (`({}).constructor()`
 * = Object, `[].constructor(3)` = Array — NO Function/eval; codex P2 sobre 27c5d18,
 * era FP que bloqueaba server-safe legítimo). El DOBLE `.constructor` (siempre Function,
 * incl. base literal) y la base función/identifier/`this`/class-expr siguen flaggeando
 * (fail-closed). Se preservan los usos legítimos (reflexión / comparación / clon `new`).
 */
describe("server-safe gate — Function constructor vía `.constructor` (beta.27 BLOCKER-1)", () => {
  const probe = (body: string) =>
    checkSourceFile(
      `/** @server-safe */\nexport const fn = () => { ${body} return null; };`,
      "ctor.fixture.tsx",
    );

  it.each([
    ["array literal base", `const w = [].constructor.constructor("return globalThis")();`],
    ["string literal base", `const w = "".constructor.constructor("x")();`],
    ["number literal base", `const w = (0).constructor.constructor("x")();`],
    ["object method base", `const w = ({}).constructor.constructor("x")();`],
    ["computed bracket access", `const w = ({})["constructor"]["constructor"]("x")();`],
    ["function base single .constructor", `function g() {}; const w = g.constructor("x");`],
    // Formas que la primera iteración (solo callee) dejaba pasar — cerradas
    // en la re-review por la regla (a) "doble .constructor".
    ["forma partida (asignada a variable)", `const F = [].constructor.constructor; const w = F("x")();`],
    ["doble accedida sin invocar", `const F = [].constructor.constructor; void F;`],
    [".call sobre el constructor", `const w = [].constructor.constructor.call(null, "x")();`],
    [".bind sobre el constructor", `const F = [].constructor.constructor.bind(null); void F;`],
    ["computed doble sin invocar", `const F = ({})["constructor"]["constructor"]; void F;`],
    // single .constructor (base función) invocado vía Function.prototype —
    // codex P1 round 4.
    [".call sobre single constructor", `const w = (() => {}).constructor.call(null, "return 1")();`],
    [".apply sobre single constructor", `const w = (function () {}).constructor.apply(null, ["return 1"])();`],
    [".bind sobre single constructor", `const F = (() => {}).constructor.bind(null); const w = F("return 1")();`],
    ["tagged template sobre constructor", "const w = (() => {}).constructor`return 1`();"],
    // codex P1 (d1ccce0): un OBJECT LITERAL puede OVERRIDEar su `constructor` propio →
    // el fast-path de "literal no-función" (12c1041) NO debe eximirlo. `{ constructor:
    // (()=>{}).constructor }` define constructor = Function → alcanza eval. También vía
    // __proto__ (cadena → Function), spread, key computada, getter.
    ["object literal con constructor: Function", `const w = ({ constructor: (() => {}).constructor }).constructor("return 1")();`],
    ["object literal con __proto__ función", `const w = ({ __proto__: () => {} }).constructor("return 1")();`],
    ["object literal con [\"constructor\"] computado", `const w = ({ ["constructor"]: (() => {}).constructor }).constructor("return 1")();`],
    ["object literal con spread", `const w = ({ ...({} as Record<string, unknown>) }).constructor("return 1")();`],
    ["object literal con getter constructor", `const w = ({ get constructor() { return (() => {}).constructor; } }).constructor("return 1")();`],
    // codex P1 (915925f): Reflect.construct/apply INVOCAN el .constructor (acceso directo) →
    // Reflect.construct(F,a) ≡ new F(...a); Reflect.apply(F,t,a) ≡ F.apply(t,a) → si F = Function,
    // eval. Token-en-su-sitio (Reflect nombrado + .constructor 1er arg directo). dot Y bracket.
    ["Reflect.construct((()=>{}).constructor, [...])", `const w = Reflect.construct((() => {}).constructor, ["return 1"])(); void w;`],
    ["Reflect.apply((()=>{}).constructor, null, [...])", `const w = Reflect.apply((() => {}).constructor, null, ["return 1"]); void w;`],
    ["Reflect['construct']((fn).constructor, [...]) bracket", `const w = (Reflect as any)["construct"]((function () {}).constructor, ["return 1"])(); void w;`],
    ["Reflect.construct((0,(()=>{}).constructor), [...]) VT arg", `const w = Reflect.construct((0, (() => {}).constructor), ["return 1"])(); void w;`],
  ])("caza el Function constructor escape: %s", (_label, body) => {
    const v = probe(body);
    expect(v.some((x) => x.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it.each([
    ["reflexión `.constructor.name`", `const e = new Error(); const n = e.constructor.name; void n;`],
    ["comparación `.constructor === X`", `const o = {}; const b = o.constructor === Object; void b;`],
    ["clon `new x.constructor()`", `const o = {}; const c = new o.constructor(); void c;`],
    ["`.constructor` simple sin segunda capa", `const e = new Error(); const c = e.constructor; void c;`],
    [".bind/.call legítimo NO sobre constructor", `const fn = [].slice.bind([]); void fn;`],
    ["método `.call` propio (no Function.prototype)", `const o = { call() { return 1; } }; const r = o.call(); void r;`],
    ["`this.constructor.name`", `class C { m() { return this.constructor.name; } } void C;`],
    // codex P2 (27c5d18): single `.constructor` INVOCADO sobre un literal no-función —
    // `({}).constructor` = Object, `[].constructor` = Array, etc. ≠ Function → NO es eval.
    // Era FP (la regla "toda invocación independientemente de la base" sobre-flaggeaba).
    ["`({}).constructor()` → Object()", `const w = ({}).constructor(); void w;`],
    ["`[].constructor(3)` → Array(3)", `const w = [].constructor(3); void w;`],
    ['`"".constructor()` → String()', `const w = "".constructor(); void w;`],
    ["`(0).constructor()` → Number()", `const w = (0).constructor(); void w;`],
    ["`(true).constructor()` → Boolean()", `const w = (true).constructor(); void w;`],
    ["`(/x/).constructor()` → RegExp()", `const w = (/x/).constructor(); void w;`],
    ["`` (`t`).constructor() `` → String()", "const w = (`t`).constructor(); void w;"],
    ["`({}).constructor.call(null)` → Object.call", `const w = ({}).constructor.call(null); void w;`],
    ["`` ({}).constructor`x` `` → tagged Object", "const w = ({}).constructor`x`; void w;"],
    // codex P1 (d1ccce0): un object literal con propiedades SEGURAS (no constructor/
    // __proto__, sin spread/computed) sigue tomando el fast-path → `.constructor` = Object.
    ["`({ a: 1, b: 2 }).constructor()` → Object", `const w = ({ a: 1, b: 2 }).constructor(); void w;`],
    // codex P1 (915925f): Reflect.construct/apply de un receiver PROVABLEMENTE no-función =
    // new Object / Object.apply, no eval → el guard de receiver lo deja exento. Y Reflect.has
    // (no es construct/apply) no invoca → no es eval.
    ["Reflect.construct(({}).constructor, []) → new Object", `const w = Reflect.construct(({}).constructor, []); void w;`],
    ["Reflect.has((()=>{}).constructor, 'x') NO invoca", `const b = Reflect.has((() => {}).constructor, "x"); void b;`],
  ])("NO genera falso positivo en uso legítimo de `.constructor`: %s", (_label, body) => {
    expect(probe(body)).toEqual([]);
  });

  // ── Residuales CONOCIDOS POR DISEÑO ────────────────────────────────────
  // El criterio de la frontera es LEGIBLE vs OFUSCADO: el gate caza lo que un
  // revisor vería leyendo el diff (las formas CONTIGUAS de .constructor). Estas
  // requieren data-flow / keys computadas / reflexión → ofuscación deliberada
  // que, bajo el modelo opt-in/first-party (sin adversario), NO es amenaza (ver
  // ADR D1-P1, "Frontera del eval-sink"). Se EVALUÓ un "Nivel 1" (constant-fold
  // del computed-key con const literal) y se DESCARTÓ: todo computed-key
  // peligroso ya se caza por la RAÍZ (ver test siguiente), así que el fold solo
  // añadía cazar el constructor-sobre-raíz-segura (un no-threat) y FP-eaba
  // shadowing honesto — coste puro.
  // Este test PINEA la decisión: si una empieza a flaggearse, lee el ADR +
  // el modelo de amenaza ANTES de cambiar nada. CADUCIDAD: vale solo mientras
  // `@server-safe` sea opt-in/first-party sin código no confiable.
  it.each([
    ["cadena partida en variables (data-flow)", `const c1 = [].constructor; const c2 = c1.constructor; const w = c2("return 1")();`],
    ["destructuring del nombre constructor", `const { constructor: C } = []; const { constructor: F } = C; const w = F("return 1")();`],
    // codex P1 (915925f): `Reflect.get(x,"constructor")` es ACCESO indirecto del .constructor
    // (no hay nodo `.constructor` a la vista; la key es un string) → residual, distinto de
    // `Reflect.construct(x.constructor,…)` (acceso DIRECTO + invocación) que SÍ se caza arriba.
    ["Reflect.get(x,'constructor') acceso indirecto", `const F = Reflect.get((() => {}) as object, "constructor") as (s: string) => () => unknown; const w = F("return 1")(); void w;`],
  ])("residual fuera de alcance POR DISEÑO (ofuscado, no es amenaza): %s", (_label, body) => {
    expect(probe(body)).toEqual([]);
  });

  // codex P2 (2e468c6): `await` es transparente SOLO para no-thenables. Un object literal
  // THENABLE (`{ then(r){ r(fn) } }`) corre su `.then` y resuelve a una función → su
  // `.constructor` ES Function = eval, pero el fast-path veía el object-literal operando y
  // lo eximía. Fix: la EXENCIÓN rechaza cualquier receiver que cruce await (parser-puro no
  // prueba no-thenable). El FLAGGING sí cruza await (cazar `(await fn.constructor)(...)`).
  const aprobe = (body: string) =>
    checkSourceFile(`/** @server-safe */\nexport async function P(fn: any) { ${body} return null; }`, "await-ctor.fixture.tsx");
  it.each([
    ["await thenable → .constructor()", `const w = (await { then(r: (v: unknown) => void) { r(function f() {}); } }).constructor("return 1")(); void w;`],
    ["await plain object → .constructor() (fail-closed)", `const w = (await ({} as Record<string, unknown>)).constructor(); void w;`],
    ["(await fn.constructor)(code) preservado", `const w = (await fn.constructor)("return 1")(); void w;`],
    ["await thenable .constructor.constructor (doble)", `const w = (await { then(r: (v: unknown) => void) { r({}); } }).constructor.constructor("return 1")(); void w;`],
  ])("caza el escape vía await (thenable resuelve a Function): %s", (_label, body) => {
    expect(aprobe(body).some((x) => x.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  // PIN de la CLASE computed-key: las 5 escrituras del MISMO ataque PASAN. Un
  // "Nivel 1" cazaría solo la #1 → falsa completitud (documentar "manejamos
  // computed-key" sería mentir; let/concat/alias/prop entran). Contra un
  // adversario, catch parcial = teatro (usa la #2). Por eso es residual: la
  // línea es legible-contigua vs indirección, no "const vs let". Si una empieza
  // a flaggearse, lee el ADR "Frontera del eval-sink" ANTES de cambiar.
  it.each([
    ["#1 const literal", `const k = "constructor"; const w = [][k][k]("return 1")();`],
    ["#2 let (reasignable)", `let k = "constructor"; const w = [][k][k]("return 1")();`],
    ["#3 concatenada", `const k = "cons" + "tructor"; const w = [][k][k]("return 1")();`],
    ["#4 alias", `const a = "constructor"; const k = a; const w = [][k][k]("return 1")();`],
    ["#5 propiedad de objeto", `const o = { key: "constructor" }; const w = [][o.key][o.key]("return 1")();`],
  ])("computed-key residual — las 5 escrituras de la clase PASAN: %s", (_label, body) => {
    expect(probe(body)).toEqual([]);
  });

  it("computed-key sobre RAÍZ insegura SÍ se caza (sin folding — por eso el Nivel 1 sobraba)", () => {
    // Cuando la raíz es peligrosa, el valor de la key es irrelevante — flaggea
    // por la raíz. Es lo que un gate sintáctico SÍ puede prometer sin mentir.
    const v = probe(`const k = "x"; return (globalThis as Record<string, unknown>)[k];`);
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });
});

/**
 * `global` (alias de Node de `globalThis`) denegado (beta.27 BLOCKER-1,
 * cruce A+B). Reabría el bypass dynamic-eval + acceso directo a process.env
 * / client globals vía el objeto global.
 */
describe("server-safe gate — `global` (alias Node de globalThis)", () => {
  const probe = (body: string) =>
    checkSourceFile(
      `/** @server-safe */\nexport const fn = () => { ${body} return null; };`,
      "global.fixture.tsx",
    );

  it.each([
    ["bare `global`", `const g = global; void g;`],
    ["`global.process.env`", `const x = global.process.env.SECRET; void x;`],
    ["`global.window.location`", `const u = global.window.location.href; void u;`],
    ["`global.constructor.constructor()`", `const w = global.constructor.constructor("x")(); void w;`],
  ])("caza acceso a `global`: %s", (_label, body) => {
    expect(probe(body).length).toBeGreaterThan(0);
  });
});

/**
 * Falsos positivos cerrados al pasar a fail-closed (beta.27 BLOCKER-1, cruce
 * A+B FP-hunt). Estos patrones server-safe legítimos NO deben flaggearse.
 */
describe("server-safe gate — fail-closed: sin falsos positivos en sintaxis legítima", () => {
  const probe = (body: string) =>
    checkSourceFile(
      `/** @server-safe */\nexport const fn = () => { ${body} return null; };`,
      "fp.fixture.tsx",
    );

  it("nombre de campo de clase (PropertyDeclaration) no se flaggea", () => {
    const code = `/** @server-safe */\nexport class Probe { count = 0; field = "x"; }`;
    expect(checkSourceFile(code, "class-field.fixture.tsx")).toEqual([]);
  });

  it("label y targets de break/continue no se flaggean", () => {
    expect(
      probe(`outer: for (let i = 0; i < 3; i++) { if (i) break outer; else continue outer; }`),
    ).toEqual([]);
  });

  it("`arguments` en función no-arrow no se flaggea", () => {
    const code = `/** @server-safe */\nexport function Probe() { return arguments.length; }`;
    expect(checkSourceFile(code, "arguments.fixture.tsx")).toEqual([]);
  });
});

/**
 * Sitio-hoja invertido: `extractPositiveTypeofGuard` (beta.27 BLOCKER-1). El
 * guard `typeof X !== "undefined"` exime el acceso a un global NO-safe dentro
 * de su then-branch; sin guard, se flaggea.
 */
describe("server-safe gate — guard typeof bajo fail-closed", () => {
  it("guard `typeof window !== 'undefined'` exime el acceso dentro", () => {
    const code = `/** @server-safe */\nexport const fn = () => {\n  if (typeof window !== "undefined") { return window.innerWidth; }\n  return 0;\n};`;
    expect(checkSourceFile(code, "guard.fixture.tsx")).toEqual([]);
  });

  it("sin guard, el mismo acceso se flaggea", () => {
    const code = `/** @server-safe */\nexport const fn = () => { return window.innerWidth; };`;
    const v = checkSourceFile(code, "noguard.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it("guard-ALIAS case-local en switch narrowing (codex P2: faltaba extractConstGuardAlias en CaseBlock)", () => {
    // `const noWin = typeof window === "undefined"; if (noWin) return null; return window.innerWidth`
    // dentro de un `case` — el alias debe narrowing igual que en un bloque normal.
    const withBlock = `/** @server-safe */\nexport function C(x: string){ switch(x){ case "x": { const noWin = typeof window === "undefined"; if (noWin) return null; return window.innerWidth; } } return null; }`;
    const noBlock = `/** @server-safe */\nexport function C(x: string){ switch(x){ case "x": const noWin = typeof window === "undefined"; if (noWin) return null; return window.innerWidth; } return null; }`;
    expect(checkSourceFile(withBlock, "g.fixture.tsx")).toEqual([]);
    expect(checkSourceFile(noBlock, "g.fixture.tsx")).toEqual([]);
  });

  it("CONTROL: case sin guard sigue flaggeando", () => {
    const code = `/** @server-safe */\nexport function C(x: string){ switch(x){ case "x": return window.innerWidth; } return null; }`;
    expect(checkSourceFile(code, "g.fixture.tsx").some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it("SOUNDNESS: un value-binding (shadow de global) de un case NO suprime checks en otro case (codex P2)", () => {
    // `case "object": const window = {}; break; case "undefined": return window.location` — entrar
    // DIRECTO a case "undefined" NO ejecuta el `const window` de case "object" (TDZ) → el shadow no
    // está disponible → `window.location` debe FLAGGEAR como global. Modelo PER-CLAUSE: cada clause
    // empieza desde entryCtx (un case labeled siempre es jump target → fall-through nunca es el único path).
    const code = `/** @server-safe */\nexport function C(x: string){ switch(x){ case "object": { const window:any = {}; break; } case "undefined": { return window.location; } } return ""; }`;
    expect(checkSourceFile(code, "g.fixture.tsx").some((v) => v.rule === "no-bare-dom-access")).toBe(true);
  });

  it("SOUNDNESS: un react-alias de un case NO se hereda en otro case (per-clause)", () => {
    // case "a" declara `const { useEffect } = React`; case "b" usa un useEffect importado de un módulo
    // SÍNCRONO → entrar directo a "b" no ejecuta "a" → el alias react de "a" no aplica → FLAGGEA.
    const code = `/** @server-safe */\nimport * as React from "react";\nimport { useEffect } from "./sync";\nexport function C(x: string){ switch(x){ case "a": { const { useEffect } = React; useEffect(() => {}); break; } case "b": { useEffect(() => { void window.location.href; }); break; } } return null; }`;
    expect(checkSourceFile(code, "g.fixture.tsx").length).toBeGreaterThan(0);
  });

  it("SOUNDNESS: un guard-alias de un case NO se hereda en otro case (codex P2: per-clause, no shared)", () => {
    // `case 1: const has = typeof window !== "undefined"; break; case 2: if (has) return window.x` —
    // entrar DIRECTO a case 2 NO ejecuta el const de case 1, así que el guard no corrió ahí →
    // compartir el alias en `current` sería fail-OPEN. Debe FLAGGEAR en case 2.
    const code = `/** @server-safe */\nexport function C(x: number){ switch(x){ case 1: { const hasWindow = typeof window !== "undefined"; break; } case 2: { if (hasWindow) return window.location.href; } } return ""; }`;
    expect(checkSourceFile(code, "g.fixture.tsx").some((v) => v.rule === "no-bare-dom-access")).toBe(true);
  });

  it("guard de ENTRADA preservado para funciones hoisted en un case (codex P2: blockEntryGuards en CaseBlock)", () => {
    // `if (typeof window !== "undefined") switch(x){ case 1: function read(){ window } }` — la función
    // hoisted resetea a blockEntryGuards (no a vacío); el CaseBlock debe heredar el guard de entrada.
    const guarded = `/** @server-safe */\nexport function C(x: number){ if (typeof window !== "undefined") switch(x){ case 1: function read(){ return window.innerWidth; } return read(); } return 0; }`;
    expect(checkSourceFile(guarded, "g.fixture.tsx")).toEqual([]);
    // CONTROL sin guard → la misma función hoisted en el case flaggea.
    const unguarded = `/** @server-safe */\nexport function C(x: number){ switch(x){ case 1: function read(){ return window.innerWidth; } return read(); } return 0; }`;
    expect(checkSourceFile(unguarded, "g.fixture.tsx").some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });
});

/**
 * JSX uppercase tag = referencia de VALOR a un global no-safe (codex P2,
 * beta.27 BLOCKER-1). Bajo la denylist la regla 9 de isNonReferencePosition
 * eximía TODO tag JSX (skip pragmático); fail-closed la hizo load-bearing y
 * `<HTMLElement/>` (global DOM como componente) lanzaba ReferenceError en SSR
 * pero pasaba el gate. Ahora: lowercase = intrínseco (exento); uppercase
 * exento SOLO si está declarado a nivel de módulo (componente). Los 4
 * vectores de FP (forward-ref, import, shadow, member-expr) quedan limpios.
 */
describe("server-safe gate — JSX uppercase tags (codex P2 beta.27)", () => {
  it.each([
    ["<HTMLElement /> (global DOM como componente)", `/** @server-safe */\nexport const C = () => <HTMLElement />;`],
    ["<Audio />", `/** @server-safe */\nexport const C = () => <Audio />;`],
    ["<Image /> self-closing", `/** @server-safe */\nexport const C = () => <Image />;`],
  ])("FLAGGEA tag JSX uppercase no declarado: %s", (_label, code) => {
    const v = checkSourceFile(code, "jsx-flag.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it.each([
    ["intrínseco <div/>", `/** @server-safe */\nexport const C = () => <div />;`],
    ["import binding <Button/>", `/** @server-safe */\nimport { Button } from "./Button";\nexport const C = () => <Button />;`],
    ["forward-ref const local", `/** @server-safe */\nexport const A = () => <Later />;\nconst Later = () => <span />;`],
    ["referencia mutua A<->B", `/** @server-safe */\nexport const A = () => <B />;\nexport const B = () => <A />;`],
    ["shadow de un global (const local)", `/** @server-safe */\nconst HTMLElement = () => <span />;\nexport const C = () => <HTMLElement />;`],
    ["member-expr <Foo.Bar/> (root importado)", `/** @server-safe */\nimport * as Foo from "./foo";\nexport const C = () => <Foo.Bar />;`],
    // Compound components (codex R6). El tag de `<Dropdown.Trigger/>` es un
    // PropertyAccessExpression en TS (NO un `JsxMemberExpression`, que no existe
    // en el AST de TS): el miembro `Trigger` está en posición de NOMBRE de
    // propiedad → lo exime la regla 1 de `isNonReferencePosition`, no la
    // exención JSX-tag (regla 9). El root sí se valida como binding (abajo).
    ["compound <Dropdown.Trigger/> importado", `/** @server-safe */\nimport { Dropdown } from "./d";\nexport const C = () => <Dropdown.Trigger />;`],
    ["compound <Icons.Search/> importado", `/** @server-safe */\nimport { Icons } from "./i";\nexport const C = () => <Icons.Search />;`],
    ["compound con miembro = nombre de global <Foo.window/>", `/** @server-safe */\nimport { Foo } from "./f";\nexport const C = () => <Foo.window />;`],
    ["compound 4-nivel <A.B.C.D/> root importado", `/** @server-safe */\nimport { A } from "./a";\nexport const C = () => <A.B.C.D />;`],
    ["compound local Card.Header", `/** @server-safe */\nconst Card: any = () => null; Card.Header = () => null;\nexport const C = () => <Card.Header />;`],
    // codex (6728b31): re-raise de la clase ya cubierta arriba. `<React.Fragment/>` /
    // `<Context.Provider/>` son PropertyAccessExpression → el `.name` (Fragment/Provider) lo exime
    // la regla 1, no hay JsxMemberExpression que visite el nombre por separado. Sus ejemplos literales:
    ["<React.Fragment/> (ns import)", `/** @server-safe */\nimport * as React from "react";\nexport const C = () => <React.Fragment>x</React.Fragment>;`],
    ["<Context.Provider/> (createContext)", `/** @server-safe */\nimport { createContext } from "react";\nconst Context = createContext(null);\nexport const C = () => <Context.Provider value={null}>x</Context.Provider>;`],
  ])("NO genera falso positivo en componente legítimo: %s", (_label, code) => {
    expect(checkSourceFile(code, "jsx-ok.fixture.tsx")).toEqual([]);
  });

  // Contraparte: en un member-tag, el ROOT sí es una ref de valor — un global
  // DOM no-bound o un componente no declarado como root DEBE flaggearse.
  it.each([
    ["root global <window.Foo/>", `/** @server-safe */\nexport const C = () => <window.Foo />;`],
    ["root no declarado <Dropdown.Trigger/>", `/** @server-safe */\nexport const C = () => <Dropdown.Trigger />;`],
  ])("FLAGGEA el root de un member-tag no-bound: %s", (_label, code) => {
    const v = checkSourceFile(code, "jsx-member-root.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });
});

/**
 * Anti-regresión de TODA la superficie de `isNonReferencePosition` bajo
 * fail-closed (recomendación Auditor B: cerrar la clase, no whack-a-mole).
 * Cada posición NO-read de un global debe quedar exenta; cada READ real debe
 * flaggearse. Si una exención empieza a sobre-permitir, salta aquí.
 */
describe("server-safe gate — isNonReferencePosition: read vs non-read (fail-closed)", () => {
  const Comp = (b: string) =>
    `/** @server-safe */\nexport const Comp = () => { ${b} return null; };`;

  it.each([
    ["obj.window (property name)", Comp(`const o: any = {}; const x = o.window; void x;`)],
    ["typeof window", Comp(`const x = typeof window; void x;`)],
    ["type annotation HTMLElement", Comp(`const x: HTMLElement | null = null; void x;`)],
    ["object literal key {window:1}", Comp(`const o = { window: 1 }; void o;`)],
    ["const window = 1 (declara local)", Comp(`const window = 1; void window;`)],
    ["class field name", `/** @server-safe */\nexport class C { window = 1; }`],
    ["destructure source {window:w}", Comp(`const o: any = {}; const { window: w } = o; void w;`)],
    ["label + break", Comp(`outer: for (let i = 0; i < 2; i++) { if (i) break outer; }`)],
    // codex P2: `export * as <global> from "..."` (NamespaceExport) — el alias es metadata
    // del re-export, no un read. Antes FP-eaba un barrel con alias homónimo de un global.
    ["export * as window from barrel (NamespaceExport)", `/** @server-safe */\nexport * as window from "./icons";`],
    ["export type * as location from barrel", `/** @server-safe */\nexport type * as location from "./icons";`],
  ])("NON-READ queda clean: %s", (_label, code) => {
    expect(checkSourceFile(code, "nonread.fixture.tsx")).toEqual([]);
  });

  it.each([
    ["bare read const w=window", Comp(`const w = window; void w;`)],
    ["shorthand {window}", Comp(`const o = { window }; void o;`)],
    ["computed key {[window]:1}", Comp(`const o = { [window as any]: 1 }; void o;`)],
    ["spread {...window}", Comp(`const o = { ...(window as any) }; void o;`)],
    ["condition window?1:2", Comp(`const x = window ? 1 : 2; void x;`)],
    ["array [window]", Comp(`const a = [window]; void a;`)],
    ["return window", Comp(`return window;`)],
  ])("READ se flaggea: %s", (_label, code) => {
    const v = checkSourceFile(code, "read.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });
});

/**
 * Erased-shadow bypass (workflow audit, beta.27 BLOCKER-1). Un import
 * type-only (`import type {X}` / `import {type X}`) se BORRA al compilar — NO
 * crea binding runtime, así que NO sombrea el global ambiente `X`. Los
 * colectores del shadow-set lo añadían sin filtrar `isTypeOnly`, tratando una
 * ref bare a `X` como local → pasaba el gate, pero en runtime resuelve al
 * global real → ReferenceError en SSR. Cableado `addRuntimeImportBindings`.
 */
describe("server-safe gate — type-only import NO sombrea el global (erased-shadow)", () => {
  it.each([
    ["import {type window} + bare read", `/** @server-safe */\nimport { type window } from "./x";\nexport const C = () => { const w = window; void w; return null; };`],
    ["import type {document} + property access", `/** @server-safe */\nimport type { document } from "./x";\nexport const C = () => { return document.title; };`],
    ["import {type HTMLElement} + JSX tag", `/** @server-safe */\nimport { type HTMLElement } from "./x";\nexport const C = () => <HTMLElement />;`],
    ["import {type Function} + eval-sink", `/** @server-safe */\nimport { type Function } from "./x";\nexport const C = () => { const f = Function("return 1")(); void f; return null; };`],
    ["mixto import {Value, type window}", `/** @server-safe */\nimport { Value, type window } from "./x";\nexport const C = () => { void Value; const w = window; void w; return null; };`],
  ])("FLAGGEA pese al import type-only: %s", (_label, code) => {
    const v = checkSourceFile(code, "erased-shadow.fixture.tsx");
    expect(v.length).toBeGreaterThan(0);
  });

  it("import VALUE (no type) SÍ es shadow real → clean", () => {
    const code = `/** @server-safe */\nimport { window } from "./x";\nexport const C = () => { const w = window; void w; return null; };`;
    expect(checkSourceFile(code, "value-shadow.fixture.tsx")).toEqual([]);
  });
});

/**
 * Falsos positivos cerrados por el workflow audit (beta.27 BLOCKER-1):
 * JsxNamespacedName (SVG/XML) e ImportTypeNode.qualifier (type-space).
 */
describe("server-safe gate — FP cerrados: JsxNamespacedName + ImportTypeNode", () => {
  it.each([
    ["atributo namespaced <use xlink:href>", `/** @server-safe */\nexport const C = () => <use xlink:href="#x" />;`],
    ["tag namespaced <svg:rect/>", `/** @server-safe */\nexport const C = () => <svg:rect />;`],
    ["ImportTypeNode qualifier en tipo", `/** @server-safe */\nexport const C = (p: import("react").ReactNode) => { void p; return null; };`],
  ])("NO genera falso positivo: %s", (_label, code) => {
    expect(checkSourceFile(code, "fp-closed.fixture.tsx")).toEqual([]);
  });

  it("import() DINÁMICO de runtime con global SIGUE flaggeando (no es type-space)", () => {
    const code = `/** @server-safe */\nexport const C = () => { void import((window as any).x); return null; };`;
    const v = checkSourceFile(code, "dynamic-import.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });
});

/**
 * El guard `typeof X !== "undefined"` NO debe suprimir la detección para los
 * sinks de eval/escape (`eval`, `Function`, `globalThis`, `global`) — codex P1
 * round 3. Están SIEMPRE presentes en Node: el guard es siempre true y NO hace
 * el body server-safe (se denegan por ser vector de escape, no por ausencia).
 * Para globals cuyo hazard SÍ es la ausencia (`window`, `process`) el guard
 * sigue siendo válido.
 */
describe("server-safe gate — typeof guard NO suprime eval/escape sinks (codex P1)", () => {
  it.each([
    ["typeof Function + Function()", `/** @server-safe */\nexport const C = () => { if (typeof Function !== "undefined") { return Function("return 1")(); } return null; };`],
    ["typeof eval + eval()", `/** @server-safe */\nexport const C = () => { if (typeof eval !== "undefined") { return eval("1"); } return null; };`],
    ["typeof global + global.process", `/** @server-safe */\nexport const C = () => { if (typeof global !== "undefined") { return global.process.env.X; } return null; };`],
    // B2 (re-hunt): `self` es el alias de globalThis PRESENTE en Edge — el guard
    // `typeof self !== "undefined"` es vacuo ahí y self.eval/self.Function LANZAN.
    ["typeof self + self.Function", `/** @server-safe */\nexport function A() { if (typeof self !== "undefined") { return self.Function("return 1")(); } return null; }`],
    ["typeof self + self.eval", `/** @server-safe */\nexport function B() { if (typeof self !== "undefined") { return self.eval("1"); } return null; }`],
    // deepest re-hunt: `process` es present-but-partial en Node (`process.permission` solo con
    // --experimental-permission) → el typeof-guard del ROOT da falsa confianza, como navigator.
    ["typeof process + process.permission (partial)", `/** @server-safe */\nexport function P() { if (typeof process !== "undefined") { return process.permission.has("x"); } return false; }`],
  ])("FLAGGEA pese al guard typeof: %s", (_label, code) => {
    expect(checkSourceFile(code, "guard-evalsink.fixture.tsx").length).toBeGreaterThan(0);
  });

  it.each([
    ["typeof window (hazard = ausencia)", `/** @server-safe */\nexport const C = () => { if (typeof window !== "undefined") { return window.innerWidth; } return 0; };`],
    ["typeof document (hazard = ausencia)", `/** @server-safe */\nexport const C = () => { if (typeof document !== "undefined") { return document.title; } return ""; };`],
  ])("el guard SÍ es válido (clean): %s", (_label, code) => {
    expect(checkSourceFile(code, "guard-valid.fixture.tsx")).toEqual([]);
  });
});

/**
 * Declaración AMBIENT (`declare const/let/var/function/class`, `declare global`)
 * NO sombrea el global homónimo — codex P2 round 3 + cierre de clase. Se borra
 * al compilar (no emite binding runtime), así que en runtime la ref resuelve al
 * global ambiente → ReferenceError en SSR. El bypass afectaba a TODOS los paths
 * (bare read, property, eval-sink, JSX tag), no solo el JSX que vio codex.
 */
describe("server-safe gate — declaración ambient (declare) NO sombrea el global", () => {
  it.each([
    ["declare const + JSX tag", `/** @server-safe */\ndeclare const HTMLElement: any;\nexport const C = () => <HTMLElement />;`],
    ["declare const + bare read", `/** @server-safe */\ndeclare const window: any;\nexport const C = () => { const x = window; void x; return null; };`],
    ["declare const + property access", `/** @server-safe */\ndeclare const document: any;\nexport const C = () => { return document.title; };`],
    ["declare const + eval-sink", `/** @server-safe */\ndeclare const Function: any;\nexport const C = () => { return Function("return 1")(); };`],
    ["declare function + JSX tag", `/** @server-safe */\ndeclare function Foo(): any;\nexport const C = () => <Foo />;`],
    ["declare class + JSX tag", `/** @server-safe */\ndeclare class Widget {}\nexport const C = () => <Widget />;`],
    ["declare global var + bare read", `/** @server-safe */\ndeclare global { var widget: any; }\nexport const C = () => { return widget; };`],
  ])("FLAGGEA pese al declare ambient: %s", (_label, code) => {
    expect(checkSourceFile(code, "ambient.fixture.tsx").length).toBeGreaterThan(0);
  });

  it.each([
    ["const REAL (no declare)", `/** @server-safe */\nexport const C = () => { const window = 1; const x = window; void x; return null; };`],
    ["var REAL top-level", `/** @server-safe */\nvar helper = 1;\nexport const C = () => { const x = helper; void x; return null; };`],
    ["componente local REAL", `/** @server-safe */\nconst Inner = () => <span/>;\nexport const C = () => <Inner />;`],
  ])("declaración REAL (no ambient) SÍ es binding → clean: %s", (_label, code) => {
    expect(checkSourceFile(code, "real-binding.fixture.tsx")).toEqual([]);
  });
});

/**
 * Namespace TYPE-ONLY / vacío NO sombrea el global (erased-shadow #3).
 *
 * TS ELIDE un `namespace` entero si no contiene ningún miembro de valor
 * (interface/type-only o vacío) — emit verificado vía ts.transpileModule. El
 * shadow-set lo añadía filtrando solo `!isAmbientDeclaration` (denylist), así
 * que `namespace navigator {}` creaba una sombra fantasma y `navigator.x`
 * pasaba como "local". Tercera vez que muerde la misma raíz (type-only import →
 * declare ambient → namespace type-only); cerrada de CLASE con el predicado
 * fail-closed `producesRuntimeValue` (whitelist de productores de valor) que
 * todos los colectores del shadow-set consultan. Dos testigos adversariales
 * independientes convergieron: hunt (document/navigator/localStorage/screen) +
 * codex P1 (`namespace window`). beta.27 BLOCKER-1.
 */
describe("server-safe gate — namespace type-only NO sombrea el global (erased-shadow)", () => {
  it.each([
    ["ns document type-only (property)", `/** @server-safe */\nnamespace document { export type M = { t: string }; }\nexport function P() { return <h1>{document.title}</h1>; }`],
    ["ns navigator vacío", `/** @server-safe */\nnamespace navigator {}\nexport function UA() { return <span>{navigator.userAgent}</span>; }`],
    ["ns localStorage type-only (bare read)", `/** @server-safe */\nnamespace localStorage { export interface E { k: string } }\nexport function S() { const ls = localStorage; ls.getItem("x"); return <div />; }`],
    ["ns screen block-scoped type-only", `/** @server-safe */\nexport function F() { namespace screen { export type S = number; } return screen.width; }`],
    ["ns window type-only (codex P1)", `/** @server-safe */\nnamespace window { export interface Foo {} }\nexport function C() { return window.location.href; }`],
    ["ns window type-only oculta Function()", `/** @server-safe */\nnamespace window { export interface Foo {} }\nexport const x = (window.constructor as any)("return 1");`],
    ["ns anidado solo-tipos", `/** @server-safe */\nnamespace document { export namespace inner { export type T = 1; } }\nexport function C() { return document.title; }`],
  ])("FLAGGEA: namespace elidido no es sombra: %s", (_label, code) => {
    expect(checkSourceFile(code, "ns-erased.fixture.tsx").length).toBeGreaterThan(0);
  });

  it.each([
    ["ns con const (instanciado)", `/** @server-safe */\nnamespace NS { export const x = 1; }\nexport function C() { return <div>{NS.x}</div>; }`],
    ["ns con function", `/** @server-safe */\nnamespace NS { export function f() { return 1; } }\nexport function C() { return NS.f(); }`],
    ["ns con class", `/** @server-safe */\nnamespace NS { export class K {} }\nexport function C() { return new NS.K(); }`],
    ["ns anidado con valor", `/** @server-safe */\nnamespace Outer { export namespace Inner { export const v = 2; } }\nexport function C() { return Outer.Inner.v; }`],
    ["enum sigue instanciando", `/** @server-safe */\nenum E { A, B }\nexport function C() { return E.A; }`],
    // `export declare const/function/class` instancian el namespace (emiten el
    // shell `var N`(IIFE)) aunque el miembro sea ambient. La versión hand-rolled
    // los omitía → FP en patrón typed-config (re-hunt). ts.isInstantiatedModule
    // los reconoce.
    ["ns con export declare const (typed-config)", `/** @server-safe */\nnamespace Config { export declare const VERSION: string; export declare const BUILD: number; }\nexport function C() { return Config.VERSION; }`],
    ["ns con interface + declare const", `/** @server-safe */\nnamespace Settings { export interface Shape { theme: string } export declare const defaults: Shape; }\nexport function C() { return Settings.defaults; }`],
    ["ns con export declare function", `/** @server-safe */\nnamespace Api { export declare function call(): void; }\nexport function C() { Api.call(); return null; }`],
  ])("namespace INSTANCIADO sí es binding legítimo → clean (0-FP): %s", (_label, code) => {
    expect(checkSourceFile(code, "ns-value.fixture.tsx")).toEqual([]);
  });
});

/**
 * DEEPEST FINAL HUNT #173 — 15 bypasses de namespace cerrados (los 2 eval-sink → residual).
 *
 * El hunt adversarial final (14 lentes, loop-until-dry, 5 escépticos/superviviente,
 * oráculo esbuild) cazó 17 candidatos. **15 (namespace erased-shadow) eran bypasses REALES
 * del MODELO del gate** (su predicado de instanciación divergía de esbuild) → cerrados aquí.
 * Los 2 eval-sink (`+`-concat / template-sub) NO eran bug del modelo: el gate entiende el
 * emit, solo declina la ofuscación → son el residual §141 (ver el bloque "frontera del
 * eval-sink" abajo); el fold que los cazaba se REVIRTIÓ por incoherencia con §141 (falsa
 * completitud). Aquí queda la raíz de namespace:
 *
 *     `esbuildInstantiatesViaStatement` marcaba instanciante TODO value-producer,
 *     incl. `declare` NO-exportado (`namespace document { declare var slot }`) y
 *     `import Q = N` value-dead (`namespace document { import Q=N; type Z=typeof Q.z }`).
 *     esbuild ELIDE ambos → el namespace se borra → el read filtra al global. Regla
 *     REAL de esbuild (medida): ambient instancia SOLO con `export`; import-equals
 *     SOLO si value-used / `export import`. Misma raíz que el ADR §F4 pinneó como
 *     riesgo (un nombre erased en el shadow-set = bypass-de-global silencioso).
 *
 * Cada bypass DEBE flaggear ahora. Cuerpo del corpus = los snippets exactos del hunt.
 */
describe("server-safe gate — DEEPEST final hunt #173: 17 bypasses (namespace erased-shadow + eval-sink +concat)", () => {
  it.each([
    ["#0 document", "/** @server-safe */\nnamespace N {\n  export const z = 1;\n}\nnamespace document {\n  import Q = N;\n  export type Z = typeof Q.z;\n}\ntype _Use = document.Z;\nexport const Probe = (): _Use => document.title as unknown as _Use;\n"],
    ["#1 document", "/** @server-safe */\nconst enum Colors {\n  Red,\n}\nnamespace document {\n  import Q = Colors;\n  export type C = Q;\n}\ntype _Touch = document.C;\nexport const Probe = (): string => {\n  const _t = \"\" as unknown as _Touch;\n  void _t;\n  return document.title;\n};\n"],
    ["#2 window", "/** @server-safe */\nnamespace WinHelpers {\n  export const tag = 1;\n}\nnamespace window {\n  import Q = WinHelpers;\n  export type T = typeof Q.tag;\n}\ntype _Touch = window.T;\nexport const Probe = (): number => {\n  const _t: _Touch = 1;\n  void _t;\n  return window.innerWidth;\n};\n"],
    ["#3 navigator", "/** @server-safe */\nnamespace UAData {\n  export const ua = \"x\";\n}\nnamespace navigator {\n  import Q = UAData;\n  export type U = typeof Q.ua;\n}\ntype _Touch = navigator.U;\nexport const Probe = (): string => {\n  const _t: _Touch = \"x\";\n  void _t;\n  return navigator.userAgent;\n};\n"],
    ["#4 localStorage", "/** @server-safe */\nnamespace StoreImpl {\n  export const v = { get(_k: string): string { return \"\"; } };\n}\nnamespace localStorage {\n  import Q = StoreImpl;\n  export type S = typeof Q.v;\n}\ntype _Touch = localStorage.S;\nexport const Probe = (k: string): string => {\n  const _t: _Touch | null = null;\n  void _t;\n  return localStorage.getItem(k) ?? \"\";\n};\n"],
    ["#5 localStorage", "/** @server-safe */\nexport namespace localStorage {\n  declare var slot: number;\n}\nexport function readToken(): string | null {\n  return (localStorage as unknown as Storage).getItem(\"auth-token\");\n}\n"],
    ["#6 sessionStorage", "/** @server-safe */\nexport namespace sessionStorage {\n  declare function noop(): void;\n}\nexport function readSession(key: string): string | null {\n  return (sessionStorage as unknown as Storage).getItem(key);\n}\n"],
    ["#7 document", "/** @server-safe */\nexport namespace document {\n  declare class Marker {}\n}\nexport function findRoot(): Element | null {\n  return (document as unknown as Document).querySelector(\"#root\");\n}\n"],
    ["#8 indexedDB", "/** @server-safe */\nexport namespace indexedDB {\n  namespace Schema {\n    declare const version: number;\n  }\n}\nexport function openStore(name: string): unknown {\n  return (indexedDB as unknown as IDBFactory).open(name);\n}\n"],
    ["#9 window", "/** @server-safe */\nexport namespace window {\n  declare enum Phase { Idle, Active }\n}\nexport function getInnerWidth(): number {\n  return (window as unknown as { innerWidth: number }).innerWidth;\n}\n"],
    ["#12 screen", "/** @server-safe */\nnamespace screen {\n  declare const _internal: number;\n}\nexport const Screen = () => {\n  const dims = screen as unknown as { width: number; height: number };\n  return dims.width * dims.height;\n};\n"],
    ["#13 navigator", "/** @server-safe */\nnamespace navigator {\n  declare class _Probe {}\n}\nexport const UA = () => {\n  const { userAgent } = navigator as unknown as { userAgent: string };\n  return userAgent.toLowerCase();\n};\n"],
    ["#14 indexedDB", "/** @server-safe */\nnamespace indexedDB {\n  declare enum _Tag { X }\n}\nexport const OpenDb = () => {\n  const idb = indexedDB as unknown as { open(name: string): { result: unknown } };\n  return idb.open(\"app\").result;\n};\n"],
    ["#15 caches", "/** @server-safe */\nnamespace caches {\n  declare function _shape(): void;\n}\nexport const HasCache = () => {\n  const store = caches as unknown as { has(k: string): Promise<boolean> };\n  return store.has(\"v1\");\n};\n"],
    ["#16 localStorage default-param", "/** @server-safe */\nnamespace localStorage {\n  declare const _slot: string;\n}\nexport const Read = (\n  key: string | null = (localStorage as unknown as { getItem(k: string): string | null }).getItem(\"k\"),\n) => {\n  return key;\n};\n"],
  ])("FLAGGEA bypass cazado por el hunt: %s", (_label, code) => {
    expect(checkSourceFile(code, "deepest-hunt.fixture.tsx").length).toBeGreaterThan(0);
  });

  // 0-FP: instanciación GENUINA (la regla de emit del build OXC/rolldown) sigue eximiendo.
  it.each([
    ["export declare const (ambient exportado instancia)", "/** @server-safe */\nnamespace document { export declare const slot: number; }\nexport function P() { return document.slot; }"],
    ["export declare function", "/** @server-safe */\nnamespace navigator { export declare function probe(): void; }\nexport function P() { navigator.probe(); return null; }"],
    ["import-equals value-USED instancia (via export const)", "/** @server-safe */\nnamespace Other { export const z = 1; }\nnamespace window { import Q = Other; export const y = Q.z; }\nexport function P() { return window.y; }"],
    ["export import instancia", "/** @server-safe */\nnamespace Other { export const z = 1; }\nnamespace screen { export import Q = Other; }\nexport function P() { return screen.Q.z; }"],
    ["non-ambient const instancia", "/** @server-safe */\nnamespace localStorage { export const slot = 1; }\nexport function P() { return localStorage.slot; }"],
  ])("0-FP namespace genuinamente instanciado sigue clean: %s", (_label, code) => {
    expect(checkSourceFile(code, "ns-inst.fixture.tsx")).toEqual([]);
  });

  // ORÁCULO (corrección beta.27): el emisor de runtime del DS es **OXC (transform) +
  // rolldown 1.0.2 (bundle)** vía `vite build` — esbuild 0.27.7 es SOLO minify. Este pin
  // corre `esbuild.transformSync` como **PROXY rápido per-statement**, NO como el oráculo
  // load-bearing. El workflow `audit-esbuild-vs-rolldown-premise` RE-VERIFICÓ behavioralmente
  // contra el build real OXC/rolldown: coinciden en TODAS las formas de abajo (la divergencia
  // bundle-level —declaration-merge— se cierra aparte; en los 2 casos donde rolldown mantiene
  // un shell vacío que esbuild elide, el gate over-flagea = fail-closed, sigue SOUND).
  //
  // PIN DE SOUNDNESS (no bypass) — la invariante que importa para el freeze:
  // **gate-EXIME ⟹ build-INSTANCIA** (un read exento ⟹ existe shadow runtime real).
  // `buildInstantiatesViaStatement` es una UNDER-APPROXIMATION CONSERVADORA del emit:
  // whitelist de productores de valor decidibles. El REVERSO NO se exige — el gate PUEDE
  // over-flaggear (un namespace instanciado SOLO por un statement runtime-only —expression-
  // statement `Q.z;`, control-flow— no se reconoce → FP FAIL-CLOSED, seguro). Codex P2
  // (round-9): el gate NO coincide EXACTO con el emit (esos casos divergen), pero la
  // divergencia es 100% fail-closed → 0 bypasses. Over-aproximar para cerrar ese FP es la
  // dirección FAIL-OPEN que abrió los 17 (rechazada, §184). Lo que pinea esto: si una forma
  // EXIME pero el build ELIDE → bypass → revienta (el proxy esbuild lo cataría per-statement).
  it.each([
    ["declare var", "declare var v: number;"],
    ["export declare const", "export declare const v: number;"],
    ["declare const", "declare const v: number;"],
    ["declare function", "declare function f(): void;"],
    ["export declare function", "export declare function f(): void;"],
    ["declare class", "declare class C {}"],
    ["export declare class", "export declare class C {}"],
    ["declare enum", "declare enum E { A }"],
    ["export declare enum", "export declare enum E { A }"],
    ["import value-dead", "import Q = Other; export type Z = typeof Q.z;"],
    ["import value-used (export const)", "import Q = Other; export const y = Q.z;"],
    ["export import", "export import Q = Other;"],
    ["non-ambient const", "const v = 1;"],
    ["export const", "export const v = 1;"],
    ["nested declare namespace", "declare namespace I { const e: number }"],
    ["nested ns + const", "namespace I { export const e = 1 }"],
    ["interface only", "interface I { a: number }"],
    ["type only", "type T = number;"],
    ["empty", ""],
    // Casos runtime-only de codex P2 — esbuild INSTANCIA, gate over-flagea (fail-closed):
    ["import + expression-statement", "import Q = Other; Q.z;"],
    ["bare expression-statement", "Other.z;"],
    ["control-flow", "if (Other.z) { }"],
  ])("SOUNDNESS gate-exime⟹build-instancia (proxy esbuild.transformSync): namespace { %s }", (_label, member) => {
    const code =
      "/** @server-safe */\nnamespace Other { export const z = 1; }\nnamespace window { " +
      member +
      " }\nexport function P() { return window.innerWidth; }\n";
    const emit = transformSync(code, { loader: "tsx", format: "esm" }).code;
    const esbuildInstantiates =
      /\bvar window\b/.test(emit) || /\(\s*window2?\s*=>/.test(emit);
    const gateExempts =
      checkSourceFile(code, "matrix.fixture.tsx").length === 0;
    if (gateExempts) expect(esbuildInstantiates).toBe(true); // exime ⟹ esbuild instancia
  });

  // FP FAIL-CLOSED CONOCIDO (codex P2): un namespace instanciado SOLO por un statement
  // runtime-only (expression-statement / control-flow) NO lo reconoce el whitelist
  // conservador → over-flagea un shadow genuino. SEGURO (over-flag, no bypass), contrivado
  // (`namespace window { Q.z; }` no lo escribe nadie; 0 en source real), y NO se cierra a
  // propósito: el fix sería expandir el reconocimiento de instanciación = dirección fail-open
  // que abrió los 17. Documentado, no enmascarado (codex: el test viejo lo ocultaba).
  it.each([
    ["import + expr-stmt", "import Q = Other; Q.z;"],
    ["bare expr-stmt", "Other.z;"],
    ["control-flow if", "if (Other.z) { }"],
  ])("FP fail-closed conocido (esbuild instancia, gate over-flagea): { %s }", (_label, member) => {
    const code =
      "/** @server-safe */\nnamespace Other { export const z = 1; }\nnamespace window { " +
      member +
      " }\nexport function P() { return window.innerWidth; }\n";
    const emit = transformSync(code, { loader: "tsx", format: "esm" }).code;
    expect(/\bvar window\b/.test(emit) || /\(\s*window2?\s*=>/.test(emit)).toBe(true); // esbuild SÍ instancia
    expect(checkSourceFile(code, "fp.fixture.tsx").length).toBeGreaterThan(0); // gate over-flagea (fail-closed)
  });
});

/**
 * beta.27 BLOCKER-1 — codex P1 (commit 9ffc9c7) re-examinado + workflow adversarial
 * `verify-export-declare-ns-p1`: BYPASS REAL por DECLARATION-MERGING namespace+ambient.
 *
 * Codex alegó (citando evanw/esbuild#1158) que `namespace window { export declare const z }`
 * se ERASE y el read filtra al global. FALSO para el caso PLANO en el toolchain del DS
 * (vite 8 → rolldown 1.0.2 + transform OXC): el plano INSTANCIA un `var window` LOCAL →
 * `window.x` = undefined, NO crash (lo cubren los pins SOUNDNESS de arriba). PERO un caso
 * DISTINTO —que el modelo del gate NO modelaba— SÍ es bypass: cuando el namespace MERGEA
 * con un `declare var|let|const|function|class <mismo-nombre>` ambient HERMANO, rolldown
 * trata el nombre como EXTERNO y ELIDE el `var` local → el shell `window || (window = {})`
 * y el read quedan contra el GLOBAL LIBRE → `ReferenceError: window is not defined` en
 * MODULE-LOAD (Edge/SSR). El gate eximía el read (namespace = shadow) = FAIL-OPEN.
 *
 * ORÁCULO MEDIDO = el BUILD REAL (vite/rolldown) + ejecución en node SIN global window,
 * NO `esbuild.transformSync` (emite `var window` para AMBOS y enmascara la divergencia —
 * solo el bundle completo de rolldown elide el local). Tabla medida (gate-exime + build→):
 *   ReferenceError (AHORA cazado): declare var|let|const|function|class window + namespace window
 *   undefined / sound (NO tocar):  plano (sin declare hermano), value-member, `declare global { var window }`
 * Fix: `namespaceCollidesWithAmbientSibling` → namespace con colisión ambient mismo-scope
 * NO instancia → no es shadow → read flaggeado. Fail-closed (solo añade flagging); `declare
 * global` EXCLUIDO (el bloque no es sibling del mismo nombre). Lección: el oráculo de emit
 * del gate es el BUNDLER del build (rolldown en vite 8), no esbuild transform aislado.
 */
describe("server-safe gate — declaration-merge namespace+ambient (codex P1 9ffc9c7 / beta.27 BLOCKER-1)", () => {
  const violations = (code: string) =>
    checkSourceFile("/** @server-safe */\n" + code, "merge.fixture.tsx").length;
  const READ_W = "\nexport function read(): number { return window.innerWidth; }\n";
  const READ_D = "\nexport function read(): string { return document.title; }\n";

  // BYPASS class — el nombre del namespace MERGEA con un ambient sibling del mismo nombre →
  // rolldown elide el local → read filtra al global → DEBE flaggear (≥1 violación).
  it.each([
    ["declare var window", "declare var window: any;\nnamespace window { export declare const z: number; }"],
    ["declare let window", "declare let window: any;\nnamespace window { export declare const z: number; }"],
    ["declare const window", "declare const window: any;\nnamespace window { export declare const z: number; }"],
    ["declare function window + ns value", "declare function window(): void;\nnamespace window { export const z = 1; }"],
    ["declare class window + ns value", "declare class window {}\nnamespace window { export const z = 1; }"],
    // INDEPENDIENTE DEL ORDEN: rolldown solo elide si el `declare` va ANTES, pero el gate
    // fail-closea ambos órdenes (el detalle de impl del bundler no se asume).
    ["ns ANTES de declare var (fail-closed)", "namespace window { export declare const z: number; }\ndeclare var window: any;"],
    // deepest re-hunt: el sibling ambient puede ser un `declare namespace` (ambient
    // ModuleDeclaration), no solo var/function/class — misma rolldown var-elision. 10
    // instancias deduped (window/document/location, ambos órdenes, plano/anidado/self-read).
    ["declare namespace window (declare first)", "declare namespace window { const tx: number; }\nnamespace window { export const z = 42; }"],
    ["declare namespace window (value first)", "namespace window { export const z = 42; }\ndeclare namespace window { const tx: number; }"],
  ])("FLAGea bypass declaration-merge: %s", (_label, body) => {
    expect(violations(body + READ_W)).toBeGreaterThan(0);
  });

  it("FLAGea el declare-namespace sibling con read BODY-INTERNAL (document)", () => {
    const code = "/** @server-safe */\ndeclare namespace document { const t: string; }\nnamespace document { export const cached = document.title; }\nexport function r(){ return document.cached; }";
    expect(checkSourceFile(code, "declns.fixture.tsx").length).toBeGreaterThan(0);
  });

  it("FLAGea el merge también para `document`", () => {
    expect(
      violations(
        "declare var document: any;\nnamespace document { export declare const z: number; }" + READ_D,
      ),
    ).toBeGreaterThan(0);
  });

  // SOUND — DEBEN seguir exentos (el build MANTIENE el local → undefined, no crash). Que el
  // fix NO los rompa es lo que evita un FP masivo y preserva el caso codex PLANO como FP.
  it.each([
    ["plano export-declare (caso codex)", "namespace window { export declare const z: number; }"],
    ["plano value-member", "namespace window { export const z = 1; }"],
    ["declare global { var window } (augmentation)", "export {};\ndeclare global { var window: any; }\nnamespace window { export declare const z: number; }"],
    ["declare var de OTRO nombre (no colisiona)", "declare var somethingElse: any;\nnamespace window { export declare const z: number; }"],
  ])("NO rompe el caso sound: %s", (_label, body) => {
    expect(violations(body + READ_W)).toBe(0);
  });

  // BODY-INTERNAL (codex P1 sobre d007dd6): el read del global vive DENTRO del cuerpo del
  // namespace (`namespace window { export const z = window.innerWidth }`, evaluado en
  // module-load). El walk del cuerpo añadía el NOMBRE del namespace a localBindings (nsCtx)
  // SIN consultar la instanciación → con la colisión ambient (rolldown elide el local) el
  // read filtraba al GLOBAL pero el gate lo suprimía como self-ref = BYPASS. Fix: el nsCtx
  // solo añade el self-name si `namespaceIsInstantiated` (incl. guard de colisión) → mismo
  // criterio inner/outer. Medido behavioral: con declare hermano → ReferenceError en load.
  it.each([
    ["declare var window + body read", "declare var window: any;\nnamespace window { export const z = window.innerWidth; }"],
    ["declare let window + body read", "declare let window: any;\nnamespace window { export const z = window.innerWidth; }"],
    ["declare function window + body read", "declare function window(): void;\nnamespace window { export const z = window.innerWidth; }"],
    ["declare var document + body read", "declare var document: any;\nnamespace document { export const z = document.title; }"],
  ])("FLAGea bypass body-internal del merge: %s", (_label, src) => {
    expect(violations(src)).toBeGreaterThan(0);
  });

  // SOUND body-internal — SIN declare hermano el namespace instancia un `var window` local
  // → `window.innerWidth` lee el objeto del namespace (undefined), no crash (medido). El
  // self-ref se suprime correctamente. Que el fix NO lo rompa preserva el caso legítimo.
  it("NO rompe el body-internal self-ref sound (sin declare hermano)", () => {
    expect(violations("namespace window { export const z = window.innerWidth; }")).toBe(0);
  });
});

/**
 * DEEPEST FINAL HUNT #173 round-2 — 2 clases de bypass deferred-execution cerradas.
 *
 *  A) import-equals que SOMBREA un hook diferido con una función SÍNCRONA no-react:
 *     `namespace App { import useEffect = Sync.run; useEffect(() => document.title) }`.
 *     Round-8 excluyó TODO import-equals de nonImportBindings (para `import ue =
 *     React.useEffect`, FP14/15) — demasiado amplio: el alias no-react no se registraba
 *     como shadow → el check canónico file-global lo trataba como el hook react diferido
 *     → eximía. Fix: import-equals va a nonImport SALVO que aliase react (RHS root ∈
 *     reactImports.namespaces). Sync.run/FakeReact → shadow → flagea; React.* → exempt.
 *  B) tag JSX `$Foo`/`_Foo` clasificado como intrínseco por `first === first.toLowerCase()`
 *     (`$`/`_` no son ni mayúscula ni minúscula) → eximía su handler. React los emite como
 *     COMPONENTES (`jsx($Foo,…)`), que pueden invocar `props.onClick()` SÍNCRONO en render.
 *     Fix: intrínseco ⟺ `/^[a-z]/` (lowercase LETTER), la regla real del jsx-runtime de
 *     React (emitida por OXC en vite 8).
 */
describe("server-safe gate — deferred-execution: import-equals hook-shadow + JSX $/_ component tag (hunt final #173 r2)", () => {
  const flagged = (code: string) =>
    checkSourceFile(code, "r2.fixture.tsx").length > 0;

  // A — import-equals shadow de hook con función síncrona no-react → FLAGGEA
  it.each([
    ["import useEffect = Sync.run", '/** @server-safe */\nimport { useEffect } from "react";\nexport const realHook = useEffect;\nnamespace Sync { export function run(cb: () => void): void { cb(); } }\nexport namespace App { import useEffect = Sync.run; useEffect(() => { document.title = "x"; }); }'],
    ["import React = FakeReact (namespace alias)", '/** @server-safe */\nimport * as React from "react";\nexport const r = React;\nnamespace FakeReact { export function useEffect(cb: () => void): void { cb(); } }\nexport namespace App { import React = FakeReact; React.useEffect(() => { document.title = "x"; }); }'],
    // codex P1: cadena con RHS root SOMBREADO — `import React = FakeReact; import useEffect = React.useEffect`.
    // El root `React` ∈ reactImports.namespaces file-global PERO sombreado localmente por FakeReact
    // (no-react) → el check debe ser scope-aware (root ∉ priorNonImport), no file-global.
    ["import-equals cadena con root sombreado (codex P1)", '/** @server-safe */\nimport * as React from "react";\nimport { useEffect } from "react";\nexport const _r = React;\nexport const _u = useEffect;\nnamespace FakeReact { export function useEffect(cb: () => void): void { cb(); } }\nexport namespace App { import React = FakeReact; import useEffect = React.useEffect; useEffect(() => { document.title = "x"; }); }'],
    // codex P1 round-10: función visitada ANTES de un `const useEffect = Sync.run` POSTERIOR
    // en el mismo scope — léxicamente liga al const local síncrono, no al hook react file-global.
    // Requiere PRE-CARGA de sombras léxicas (gatherNonReactLexicalShadows) al entrar el scope.
    ["sombra léxica POSTERIOR (función antes del const, codex P1-r10)", '/** @server-safe */\nimport { useEffect } from "react";\nexport const real = useEffect;\nconst Sync = { run(cb: () => void) { cb(); } };\nnamespace N { export function C() { useEffect(() => { void window.location.href; }); } const useEffect = Sync.run; }\nexport const _n = N;'],
    // codex P1 (review genérico): cadena de sombra react del MISMO bloque ANTES de una función hoisted
    // que la usa. `const React = FakeReact; const useEffect = React.useEffect` → useEffect es síncrono
    // (FakeReact). El pre-load DEBE resolver la cadena same-block (TDZ → React∈shadows antes de useEffect)
    // para que la función hoisted `f` vea useEffect como sombra. El purge posicional NO alcanza a `f`.
    ["same-block FakeReact shadow chain + hoisted fn", '/** @server-safe */\nimport * as React from "react";\nnamespace FakeReact { export function useEffect(cb: () => void): void { cb(); } }\nexport function C() { function f() { useEffect(() => { void window.location.href; }); } const React = FakeReact; const useEffect = React.useEffect; f(); return null; }\nexport const _r = React;'],
    ["same-block FakeReact shadow chain (uso directo)", '/** @server-safe */\nimport * as React from "react";\nnamespace FakeReact { export function useEffect(cb: () => void): void { cb(); } }\nexport function C() { const React = FakeReact; const useEffect = React.useEffect; useEffect(() => { void window.location.href; }); return null; }\nexport const _r = React;'],
    // codex P1 (review genérico): MULTI-declarador en UN statement — `const React = FakeReact, useEffect
    // = React.useEffect`. JS resuelve el 2º `React` al declarador LOCAL del 1º (FakeReact, sync), pero
    // reactAliasesDeclaredBy clasificaba todos los declaradores contra el scope de ANTES del statement
    // (React = el import) → useEffect tratado como hook diferido = BYPASS. Fix: avanzar izq-a-der dentro
    // de la lista de declaradores. Flaggea el window read síncrono.
    ["multi-declarador const React=FakeReact, useEffect=React.useEffect", '/** @server-safe */\nimport * as React from "react";\nnamespace FakeReact { export function useEffect(cb: () => void): void { cb(); } }\nexport function C() { const React = FakeReact, useEffect = React.useEffect; useEffect(() => { void window.location.href; }); return null; }\nexport const _r = React;'],
    ["multi-declarador const Sync={...}, useEffect=Sync.run", '/** @server-safe */\nexport function C() { const Sync = { run(cb: () => void) { cb(); } }, useEffect = Sync.run; useEffect(() => { void window.location.href; }); return null; }'],
  ])("FLAGGEA import-equals no-react que sombrea un hook: %s", (_l, code) => {
    expect(flagged(code)).toBe(true);
  });

  // A — no-regresión: hook real de react diferido sigue exento (no afectado por la pre-carga)
  it("0-FP: useEffect REAL de react (sin shadow) sigue EXENTO", () => {
    expect(flagged('/** @server-safe */\nimport { useEffect } from "react";\nexport function C() { useEffect(() => { void window.location.href; }); return null; }')).toBe(false);
  });

  // useEffectEvent (React 19.2): el callback corre desde un Effect y React ERRA si se llama en render →
  // (a) no corre en render + (b) el return no es render-invocable (React lo previene) → exento. codex P2.
  it("0-FP: useEffectEvent de react EXENTO; pero de NO-react FLAGGEA (source-check, sin fail-open)", () => {
    expect(flagged('/** @server-safe */\nimport { useEffectEvent } from "react";\nexport function C() { const e = useEffectEvent(() => { void window.location.href; }); return null; }')).toBe(false);
    expect(flagged('/** @server-safe */\nimport { experimental_useEffectEvent } from "react";\nexport function C() { const e = experimental_useEffectEvent(() => { void window.location.href; }); return null; }')).toBe(false);
    // source-check: un `useEffectEvent` de un módulo NO-react (corre síncrono) NO exime → fail-closed.
    expect(flagged('/** @server-safe */\nimport { useEffectEvent } from "./sync";\nexport function C() { const e = useEffectEvent(() => { void window.location.href; }); e(); return null; }')).toBe(true);
  });

  // A — FP destructure-de-react cerrado (hunt scope-aware, 7 FP_REGRESSION). Destructurar hooks
  // reales del namespace React (`const { useEffect } = React`) es un alias react, NO un shadow
  // sync → el read diferido dentro DEBE eximir. variableInitAliasesReact + gatherReactImports.
  it.each([
    ["const { useEffect } = React (default)", '/** @server-safe */\nimport React from "react";\nconst { useEffect, useState } = React;\nexport function W(): string { useEffect(() => { void window.innerWidth; }); return useState(0) ? "x" : "y"; }'],
    ["const { useLayoutEffect } = React (import *)", '/** @server-safe */\nimport * as React from "react";\nconst { useLayoutEffect } = React;\nexport function W() { useLayoutEffect(() => { void document.body.clientHeight; }); return null; }'],
    ["rename const { useEffect: ue } = React", '/** @server-safe */\nimport React from "react";\nconst { useEffect: ue } = React;\nexport function W() { ue(() => { void window.innerWidth; }); return null; }'],
    ["cadena const R = React; const { useEffect } = R", '/** @server-safe */\nimport * as React from "react";\nconst R = React;\nconst { useEffect } = R;\nexport function W() { useEffect(() => { void window.innerWidth; }); return null; }'],
    ["const ue = React.useEffect (alias directo)", '/** @server-safe */\nimport * as React from "react";\nconst ue = React.useEffect;\nexport function W() { ue(() => { void window.innerWidth; }); return null; }'],
  ])("0-FP: destructure/alias de hook react TOP-LEVEL EXENTO: %s", (_l, code) => {
    expect(flagged(code)).toBe(false);
  });

  // CONTROL fail-open del inventario client-only: hooks cuyo callback CORRE en el render SSR/Edge (useMemo,
  // useState-init, useSyncExternalStore get*Snapshot) o cuyo value returned se invoca en render (useCallback,
  // useImperativeHandle — round 15 P2.2) NO se eximen. Es el lado SIMÉTRICO del FP de ref/useImperativeHandle:
  // eximir de MÁS sería fail-open. Solo useEffect/useLayoutEffect/useInsertionEffect (post-render) eximen.
  it.each([
    ["useMemo (corre EN render)", '/** @server-safe */\nimport { useMemo } from "react";\nexport function C() { return useMemo(() => (window as any).innerWidth, []); }'],
    ["useSyncExternalStore getSnapshot (corre EN render)", '/** @server-safe */\nimport { useSyncExternalStore } from "react";\nexport function C() { return useSyncExternalStore(() => () => {}, () => (window as any).innerWidth, () => 0); }'],
    ["useSyncExternalStore getServerSnapshot (corre EN SSR)", '/** @server-safe */\nimport { useSyncExternalStore } from "react";\nexport function C() { return useSyncExternalStore(() => () => {}, () => 0, () => (window as any).innerWidth); }'],
    ["useState lazy init (corre EN render)", '/** @server-safe */\nimport { useState } from "react";\nexport function C() { const [s] = useState(() => (window as any).innerWidth); return s; }'],
    ["useImperativeHandle (value invocable en render, round 15)", '/** @server-safe */\nimport { useImperativeHandle, forwardRef } from "react";\nexport const C = forwardRef((_p, r) => { useImperativeHandle(r, () => ({ s() { (window as any).x; } })); return null; });'],
    ["useCallback (value memoizado invocable en render, round 15)", '/** @server-safe */\nimport { useCallback } from "react";\nexport function C() { const f = useCallback(() => (window as any).x, []); return <div onClick={f} />; }'],
  ])("CONTROL fail-open: hook render-phase NO se exime (FLAGGEA): %s", (_l, code) => {
    expect(flagged(code)).toBe(true);
  });

  // BYPASS codex P1 (recursión file-global revertida): un alias react NESTED en `helper` NO
  // debe reclasificar el `useEffect` de OTRO scope importado de un módulo no-react (`./sync`,
  // que corre síncrono en render). La resolución de alias react es TOP-LEVEL only; un alias en
  // scope hermano no aplica → este DEBE flaggear (bypass cerrado).
  it("FLAGGEA codex P1: alias react nested NO filtra a un useEffect no-react de otro scope", () => {
    expect(flagged('/** @server-safe */\nimport { useEffect } from "./sync";\nimport * as React from "react";\nfunction helper(): void { const { useEffect } = React; useEffect(() => {}); }\nexport function C() { useEffect(() => { void window.location.href; }); return null; }\nexport const _h = helper;')).toBe(true);
  });

  // 0-FP NESTED (resolución react SCOPE-AWARE, addReactAliases): un destructure/alias react en
  // scope NESTED (cuerpo de función/namespace) AHORA se reconoce vía `scopeReactNs`/`scopeReactNamed`
  // acumulados posicionalmente durante el walk — el read diferido EXIME. Antes era residual
  // fail-closed (over-flag); el refactor scope-aware lo cierra SIN reabrir el bypass file-global
  // que codex P1 rechazó (el alias vive solo en su scope, no filtra a hermanos — ver el test
  // codex P1 arriba, que sigue FLAGGEANDO). Cierra [6]/[9]/[10] del hunt scope-aware.
  it.each([
    ["nested: const { useEffect } = React en función", '/** @server-safe */\nimport * as React from "react";\nexport function Comp() { const { useEffect } = React; useEffect(() => { void window.innerWidth; }, []); return null; }'],
    ["nested: const useEffect = reactUseEffect en función", '/** @server-safe */\nimport { useEffect as reactUseEffect } from "react";\nexport function useTitle(t: string): void { const useEffect = reactUseEffect; useEffect(() => { document.title = t; }); }'],
    ["nested: namespace P { import R = React; R.useEffect }", '/** @server-safe */\nimport * as React from "react";\nexport namespace Panel { import R = React; export function usePanel(): void { R.useEffect(() => { void window.scrollY; }); } }'],
    ["nested: const R = React; R.useEffect directo", '/** @server-safe */\nimport * as React from "react";\nexport function Comp() { const R = React; R.useEffect(() => { void window.innerWidth; }); return null; }'],
    // Cadena scope-local de DOS hops — antes residual fail-closed; el núcleo único
    // `reactAliasesDeclaredBy` (scope-aware en AMBOS paths: registro Y exclusión nonImport)
    // resuelve el root intermedio `R` → ue = useEffect real → EXENTO.
    ["nested cadena: const R = React; const ue = R.useEffect", '/** @server-safe */\nimport * as React from "react";\nexport function Comp() { const R = React; const ue = R.useEffect; ue(() => { void window.innerWidth; }); return null; }'],
  ])("0-FP NESTED: alias react scope-aware en función/namespace EXENTO: %s", (_l, code) => {
    expect(flagged(code)).toBe(false);
  });

  // SOUNDNESS: el control no-react (destructure de un objeto SYNC, o React sombreado por un no-react)
  // SIGUE flaggeando — el fix scope-aware no abre bypass. Cubre también: alias-spoof nested
  // (`const { useState: useEffect } = React` → canónico useState, render-phase → FLAGGEA) y alias de
  // namespace NO-react nested (`import R = FakeReact; R.useEffect`).
  it.each([
    ["const { useEffect } = Sync (objeto sync no-react)", '/** @server-safe */\nconst Sync = { useEffect(cb: () => void) { cb(); } };\nexport function W() { const { useEffect } = Sync; useEffect(() => { void window.innerWidth; }); return null; }'],
    ["React sombreado: const React2 = FakeReact; const { useEffect } = React2", '/** @server-safe */\nimport * as React from "react";\nexport const _r = React;\nnamespace FakeReact { export function useEffect(cb: () => void): void { cb(); } }\nexport namespace App { const React2 = FakeReact; const { useEffect } = React2; useEffect(() => { void document.title; }); }'],
    ["nested sync shadow: const useEffect = Sync.run", '/** @server-safe */\nimport * as Sync from "./sync";\nexport function Comp() { const useEffect = Sync.run; useEffect(() => { void window.location.href; }); return null; }'],
    ["alias-spoof nested: const { useState: useEffect } = React (canónico useState)", '/** @server-safe */\nimport * as React from "react";\nexport function Comp() { const { useState: useEffect } = React; useEffect(() => { void window.innerWidth; }); return null; }'],
    ["namespace NO-react nested: import R = FakeReact; R.useEffect", '/** @server-safe */\nimport * as FakeReact from "./fake";\nexport namespace P { import R = FakeReact; export function go() { R.useEffect(() => { void window.scrollY; }); } }'],
  ])("SOUNDNESS: alias NO-react / spoof sigue FLAGGEANDO: %s", (_l, code) => {
    expect(flagged(code)).toBe(true);
  });

  // A — no-regresión: import-equals que SÍ aliasa react sigue exento (FP14/15), directo y en cadena
  it.each([
    ["directo: ue=React.useEffect, R=React", '/** @server-safe */\nimport * as React from "react";\nimport R = React;\nimport ue = React.useEffect;\nexport function C() { ue(() => { document.title = "x"; }); R.useEffect(() => { window.scrollTo(0,0); }); return null; }'],
    ["cadena react legítima: R=React; ue=R.useEffect", '/** @server-safe */\nimport * as React from "react";\nimport R = React;\nimport ue = R.useEffect;\nexport function C() { ue(() => { document.title = "x"; }); return null; }'],
  ])("0-FP: import-equals a REACT sigue EXENTO (FP14/15): %s", (_l, code) => {
    expect(flagged(code)).toBe(false);
  });

  // B — tag JSX $/_-prefijo es COMPONENTE → handler NO exento → FLAGGEA
  it.each([
    ["$Panel onClick síncrono", '/** @server-safe */\nfunction $Panel(props: { onClick: () => void }) { props.onClick(); return null; }\nexport function C() { return <$Panel onClick={() => { window.alert(document.cookie); }} />; }'],
    ["_Widget onMount síncrono", '/** @server-safe */\nfunction _Widget(props: { onMount: () => void }) { props.onMount(); return null; }\nexport function C() { return <_Widget onMount={() => { localStorage.setItem("k", screen.width + ""); }} />; }'],
    ["Upper onShow", '/** @server-safe */\nfunction Box(props: { onShow: () => void }) { props.onShow(); return null; }\nexport function C() { return <Box onShow={() => { history.pushState(null, "", location.href); }} />; }'],
    // ref callback en COMPONENTE: React 19 puede pasar `ref` como prop normal e invocarlo en render → NO exento (codex P2).
    ["Comp ref síncrono", '/** @server-safe */\nfunction Box(props: { ref: (n: unknown) => void }) { props.ref(null); return null; }\nexport function C() { return <Box ref={() => { void window.name; }} />; }'],
  ])("FLAGGEA handler en COMPONENTE custom (corre síncrono en render): %s", (_l, code) => {
    expect(flagged(code)).toBe(true);
  });

  // B — no-regresión: handler en INTRÍNSECO (lowercase letter) sigue exento
  it.each([
    ["<button onClick>", '/** @server-safe */\nexport function C() { return <button onClick={() => { window.alert(document.cookie); }}>x</button>; }'],
    ["<div onMouseEnter>", '/** @server-safe */\nexport function C() { return <div onMouseEnter={() => { void localStorage.length; }} />; }'],
    ["<x$ onClick> (lowercase-first intrínseco)", '/** @server-safe */\nexport function C() { return <x$ onClick={() => { void window.name; }} />; }'],
    // ref callback en HOST: corre en el COMMIT del cliente (no en SSR render) → EXENTO igual que un handler (codex P2).
    ["<div ref> callback", '/** @server-safe */\nexport function C() { return <div ref={() => { window.scrollTo(0, 0); }} />; }'],
    ["<input ref> callback (document)", '/** @server-safe */\nexport function C() { return <input ref={(n: unknown) => { if (n) document.title = "x"; }} />; }'],
  ])("0-FP: handler/ref en intrínseco lowercase sigue EXENTO: %s", (_l, code) => {
    expect(flagged(code)).toBe(false);
  });
});

/**
 * NÚCLEO ÚNICO de react-alias (`reactAliasesDeclaredBy`) — codex P1 (BYPASS let-reassign) +
 * hunt adversarial #173 (31 hallazgos: 7 bypasses + 13 FPs + 11 residuales). La lógica antes
 * estaba CUADRUPLICADA y divergente (gatherReactImports file-global, variableInitAliasesReact/
 * importEqualsAliasesReact para exclusión nonImport, addReactAliases scope-aware); codex explotó
 * el eje const-vs-let, el hunt el eje file-global-vs-scope-aware y property-vs-element. Unificado.
 */
describe("server-safe gate — react-alias núcleo único (codex P1 const-only + hunt #173 scope-aware)", () => {
  const H = '/** @server-safe */\nimport * as React from "react";\n';
  const HD = '/** @server-safe */\nimport React from "react";\n';
  const flagged = (code: string) => checkSourceFile(code, "core.fixture.tsx").length > 0;

  // BYPASSES (fail-OPEN) cerrados — const-only mata el let/var reasignable; el computed-spoof
  // resuelve el miembro real (useState → render-phase). TODOS deben FLAGGEAR.
  it.each([
    ["computed-spoof const {['useState']:useEffect}=React", H + `export function C(){ const {["useState"]:useEffect}=React; useEffect(()=>{ void window.innerWidth; }); return null; }`],
    ["let {useEffect}=React reasignado a sync", HD + `let { useEffect } = React;\nuseEffect = ((cb:()=>void)=>cb()) as unknown as typeof useEffect;\nexport function C(){ useEffect(()=>{ void window.innerWidth; }); return null; }`],
    ["let ue=React.useEffect; ue=runSync (nested)", H + `function runSync(cb:()=>void){cb();}\nexport function C(){ let ue=React.useEffect; ue=runSync; ue(()=>{ void window.innerWidth; }); return null; }`],
    ["let ue=React.useEffect; ue=runSync (top-level)", H + `function runSync(cb:()=>void){cb();}\nlet ue=React.useEffect; ue=runSync;\nexport function C(){ ue(()=>{ void window.innerWidth; }); return null; }`],
    ["let ue=React.useEffect; ue=obj.run", H + `const obj={run(cb:()=>void){cb();}};\nexport function C(){ let ue:(cb:()=>void)=>void=React.useEffect; ue=obj.run; ue(()=>{ void window.innerWidth; }); return null; }`],
    ["chain const ue; let ue2=ue; ue2=runSync", H + `function runSync(cb:()=>void){cb();}\nconst ue=React.useEffect; let ue2=ue; ue2=runSync;\nexport function C(){ ue2(()=>{ void window.innerWidth; }); return null; }`],
    ["let ue=React.useEffect; if(flag) ue=runSync", H + `function runSync(cb:()=>void){cb();}\nexport function C(flag:boolean){ let ue=React.useEffect; if(flag){ue=runSync;} ue(()=>{ void window.innerWidth; }); return null; }`],
    // codex P1 sobre 1defc39: rest-de-namespace es un objeto MUTABLE → reasignar el miembro lo
    // vuelve síncrono. NO se registra rest como namespace → FLAGGEA.
    ["rest mutado const {...rest}=React; rest.useEffect=sync", HD + `export function C(){ const {...rest}=React; (rest as any).useEffect=((cb:()=>void)=>cb()); (rest as any).useEffect(()=>{ void window.innerWidth; }); return null; }`],
  ])("BYPASS CERRADO (const-only / computed-spoof / rest-mutable) — FLAGGEA: %s", (_l, code) => {
    expect(flagged(code)).toBe(true);
  });

  // FPs (fail-closed over-flag) cerrados por el núcleo scope-aware + element-access + computed-literal
  // + purge scope-shadow. TODOS deben EXIMIR (el callee ES un hook react diferido). (El rest-de-namespace
  // NO se cierra: el rest es un objeto mutable → registrarlo como ns sería fail-OPEN, codex P1 — residual.)
  it.each([
    ["scope-local chain nested const R=React; {useEffect}=R", H + `export function Outer(){ const R=React; function Mid(){ const {useEffect}=R; function Leaf(){ useEffect(()=>{ void localStorage.getItem("k"); },[]); return null;} return Leaf;} return Mid; }`],
    ["scope-local chain same-block const R=React; {useEffect}=R", H + `export function C(){ const R=React; const {useEffect}=R; useEffect(()=>{ void localStorage.getItem("k"); },[]); return null; }`],
    ["two-hop ident const e=React.useEffect; const ue=e", H + `export function C(){ const e=React.useEffect; const ue=e; ue(()=>{ void window.innerWidth; }); return null; }`],
    ["element-access const ue=React['useEffect']", H + `export function C(){ const ue=React["useEffect"]; ue(()=>{ void window.innerWidth; }); return null; }`],
    ["computed-literal binding {['useEffect']:ue}=React", H + `export function C(){ const {["useEffect"]:ue}=React; ue(()=>{ void window.innerWidth; },[]); return null; }`],
    ["import-equals nested namespace R/ue", H + `namespace P{ import R=React; import ue=R.useEffect; export function go(){ ue(()=>{ void location.href; }); } }\nexport const _p=P;`],
    ["inner-block react-alias sombrea outer sync", H + `function runSync(cb:()=>void){cb();}\nexport function C(){ const ue=runSync; ue(()=>{}); { const ue=React.useEffect; ue(()=>{ void window.innerWidth; }); } return null; }`],
    ["nested react-alias bajo top-level sync shadow", HD + `const Sync={run:(cb:()=>void)=>cb()};\nconst useEffect=Sync.run;\nexport function Widget(){ function helper(){ const useEffect=React.useEffect; useEffect(()=>{ document.title=window.location.href; },[]); } helper(); return null; }`],
  ])("FP CERRADO (scope-aware/element-access/rest/purge) — EXIME: %s", (_l, code) => {
    expect(flagged(code)).toBe(false);
  });

  // RESIDUALES fail-closed ACEPTADOS (SOUND, no bypass) — cerrarlos exige data-flow (reassign-tracking)
  // o modelar el binder (miembros de namespace, .bind/.call). Documentados; deben seguir FLAGGEANDO.
  it.each([
    ["var ue=React.useEffect (sin reassign, const-only)", H + `export function C(){ var ue=React.useEffect; ue(()=>{ void window.innerWidth; }); return null; }`],
    ["assignment-form let ue; ue=React.useEffect", H + `export function C13({mode}:{mode:number}){ let ue:typeof React.useEffect; switch(mode){ case 0: ue=React.useEffect; ue(()=>{ void window.innerWidth; },[]); break; } return null; }`],
    ["let s=runSync; s=React.useEffect (reassign sync→react)", H + `function runSync(cb:()=>void){cb();}\nexport function C(){ let s=runSync; s=React.useEffect; s(()=>{ void window.innerWidth; }); return null; }`],
    ["namespace member export P.useEffect2", `/** @server-safe */\nimport { useEffect } from "react";\nnamespace P{ export const useEffect2=useEffect; }\nexport const realUE=P.useEffect2;\nexport function C(){ realUE(()=>{ void window.innerWidth; }); return null; }`],
    ["rest-de-namespace const {...rest}=React; rest.useEffect (objeto mutable, fail-closed)", HD + `const { Component:_C, ...rest }=React; void _C;\nexport function C(){ rest.useEffect(()=>{ void window.innerWidth; }); return null; }`],
    ["ternary (cond?React:React2).useEffect", H + `import * as React2 from "react";\nexport function C(cond:boolean){ (cond?React:React2).useEffect(()=>{ void window.innerWidth; }); return null; }`],
    ["useEffect.bind(null)(cb)", `/** @server-safe */\nimport { useEffect } from "react";\nexport function C(){ useEffect.bind(null)(()=>{ void window.innerWidth; }); return null; }`],
    ["useEffect(...[cb]) spread", `/** @server-safe */\nimport { useEffect } from "react";\nexport function C(){ useEffect(...[()=>{ void window.innerWidth; }]); return null; }`],
  ])("RESIDUAL fail-closed ACEPTADO (data-flow/binder) — FLAGGEA: %s", (_l, code) => {
    expect(flagged(code)).toBe(true);
  });

  // SOUNDNESS: el fix scope-aware (que EXIME más) NO abre bypass — los controles sync/spoof/sibling FLAGGEAN.
  it.each([
    ["sibling-leak helper react-alias NO filtra a C sync", `/** @server-safe */\nimport { useEffect } from "./sync";\nimport * as React from "react";\nfunction helper(){ const {useEffect}=React; useEffect(()=>{}); }\nexport function C(){ useEffect(()=>{ void window.location.href; }); return null; }\nexport const _h=helper;`],
    ["sibling helperB usa el top-level sync useEffect", HD + `const Sync={run:(cb:()=>void)=>cb()};\nconst useEffect=Sync.run;\nexport function Widget(){ function helperB(){ useEffect(()=>{ document.title=window.location.href; }); } helperB(); return null; }`],
    ["rest-de-sync NO exime const {...rest}=Sync", `/** @server-safe */\nimport * as Sync from "./sync";\nexport function C(){ const {...rest}=Sync; rest.useEffect(()=>{ void window.innerWidth; }); return null; }`],
  ])("SOUNDNESS: control sync/sibling sigue FLAGGEANDO: %s", (_l, code) => {
    expect(flagged(code)).toBe(true);
  });
});

/**
 * Invalidación de namespace react por MEMBER-WRITE (codex P1 sobre b35a87c). Un `import React
 * from "react"` (default) es el objeto export MUTABLE (interop CJS), NO el Module Namespace
 * read-only de `import * as React`. `React.useEffect = sync; React.useEffect(()=>window)` corre
 * síncrono → BYPASS. Fix: si el root de un namespace tiene un member-write en el archivo
 * (`gatherMutatedNamespaceRoots`), NO se exime su `.useEffect`. File-wide (el objeto es compartido).
 * Clave: NO se sobre-flaggea el caso COMÚN sin mutación (`import React from "react"; React.useEffect(cb)`).
 */
describe("server-safe gate — invalidación de namespace por member-write (codex P1 b35a87c)", () => {
  const flagged = (code: string) => checkSourceFile(code, "mut.fixture.tsx").length > 0;
  const HD = '/** @server-safe */\nimport React from "react";\n';
  const HN = '/** @server-safe */\nimport * as React from "react";\n';

  // BYPASS cerrado — un member-write al namespace lo invalida → FLAGGEA.
  it.each([
    ["default React.useEffect=sync", HD + `export function C(){ (React as any).useEffect=((cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["default React['useEffect']=sync (element-access write)", HD + `export function C(){ (React as any)["useEffect"]=((cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["alias R mutado const R=React; R.useEffect=sync", HD + `export function C(){ const R=React; (R as any).useEffect=((cb:()=>void)=>cb()); R.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["React mutado, usado vía alias R", HD + `export function C(){ const R=React; (React as any).useEffect=((cb:()=>void)=>cb()); R.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["Object.assign(React,{useEffect})", HD + `export function C(){ Object.assign(React as any,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P1 #4: el objeto es COMPARTIDO → mutar CUALQUIER alias contamina a TODA la familia.
    // Mutación vía alias A, llamada vía React (el root sintáctico del write NO basta).
    ["alias-de-alias: const A=React; A.useEffect=sync; React.useEffect()", HD + `export function C(){ const A=React; (A as any).useEffect=((cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["cadena: const A=React; const B=A; B.useEffect=sync; React.useEffect()", HD + `export function C(){ const A=React; const B=A; (B as any).useEffect=((cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["let alias: let B=React; B.useEffect=sync; React.useEffect()", HD + `export function C(){ let B=React; (B as any).useEffect=((cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["nested alias mutation contamina top-level React", HD + `function f(){ const A=React; (A as any).useEffect=((cb:()=>void)=>cb()); }\nexport function C(){ React.useEffect(()=>{ void window.location.href; }); return null; }\nexport const _f=f;`],
    ["import-equals alias mutado: import A=React; A.useEffect=sync", HD + `import A=React;\n(A as any).useEffect=((cb:()=>void)=>cb());\nexport function C(){ React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P1 #5: mutadores Object.*/Reflect.* en forma BRACKET (element-access) — misma
    // normalización dot/bracket; el bracket-form se colaba.
    ["Object['assign'](React,…) bracket-form", HD + `export function C(){ (Object as any)["assign"](React,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["Object['defineProperty'](React,…) bracket-form", HD + `export function C(){ (Object as any)["defineProperty"](React,"useEffect",{value:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["Reflect.set(React,…)", HD + `export function C(){ Reflect.set(React,"useEffect",(cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["Reflect.defineProperty(React,…)", HD + `export function C(){ Reflect.defineProperty(React,"useEffect",{value:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["Reflect['set'](React,…) bracket-form", HD + `export function C(){ (Reflect as any)["set"](React,"useEffect",(cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P1 #6: key bracket envuelta en nodo runtime-erased (paréntesis, `as const`) — mismo
    // unwrap que los otros member-name paths.
    ["Object[('assign')](React,…) key con paréntesis", HD + `export function C(){ (Object as any)[("assign")](React,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["Object['assign' as const](React,…) key con as", HD + `export function C(){ (Object as any)["assign" as const](React,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["React[('useEffect')]=sync write con key envuelta", HD + `export function C(){ (React as any)[("useEffect")]=((cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P1 #8: bajo interop CJS el NAMED import se lee del MISMO objeto mutable → si la familia
    // react se muta, el named hook tampoco es de fiar.
    ["named hook + React.useEffect=sync", `/** @server-safe */\nimport React, { useEffect } from "react";\nexport function C(){ (React as any).useEffect=((cb:()=>void)=>cb()); useEffect(()=>{ void window.location.href; }); return null; }`],
    ["named hook + Object.assign(React,…)", `/** @server-safe */\nimport React, { useEffect } from "react";\nexport function C(){ Object.assign(React as any,{useEffect:(cb:()=>void)=>cb()}); useEffect(()=>{ void window.location.href; }); return null; }`],
    ["named hook + alias mutado A=React; A.useEffect=sync", `/** @server-safe */\nimport React, { useEffect } from "react";\nexport function C(){ const A=React; (A as any).useEffect=((cb:()=>void)=>cb()); useEffect(()=>{ void window.location.href; }); return null; }`],
    ["scope-local named alias bajo mutación const ue=useEffect", `/** @server-safe */\nimport React, { useEffect } from "react";\nexport function C(){ (React as any).useEffect=((cb:()=>void)=>cb()); const ue=useEffect; ue(()=>{ void window.location.href; }); return null; }`],
    // codex P1 #9: destructuring-assignment member-write — el target member ESTÁ en el archivo
    // (token-en-su-sitio) aunque el LHS sea un object/array literal.
    ["object-destr ({useEffect: React.useEffect} = …)", HD + `export function C(){ ({ useEffect: (React as any).useEffect } = { useEffect:(cb:()=>void)=>cb() }); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["array-destr [React.useEffect] = [sync]", HD + `export function C(){ [(React as any).useEffect] = [(cb:()=>void)=>cb()]; React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["nested object-destr ({a:{b: React.useEffect}} = …)", HD + `export function C(){ ({ a:{ b:(React as any).useEffect } } = { a:{ b:(cb:()=>void)=>cb() } }); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["destr default ({x: React.useEffect = d} = …)", HD + `export function C(){ const d=(cb:()=>void)=>cb(); ({ x:(React as any).useEffect = d } = {} as any); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["destr taintea NAMED ({useEffect: React.useEffect} = …)", `/** @server-safe */\nimport React, { useEffect } from "react";\nexport function C(){ ({ useEffect: (React as any).useEffect } = { useEffect:(cb:()=>void)=>cb() }); useEffect(()=>{ void window.location.href; }); return null; }`],
    ["for-of destr pattern member-write", HD + `export function C(){ for ({ x: (React as any).useEffect } of [{ x:(cb:()=>void)=>cb() }]) {} React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P2 (e248193): receiver VALUE-TRANSPARENTE (coma/&&/ternario) → token-en-su-sitio,
    // el target ES React. Antes rootOf solo hacía unwrapErased → (0, React) escapaba.
    ["((0, React) as any).useEffect=sync (coma en target)", HD + `export function C(){ ((0, React) as any).useEffect=((cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["Object.assign((0, React),…) (coma en 1er arg)", HD + `export function C(){ Object.assign((0, React) as any,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["(true && React).useEffect=sync (&& en target)", HD + `export function C(){ ((true && React) as any).useEffect=((cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P1 (5318d34): la FAMILIA de aliases también debe reconocer un alias VALUE-
    // TRANSPARENTE. `const A = (0, React)` → A ES React; antes el family-builder solo hacía
    // unwrapErased+Identifier → A no entraba en la familia → un member-write a A no tainteaba
    // React. Mismo `valueTransparentLeaves` que el target-resolution (clase, no instancia).
    ["familia: const A=(0,React); A.useEffect=sync", HD + `export function C(){ const A=(0,React); (A as any).useEffect=((cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: const A=(c?React:x); A.useEffect=sync (ternario)", HD + `export function C(){ const A=(Math.random()>0.5?React:({} as any)); (A as any).useEffect=((cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: cadena const A=(0,React); const B=A; B.useEffect=sync", HD + `export function C(){ const A=(0,React); const B=A; (B as any).useEffect=((cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // deepest re-hunt: formas de alias que NO son `const X = React` — assignment, destructuring
    // (decl+assign), param-default, array-index. El family-builder solo enrollaba VariableDecl-
    // identifier + import-equals → estas escapaban = bypass (8 instancias).
    ["familia: assignment A=React", HD + `export function C(){ let A: any; A = React; A.useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: array-destr-assign [A]=[React]", HD + `export function C(){ let A: any; [A] = [React]; A.useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: obj-destr-decl {a:A}={a:React}", HD + `export function C(){ const { a: A } = { a: React }; (A as any).useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: array-destr-decl [A]=[React]", HD + `export function C(){ const [A] = [React]; (A as any).useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: array-index A=[React][0]", HD + `export function C(){ const A = [React][0]; (A as any).useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: param-default go(A=React)", HD + `export function C(){ function go(A: any = React){ A.useEffect=(cb:any)=>cb(); } go(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P2 (2561d6b): default de un binding-ELEMENT (param destructurado o `const`) — el
    // family-builder solo enrollaba param-default cuando node.name era identifier; el binding
    // pattern escapaba (`{ R = React }`).
    ["familia: param binding-default go({R=React})", HD + `export function C(){ function go({ R = React as any } = {} as any){ R.useEffect=(cb:any)=>cb(); } go(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: array param binding-default go([R=React])", HD + `export function C(){ function go([ R = React as any ] = [] as any){ R.useEffect=(cb:any)=>cb(); } go(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: var binding-default const {R=React}", HD + `export function C(){ const { R = React as any } = {} as any; (R as any).useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P2 (50630d8): default ANIDADO en un binding-pattern — el loop solo miraba elementos
    // inmediatos; `{ opts: { R = React } }` escapaba.
    ["familia: param nested-default go({opts:{R=React}})", HD + `export function C(){ function go({ opts: { R = React as any } = {} as any } = {} as any){ R.useEffect=(cb:any)=>cb(); } go(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: var nested-default const {opts:{R=React}}", HD + `export function C(){ const { opts: { R = React as any } = {} as any } = {} as any; (R as any).useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: deep nested-default {a:{b:{R=React}}}", HD + `export function C(){ const { a: { b: { R = React as any } = {} as any } = {} as any } = {} as any; (R as any).useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P2 (9abe984, #133): key COMPUTADA value-transparente en el destructuring de la familia.
    ["familia: computed key {[\"a\"]:A}={a:React}", HD + `export function C(){ const { ["a"]: A } = { a: React }; (A as any).useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P2 (3b7b6ba, #133): mutador con target vía SPREAD de array-literal.
    ["familia: Object.assign(...[React, {…}])", HD + `export function C(){ Object.assign(...[React, { useEffect(cb: any){ cb(); } }] as any); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P2 (4823f3a, #133): default de assignment-destructure + mutador con cond-spread.
    ["familia: assignment-default ({R=React}={})", HD + `export function C(){ let R: any; ({ R = React } = {} as any); (R as any).useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: rename-default ({x:R=React}={})", HD + `export function C(){ let R: any; ({ x: R = React } = {} as any); (R as any).useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: Object.assign(...(c?[React,{…}]:[]))", HD + `export function C(){ Object.assign(...((0 as unknown as boolean) ? [React, { useEffect:(cb:any)=>cb() }] : []) as any); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P2 (7614b51, #133): receiver del mutador value-transparente.
    ["familia: (0, Object).assign(React, {…})", HD + `export function C(){ (0, Object).assign(React, { useEffect:(cb:any)=>cb() }); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P2 (79b8fc1, #133): familia react vía alternativas de literal.
    ["familia: const {R}=c?{R:React}:{R:React}", HD + `export function C(){ const { R } = (0 as unknown as boolean) ? { R: React } : { R: React }; (R as any).useEffect=(cb:any)=>cb(); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P1 (338913f, #133): receiver del mutador con ALTERNATIVAS donde la 1ª rama NO es mutador.
    ["familia: (c?Fake:Object).assign(React,{…})", HD + `export function C(c: boolean){ const Fake: any = {}; (c ? Fake : Object).assign(React, { useEffect:(cb:any)=>cb() }); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["familia: (c?Object:Reflect).set(React,…) mutadores mixtos", HD + `export function C(c: boolean){ (c ? Object : Reflect).set(React, "useEffect", (cb:any)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
  ])("BYPASS CERRADO (namespace mutado por member-write) — FLAGGEA: %s", (_l, code) => {
    expect(flagged(code)).toBe(true);
  });

  it("NO over-taintea un hermano NO-react del destructuring ({a:A,b:B}={a:React,b:x}; B mutado)", () => {
    const code = HD + `export function C(){ const other: any = {}; const { a: A, b: B } = { a: React, b: other }; (B as any).useEffect=(cb:any)=>cb(); void A; React.useEffect(()=>{ void window.location.href; }); return null; }`;
    expect(flagged(code)).toBe(false);
  });

  // ASIMETRÍA taint-vs-recognition (clase narrow-unwrap, dirección OPUESTA): el lado de
  // RECONOCIMIENTO de hook (reactAliasesDeclaredBy) se queda en unwrapErased a propósito —
  // reconocer `const R=(0,React)` como react EXIMIRÍA más (fail-OPEN). Así que `const R=
  // (0,React); R.useEffect(()=>window)` OVER-FLAGEA (trata el hook real como sync) = residual
  // FAIL-CLOSED, seguro. El TAINT sí cruza value-transparent (arriba), porque ahí narrow
  // = fail-OPEN. Misma sintaxis, resolución opuesta según la dirección de seguridad.
  it("RESIDUAL fail-closed: const R=(0,React); R.useEffect(()=>window) over-flagea (recognition narrow a propósito)", () => {
    const code = HD + `export function C(){ const R=(0,React); return R.useEffect(()=>{ void window.location.href; }); }`;
    expect(flagged(code)).toBe(true);
  });

  // FRONTERA: pasar React a una función ARBITRARIA que lo muta es data-flow inter-procedural
  // (residual single-file, como toda indirección del gate). El mutador token-en-su-sitio
  // (Object/Reflect con X de primer arg) SÍ se caza; el paso-por-función NO.
  it("RESIDUAL fail-open declarado: React pasado a una función que lo muta (data-flow)", () => {
    const code = HD + `function patch(r:any){ r.useEffect=((cb:()=>void)=>cb()); }\nexport function C(){ patch(React); React.useEffect(()=>{ void window.location.href; }); return null; }\nexport const _p=patch;`;
    // Documenta el residual: el gate NO lo caza a propósito (exige análisis inter-procedural).
    expect(flagged(code)).toBe(false);
  });

  // FRONTERA (codex P1 #7 → ratificado residual): alcanzar un mutador a través de
  // `Function.prototype.call`/`.apply`/`.bind`, aliasing del callee, comma-operator o
  // qualified-access (`globalThis.Object.assign`) exige modelar la semántica de invocación /
  // value-flow del callee = el subsistema que el gate renuncia (misma clase que eval-sink §141
  // ensamblaje/indirección y cross-módulo). El mutador DIRECTO (`Object.assign(React,…)`) SÍ se
  // caza; el indirecto NO. Tests pinean el residual single-file (NO bug, frontera por diseño).
  it.each([
    ["Object.assign.call(Object, React, …)", HD + `export function C(){ Object.assign.call(Object,React,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["Reflect.set.call(Reflect, React, …)", HD + `export function C(){ Reflect.set.call(Reflect,React,"useEffect",(cb:()=>void)=>cb()); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    // codex P2 (e248193): coma en el CALLEE (`(0, Object.assign)(React,…)`) sigue residual —
    // resolverlo exige modelar QUÉ función se invoca (callee value-flow), distinto del TARGET
    // value-transparent que SÍ se caza arriba (`Object.assign((0, React),…)`). Frontera coherente.
    ["(0, Object.assign)(React, …) — coma en CALLEE", HD + `export function C(){ (0, Object.assign)(React as any,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
  ])("RESIDUAL frontera data-flow: mutador vía invocación indirecta NO se caza: %s", (_l, code) => {
    expect(flagged(code)).toBe(false);
  });

  // RESIDUAL §141 (codex P2 sobre 9c97cdd): una KEY de mutador COMPUTADA por un operador
  // (`Object[1 && "assign"]`, `Object[(0,"assign")]`, `Object["as"+"sign"]`) exige constant-folding
  // → frontera §141 (token-unidad literal en su sitio se caza; operador-computed = residual). Misma
  // clase que la invocación indirecta. NO se caza (fail-open por diseño). El literal SÍ (probado abajo).
  it.each([
    ["Object[1 && 'assign'](React,…)", HD + `export function C(){ (Object as any)[1 && "assign"](React,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["Object[(0,'assign')](React,…)", HD + `export function C(){ (Object as any)[(0,"assign")](React,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["Object['as'+'sign'](React,…) concat", HD + `export function C(){ (Object as any)["as"+"sign"](React,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`],
  ])("RESIDUAL §141: key de mutador COMPUTADA por operador NO se caza: %s", (_l, code) => {
    expect(flagged(code)).toBe(false);
  });

  // FRONTERA: el literal (incl. erased-wrapped) SÍ se caza — confirma que la frontera es token-unidad.
  it("CONTROL: key de mutador LITERAL (incl. paréntesis) SÍ taintea", () => {
    const lit = HD + `export function C(){ (Object as any)["assign"](React,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`;
    const paren = HD + `export function C(){ (Object as any)[("assign")](React,{useEffect:(cb:()=>void)=>cb()}); React.useEffect(()=>{ void window.location.href; }); return null; }`;
    expect(flagged(lit)).toBe(true);
    expect(flagged(paren)).toBe(true);
  });

  // 0-FP — el caso COMÚN sin mutación sigue exento; un member-write a OTRO objeto NO taintea React.
  it.each([
    ["default React.useEffect(cb) sin mutación (patrón ubicuo)", HD + `export function C(){ React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["namespace import * as React (read-only)", HN + `export function C(){ React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["member-write a OTRO objeto no taintea React", HD + `export function C(){ const o:any={}; o.foo=1; React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["named import directo no afectado", `/** @server-safe */\nimport { useEffect } from "react";\nexport function C(){ useEffect(()=>{ void window.location.href; }); return null; }`],
    ["default + named SIN mutación (patrón común)", `/** @server-safe */\nimport React, { useEffect } from "react";\nexport function C(){ useEffect(()=>{ void window.location.href; }); return null; }`],
    ["member-write a otro objeto no taintea el named", `/** @server-safe */\nimport React, { useEffect } from "react";\nexport function C(){ const o:any={}; o.foo=1; useEffect(()=>{ void window.location.href; }); return null; }`],
    ["destructuring a identifiers (no member-write) no taintea", HD + `export function C(){ let a:any,b:any; ({ a, b } = { a:1, b:2 }); void a; void b; React.useEffect(()=>{ void window.location.href; }); return null; }`],
    ["destructuring-write a OTRO objeto no taintea react", HD + `export function C(){ const o:any={}; ({ a: o.foo } = { a:1 }); React.useEffect(()=>{ void window.location.href; }); return null; }`],
  ])("0-FP: sin mutación del namespace react sigue EXENTO: %s", (_l, code) => {
    expect(flagged(code)).toBe(false);
  });
});

/**
 * INVARIANTE DE CAPA — tsc bloquea el shadow TDZ (rebuttal PINEADO, beta.27).
 *
 * Codex (P2) señaló que el gate pasa `if (typeof window === "undefined") return;
 * const window = {}` (el `typeof window` resuelve al lexical en TDZ y lanza). Es
 * REAL que el gate lo pasa, pero NO es un bypass del gate por dos motivos
 * independientes:
 *   1. tsc lo RECHAZA antes — "used before declaration" (TS2448 const/let,
 *      TS2449 class), error de scoping core e INDEPENDIENTE de `strict`. El
 *      typecheck es CI-gate (verify + `tsc -p tsconfig.build.json`) → nunca
 *      compila ni llega a producción.
 *   2. El crash es TDZ — revienta igual en cliente y servidor, no es "global
 *      ausente en SSR" → fuera del mandato del gate.
 *
 * Este test PINCHA la dependencia de capa (no "esperamos que tsc lo rechace",
 * sino un invariante verificado en CI): si una versión futura de TS degrada esos
 * errores, revienta y lo revisitamos. Misma disciplina que el JSX member-tag —
 * todo rebuttal "una capa previa lo bloquea" se respalda pinchando esa capa.
 *
 * CONTRASTE decisivo con la clase erased-shadow REAL (declare / namespace
 * type-only): esa COMPILA limpio → tsc NO la bloquea → el gate es la ÚNICA
 * defensa → DEBE cazarla (y la caza). Que el TDZ no compile y el erased-shadow
 * sí PRUEBA que son clases distintas — no se arreglan con el mismo código.
 */
describe("server-safe gate — invariante de capa: tsc bloquea el shadow TDZ", () => {
  it.each([
    ["const window", `export function C() { if (typeof window === "undefined") return null; const window = {}; return window; }`, 2448],
    ["let window", `export function C() { if (typeof window === "undefined") return null; let window: any; window = {}; return window; }`, 2448],
    ["class window", `export function C() { if (typeof window === "undefined") return null; class window {} return window; }`, 2449],
  ])("el shadow TDZ '%s' FALLA typecheck (used before declaration)", (_label, code, expected) => {
    expect(tscDiagnosticCodes(code)).toContain(expected);
  });

  it("TS2448 es independiente de `strict` (también con strict:false)", () => {
    const code = `export function C() { if (typeof window === "undefined") return null; const window = {}; return window; }`;
    expect(tscDiagnosticCodes(code, false)).toContain(2448);
  });

  it.each([
    ["declare const window", `declare const window: any;\nexport function C() { return window.location.href; }`],
    ["namespace navigator type-only", `namespace navigator {}\nexport function C() { return navigator.userAgent; }`],
  ])("CONTRASTE: el erased-shadow real '%s' COMPILA limpio (tsc no es la defensa)", (_label, code) => {
    const codes = tscDiagnosticCodes(code);
    expect(codes).not.toContain(2448);
    expect(codes).not.toContain(2449);
  });

  it("CONTRASTE: …pero el GATE sí caza el erased-shadow (es la única defensa)", () => {
    const declareCode = `/** @server-safe */\ndeclare const window: any;\nexport function C() { return window.location.href; }`;
    const nsCode = `/** @server-safe */\nnamespace navigator {}\nexport function C() { return navigator.userAgent; }`;
    expect(checkSourceFile(declareCode, "declare-shadow.fixture.tsx").length).toBeGreaterThan(0);
    expect(checkSourceFile(nsCode, "ns-shadow.fixture.tsx").length).toBeGreaterThan(0);
  });
});

/**
 * import-equals VALUE-ALIAS (hunt, beta.27 BLOCKER-1). `import h = A.B.C` con un
 * moduleReference NO-type-only emite `var h = A.B.C` — un read runtime del root.
 * `import h = window.location.href` leía `window` en SSR, pero la regla 11 de
 * `isNonReferencePosition` eximía TODA EntityName (`QualifiedName`) asumiendo
 * type-space. La excepción des-exime SOLO el root (`.left` más interno) cuando
 * la EntityName es el moduleReference de un import-equals de valor; los miembros
 * (`.right`) los sigue eximiendo la regla 1, y el type-space (`React.ReactNode`)
 * y los alias a binding local (`import x = NS.Foo`) siguen clean.
 */
describe("server-safe gate — import-equals value-alias (regla 11)", () => {
  it.each([
    ["import h = window.location.href", `/** @server-safe */\nimport h = window.location.href;\nexport const x = h;`],
    ["import nav = navigator.userAgent", `/** @server-safe */\nimport nav = navigator.userAgent;\nexport const x = nav;`],
    ["import ls = localStorage.length", `/** @server-safe */\nimport ls = localStorage.length;\nexport const x = ls;`],
    ["import d = document.cookie", `/** @server-safe */\nimport d = document.cookie;\nexport const x = d;`],
  ])("FLAGGEA el root del value-alias: %s", (_label, code) => {
    expect(checkSourceFile(code, "import-eq.fixture.tsx").length).toBeGreaterThan(0);
  });

  it.each([
    ["type React.ReactNode (QualifiedName type-space)", `/** @server-safe */\nexport type P = { children?: React.ReactNode };\nexport const C = (p: P) => p.children;`],
    ["import x = NS.Foo (namespace local de valor)", `/** @server-safe */\nnamespace NS { export const Foo = 1; }\nimport x = NS.Foo;\nexport const y = x;`],
    ["import type T = React.FC (type-only)", `/** @server-safe */\nimport type T = React.FC;\nexport const x: unknown = null;`],
  ])("NO genera falso positivo: %s", (_label, code) => {
    expect(checkSourceFile(code, "import-eq-ok.fixture.tsx")).toEqual([]);
  });
});

/**
 * import-equals a un miembro TIPO same-file = RESIDUAL POR DISEÑO (degradado de B4).
 * `import window = Cfg.window` cuyo `Cfg.window` es un tipo se BORRA al emit, así que un
 * `window.*` posterior resuelve al global. Cazarlo exige resolver el RHS contra los
 * namespaces del archivo CON merge / scope-léxico / alias-chains / dotted / self-ref —
 * eso ES el binder de TS, que el gate renuncia a tener (parser-puro, solo
 * `createSourceFile`). Probado empíricamente: tras B4, codex enumeró 7 constructos
 * consecutivos del binder. Decisión: NO reimplementar el binder; queda residual, MISMA
 * clase categórica que el alias CROSS-MODULE (necesita binder) y que la ofuscación del
 * eval-sink — decidible-solo-por-binder, contrived + opt-in/first-party. Estos tests
 * PINEAN el residual: el gate NO los caza, a propósito (ver ADR, cláusula de caducidad
 * doble: revisitar si deja de ser opt-in/first-party O si el gate adopta binder).
 */
describe("server-safe gate — import-equals a tipo same-file = RESIDUAL (binder, fuera de diseño)", () => {
  it.each([
    ["miembro interface same-file", `/** @server-safe */\nnamespace Cfg { export interface window { x: number } export const VERSION = "1.0"; }\nimport window = Cfg.window;\n/** @server-safe */\nexport function C() { return window.location.href + Cfg.VERSION; }`],
    ["nested A.B.window (miembro tipo)", `/** @server-safe */\nnamespace A { export namespace B { export interface window { x: number } } export const V = 1; }\nimport window = A.B.window;\n/** @server-safe */\nexport function C() { return window.location.href + A.V; }`],
    ["merge function+namespace", `/** @server-safe */\nfunction Cfg() {}\nnamespace Cfg { export interface window { x: number } }\nimport window = Cfg.window;\n/** @server-safe */\nexport function C() { return window.location.href; }`],
    // namespace instanciado (const V) → el ROOT no se flaggea; aísla el residual del
    // bypass (window.location no se caza) del FP-contrived del root type-only.
    ["dotted namespace A.B { interface } (ns instanciado)", `/** @server-safe */\nnamespace A.B { export interface window { x: number } export const V = 1; }\nimport window = A.B.window;\n/** @server-safe */\nexport function C() { return window.location.href + A.B.V; }`],
  ])("NO se caza (residual binder, opt-in/first-party): %s", (_label, code) => {
    // Documentación honesta del residual: el gate devuelve [] a propósito. Si algún día
    // adopta un binder/type-checker, estos pasarían a cazarse (cláusula de caducidad).
    expect(checkSourceFile(code, "import-eq-residual.fixture.tsx")).toEqual([]);
  });

  it.each([
    // miembro de VALOR same-file → emite `var win = Cfg.win` → binding real, clean.
    ["miembro const same-file (value-alias)", `/** @server-safe */\nnamespace Cfg { export const win = { x: 1 }; }\nimport win = Cfg.win;\n/** @server-safe */\nexport function C() { return win.x; }`],
    ["miembro function same-file", `/** @server-safe */\nnamespace Cfg { export function make() { return 1; } }\nimport make = Cfg.make;\n/** @server-safe */\nexport function C() { return make(); }`],
    // cross-module no resoluble → conservador value-alias (residual): no flaggea.
    ["alias cross-module (residual honesto)", `import * as Ext from "./other";\nimport win = Ext.win;\n/** @server-safe */\nexport function C() { return win.x; }`],
  ])("NO genera falso positivo (value-alias / residual cross-module): %s", (_label, code) => {
    expect(checkSourceFile(code, "import-eq-val.fixture.tsx")).toEqual([]);
  });
});

/**
 * Eval-sink PAREN-WRAP (hunt, beta.27 BLOCKER-1). Las ramas (b/c/d) de la
 * detección `.constructor` exigían `node.parent` directo = Call/PropertyAccess/
 * Tagged; un `ParenthesizedExpression` rompía la cadena y `((fn).constructor)()`
 * (= `Function("code")()`) pasaba. Los parens son contiguos y legibles, NO
 * ofuscación → in-scope. `isWeaponizedConstructorAccess` salta parens a ambos
 * lados. Los usos legítimos (`(err.constructor).name`, `(x.constructor) === Y`,
 * `new (x.constructor)()`) siguen clean.
 */
describe("server-safe gate — eval-sink paren-wrap del .constructor", () => {
  it.each([
    ["((fn).constructor)() callee", `/** @server-safe */\nexport const t = ((() => {}).constructor)("return window.localStorage")();`],
    ["(...).call(null,...)", `/** @server-safe */\nexport const t = ((() => {}).constructor).call(null, "return document.cookie")();`],
    ["(...) tagged template", `/** @server-safe */\nexport const t = ((() => {}).constructor)\`return navigator.userAgent\`;`],
    ["doble paren wrap", `/** @server-safe */\nexport const t = (((() => {}).constructor))("x")();`],
    ["(base).constructor.constructor partido", `/** @server-safe */\nconst F = (({}).constructor).constructor;\nexport const t = F("x")();`],
  ])("FLAGGEA pese a los paréntesis: %s", (_label, code) => {
    const v = checkSourceFile(code, "paren-sink.fixture.tsx");
    expect(v.some((x) => x.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it.each([
    ["(err.constructor).name", `/** @server-safe */\nexport const n = (err: any) => (err.constructor).name;`],
    ["(x.constructor) === Y", `/** @server-safe */\nexport const eq = (x: any, Y: any) => (x.constructor) === Y;`],
    ["new (x.constructor)() clon", `/** @server-safe */\nexport const clone = (x: any) => new (x.constructor)();`],
  ])("NO genera falso positivo en uso legítimo de .constructor: %s", (_label, code) => {
    expect(checkSourceFile(code, "ctor-ok.fixture.tsx")).toEqual([]);
  });
});

/**
 * Eval-sink por BRACKET notation (codex P2, beta.27). `x.constructor["call"](...)`
 * invocaba Function.prototype.call por bracket; la rama (c) solo miraba
 * `PropertyAccessExpression` (`.call` punto). `accessedMemberName` unifica punto y
 * bracket-string → cierra la asimetría de forma estructural (`isConstructorMemberAccess`
 * ya era simétrico). La frontera legible-vs-ofuscado se mantiene SIMÉTRICA: el
 * contiguo se caza en ambas formas; el split-var (residual #1, data-flow) queda
 * out-of-scope en ambas — `["call"]` no es ofuscación, una key dinámica `[k]` sí.
 */
describe("server-safe gate — eval-sink por bracket notation del .constructor", () => {
  it.each([
    ['constructor["call"]', `/** @server-safe */\nexport const t = (() => {}).constructor["call"](null, "return window")();`],
    ['constructor["apply"]', `/** @server-safe */\nexport const t = (() => {}).constructor["apply"](null, ["return window"])();`],
    ['constructor["bind"]', `/** @server-safe */\nexport const t = (() => {}).constructor["bind"](null, "x")();`],
    ['paren + bracket combinado (base función)', `/** @server-safe */\nexport const t = ((() => {}).constructor)["call"](null, "x")();`],
    ['doble bracket constructor["constructor"]', `/** @server-safe */\nexport const t = ({})["constructor"]["constructor"]("x")();`],
    // Key envuelta en wrappers erased (paréntesis/cast) — runtime-equivalente al
    // string literal. codex P2.
    ['key parentizada [("call")]', `/** @server-safe */\nexport const t = (() => {}).constructor[("call")](null, "return window")();`],
    ['doble [("constructor")] parentizada', `/** @server-safe */\nexport const t = ({})[("constructor")][("constructor")]("x")();`],
    ['key con cast ["call" as string]', `/** @server-safe */\nexport const t = (() => {}).constructor[("call") as string](null, "x")();`],
  ])("FLAGGEA el bracket-string igual que el punto: %s", (_label, code) => {
    const v = checkSourceFile(code, "bracket-sink.fixture.tsx");
    expect(v.some((x) => x.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it.each([
    ['a["slice"](0) — bracket no-constructor', `/** @server-safe */\nexport const f = (a: any[]) => a["slice"](0);`],
    ['fn["bind"](null) sobre no-constructor', `/** @server-safe */\nexport const b = (fn: any) => fn["bind"](null);`],
    ['x["constructor"].name — lectura legítima', `/** @server-safe */\nexport const n = (x: any) => x["constructor"].name;`],
    // codex P2 (27c5d18): bracket `.call` sobre el `.constructor` de un literal no-función
    // = `Object.call` (no Function) → no es eval. El DOBLE bracket (`({})["constructor"]
    // ["constructor"]`) SÍ flaggea (arriba) porque es Function; este single no.
    ['(({}).constructor)["call"]() — Object.call, no eval', `/** @server-safe */\nexport const t = (({}).constructor)["call"](null, "x");`],
  ])("NO genera falso positivo en bracket legítimo: %s", (_label, code) => {
    expect(checkSourceFile(code, "bracket-ok.fixture.tsx")).toEqual([]);
  });
});

/**
 * Eval-sink por wrapper ERASED (re-hunt, beta.27). `(() => {}).constructor!(...)`,
 * `((() => {}).constructor as F)(...)`, `... satisfies T` — `!`/`as`/`satisfies`/
 * `<T>` son wrappers que TS BORRA al emit (emiten exactamente su operando), igual
 * que los paréntesis. El skip-parens del fix C solo saltaba ParenthesizedExpression
 * → estos hermanos escapaban. `isErasedOuterExpr`/`skipErasedDown` los saltan a
 * ambos lados. Contiguos y legibles → in-scope; los usos legítimos con cast/`!`
 * (`(e.constructor as Function).name`, `new (x.constructor as any)()`) siguen clean.
 */
describe("server-safe gate — eval-sink por wrapper erased (!/as/satisfies)", () => {
  it.each([
    ['NonNull `!` callee', `/** @server-safe */\nexport const t = (() => {}).constructor!("return globalThis")();`],
    ['as-cast callee', `/** @server-safe */\nexport const t = ((() => {}).constructor as unknown as (c: string) => () => unknown)("return globalThis")();`],
    ['satisfies wrapper', `/** @server-safe */\nexport const t = ((() => {}) satisfies unknown).constructor("return window")();`],
    ['NonNull `!` + .call', `/** @server-safe */\nexport const t = (() => {}).constructor!.call(null, "return globalThis")();`],
    ['NonNull `!` + bracket ["call"]', `/** @server-safe */\nexport const t = (() => {}).constructor!["call"](null, "x")();`],
    ['as + NonNull combinado', `/** @server-safe */\nexport const t = (((() => {}).constructor as any)!)("x")();`],
  ])("FLAGGEA pese al wrapper erased: %s", (_label, code) => {
    const v = checkSourceFile(code, "erased-sink.fixture.tsx");
    expect(v.some((x) => x.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it.each([
    ['(e.constructor as Function).name', `/** @server-safe */\nexport const n = (e: any) => (e.constructor as Function).name;`],
    ['new (x.constructor as any)() clon', `/** @server-safe */\nexport const c = (x: any) => new (x.constructor as any)();`],
    ['(x.constructor!) === Y', `/** @server-safe */\nexport const eq = (x: any, Y: any) => (x.constructor!) === Y;`],
  ])("NO genera falso positivo con cast/non-null legítimo: %s", (_label, code) => {
    expect(checkSourceFile(code, "erased-ok.fixture.tsx")).toEqual([]);
  });
});

/**
 * Eval-sink envuelto en OPERADORES value-transparentes (re-hunt exhaustivo, beta.27).
 *
 * El valor de `(0, X)` / `(c ? X : Y)` / `(X || Y)` / `(f = X)` ES (sintácticamente)
 * uno de sus operandos — el `.constructor` está TEXTUALMENTE presente, un revisor lo
 * ve; solo hay ruido transparente alrededor. Es el lado legible/contiguo de la
 * frontera (under-catch del mandato existente), no scope nuevo.
 *
 * EL SET ES EL CONTRATO — finito y enumerable: wrappers erased (`()`,`!`,`as`,
 * `satisfies`,`<T>`) + coma, `&&`, `||`, `??`, `?:`, `=`. NO es falsa-completitud
 * (a diferencia del computed-key, que es data-flow ∞). CRÍTICO: el set EXCLUYE las
 * CALLS/IIFE — `(() => X)()` exige evaluar el cuerpo = data-flow = residual. Este
 * test pinea el set cerrado; si un call se vuelve "transparente", reabre el muro ∞.
 */
describe("server-safe gate — eval-sink por operador value-transparente", () => {
  it.each([
    ['coma (0, X)', `/** @server-safe */\nexport const t = (0, (() => {}).constructor)("return globalThis")();`],
    ['conditional c ? X : null', `/** @server-safe */\nexport const t = ((c: boolean) => (c ? (() => {}).constructor : null)!("x")())(true);`],
    ['lógico X || null', `/** @server-safe */\nexport const t = ((() => {}).constructor || null)("return globalThis")();`],
    ['nullish null ?? X', `/** @server-safe */\nexport const t = (null ?? (() => {}).constructor)("x")();`],
    ['asignación (f = X)', `/** @server-safe */\nlet f: any;\nexport const t = (f = (() => {}).constructor)("x")();`],
    ['coma + as + bracket ["call"]', `/** @server-safe */\nexport const t = (0, (() => {}).constructor as any)["call"](null, "x")();`],
    // await de un valor NO-thenable (un constructor no es thenable) es transparente
    // (codex P1). El operando debe ser un .constructor SINTÁCTICO.
    ['await del .constructor (callee)', `/** @server-safe */\nexport async function C() { const w = (await (function () {}).constructor)("return window")(); return w; }`],
    ['await + .call', `/** @server-safe */\nexport async function C() { const w = (await (() => {}).constructor).call(null, "x")(); return w; }`],
    ['await + coma combinado', `/** @server-safe */\nexport async function C() { const w = (await (0, (() => {}).constructor))("x")(); return w; }`],
    // compound logical-assignment (||=/??=/&&=): mismo valor que ||/??/&& —
    // miembro de la clase value-transparente acotada (deep re-hunt).
    ['||= (a ||= ctor)()', `/** @server-safe */\nexport const C = () => { let a: any = null; const fn = () => {}; return (a ||= fn.constructor)("return globalThis")(); };`],
    ['??= (a ??= ctor)()', `/** @server-safe */\nexport const C = () => { let a: any = 0; const fn = () => {}; return (a ??= fn.constructor)("x")(); };`],
    ['&&= (a &&= ctor)()', `/** @server-safe */\nexport const C = () => { let a: any = {}; const fn = () => {}; return (a &&= fn.constructor)("x")(); };`],
    ['base path (a ||= ctor).constructor', `/** @server-safe */\nconst fn = () => {};\nlet a: any;\nconst Dbl = (a ||= fn.constructor).constructor;\nexport const t = Dbl("x")();`],
    // key con coma cuyo right es un LITERAL → estáticamente "constructor".
    ['key comma con literal right', `/** @server-safe */\nexport const C = () => { let log = ""; const F = [].constructor[(log = "k", "constructor")] as any; void log; return F("x")(); };`],
    // B1 (re-hunt): operador value-transparente (&&/||/??/?:) en la KEY del
    // ElementAccess — la key reusa el MISMO unwrap value-transparent que la base
    // (`valueTransparentLeaves`), cerrando la asimetría base-vs-key.
    ['key [1 && "constructor"] (doble ctor)', `/** @server-safe */\nexport const t = ({})["constructor"][1 && "constructor"]("return globalThis")();`],
    ['key ["" || "constructor"]', `/** @server-safe */\nexport const t = ({})["constructor"]["" || "constructor"]("x")();`],
    ['key [null ?? "constructor"]', `/** @server-safe */\nexport const t = ({})["constructor"][null ?? "constructor"]("x")();`],
    ['key [true ? "constructor" : "x"]', `/** @server-safe */\nexport const t = ({})["constructor"][true ? "constructor" : "x"]("x")();`],
    ['key [c && "call"] sobre ctor', `/** @server-safe */\nexport const t = ((c: boolean) => (() => {}).constructor[c && "call"](null, "x")())(true);`],
  ])("FLAGGEA pese al operador value-transparente: %s", (_label, code) => {
    const v = checkSourceFile(code, "vt-sink.fixture.tsx");
    expect(v.some((x) => x.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it.each([
    // EL BOUND: call/IIFE NO es transparente → residual out-of-scope (data-flow).
    ['IIFE devuelve ctor (call NO transparente)', `/** @server-safe */\nexport const t = ((() => (() => {}).constructor)())("x")();`],
    // await de un CALL / promise-var es data-flow → residual (el operando es un call).
    ['await de un call (data-flow)', `/** @server-safe */\nexport async function C() { const getCtor = () => (() => {}).constructor; const w = (await getCtor())("x")(); return w; }`],
    ['await p, .constructor.name no llamado', `/** @server-safe */\nexport async function C(p: any) { const n = (await p).constructor.name; return n; }`],
    // &&-left NO carga el valor (base truthy pasa a la derecha) → no FP.
    ['(ctor && safeFn)() → safeFn', `/** @server-safe */\nexport const t = ((() => {}).constructor && ((s: string) => s))("x");`],
    ['(x.constructor || Object) === Object', `/** @server-safe */\nexport const eq = (x: any) => (x.constructor || Object) === Object;`],
    ['ternario .name no llamado', `/** @server-safe */\nexport const n = (e: any) => (true ? e.constructor : null)?.name;`],
    // BOUND: key con OPERADOR de variable (|| con operando variable) = data-flow
    // → residual (no da un literal único estático).
    ['key [k || "x"] con k variable (residual)', `/** @server-safe */\nexport const C = () => { const key = "constructor"; const F = [].constructor[key || "x"] as any; return F("x")(); };`],
    ['(a ||= 2) sin constructor', `/** @server-safe */\nexport const C = () => { let a: any = 1; const b = (a ||= 2); return b; };`],
  ])("NO genera falso positivo / respeta el bound (sin call traversal): %s", (_label, code) => {
    expect(checkSourceFile(code, "vt-ok.fixture.tsx")).toEqual([]);
  });
});

/**
 * Guard POSICIONAL en cuerpos de función (hunt D + re-hunt, beta.27 BLOCKER-1).
 *
 * El narrowing `if (typeof X === "undefined") return` es POSICIONAL: un cuerpo
 * de función hereda los guards activos en SU posición de definición. Es sound
 * para todo lo que se invoca según su posición léxica (arrow/function-expr/
 * método/IIFE solo son llamables DESPUÉS de su definición): tras un guard-negativo
 * early-return el server ya retornó → lo definido después es client-only → hereda
 * el guard (clean); lo definido ANTES hereda el estado vacío → un read se flaggea.
 *
 * ÚNICA excepción — function DECLARATION: HOISTED, llamable ANTES de su posición
 * textual o en la rama undefined → se resetea (no hereda). El reset INCONDICIONAL
 * previo (que reseteaba todo function-like) FP-eaba closures retornados y
 * callbacks síncronos (.map/.reduce), que SÍ son posicionales y client-only tras
 * el guard. Corregido: reset solo para function declarations.
 */
describe("server-safe gate — guard posicional en cuerpos de función", () => {
  it.each([
    // Function declarations HOISTED — llamables antes/independiente del guard.
    ["function-decl hoisted llamada antes del guard", `/** @server-safe */\nexport function Clock(): string { const s = read(); if (typeof window === "undefined") return ""; function read() { return window.location.href; } return s; }`],
    ["function-decl llamada en rama undefined", `/** @server-safe */\nexport function Banner(): string { if (typeof window === "undefined") return readUrl(); function readUrl() { return window.location.href; } return "c"; }`],
    // Posicionales DEFINIDOS ANTES del guard / sin guard → no client-only → flag.
    ["closure definido ANTES del guard", `/** @server-safe */\nexport function F() { const h = () => window.location.href; if (typeof window === "undefined") return h; return h; }`],
    ["IIFE en rama undefined (positive early-return)", `/** @server-safe */\nexport function F() { if (typeof window !== "undefined") return "c"; return (() => window.location.href)(); }`],
    ["IIFE sin guard alguno", `/** @server-safe */\nexport function F() { return (() => window.location.href)(); }`],
  ])("FLAGGEA el read en el cuerpo de función: %s", (_label, code) => {
    expect(checkSourceFile(code, "guard-fn.fixture.tsx").length).toBeGreaterThan(0);
  });

  it.each([
    ["guard interno + read straight-line", `/** @server-safe */\nexport function useTheme(): string { if (typeof window === "undefined") return "d"; return window.localStorage.getItem("t") ?? "d"; }`],
    ["guard DENTRO de la función protege su read", `/** @server-safe */\nexport function F() { function read() { if (typeof window === "undefined") return ""; return window.location.href; } return read(); }`],
    ["positive guard straight-line", `/** @server-safe */\nexport const C = () => { if (typeof window !== "undefined") { return window.location.href; } return ""; };`],
    // Posicionales DEFINIDOS TRAS un guard-negativo → client-only → heredan → clean.
    ["closure retornado tras guard negativo", `/** @server-safe */\nexport function F() { if (typeof window === "undefined") return null; const h = () => window.location.href; return h; }`],
    ["IIFE arrow tras guard negativo", `/** @server-safe */\nexport function C() { if (typeof window === "undefined") return null; return (() => window.location.href)(); }`],
    ["IIFE function-expr tras guard negativo", `/** @server-safe */\nexport function C() { if (typeof window === "undefined") return null; return (function () { return window.location.href; })(); }`],
    // Callbacks SÍNCRONOS (.map/.reduce) tras un guard → corren en flujo client-only.
    [".map callback en rama positive-guard", `/** @server-safe */\nexport function C() { if (typeof window !== "undefined") { return ["a", "b"].map((k) => k + window.location.href).join(","); } return "ssr"; }`],
    [".reduce callback tras guard negativo", `/** @server-safe */\nexport function C() { if (typeof window === "undefined") return 0; return [1, 2].reduce((s, n) => s + n + window.scrollY, 0); }`],
    // fn-decl dentro de un bloque POSITIVE-guard: hereda blockEntryGuards (el guard
    // positivo vale para todo el bloque incl. hoisted fns). Re-hunt FP5.
    ["fn-decl en bloque positive-guard", `/** @server-safe */\nexport function C() { if (typeof window !== "undefined") { function read() { return window.location.href; } return read(); } return "ssr"; }`],
    ["fn-decl en bloque doble positive-guard (if chain)", `/** @server-safe */\nexport function C() { if (typeof window !== "undefined" && typeof document !== "undefined") { function read() { return window.location.href + document.title; } return read(); } return "ssr"; }`],
  ])("posicional client-only tras el guard → clean (0-FP): %s", (_label, code) => {
    expect(checkSourceFile(code, "guard-own.fixture.tsx")).toEqual([]);
  });

  it.each([
    // fn-decl en bloque SIN guard / con guard NEGATIVO mid-block (no block-entry)
    // → resetea a vacío → sigue flaggeando (no abre el bypass de D).
    ["fn-decl en bloque plano sin guard", `/** @server-safe */\nexport function C() { { function read() { return window.location.href; } return read(); } }`],
    ["fn-decl hoisted, guard negativo mid-block", `/** @server-safe */\nexport function Clock(): string { const s = read(); if (typeof window === "undefined") return ""; function read() { return window.location.href; } return s; }`],
  ])("fn-decl sin block-entry guard SIGUE flaggeando: %s", (_label, code) => {
    expect(checkSourceFile(code, "fndecl-flag.fixture.tsx").length).toBeGreaterThan(0);
  });
});

/**
 * typeof guards a nivel de EXPRESIÓN (re-hunt, beta.27). El gate solo reconocía el
 * `if (typeof X !== "undefined")`; los idiomas SSR everyday por expresión —`&&`,
 * `||`, ternario— FP-eaban. Fix: reusa el MISMO predicado del if-guard (no forkeado)
 * → hereda la exclusión NON_ABSENCE_DENIALS, así que un eval-sink bajo guard-por-
 * expresión NO se exime. Chain-aware y conservador (nunca sobre-añade → sin bypass).
 */
describe("server-safe gate — typeof guard por expresión (&&/||/ternario)", () => {
  it.each([
    ["ternario positivo → whenTrue", `/** @server-safe */\nexport const Gp = () => { const h = typeof window !== "undefined" ? window.location.href : "/"; return h; };`],
    ["&& positivo → right", `/** @server-safe */\nexport const Ga = () => { const v = typeof window !== "undefined" && window.innerWidth; return v; };`],
    ["|| negativo → right", `/** @server-safe */\nexport const Go = () => { const n = typeof document === "undefined" || document.title === ""; return n; };`],
    ["cadena && doble guard", `/** @server-safe */\nexport const C = () => { const x = typeof window !== "undefined" && typeof document !== "undefined" && window.location.href; return x; };`],
    ["ternario negativo → whenFalse", `/** @server-safe */\nexport const C = () => (typeof window === "undefined" ? "ssr" : window.location.href);`],
  ])("NO genera falso positivo bajo guard por expresión: %s", (_label, code) => {
    expect(checkSourceFile(code, "expr-guard.fixture.tsx")).toEqual([]);
  });

  it.each([
    // CRÍTICO (reuse hereda NON_ABSENCE_DENIALS): el guard es vacuamente true sobre
    // un escape/eval sink → NO lo exime.
    ["typeof Function && Function()", `/** @server-safe */\nexport const t = typeof Function !== "undefined" && Function("return globalThis")();`],
    ["&& guard + .constructor eval-sink", `/** @server-safe */\nexport const t = typeof window !== "undefined" && (() => {}).constructor("x")();`],
    ["ternario + globalThis.eval", `/** @server-safe */\nexport const t = typeof globalThis !== "undefined" ? globalThis.eval("x") : null;`],
    // Soundness: guard de OTRO nombre, o `||` en el left de `&&` → NO garantiza.
    ["guard de document, read de window", `/** @server-safe */\nexport const C = () => { const x = typeof document !== "undefined" && window.location.href; return x; };`],
    ["|| en el left de && no garantiza", `/** @server-safe */\nexport const C = (foo: boolean) => { const x = (foo || typeof window !== "undefined") && window.location.href; return x; };`],
  ])("SIGUE flaggeando (eval-sink bajo guard / read no garantizado): %s", (_label, code) => {
    expect(checkSourceFile(code, "expr-guard-flag.fixture.tsx").length).toBeGreaterThan(0);
  });
});

/**
 * Deferred TIMER vs CLIENT-ONLY (deep re-hunt + codex P1). UN GLOBAL DE CLIENTE
 * (window/document/navigator, eval-sink, escape-root) solo es seguro en deferred CLIENT-ONLY
 * (useEffect/event-handler, que NO corren en SSR — corren tras hidratación en el navegador).
 * Los TIMERS (setTimeout/setInterval/queueMicrotask) SÍ disparan en el isolate Edge/SSR → su
 * callback corre en el SERVIDOR → CUALQUIER read de global de cliente ahí LANZA → se flaggea.
 * Antes solo los eval-sinks requerían client-only; window/document se eximían en timer =
 * BYPASS (codex P1: `setTimeout(() => window.scrollTo(0,0))` corre en el server y revienta).
 */
describe("server-safe gate — global de cliente en timer deferido NO se exime", () => {
  it.each([
    ["queueMicrotask + Function()", `/** @server-safe */\nexport function W() { queueMicrotask(() => { const g = Function("return window")(); void g; }); return <div />; }`],
    ["setTimeout + eval()", `/** @server-safe */\nexport function W() { setTimeout(() => { eval("x"); }, 0); return <div />; }`],
    ["setInterval + .constructor sink", `/** @server-safe */\nexport function W() { setInterval(() => { (() => {}).constructor("x")(); }, 100); return <div />; }`],
  ])("FLAGGEA el eval-sink en un timer: %s", (_label, code) => {
    const v = checkSourceFile(code, "timer-sink.fixture.tsx");
    expect(v.some((x) => x.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  // codex P1: el read de un global de cliente (window/document/screen) en un timer también
  // se flaggea — el timer corre en el server isolate y window/document están ausentes ahí.
  it.each([
    ["window.scrollTo en setTimeout", `/** @server-safe */\nexport function W() { setTimeout(() => { window.scrollTo(0, 0); }, 0); return <div />; }`],
    ["document.title en queueMicrotask", `/** @server-safe */\nexport function W() { queueMicrotask(() => { void document.title; }); return <div />; }`],
    ["screen.width en setInterval", `/** @server-safe */\nexport function W() { setInterval(() => { void screen.width; }, 100); return <div />; }`],
  ])("FLAGGEA el read de global de cliente en un timer: %s", (_label, code) => {
    const v = checkSourceFile(code, "timer-glob.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it.each([
    ["useEffect + Function (client-only)", `/** @server-safe */\nimport { useEffect } from "react";\nexport function W() { useEffect(() => { const g = Function("return 1")(); void g; }, []); return <div />; }`],
    ["onClick + eval (client-only)", `/** @server-safe */\nexport function W() { return <button onClick={() => { eval("x"); }}>x</button>; }`],
    ["timer ANIDADO en useEffect (sticky client)", `/** @server-safe */\nimport { useEffect } from "react";\nexport function W() { useEffect(() => { setTimeout(() => { eval("x"); }, 0); }, []); return <div />; }`],
    ["window en useEffect (client-only, exento)", `/** @server-safe */\nimport { useEffect } from "react";\nexport function W() { useEffect(() => { window.scrollTo(0, 0); }, []); return <div />; }`],
    ["window en setTimeout DENTRO de useEffect (sticky)", `/** @server-safe */\nimport { useEffect } from "react";\nexport function W() { useEffect(() => { setTimeout(() => { window.scrollTo(0, 0); }, 0); }, []); return <div />; }`],
  ])("NO flaggea (client-only deferred): %s", (_label, code) => {
    expect(checkSourceFile(code, "deferred-ok.fixture.tsx")).toEqual([]);
  });

  // deepest re-hunt #3: el deferred-sink exime SOLO el 1er arg (callback), NO los args 2+.
  // El 2º arg de un effect-hook son las DEPS (array) — una arrow ahí que lee window y se
  // captura+invoca en render escapaba como deferred = BYPASS.
  it("FLAGGEA una arrow en la posición DEPS (2º arg) de useEffect que lee window", () => {
    const code = `/** @server-safe */\nimport { useEffect } from "react";\nexport function C() { let leaked: any; useEffect(() => {}, (leaked = () => window.innerWidth) as any); return leaked(); }`;
    expect(checkSourceFile(code, "deps-arg.fixture.tsx").some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it("NO flaggea un useEffect normal con deps array", () => {
    const code = `/** @server-safe */\nimport { useEffect } from "react";\nexport function C() { const x = 1; useEffect(() => { void x; }, [x]); return null; }`;
    expect(checkSourceFile(code, "deps-ok.fixture.tsx")).toEqual([]);
  });

  // deepest re-hunt #7: miembro browser-only de un SAFE global (console.measureUserAgent
  // SpecificMemory) — el root existe pero el método falta en Node → la llamada lanza. typeof-
  // guard del root no protege; solo exento en client-only.
  it.each([
    ["render", `/** @server-safe */\nexport function f() { return console.table(); }`],
    ["bajo typeof guard", `/** @server-safe */\nexport function f() { if (typeof console !== "undefined") return console.table(); return null; }`],
    // codex P1: el receiver se desenvuelve value-transparente (el cast a `any` es probable).
    ["(console as any).measure...", `/** @server-safe */\nexport function f() { return (console as any).table(); }`],
    ["(0, console).measure...", `/** @server-safe */\nexport function f() { return (0, console).table(); }`],
    // codex P2 (e3418ee): el PARÉNTESIS rompe la cadena opcional → el undefined se derefencia y
    // crashea. `(x?.()).foo` NO es un probe seguro (a diferencia de `x?.().foo` sin paréntesis).
    ["grouped optional deref (M?.()).foo", `/** @server-safe */\nexport function f() { return ((console.table?.()) as any).foo; }`],
    ["grouped optional deref (M?.())[0]", `/** @server-safe */\nexport function f() { return ((console.table?.()) as any)[0]; }`],
    ["grouped optional call (M?.())()", `/** @server-safe */\nexport function f() { return ((console.table?.()) as any)(); }`],
    ["grouped optional access (M?.name).x", `/** @server-safe */\nexport function f() { return ((console.table?.name) as any).x; }`],
    ["grouped optional + non-null (M?.())!.foo", `/** @server-safe */\nexport function f() { return (console.table?.())!.foo; }`],
    // codex P2 (058b1f6): TaggedTemplate guarda el callee en \`.tag\`, no \`.expression\` →
    // \`(M?.())\\\`x\\\`\` ejecuta \`undefined\\\`x\\\`\` (TypeError). Antes escapaba el branch.
    ["grouped optional tagged-template (M?.())`x`", "/** @server-safe */\nexport function f() { return ((console.table?.()) as any)`x`; }"],
  ])("FLAGGEA console.table (partial SAFE-global member): %s", (_l, code) => {
    expect(checkSourceFile(code, "perf-partial.fixture.tsx").some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it("NO flaggea console.log() (presente en Node)", () => {
    expect(checkSourceFile(`/** @server-safe */\nexport function f() { return console.log(); }`, "perf-log.fixture.tsx")).toEqual([]);
  });

  // codex P2: un PROBE SEGURO del miembro parcial no crashea → no se flaggea (feature-detection).
  it.each([
    ["optional call ?.()", `/** @server-safe */\nexport function f() { return console.table?.(); }`],
    ["typeof operand", `/** @server-safe */\nexport function f() { return typeof console.table === "function"; }`],
    ["optional access ?.name", `/** @server-safe */\nexport function f() { return console.table?.name; }`],
    // codex P2: el probe envuelto en parens/cast también es seguro (ascenso value-transparent).
    ["typeof (parenthesized)", `/** @server-safe */\nexport function f() { return typeof (console.table) === "function"; }`],
    ["(cast as any)?.()", `/** @server-safe */\nexport function f() { return (console.table as any)?.(); }`],
    // codex P2 (e3418ee): SIN paréntesis la cadena opcional corta entera → seguro. Contraste
    // con el caso `(x?.()).foo` agrupado (que SÍ flaggea, arriba).
    ["optional chain M?.().foo (sin paréntesis)", `/** @server-safe */\nexport function f() { return console.table?.().foo; }`],
    ["optional chain M?.()!.foo (non-null, sin paréntesis)", `/** @server-safe */\nexport function f() { return console.table?.()!.foo; }`],
    ["optional consumer (M?.())?.foo (consumer opcional)", `/** @server-safe */\nexport function f() { return (console.table?.())?.foo; }`],
  ])("NO flaggea un probe seguro del miembro parcial: %s", (_l, code) => {
    expect(checkSourceFile(code, "perf-probe.fixture.tsx")).toEqual([]);
  });

  // codex P2: el miembro parcial extraído por DESTRUCTURING (`const { measure...: m } =
  // console; m()`) escapaba al check de property-access. Fail-closed: flaggear la extracción.
  it.each([
    ["destr renombrado", `/** @server-safe */\nexport function f() { const { table: m } = console as any; return m(); }`],
    ["destr shorthand", `/** @server-safe */\nexport function f() { const { table } = console as any; return table; }`],
    ["destr computed string", `/** @server-safe */\nexport function f() { const { ["table"]: m } = console as any; return m; }`],
    // codex P2 (e3418ee): key computada VALUE-TRANSPARENTE — el property-access path ya la
    // normaliza (`console[1 && "M"]` flaggea), el destructuring debe ser consistente.
    ["destr computed [1 && M]", `/** @server-safe */\nexport function f() { const { [1 && "table"]: m } = console as any; return m(); }`],
    ["destr computed [(0, M)]", `/** @server-safe */\nexport function f() { const { [(0, "table")]: m } = console as any; return m(); }`],
    ["assignment-destr", `/** @server-safe */\nexport function f() { let m: any; ({ table: m } = console as any); return m; }`],
  ])("FLAGGEA el destructuring de un miembro parcial: %s", (_l, code) => {
    expect(checkSourceFile(code, "perf-destr.fixture.tsx").some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it("NO flaggea import-equals de un miembro SAFE (console.log) ni type-only", () => {
    expect(checkSourceFile(`/** @server-safe */\nimport log = console.log;\nexport function f() { return log(); }`, "ie-safe.fixture.tsx")).toEqual([]);
    expect(checkSourceFile(`/** @server-safe */\nimport type compile = WebAssembly.compile;\nexport function f() { return 1; }`, "ie-typeonly.fixture.tsx")).toEqual([]);
  });

  it("NO flaggea destructuring de un miembro PRESENTE (log)", () => {
    expect(checkSourceFile(`/** @server-safe */\nexport function f() { const { log } = console; return log; }`, "perf-log-destr.fixture.tsx")).toEqual([]);
  });

  // codex P3 (fd84c07): el path de destructuring debe respetar el forward value-read igual que el
  // de property-access — un binding MODULE-LEVEL declarado DESPUÉS de la función (leído a call-time
  // = el local, no el global) no debe flaggearse.
  it.each([
    ["destr console module-local (decl después)", `/** @server-safe */\nexport function C() { const { table: x } = console; return x; }\nconst console: any = { table: () => 0 };`],
    ["destr WebAssembly module-local (decl después)", `/** @server-safe */\nexport function C() { const { compile } = WebAssembly; return compile; }\nconst WebAssembly: any = { compile: () => 0 };`],
  ])("NO flaggea destructuring de un shadow MODULE-LEVEL (forward value-read): %s", (_l, code) => {
    expect(checkSourceFile(code, "partial-fwd.fixture.tsx")).toEqual([]);
  });

  // codex P2 (3ae4423): ALIAS scope-aware de un root parcial-safe — el root está en SAFE_GLOBALS,
  // así que `const WA = WebAssembly; WA.compile()` era invisible aguas arriba = bypass.
  it.each([
    ["alias WA.compile()", `/** @server-safe */\nexport function f() { const WA = WebAssembly; return WA.compile(new Uint8Array()); }`],
    ["alias perf.measure()", `/** @server-safe */\nexport function f() { const perf = console; return perf.table(); }`],
    ["alias multi-hop b.compile()", `/** @server-safe */\nexport function f() { const a = WebAssembly; const b = a; return b.compile(new Uint8Array()); }`],
    ["alias destructure const {compile}=WA", `/** @server-safe */\nexport function f() { const WA = WebAssembly as any; const { compile } = WA; return compile(new Uint8Array()); }`],
    ["alias value-transparent (0,WebAssembly)", `/** @server-safe */\nexport function f() { const WA = (0, WebAssembly); return WA.compile(new Uint8Array()); }`],
    ["alias present-throws optional-call WA.compile?.()", `/** @server-safe */\nexport function f() { const WA = WebAssembly; return WA.compile?.(new Uint8Array()); }`],
    // codex P2 (2870236, #133): alias de root parcial por DESTRUCTURING / array-index.
    ["array-destr const [WA]=[WebAssembly]", `/** @server-safe */\nexport function f() { const [WA] = [WebAssembly]; return WA.compile(new Uint8Array()); }`],
    ["obj-default const {WA=WebAssembly}={}", `/** @server-safe */\nexport function f() { const { WA = WebAssembly } = {} as any; return WA.compile(new Uint8Array()); }`],
    ["array-index const WA=[WebAssembly][0]", `/** @server-safe */\nexport function f() { const WA = [WebAssembly][0]; return WA.compile(new Uint8Array()); }`],
    // codex P2 (59afad2, #133): alias de root parcial por ASSIGNMENT-destructuring.
    ["assign ({WA}={WA:WebAssembly})", `/** @server-safe */\nexport function f() { let WA: any; ({ WA } = { WA: WebAssembly }); return WA.compile(new Uint8Array()); }`],
    ["assign [WA]=[WebAssembly]", `/** @server-safe */\nexport function f() { let WA: any; [WA] = [WebAssembly]; return WA.compile(new Uint8Array()); }`],
    // codex P2 (a94f607, #133): cadena de alias en el MISMO statement (left-to-right).
    ["chain const A=WebAssembly, B=A; B.compile()", `/** @server-safe */\nexport function f() { const A = WebAssembly, B = A; return B.compile(new Uint8Array()); }`],
    ["chain const A=WebAssembly, B=A, C=B; C.compile()", `/** @server-safe */\nexport function f() { const A = WebAssembly, B = A, C = B; return C.compile(new Uint8Array()); }`],
    // codex P2 (f32a946, #133): alias declarado en el HEADER de un for.
    ["for(const WA=WebAssembly;;){WA.compile()}", `/** @server-safe */\nexport function f() { for (const WA = WebAssembly; ; ) { return WA.compile(new Uint8Array()); } return null; }`],
    // codex P2 (2601bf6, #133): alias en declarador posterior / var-for-header / default renombrado.
    ["const WA=WebAssembly, x=WA.compile()", `/** @server-safe */\nexport function f() { const WA = WebAssembly, x = WA.compile(new Uint8Array()); return x; }`],
    ["for(var WA=WebAssembly;;){WA.compile()}", `/** @server-safe */\nexport function f() { for (var WA = WebAssembly; ; ) { return WA.compile(new Uint8Array()); } return null; }`],
    ["({x:WA=WebAssembly}={}); WA.compile()", `/** @server-safe */\nexport function f() { let WA: any; ({ x: WA = WebAssembly } = {} as any); return WA.compile(new Uint8Array()); }`],
    // codex P2 (8296ebc, #133): OBJECT-REST copia el partial-root → alias (el miembro va con él o
    // falta igual). Solo partial (un timer-rest da un objeto no invocable, no es alias de timer).
    ["object-rest const {...WA}=WebAssembly", `/** @server-safe */\nexport function f() { const { ...WA } = WebAssembly as any; return WA.compile(new Uint8Array()); }`],
    ["object-rest const {...perf}=console", `/** @server-safe */\nexport function f() { const { ...perf } = console as any; return perf.table(); }`],
    ["object-rest parcial {len, ...WA}=WebAssembly", `/** @server-safe */\nexport function f() { const { length: len, ...WA } = WebAssembly as any; void len; return WA.compile(new Uint8Array()); }`],
    // codex P2 (c2eec1a, #133): key COMPUTADA + default de array-assignment.
    ['computed const {["wa"]:WA}={wa:WebAssembly}', `/** @server-safe */\nexport function f() { const { ["wa"]: WA } = { wa: WebAssembly } as any; return WA.compile(new Uint8Array()); }`],
    ["array-assign default [WA=WebAssembly]=[]", `/** @server-safe */\nexport function f() { let WA: any; [WA = WebAssembly] = [] as any; return WA.compile(new Uint8Array()); }`],
    // codex P2 / §141: assignment-EXPRESSION embebida en operador value-transparente.
    ["embedded (WA=WebAssembly) && WA.compile()", `/** @server-safe */\nexport function f() { let WA: any; return (WA = WebAssembly) && WA.compile(new Uint8Array()); }`],
    // codex P2 (3f27e0c, #133): embebida en el RECEIVER (se evalúa antes del sink-check del member).
    ["embedded en receiver ((WA=WebAssembly), WA).compile()", `/** @server-safe */\nexport function f() { let WA: any; return ((WA = WebAssembly), WA).compile(new Uint8Array()); }`],
    // codex P2 (eb9d71c, #133): chain embebida + import-equals de un miembro partial-denied.
    ["chain embebida (WA=WebAssembly, A=WA, A).compile()", `/** @server-safe */\nexport function f() { let WA: any; let A: any; return (WA = WebAssembly, A = WA, A).compile(new Uint8Array()); }`],
    ["import-equals WebAssembly.compile", `/** @server-safe */\nimport compile = WebAssembly.compile;\nexport function f() { return compile(new Uint8Array()); }`],
    ["import-equals console.measure...", `/** @server-safe */\nimport m = console.table;\nexport function f() { return m(); }`],
    // codex P2 (069d4c8, #133): embedded assignment cross-statement (persiste al siguiente stmt).
    ["cross-stmt (WA=WebAssembly, 0); WA.compile()", `/** @server-safe */\nexport function f() { let WA: any; (WA = WebAssembly, 0); return WA.compile(new Uint8Array()); }`],
    // codex P2 (9d5ba3a, #133, exhaustive): embedded-en-declarador / for-init expr / import-equals
    // alias-root / object-rest assignment.
    ["declarador const _=(WA=WebAssembly), x=WA.compile()", `/** @server-safe */\nexport function f() { let WA: any; const _ = (WA = WebAssembly), x = WA.compile(new Uint8Array()); void _; return x; }`],
    ["for-init expr (WA=WebAssembly; WA.compile();)", `/** @server-safe */\nexport function f() { let WA: any; for (WA = WebAssembly; WA.compile(new Uint8Array()); ) { break; } return null; }`],
    ["import-equals alias-root import WA=WebAssembly; import compile=WA.compile", `/** @server-safe */\nnamespace N { import WA = WebAssembly; import compile = WA.compile; export const p = compile(new Uint8Array()); }`],
    ["object-rest assignment ({...WA}=WebAssembly)", `/** @server-safe */\nexport function f() { let WA: any; ({ ...WA } = WebAssembly as any); return WA.compile(new Uint8Array()); }`],
    // codex P2 (3b7b6ba, #133): destructuring ANIDADO contra un object-literal (recursión estructural).
    ["nested destructure const {x:{compile}}={x:WebAssembly}", `/** @server-safe */\nexport function f() { const { x: { compile } } = { x: WebAssembly }; return compile(new Uint8Array()); }`],
    ["nested destructure const {x:{measure}}={x:console}", `/** @server-safe */\nexport function f() { const { x: { table: m } } = { x: console }; return m(); }`],
    // codex P2 (5eee12d, #133): destructuring ARRAY + mezclas obj/array (recursión estructural).
    ["array nested const [{compile}]=[WebAssembly]", `/** @server-safe */\nexport function f() { const [{ compile }] = [WebAssembly]; return compile(new Uint8Array()); }`],
    ["mixed const {x:[{compile}]}={x:[WebAssembly]}", `/** @server-safe */\nexport function f() { const { x: [{ compile }] } = { x: [WebAssembly] }; return compile(new Uint8Array()); }`],
    ["array assign [{compile}]=[WebAssembly]", `/** @server-safe */\nexport function f() { let compile: any; [{ compile }] = [WebAssembly]; return compile(new Uint8Array()); }`],
    // codex P2 (c23f5a7, #133): el DEFAULT del binding-element provee el root (key ausente).
    ["default {x:{compile}=WebAssembly}={}", `/** @server-safe */\nexport function f() { const { x: { compile } = WebAssembly } = {} as any; return compile(new Uint8Array()); }`],
    ["default array [{compile}=WebAssembly]=[]", `/** @server-safe */\nexport function f() { const [{ compile } = WebAssembly] = [] as any; return compile(new Uint8Array()); }`],
    // codex P2 (3b97676, #133): PARÁMETRO con default partial-root (alias-root o destructure-member).
    ["param run(WA=WebAssembly){ WA.compile() }", `/** @server-safe */\nexport function run(WA: any = WebAssembly){ return WA.compile(new Uint8Array()); }`],
    ["param run({compile}=WebAssembly){ compile() }", `/** @server-safe */\nexport function run({ compile }: any = WebAssembly){ return compile(new Uint8Array()); }`],
    ["param run([{compile}]=[WebAssembly]){ compile() }", `/** @server-safe */\nexport function run([{ compile }]: any = [WebAssembly]){ return compile(new Uint8Array()); }`],
    // codex P2 (d4dfdd0, #133): binding-element default (sin default entero) + default sobre init OPACO.
    ["binding-element default run({WA=WebAssembly})", `/** @server-safe */\nexport function run({ WA = WebAssembly }: any){ return WA.compile(new Uint8Array()); }`],
    ["default sobre init opaco const {x:{compile}=WebAssembly}=props", `/** @server-safe */\nexport function f(props: any) { const { x: { compile } = WebAssembly } = props; return compile(new Uint8Array()); }`],
    // codex P2 (372903e, #133): catch-pattern default + base de proyección partial value-transparente.
    ["catch ({x:{compile}=WebAssembly}){ compile() }", `/** @server-safe */\nexport function f() { try {} catch ({ x: { compile } = WebAssembly }: any) { return compile(new Uint8Array()); } }`],
    ["VT projection (c?[WebAssembly]:[WebAssembly])[0].compile()", `/** @server-safe */\nexport function f(c: boolean) { return (c ? [WebAssembly] : [WebAssembly])[0].compile(new Uint8Array()); }`],
    // codex P2 (7614b51, #133): catch alias-default + alternativas de literal en el member-extract.
    ["catch ({WA=WebAssembly}){ WA.compile() }", `/** @server-safe */\nexport function f() { try {} catch ({ WA = WebAssembly }: any) { return WA.compile(new Uint8Array()); } }`],
    ["literal-alt const {x:{compile}}=c?{x:WebAssembly}:{x:WebAssembly}", `/** @server-safe */\nexport function f(c: boolean) { const { x: { compile } } = c ? { x: WebAssembly } : { x: WebAssembly }; return compile(new Uint8Array()); }`],
    // codex P2 (79b8fc1, #133): computed member-key + destructuring-key con ALTERNATIVAS + for-of pattern.
    ["computed member-key WebAssembly[c?'compile':'validate']", `/** @server-safe */\nexport function f(c: boolean) { return (WebAssembly as any)[c ? "compile" : "validate"](new Uint8Array()); }`],
    ["computed destr-key const {[c?'compile':'validate']:f}=WebAssembly", `/** @server-safe */\nexport function f(c: boolean) { const { [c ? "compile" : "validate"]: g } = WebAssembly as any; return g(new Uint8Array()); }`],
    ["for-of pattern default for ({WA=WebAssembly} of rows)", `/** @server-safe */\nexport function f() { let WA: any; for ({ WA = WebAssembly } of [] as any[]) { WA.compile(new Uint8Array()); } }`],
    // codex P2 (e1a7995, #133): for-of/for-in member-EXTRACT vía default (paridad con el alias-enroll).
    ["for-of member-extract for ({x:{compile}=WebAssembly} of rows)", `/** @server-safe */\nexport function f() { let compile: any; for ({ x: { compile } = WebAssembly } of [] as any[]) { compile(new Uint8Array()); } }`],
    ["for-of array member-extract for ([{compile}=WebAssembly] of rows)", `/** @server-safe */\nexport function f() { let compile: any; for ([{ compile } = WebAssembly] of [] as any[]) { compile(new Uint8Array()); } }`],
  ])("FLAGGEA el acceso a un miembro parcial vía ALIAS del root: %s", (_l, code) => {
    expect(checkSourceFile(code, "partial-alias.fixture.tsx").some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it.each([
    ["alias de miembro SAFE perf.log()", `/** @server-safe */\nexport function f() { const perf = console; return perf.log(); }`],
    ["alias de miembro SAFE WA.validate()", `/** @server-safe */\nexport function f() { const WA = WebAssembly; return WA.validate(new Uint8Array()); }`],
    ["typeof sobre alias", `/** @server-safe */\nexport function f() { const WA = WebAssembly; return typeof WA.compile; }`],
    // codex P2 (8296ebc): object-rest de un TIMER da un objeto NO invocable → no es timer-alias
    // (llamarlo es TypeError genérico, no eval del navegador) → fuera del contrato del eval-sink.
    ["object-rest de timer no es eval-sink", `/** @server-safe */\nexport function f() { const { ...later } = setTimeout as any; return (later as any)("x"); }`],
    // codex P2 (3ae4423): alias purgado al ser SOMBREADO por un binding interno homónimo.
    ["partial alias sombreado por param", `/** @server-safe */\nexport function f() { const WA = WebAssembly; function g(WA: any) { return WA.compile("x"); } return g; }`],
    ["timer alias sombreado por param", `/** @server-safe */\nexport function f() { const later = setTimeout; function g(later: any) { return later("x"); } return g; }`],
    ["timer alias sombreado por const interno", `/** @server-safe */\nexport function f() { const later = setTimeout; { const later = (s: string) => s; void later("x"); } return null; }`],
  ])("NO flaggea (alias safe / alias sombreado): %s", (_l, code) => {
    expect(checkSourceFile(code, "partial-alias-ok.fixture.tsx")).toEqual([]);
  });

  // codex P2 (80aeece): `WebAssembly` es root SAFE (namespace existe en Edge) pero sus APIs de
  // compilación/instanciación DINÁMICA están deshabilitadas en el baseline Edge (Vercel/Workers)
  // igual que eval/Function → lanzan en render. PRESENT-but-throws: el optional-CALL también flaggea.
  it.each([
    ["compile(bytes)", `/** @server-safe */\nexport function f() { return WebAssembly.compile(new Uint8Array()); }`],
    // codex P2 (review genérico): instantiateStreaming NO tiene overload de Module (solo Response/stream
    // → compila) → SIGUE denegado. (`instantiate` SÍ tiene forma estática `instantiate(Module)` → se movió
    // a ALLOW; ver el bloque exento de abajo.)
    ["instantiateStreaming", `/** @server-safe */\nexport function f() { return WebAssembly.instantiateStreaming(fetch("x")); }`],
    ["compileStreaming", `/** @server-safe */\nexport function f() { return WebAssembly.compileStreaming(fetch("x")); }`],
    ["new Module(bytes)", `/** @server-safe */\nexport function f() { return new WebAssembly.Module(new Uint8Array()); }`],
    ["wrapped (WebAssembly as any).compile", `/** @server-safe */\nexport function f() { return (WebAssembly as any).compile(new Uint8Array()); }`],
    ["element-access WebAssembly['compile']", `/** @server-safe */\nexport function f() { return (WebAssembly as any)["compile"](new Uint8Array()); }`],
    ["destructuring const { compile }", `/** @server-safe */\nexport function f() { const { compile } = WebAssembly as any; return compile(new Uint8Array()); }`],
    ["optional-call compile?.() (present-throws)", `/** @server-safe */\nexport function f() { return WebAssembly.compile?.(new Uint8Array()); }`],
    // codex P1 (3ae4423): optional-access a call/apply/bind sobre present-throws — Function.prototype
    // INVOCA igual → compila → lanza. (≠ miembro ausente, donde `?.call` corta a undefined.)
    ["optional compile?.call(null, bytes)", `/** @server-safe */\nexport function f() { return WebAssembly.compile?.call(null, new Uint8Array()); }`],
    ["optional compile?.apply(null, [bytes])", `/** @server-safe */\nexport function f() { return WebAssembly.compile?.apply(null, [new Uint8Array()]); }`],
    ["optional compile?.bind(null)()", `/** @server-safe */\nexport function f() { return WebAssembly.compile?.bind(null)(new Uint8Array()); }`],
    ["alias WA.compile?.call(...)", `/** @server-safe */\nexport function f() { const WA = WebAssembly; return WA.compile?.call(null, new Uint8Array()); }`],
  ])("FLAGGEA dynamic codegen de WebAssembly (deshabilitado en Edge): %s", (_l, code) => {
    expect(checkSourceFile(code, "wasm.fixture.tsx").some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it.each([
    ["typeof WebAssembly.compile (feature-detect)", `/** @server-safe */\nexport function f() { return typeof WebAssembly.compile; }`],
    ["optional-ACCESS compile?.name (no invoca)", `/** @server-safe */\nexport function f() { return WebAssembly.compile?.name; }`],
    ["new WebAssembly.Memory (no compila)", `/** @server-safe */\nexport function f() { return new WebAssembly.Memory({ initial: 1 }); }`],
    ["WebAssembly.validate (no compila a ejecutable)", `/** @server-safe */\nexport function f() { return WebAssembly.validate(new Uint8Array()); }`],
    // codex P2 (review genérico): `instantiate` tiene forma estática soportada `instantiate(Module)` —
    // el ÚNICO camino Wasm bendecido en Edge (RSC/SSR). Denegarla = FP. `instantiate(bufferSource)` es
    // residual de data-flow §141 (provenance del arg, fuera de scope parser-puro).
    ["WebAssembly.instantiate (forma estática soportada en Edge)", `/** @server-safe */\nexport function f() { return WebAssembly.instantiate(0 as any, {} as any); }`],
    ["WebAssembly.Instance (módulo pre-compilado)", `/** @server-safe */\nexport function f() { return new WebAssembly.Instance(0 as any); }`],
    ["typeof WebAssembly (namespace existe en Edge)", `/** @server-safe */\nexport function f() { return typeof WebAssembly; }`],
    // codex P1 (3ae4423): optional-access a METADATA (no invoca) sigue siendo probe seguro.
    ["compile?.name (metadata, no invoca)", `/** @server-safe */\nexport function f() { return WebAssembly.compile?.name; }`],
    ["compile?.length (metadata, no invoca)", `/** @server-safe */\nexport function f() { return WebAssembly.compile?.length; }`],
    // miembro AUSENTE: `?.call` corta a undefined (measure es undefined) → seguro.
    ["perf.measure?.call(null) ausente (short-circuit)", `/** @server-safe */\nexport function f() { return console.table?.call(null); }`],
  ])("NO flaggea miembros/probes seguros de WebAssembly: %s", (_l, code) => {
    expect(checkSourceFile(code, "wasm-ok.fixture.tsx")).toEqual([]);
  });

  // B3 (re-hunt): las NON_ABSENCE_DENIALS (raíces de escape / stubs que lanzan:
  // globalThis/global/self/setImmediate/clearImmediate) NO son hazards de ausencia
  // — disparan en Edge SIEMPRE, así que un timer (que SÍ corre en SSR) NO las exime
  // (antes la exención se llaveaba por DYNAMIC_EVAL_SINKS ⊊ NON_ABSENCE_DENIALS).
  it.each([
    ["bare globalThis en setTimeout", `/** @server-safe */\nexport function W() { setTimeout(() => { const g = globalThis; void g; }, 0); return <div />; }`],
    ["globalThis.window.location en setTimeout (TypeError Edge)", `/** @server-safe */\nexport function W() { setTimeout(() => { void globalThis.window.location.href; }, 0); return <div />; }`],
    ["bare global en setInterval", `/** @server-safe */\nexport function W() { setInterval(() => { const g = global; void g; }, 0); return <div />; }`],
    ["bare globalThis en queueMicrotask", `/** @server-safe */\nexport function W() { queueMicrotask(() => { const g = globalThis; void g; }); return <div />; }`],
    ["setImmediate en setTimeout (stub que lanza)", `/** @server-safe */\nexport function W() { setTimeout(() => { setImmediate(() => {}); }, 0); return <div />; }`],
    // codex P2 (5f7aa4d): navigator es present-PARCIAL (root sí, geolocation/mediaDevices
    // no) → mismo perfil que setImmediate, NON_ABSENCE_DENIALS. Timer fire en Edge → flag.
    ["navigator.geolocation en setTimeout (shape parcial)", `/** @server-safe */\nexport function W() { setTimeout(() => { navigator.geolocation.getCurrentPosition(() => {}); }, 0); return <div />; }`],
  ])("FLAGGEA la raíz de escape en un timer: %s", (_label, code) => {
    expect(checkSourceFile(code, "timer-escape.fixture.tsx").length).toBeGreaterThan(0);
  });

  // codex P2 (5f7aa4d): un presence-guard `typeof navigator !== "undefined"` da FALSA
  // confianza — el root está presente en Node 22+/edge pero `navigator.geolocation` falta
  // → revienta en SSR. NON_ABSENCE_DENIALS hace que el typeof-guard NO exima (igual que
  // setImmediate). El `window` (ausencia real) SÍ se protege con typeof (contraste).
  it.each([
    ["presence-guard navigator.geolocation", `/** @server-safe */\nexport function W() { if (typeof navigator !== "undefined") navigator.geolocation.getCurrentPosition(() => {}); return <div />; }`],
    ["presence-guard navigator.mediaDevices", `/** @server-safe */\nexport function W() { if (typeof navigator !== "undefined") void navigator.mediaDevices.getUserMedia({}); return <div />; }`],
  ])("FLAGGEA navigator bajo presence-guard (shape parcial, no ausencia): %s", (_label, code) => {
    expect(checkSourceFile(code, "nav-guard.fixture.tsx").length).toBeGreaterThan(0);
  });

  it("NO flaggea window bajo presence-guard (ausencia real → typeof protege)", () => {
    const code = `/** @server-safe */\nexport function W() { if (typeof window !== "undefined") return window.innerWidth; return 0; }`;
    expect(checkSourceFile(code, "win-guard.fixture.tsx")).toEqual([]);
  });

  it.each([
    // Las MISMAS raíces de escape en client-only deferred (useEffect) SÍ se eximen.
    ["globalThis en useEffect (client-only)", `/** @server-safe */\nimport { useEffect } from "react";\nexport function W() { useEffect(() => { const g = globalThis; void g; }, []); return <div />; }`],
    // navigator en client-only deferred (browser-only, donde es completo) → exento.
    ["navigator.geolocation en useEffect (client-only)", `/** @server-safe */\nimport { useEffect } from "react";\nexport function W() { useEffect(() => { navigator.geolocation.getCurrentPosition(() => {}); }, []); return <div />; }`],
  ])("NO flaggea raíz de escape en client-only deferred: %s", (_label, code) => {
    expect(checkSourceFile(code, "escape-client-ok.fixture.tsx")).toEqual([]);
  });
});

/**
 * Cuerpo de namespace es un scope con sus locales (deep re-hunt FP8): un `const`/
 * `function` local del namespace usado en sus miembros NO se flaggea. Un read de
 * un global REAL dentro del namespace sí.
 */
describe("server-safe gate — namespace body locals (FP8)", () => {
  it.each([
    ["const local usado en method", `/** @server-safe */\nexport namespace format { const SEP = ", "; export function join(parts: readonly string[]): string { return parts.join(SEP); } }`],
    ["fn local en namespace", `/** @server-safe */\nexport namespace util { function helper() { return 1; } export function f() { return helper(); } }`],
    // el NOMBRE del namespace es un binding runtime dentro de su cuerpo (codex P2):
    ["self-ref del nombre (fmt.SEP)", `/** @server-safe */\nexport namespace fmt { export const SEP = ","; export function join(p: string[]) { return p.join(fmt.SEP); } }`],
    ["nested A.B self-ref (B.x + A.B.x)", `/** @server-safe */\nexport namespace A { export namespace B { export const x = 1; export function f() { return B.x + A.B.x; } } }`],
    // var hoisted del cuerpo (colisiona con un global) — local, no toca el global (codex P2):
    ["var hoisted que sombrea un global", `/** @server-safe */\nexport namespace N { var window = { x: 1 }; export const y = window.x; }`],
    ["var hoisted usado en method", `/** @server-safe */\nexport namespace N { var doc: any; doc = {}; export function f() { return doc; } }`],
  ])("NO genera falso positivo en locales del namespace: %s", (_label, code) => {
    expect(checkSourceFile(code, "ns-locals.fixture.tsx")).toEqual([]);
  });

  it.each([
    ["global real en namespace body", `/** @server-safe */\nexport namespace bad { export function f() { return window.location.href; } }`],
    ["global real en nested A.B body", `/** @server-safe */\nexport namespace A { export namespace B { export function f() { return window.location.href; } } }`],
    // var en static block de clase NO se hoista al namespace/función (scoped al
    // bloque) → el global homónimo posterior SIGUE flaggeando (codex P2, bypass).
    ["var en static block (namespace) no hoista", `/** @server-safe */\nexport namespace N { class C { static { var window = {} as any; void window; } } export const x = window.location; }`],
    ["var en static block (función) no hoista", `/** @server-safe */\nexport function F() { class C { static { var window = {} as any; void window; } } return window.location.href; }`],
  ])("read de un global REAL dentro del namespace SIGUE flaggeando: %s", (_label, code) => {
    expect(checkSourceFile(code, "ns-global.fixture.tsx").length).toBeGreaterThan(0);
  });
});

/**
 * Static block de clase es un scope de var-hoisting PROPIO (codex P2, la cara
 * interna del fix anterior): un `var` declarado dentro es local al bloque y leerlo
 * en el mismo bloque NO se flaggea. Pero el global REAL (sin local) dentro del
 * bloque SÍ flaggea (corre durante la evaluación de la clase, render-path), y el
 * `var` NO se hoista fuera de la clase (la rama de clase corta el leak — cubierto
 * en FP8 arriba). Cierra el FP que `collectVarHoistedRecursive` para-en-clase abrió.
 */
describe("server-safe gate — static block es scope de var-hoisting propio (FP, codex P2)", () => {
  it.each([
    ["var local leído en el mismo static block", `/** @server-safe */\nexport class C { static { var window = { location: { href: "" } }; void window.location.href; } }`],
    ["var anidado en if dentro del static block", `/** @server-safe */\nexport class C { static { if (true) { var window = { x: 1 }; } void window.x; } }`],
    ["function decl homónima de un global, pre-cargada", `/** @server-safe */\nexport class C { static { void location.toString(); function location() { return ""; } } }`],
    ["static block tras guard typeof hereda el narrowing", `/** @server-safe */\nexport function make() { if (typeof window === "undefined") return null; class C { static { void window.location.href; } } return C; }`],
  ])("NO genera falso positivo: %s", (_label, code) => {
    expect(checkSourceFile(code, "static-block.fixture.tsx")).toEqual([]);
  });

  it.each([
    ["global real (sin local) en static block", `/** @server-safe */\nexport class C { static { void window.location.href; } }`],
    ["instance field init leyendo un global", `/** @server-safe */\nexport class C { x = window.location.href; }`],
  ])("read de un global REAL en cuerpo de clase SIGUE flaggeando: %s", (_label, code) => {
    expect(checkSourceFile(code, "static-block-global.fixture.tsx").length).toBeGreaterThan(0);
  });
});

/**
 * Guards: narrowing en más posiciones (deep re-hunt). El `||` de guards negativos
 * en early-return narrowea TODOS (`if (typeof a === "undefined" || typeof b ===
 * "undefined") return`); un then-branch exhaustivo via if/else cuenta como salida;
 * la rama ELSE de un guard negativo narrowea (X definido ahí). Todo reusa los
 * mismos colectores (no forkeado); la rama equivocada sigue flaggeando.
 */
describe("server-safe gate — guard narrowing extendido (||-early-return, else, if/else)", () => {
  it.each([
    ["|| de negativos en early-return", `/** @server-safe */\nexport function C() { if (typeof window === "undefined" || typeof document === "undefined") return null; return window.location.href + document.title; }`],
    ["then exhaustivo via if/else", `/** @server-safe */\nexport function C({ a }: { a: boolean }) { if (typeof window === "undefined") { if (a) { return "a"; } else { return "b"; } } return window.location.href; }`],
    ["read en ELSE de guard negativo", `/** @server-safe */\nexport function C() { if (typeof window === "undefined") { return "ssr"; } else { return window.location.href; } }`],
  ])("NO genera falso positivo: %s", (_label, code) => {
    expect(checkSourceFile(code, "guard-ext.fixture.tsx")).toEqual([]);
  });

  it.each([
    ["read en THEN de guard negativo (undefined ahí)", `/** @server-safe */\nexport function C() { if (typeof window === "undefined") { return window.location.href; } return "x"; }`],
    ["|| con no-guard: el otro nombre no garantizado", `/** @server-safe */\nexport function C(foo: boolean) { if (typeof window === "undefined" || foo) return null; return window.location.href + document.title; }`],
    ["then NO exhaustivo (if sin else)", `/** @server-safe */\nexport function C({ a }: { a: boolean }) { if (typeof window === "undefined") { if (a) { return "a"; } } return window.location.href; }`],
  ])("SIGUE flaggeando (rama equivocada / no garantizado): %s", (_label, code) => {
    expect(checkSourceFile(code, "guard-ext-flag.fixture.tsx").length).toBeGreaterThan(0);
  });
});

/**
 * Batch de FPs del deep re-hunt (cluster C: F1/F2/F3 reconocimiento de guard; F4
 * forward value-read; F5 cast en callback diferido). Todos son código legítimo y
 * compilable que el gate flaggeaba; cada fix viene con su contra-test de SOUNDNESS
 * (la dirección que SÍ debe flaggear sigue flaggeando — cero bypass).
 */
describe("server-safe gate — FP batch del re-hunt (F1-F5) + soundness", () => {
  it.each([
    // F1: typeof X === "object" (idioma UMD) es existencia-positiva.
    ["F1 typeof window === object", `/** @server-safe */\nexport function C() { if (typeof window === "object") { return window.innerWidth; } return 0; }`],
    ["F1 doble === object &&", `/** @server-safe */\nexport function C() { if (typeof window === "object" && typeof document === "object") { return window.innerWidth + document.body.clientWidth; } return 0; }`],
    // F2: !(typeof X === "undefined") y typeof X !== "object" early-return.
    ["F2 !(typeof === undefined)", `/** @server-safe */\nexport function C() { if (!(typeof window === "undefined")) { return window.innerWidth; } return 0; }`],
    ["F2 typeof !== object early-return", `/** @server-safe */\nexport function C() { if (typeof window !== "object") return 0; return window.innerWidth; }`],
    // F3: guard positivo en condición de for/while narrowea el body.
    ["F3 guard en condición de for", `/** @server-safe */\nexport function C() { let s = 0; for (let i = 0; typeof window !== "undefined" && i < 3; i++) { s += window.innerWidth; } return s; }`],
    ["F3 guard en condición de while", `/** @server-safe */\nexport function C() { let s = 0, n = 0; while (typeof window !== "undefined" && n < 3) { s += window.innerWidth; n++; } return s; }`],
    // F4: forward value-read de un nombre module-declared dentro de una función.
    ["F4 forward const (function)", `/** @server-safe */\nexport function Price() { return CURRENCY + "9.99"; }\nconst CURRENCY = "$";`],
    ["F4 forward const (arrow) + property + class", `/** @server-safe */\nexport const P = () => CURRENCY;\nconst CURRENCY = "$";\n/** @server-safe */\nexport function T() { return TABLE.length; }\nconst TABLE = [1];\n/** @server-safe */\nexport function H() { return new Helper(); }\nclass Helper {}`],
    // codex P2 (59afad2, #133): MULTI-DECLARATOR left-to-right — `const a = …, b = a` lee `a`
    // (1er declarador, ya inicializado en orden) en el 2º; antes el statement se visitaba entero
    // antes de bindear → `a` se veía como global no-bound = FP.
    ["multi-declarator const a=1, b=a", `/** @server-safe */\nexport function f() { const a = 1, b = a; return b; }`],
    ["multi-declarator const cfg={x:1}, value=cfg.x", `/** @server-safe */\nconst cfg = { x: 1 }, value = cfg.x;\nexport const v = value;`],
    ["multi-declarator const a=1, b=a, c=a+b", `/** @server-safe */\nexport function f() { const a = 1, b = a, c = a + b; return c; }`],
    // F5: cast (as/satisfies) entre el callback y su sink diferido.
    ["F5 useEffect callback casteado (as)", `import { useEffect } from "react";\n/** @server-safe */\nexport function R() { useEffect((() => { document.title = String(window.innerWidth); }) as () => void, []); }`],
    ["F5 useEffect callback casteado (satisfies)", `import { useEffect } from "react";\n/** @server-safe */\nexport function R() { useEffect((() => { document.title = "x"; }) satisfies () => void, []); }`],
    // FP paren-operand (review adversarial del batch): el operando de typeof envuelto
    // en wrappers runtime-transparentes (`typeof (window)`, `typeof (window as any)`)
    // ≡ `typeof window` — guard reconocido Y el bare ident interno exento.
    ["paren typeof operand guard", `/** @server-safe */\nexport function C() { if (typeof (window) !== "undefined") { return window.location.href; } return null; }`],
    ["typeof (window) solo (operando exento)", `/** @server-safe */\nexport const ok = typeof (window) !== "undefined";`],
    ["typeof (X as any) === object guard", `/** @server-safe */\nexport function C() { if (typeof (document as any) === "object") { return (document as any).title; } return ""; }`],
    // template-literal SIN sustitución y string parentizado en el lado de comparación
    // (deep adversarial FP): runtime-idénticos a un string literal directo.
    ["typeof === template-literal undefined", `/** @server-safe */\nexport function C(): string | null { if (typeof window === \`undefined\`) return null; return window.location.href; }`],
    ["typeof === template-literal object", `/** @server-safe */\nexport function C(): number { if (typeof window === \`object\`) { return window.innerWidth; } return 0; }`],
    ["typeof !== string parentizado", `/** @server-safe */\nexport function C(): string | null { if (typeof window !== ("undefined")) { return window.location.href; } return null; }`],
  ])("NO genera falso positivo: %s", (_label, code) => {
    expect(checkSourceFile(code, "fp-batch.fixture.tsx")).toEqual([]);
  });

  it.each([
    // F1/F2 soundness: typeof !== "object" en el THEN (no early-return) → window puede
    // ser undefined ahí → FLAG.
    ["typeof !== object en THEN (no early-return)", `/** @server-safe */\nexport function C() { if (typeof window !== "object") { return window.innerWidth; } return 0; }`],
    // F3 soundness: || en la condición NO garantiza presencia en el body.
    ["|| en condición de while → body no seguro", `/** @server-safe */\nexport function C() { let i = 0; while (typeof window !== "undefined" || i < 3) { i += window.innerWidth; } return i; }`],
    // F3 soundness: do-while corre el body ANTES del primer check.
    ["do-while → body antes del check", `/** @server-safe */\nexport function C() { let i = 0; do { i += window.innerWidth; } while (typeof window !== "undefined" && i < 3); return i; }`],
    // F1/F2 soundness: guard sobre un eval-sink/escape root (NON_ABSENCE_DENIAL) por
    // cualquier forma de comparación NO lo exime.
    ["typeof Function === function NO exime eval-sink", `/** @server-safe */\nexport function C() { if (typeof Function === "function") { return Function("return 1")(); } return null; }`],
    // F4 soundness: un GLOBAL real (no module-declared) dentro de una función → FLAG.
    ["global real dentro de función", `/** @server-safe */\nexport function C() { return window.location.href; }`],
    // F4 soundness: read DIRECTO render-path de un global → FLAG (no es función).
    ["global directo render-path", `/** @server-safe */\nexport const x = window.location.href;`],
    // multi-declarator soundness: un GLOBAL real en un declarador posterior SIGUE flaggeando.
    ["multi-declarator con global real const a=1, b=window.x", `/** @server-safe */\nexport function f() { const a = 1, b = (window as any).x; return [a, b]; }`],
    // F5 soundness: eval-sink en un timer casteado SIGUE flaggeando (timer dispara en Edge).
    ["eval-sink en setTimeout casteado", `/** @server-safe */\nexport function B() { setTimeout((() => { Function("return 1")(); }) as () => void, 0); }`],
    // paren-operand soundness: `typeof window.location` (property access) EJECUTA el
    // read → FLAG; el unwrap solo cubre wrappers erased, no member access.
    ["typeof window.location (property access ejecuta)", `/** @server-safe */\nexport function C() { return typeof window.location; }`],
    ["typeof (window).location.href (read real)", `/** @server-safe */\nexport function C() { return typeof (window).location.href; }`],
    // paren-operand soundness: un NON_ABSENCE_DENIAL con operando parentizado NO se
    // exime → el eval-sink bajo ese guard sigue flaggeando.
    ["typeof (Function) parentizado NO exime eval-sink", `/** @server-safe */\nexport function C() { if (typeof (Function) === "function") { return Function("return 1")(); } return null; }`],
  ])("SIGUE flaggeando (soundness, sin bypass): %s", (_label, code) => {
    expect(checkSourceFile(code, "fp-batch-sound.fixture.tsx").length).toBeGreaterThan(0);
  });
});

/**
 * INVARIANTE ACOPLADA de F4 (QA review de Iván). La soundness de F4 — eximir un nombre
 * module-declared leído dentro de una función — NO es auto-contenida: descansa sobre que
 * `gatherModuleDeclaredNames` EXCLUYA lo que se borra al emit. Si un nombre ERASED (phantom:
 * namespace type-only / interface / type-alias / import-type / inline-type / ambient
 * `declare`) se colara en el set, F4 eximiría un read del GLOBAL REAL (dom-access bypass,
 * NO un TDZ-de-local — no hay binding local que sombree). Estos tests PINEAN el acoplamiento:
 * un phantom leído en cuerpo de función DEBE flaggear. Si una regresión en los excludes de
 * erased-shadow rompe esto, falla AQUÍ (ruidoso) en vez de convertir F4 en bypass silencioso.
 */
describe("server-safe gate — F4 sound SOLO si moduleDeclaredNames excluye lo borrado (phantom DEBE flaggear)", () => {
  it.each([
    ["namespace type-only", `/** @server-safe */\nnamespace window { export interface X { a: number } }\nexport function C() { return window.location.href; }`],
    ["interface", `/** @server-safe */\ninterface window { a: number }\nexport function C() { return window.location.href; }`],
    ["type alias", `/** @server-safe */\ntype window = { a: number };\nexport function C() { return window.location.href; }`],
    ["import type { window }", `/** @server-safe */\nimport type { window } from "./x";\nexport function C(): unknown { return window.location.href; }`],
    ["import { type window } inline", `/** @server-safe */\nimport { type window } from "./x";\nexport function C(): unknown { return window.location.href; }`],
    ["declare const (ambient)", `/** @server-safe */\ndeclare const window: { location: { href: string } };\nexport function C() { return window.location.href; }`],
  ])("phantom borrado leído en función SIGUE flaggeando (F4 NO lo exime): %s", (_label, code) => {
    expect(checkSourceFile(code, "f4-phantom.fixture.tsx").length).toBeGreaterThan(0);
  });

  it("control: un binding REAL (const) leído en función SÍ se exime (F4 sound)", () => {
    const code = `/** @server-safe */\nconst window = { location: { href: "" } };\nexport function C() { return window.location.href; }`;
    expect(checkSourceFile(code, "f4-real.fixture.tsx")).toEqual([]);
  });
});

/**
 * DEEPEST adversarial (16 lentes) — 2 bypasses raíz + 2 FPs, antes del freeze de #173.
 *
 * B-α (alias-spoof DEFERRED_HOOK): `import { useState as useEffect }` — el deferred-hook
 *   se reconocía por el NOMBRE LOCAL (alias) contra DEFERRED_HOOKS, no el export canónico.
 *   useState (render-phase, su lazy-init corre en SSR) renombrado a useEffect eximía
 *   window/document Y eval/Function/.constructor. Fix: resolver el export canónico.
 * B-β (param-default var-hoist): `function f(x = window.x){ var window }` — el default-param
 *   corre en scope de PARÁMETRO (no ve el `var` del body), pero el gate aplicaba el
 *   bodyContext (con var hoisted) a los defaults → suprimía el read del GLOBAL real.
 */
describe("server-safe gate — DEEPEST: alias-spoof DEFERRED_HOOK (B-α) por export canónico", () => {
  it.each([
    ["useState as useEffect + window", `import { useState as useEffect } from "react";\n/** @server-safe */\nexport function C(): string { const [v] = useEffect((): string => window.location.href); return v; }`],
    ["useState as useEffect + eval-sink", `import { useState as useEffect } from "react";\n/** @server-safe */\nexport function C(): number { const [v] = useEffect((): number => { eval("globalThis"); return 0; }); return v; }`],
    ["useMemo as useLayoutEffect + .constructor", `import { useMemo as useLayoutEffect } from "react";\n/** @server-safe */\nexport function C(): unknown { return useLayoutEffect(() => (() => {}).constructor("return globalThis")(), []); }`],
    ["React.useState (namespace) lazy-init", `import * as React from "react";\n/** @server-safe */\nexport function C(): string { const [v] = React.useState((): string => window.location.href); return v; }`],
  ])("FLAGGEA el render-phase hook spoofeado: %s", (_label, code) => {
    expect(checkSourceFile(code, "alias-spoof.fixture.tsx").length).toBeGreaterThan(0);
  });

  it.each([
    // El deferred-hook GENUINO (aunque aliaseado) SÍ se exime — la cara FP, mismo fix.
    ["useEffect normal", `import { useEffect } from "react";\n/** @server-safe */\nexport function C() { useEffect(() => { window.location.href; }); return null; }`],
    ["useEffect as ue (alias de un deferred genuino)", `import { useEffect as ue } from "react";\n/** @server-safe */\nexport function C() { ue(() => { window.location.href; }); return null; }`],
    ["React.useEffect (namespace)", `import * as React from "react";\n/** @server-safe */\nexport function C() { React.useEffect(() => { window.location.href; }); return null; }`],
    // `import { default as React }` ≡ `import React` (codex P2): React.useEffect exento.
    ["{ default as React } + React.useEffect", `import { default as React } from "react";\n/** @server-safe */\nexport function C() { React.useEffect(() => { window.location.href; }); return null; }`],
    // bracket-access `React["useEffect"]` === React.useEffect (deep adversarial FP): el
    // callee por ElementAccess con key string se reconoce igual que por punto.
    ['React["useEffect"] bracket-access', `import * as React from "react";\n/** @server-safe */\nexport function C() { React["useEffect"](() => { window.location.href; }); return null; }`],
  ])("NO flaggea el deferred-hook genuino (client-only): %s", (_label, code) => {
    expect(checkSourceFile(code, "alias-genuine.fixture.tsx")).toEqual([]);
  });

  it('soundness: React["useState"] bracket lazy-init SIGUE flaggeando (render-phase)', () => {
    const code = `import * as React from "react";\n/** @server-safe */\nexport function C(): string { const [v] = React["useState"]((): string => window.location.href); return v; }`;
    expect(checkSourceFile(code, "bracket-soundness.fixture.tsx").length).toBeGreaterThan(0);
  });

  it("soundness: { default as React } + React.useState lazy-init SIGUE flaggeando", () => {
    const code = `import { default as React } from "react";\n/** @server-safe */\nexport function C(): string { const [v] = React.useState((): string => window.location.href); return v; }`;
    expect(checkSourceFile(code, "default-react-soundness.fixture.tsx").length).toBeGreaterThan(0);
  });
});

describe("server-safe gate — DEEPEST: param-default corre en scope de parámetro (B-β)", () => {
  it.each([
    ["var window body + param default lee global", `/** @server-safe */\nexport function f(href: string = window.location.href): string { var window: { location: { href: string } } = { location: { href: "" } }; return href; }`],
    ["var navigator body + param default", `/** @server-safe */\nexport function f(ua: string = navigator.userAgent): string { var navigator: { userAgent: string } = { userAgent: "" }; return ua; }`],
    ["arrow + destructuring default lee global con var body", `/** @server-safe */\nexport const g = ({ x = window.location.href }: { x?: string } = {}): string => { var window = {}; void window; return x; };`],
    ["param default sin shadow lee global real", `/** @server-safe */\nexport function f(x: string = navigator.userAgent): string { return x; }`],
  ])("FLAGGEA el global leído en el default-param: %s", (_label, code) => {
    expect(checkSourceFile(code, "param-default.fixture.tsx").length).toBeGreaterThan(0);
  });

  it.each([
    // El param-default ve los PARÁMETROS anteriores (no FP); el body sí ve su var local.
    ["param default lee parámetro anterior", `/** @server-safe */\nexport function f(a: number, b: number = a + 1): number { return a + b; }`],
    ["body lee su propio var local (F4/static-block style)", `/** @server-safe */\nexport function f(): string { var window = { location: { href: "" } }; return window.location.href; }`],
    // codex P1 = NO-bug (verificado empíricamente: gate+tsc+runtime). El caso directo
    // `f(x = window.x, window)` lo RECHAZA tsc (TS2373 "cannot reference identifier
    // declared after it") → no llega al gate; el closure que captura un param posterior
    // lee el PARAM (no el global). Aquí el closure NO debe flaggear (window es el param):
    ["closure en default captura param posterior (lee el param)", `/** @server-safe */\nexport function f(x: () => string = () => (window as any).location.href, window?: { location: { href: string } }): string { return x(); }`],
  ])("NO genera falso positivo: %s", (_label, code) => {
    expect(checkSourceFile(code, "param-default-ok.fixture.tsx")).toEqual([]);
  });
});

/**
 * named function-expression self-name (codex P2 + deep verify). El nombre de una
 * `function self(){…}` está en scope DENTRO de la función — defaults Y body. `self`
 * resuelve a la FUNCIÓN, no al global homónimo (runtime verificado: "IS_FUNCTION").
 * Sin esto el gate lo flaggeaba (FP en ambos sitios). Soundness: una fn cuyo nombre NO
 * colisiona con el read sigue flaggeando el global real.
 */
describe("server-safe gate — named fn-expr self-name (P2 + body, deep verify)", () => {
  it.each([
    ["self-name en default", `/** @server-safe */\nexport const fn = function self(x: unknown = self): unknown { return x; };`],
    ["self-name en body (window)", `/** @server-safe */\nexport const f = function window(): unknown { return (window as any); };`],
    ["self-name en body con propiedad (localStorage)", `/** @server-safe */\nexport const h = function localStorage(): unknown { return (localStorage as any).getItem("x"); };`],
    ["self-name en default + body", `/** @server-safe */\nexport const r = function navigator(x: unknown = navigator): unknown { void x; return (navigator as any); };`],
  ])("NO genera falso positivo (self-name = la función): %s", (_label, code) => {
    expect(checkSourceFile(code, "self-name.fixture.tsx")).toEqual([]);
  });

  it.each([
    // La fn NO se llama como el global → el read es el global real → FLAG.
    ["arrow lee window (no self-name)", `/** @server-safe */\nexport const f = function helper(): string { return window.location.href; };`],
    ["function helper lee navigator", `/** @server-safe */\nexport const g = function helper(): string { return navigator.userAgent; };`],
  ])("SIGUE flaggeando el global real (soundness): %s", (_label, code) => {
    expect(checkSourceFile(code, "self-name-sound.fixture.tsx").length).toBeGreaterThan(0);
  });
});

/**
 * Computed method/accessor key (codex P1). La key `{ [window.x]() {} }` se evalúa al
 * CREAR el objeto/clase (render path, scope EXTERNO), ANTES de que exista el scope de
 * parámetros. Visitarla con el param scope (que tiene los params) suprimía un read del
 * GLOBAL real cuando un param lo sombreaba (runtime verificado: lee el global). Fix: la
 * computed key + decoradores + tipos se visitan en el scope externo; solo los defaults
 * de params usan el param scope.
 */
describe("server-safe gate — computed method key en scope externo (codex P1)", () => {
  it.each([
    ["object computed key lee global con param shadow", `/** @server-safe */\nexport const o = { [window.location.href](window: unknown): void { void window; } };`],
    ["class computed method key", `/** @server-safe */\nexport class C { [navigator.userAgent](navigator: unknown): void { void navigator; } }`],
    ["class computed accessor key", `/** @server-safe */\nexport class C { get [document.title](): number { return 1; } }`],
    // Decorador de PARÁMETRO: corre en DEFINICIÓN (scope externo, antes del param) → lee
    // el global aunque el param se llame igual (codex P1; compila con experimentalDecorators).
    ["param decorator lee global con param shadow", `/** @server-safe */\nexport class C { m(@((window as any).location.href) window: any): void { void window; } }`],
  ])("FLAGGEA el global leído en la computed key / decorador: %s", (_label, code) => {
    expect(checkSourceFile(code, "computed-key.fixture.tsx").length).toBeGreaterThan(0);
  });

  it.each([
    // computed key legítima (const local / param de fn externa) → NO flaggea.
    ["computed key con const local", `/** @server-safe */\nconst KEY = "dynamic";\nexport const o = { [KEY](x: number): number { return x; } };`],
    ["computed key lee un param de la fn externa", `/** @server-safe */\nexport function make(k: string) { return { [k](x: number): number { return x; } }; }`],
    // RETURN TYPE que referencia un param (type-predicate `r is T`): debe verse bajo el
    // param scope, NO el externo. Regresión real cazada en CI (composeRefs.ts:35).
    ["type-predicate en return type referencia el param", `import type { Ref } from "react";\n/** @server-safe */\nexport function clean<T>(refs: Array<Ref<T> | null>): Ref<T>[] { return refs.filter((r): r is Ref<T> => r != null); }`],
    ["arrow con type-predicate inline", `/** @server-safe */\nexport const f = (xs: unknown[]) => xs.filter((x): x is string => typeof x === "string");`],
  ])("NO genera falso positivo (computed key no-global / return type ve params): %s", (_label, code) => {
    expect(checkSourceFile(code, "computed-key-ok.fixture.tsx")).toEqual([]);
  });
});

describe("server-safe gate — DEEPEST FPs: paren-typeof-operando + ambient declare", () => {
  it.each([
    ["(typeof window) !== undefined", `/** @server-safe */\nexport function C(): string { if ((typeof window) !== "undefined") { return window.location.href; } return ""; }`],
    ["(typeof window as string) !== undefined", `/** @server-safe */\nexport function C(): number { if ((typeof window as string) !== "undefined") { return window.innerWidth; } return 0; }`],
    ["declare global { class X extends HTMLElement }", `/** @server-safe */\ndeclare global { class MyElement extends HTMLElement {} }\nexport {};`],
    ["declare namespace { class C extends Navigator }", `/** @server-safe */\ndeclare namespace NS { class C extends Navigator {} }\nexport {};`],
  ])("NO genera falso positivo: %s", (_label, code) => {
    expect(checkSourceFile(code, "deepest-fp.fixture.tsx")).toEqual([]);
  });

  it.each([
    // SOUNDNESS: namespace INSTANCIADO (no-ambient) con class extends runtime → FLAG.
    ["namespace instanciado class extends window.Base", `/** @server-safe */\nexport namespace NS { export class C extends (window as any).Base {} }`],
    // typeof de un MEMBER ejecuta el read → FLAG (el guard no aplica al bare window).
    ["typeof window.location (member ejecuta read)", `/** @server-safe */\nexport function C(): string { if ((typeof window.location) !== "undefined") { return window.location.href; } return ""; }`],
  ])("SIGUE flaggeando (soundness): %s", (_label, code) => {
    expect(checkSourceFile(code, "deepest-fp-sound.fixture.tsx").length).toBeGreaterThan(0);
  });
});

/**
 * FPs fail-closed destapados por el re-hunt: self-reference de clase + root de
 * heritage type-only cualificada. Ambos son posiciones que NO leen un global en
 * runtime pero el modelo fail-closed flaggeaba. Cero debilitamiento — el
 * class-extends RUNTIME y los reads reales siguen flaggeándose.
 */
describe("server-safe gate — class self-ref + heritage type-only (FP re-hunt)", () => {
  it.each([
    ["class self-ref en método", `/** @server-safe */\nexport class Theme { static defaultColor = "blue"; resolve(o?: string): string { return o ?? Theme.defaultColor; } }`],
    ["class self-ref en static method", `/** @server-safe */\nexport class Helper { static make(): Helper { return new Helper(); } }`],
    ["class self-ref en getter", `/** @server-safe */\nexport class Box { static unit = 1; get u(): number { return Box.unit; } }`],
    ["interface extends ns.member type-only", `/** @server-safe */\nimport type * as nav from "./nt";\nexport interface T extends nav.Connection { r: boolean }\nexport const S = (p: T) => p.r;`],
    ["interface extends ns.A.B (deep)", `/** @server-safe */\nimport type * as nav from "./nt";\nexport interface T extends nav.A.B { r: boolean }\nexport const S = (p: T) => p.r;`],
    ["class implements ns.member type-only", `/** @server-safe */\nimport type * as win from "./wt";\nexport class X implements win.Foo {}`],
  ])("NO genera falso positivo (posición no-runtime): %s", (_label, code) => {
    expect(checkSourceFile(code, "fp-rehunt.fixture.tsx")).toEqual([]);
  });

  it.each([
    ["class extends window.HTMLElement (runtime read)", `/** @server-safe */\nexport class W extends window.HTMLElement {}`],
    ["class extends HTMLElement bare", `/** @server-safe */\nexport class E extends HTMLElement {}`],
    ["método de clase lee window real", `/** @server-safe */\nexport class C { m() { return window.location.href; } }`],
  ])("class-extends runtime / read real SIGUE flaggeado: %s", (_label, code) => {
    expect(checkSourceFile(code, "fp-rehunt-flag.fixture.tsx").length).toBeGreaterThan(0);
  });
});

/**
 * `using` / `await using` son BLOCK-SCOPED, no var-hoisted (re-hunt BYP4). El gate
 * trataba el `using` plano (NodeFlags.Using=4, sin el bit Const) como var-hoisted →
 * `{ using navigator = … }` sombreaba el global homónimo en el scope EXTERNO → eximía
 * `navigator.userAgent` fuera del bloque. Fix: isBlockScopedDeclList incluye Using.
 */
describe("server-safe gate — using/await-using es block-scoped (BYP4)", () => {
  it.each([
    ["using shadow no escapa el bloque", `/** @server-safe */\nexport function C() { { using navigator = { [Symbol.dispose]() {} }; void navigator; } return navigator.userAgent; }`],
    ["await using shadow no escapa", `/** @server-safe */\nexport function C() { { await using x = { async [Symbol.asyncDispose]() {} }; void x; } return window.location.href; }`],
  ])("FLAGGEA el global en scope externo (using no lo sombrea): %s", (_label, code) => {
    expect(checkSourceFile(code, "using-flag.fixture.tsx").length).toBeGreaterThan(0);
  });

  it.each([
    ["using local usado en su scope", `/** @server-safe */\nexport function C() { using res = { [Symbol.dispose]() {} }; return res; }`],
    ["using doc.title en su bloque", `/** @server-safe */\nexport function C() { { using doc = { title: "x", [Symbol.dispose]() {} }; return doc.title; } }`],
  ])("using DENTRO de su bloque es binding local → clean: %s", (_label, code) => {
    expect(checkSourceFile(code, "using-ok.fixture.tsx")).toEqual([]);
  });
});

/**
 * Clase HONEST-CONSTRUCT (workflow audit, beta.27 BLOCKER-1): FALSOS POSITIVOS
 * sobre código server-safe legítimo y compilable que el modelo fail-closed
 * dejaba pasar por omisión de scope/posición. Cero bypasses — todos dirección
 * fail-closed. Arreglarlos solo quita FP, nunca debilita el gate.
 */
describe("server-safe gate — clase honest-construct (FP cerrados)", () => {
  const Comp = (b: string) =>
    `/** @server-safe */\nexport const Comp = () => { ${b} };`;

  it.each([
    ["negative-guard early-return (idioma SSR dominante)", Comp(`if (typeof window === "undefined") return null; return window.innerWidth;`)],
    ["negative-guard con block then", Comp(`if (typeof document === "undefined") { return null; } return document.title;`)],
    ["negative-guard con throw", Comp(`if (typeof window === "undefined") throw new Error("ssr"); return window.innerWidth;`)],
    ["negative-guard polaridad ==", Comp(`if (typeof window == "undefined") return null; return window.innerWidth;`)],
    ["enum value access", `/** @server-safe */\nenum Dir { Up, Down }\nexport const Comp = () => { const x = Dir.Up; void x; return null; };`],
    ["enum usado en componente posterior", `/** @server-safe */\nenum Dir { Up }\nexport const Comp = () => Dir.Up;`],
    ["named tuple labels", `/** @server-safe */\nexport type Pair = [first: number, second: string];\nexport const Comp = () => null;`],
    ["named tuple rest/optional", `/** @server-safe */\nexport type T = [head: number, tail?: string, ...rest: boolean[]];\nexport const Comp = () => null;`],
    ["namespace value access", `/** @server-safe */\nnamespace NS { export const thing = 1; }\nexport const Comp = () => { const x = NS.thing; void x; return null; };`],
    ["import X = NS.Y (import-equals)", `/** @server-safe */\nnamespace NS { export const Y = 1; }\nimport X = NS.Y;\nexport const Comp = () => { const z = X; void z; return null; };`],
  ])("NO genera falso positivo: %s", (_label, code) => {
    expect(checkSourceFile(code, "honest.fixture.tsx")).toEqual([]);
  });

  // El narrowing por early-return NO debe sobre-eximir (FN check): solo aplica
  // al nombre guardado, DESPUÉS del if, con then abrupto y sin else.
  it.each([
    ["acceso ANTES del if (no narrowed aún)", Comp(`const a = window.innerWidth; if (typeof window === "undefined") return null; void a;`)],
    ["con else → no narrowing", Comp(`if (typeof window === "undefined") { void 0; } else { void 0; } return window.x;`)],
    ["then sin abrupt → no narrowing", Comp(`if (typeof window === "undefined") { void 0; } return window.x;`)],
    ["eval/escape no se eximen por guard", Comp(`if (typeof Function === "undefined") return null; return Function("return 1")();`)],
    ["otro nombre no se exime", Comp(`if (typeof window === "undefined") return null; return document.title;`)],
    ["declare enum ambient NO sombrea", `/** @server-safe */\ndeclare enum E { A }\nexport const Comp = () => { const x = window; void x; return null; };`],
  ])("el guard negativo NO sobre-exime (sigue flaggeando): %s", (_label, code) => {
    const v = checkSourceFile(code, "honest-fn.fixture.tsx");
    expect(v.length).toBeGreaterThan(0);
  });
});

/**
 * `setImmediate`/`clearImmediate` denegados por el stance edge-baseline
 * (beta.27): Node-only, no Web-standard; en Vercel Edge son un stub que LANZA
 * al llamarse → el typeof-guard NO los legitima (van en NON_ABSENCE_DENIALS).
 * Los otros deferred-timers (web-standard) siguen safe + su callback diferido.
 */
describe("server-safe gate — setImmediate/clearImmediate (edge-baseline)", () => {
  const Comp = (b: string) =>
    `/** @server-safe */\nexport const Comp = () => { ${b} };`;

  it.each([
    ["setImmediate bare", Comp(`setImmediate(() => {}); return null;`)],
    ["clearImmediate bare", Comp(`clearImmediate(1 as unknown as NodeJS.Immediate); return null;`)],
    ["typeof setImmediate guard NO exime (stub Edge)", Comp(`if (typeof setImmediate !== "undefined") { setImmediate(() => {}); } return null;`)],
  ])("FLAGGEA: %s", (_label, code) => {
    expect(checkSourceFile(code, "setimmediate.fixture.tsx").length).toBeGreaterThan(0);
  });

  // El timer web-standard EN SÍ no se deniega (a diferencia de setImmediate); un callback sin
  // global de cliente queda limpio. (Un read de window/document DENTRO del timer SÍ flaggea —
  // el timer corre en el server isolate; ver describe "global de cliente en timer".)
  it.each([
    ["setTimeout callback sin global", Comp(`setTimeout(() => { let n = 0; n += 1; void n; }, 0); return null;`)],
    ["queueMicrotask callback sin global", Comp(`queueMicrotask(() => { let s = ""; s += "x"; void s; }); return null;`)],
  ])("web-standard timer EN SÍ no se deniega → clean: %s", (_label, code) => {
    expect(checkSourceFile(code, "webtimer.fixture.tsx")).toEqual([]);
  });
});

/**
 * Codex P2 round 5 — el narrowing por early-return (`if (typeof X ===
 * "undefined") return`) no se propagaba en el loop separado de CaseBlock
 * (switch), causando un FP en un patrón SSR común. (El otro P2 de la ronda —
 * el shadow-fold del Nivel 1 — se cerró revirtiendo el Nivel 1 entero: ver el
 * residual computed-key arriba.)
 */
describe("server-safe gate — codex P2 round 5 (switch-guard)", () => {
  it("switch: negative-guard con statements directos NO genera FP", () => {
    const code = `/** @server-safe */\nexport const C = (x: string) => { switch (x) { case "b": if (typeof window === "undefined") return 0; return window.innerWidth; default: return 0; } };`;
    expect(checkSourceFile(code, "switch-guard.fixture.tsx")).toEqual([]);
  });

  it("switch: el guard NO cruza el clause boundary (sound, sigue flaggeando)", () => {
    // Entrar directamente en `case "b"` no ejecuta el `if` de `case "a"`.
    const code = `/** @server-safe */\nexport const C = (x: string) => { switch (x) { case "a": if (typeof window === "undefined") return 0; case "b": return window.innerWidth; default: return 0; } };`;
    const v = checkSourceFile(code, "switch-cross.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });
});

describe("server-safe gate — DEEPEST: callee diferido envuelto en wrapper erased (deferred-alias-spoof)", () => {
  it("(useEffect)(cb) con paréntesis NO genera FP (sink diferido reconocido)", () => {
    const code = `/** @server-safe */\nimport { useEffect } from "react";\nexport function C() { (useEffect)(() => { window.location.href; }); return null; }`;
    expect(checkSourceFile(code, "callee-paren.fixture.tsx")).toEqual([]);
  });

  it("(useEffect as typeof useEffect)(cb) — cast erased en callee, sin FP", () => {
    const code = `/** @server-safe */\nimport { useEffect } from "react";\nexport function C() { (useEffect as typeof useEffect)(() => { window.location.href; }); return null; }`;
    expect(checkSourceFile(code, "callee-as.fixture.tsx")).toEqual([]);
  });

  it("(React).useEffect(cb) y (React)[\"useEffect\"](cb) — chain-root en paren, sin FP", () => {
    const dot = `/** @server-safe */\nimport * as React from "react";\nexport function C() { (React).useEffect(() => { window.location.href; }); return null; }`;
    expect(checkSourceFile(dot, "chain-paren-dot.fixture.tsx")).toEqual([]);
    const bracket = `/** @server-safe */\nimport * as React from "react";\nexport function C() { (React)["useEffect"](() => { window.location.href; }); return null; }`;
    expect(checkSourceFile(bracket, "chain-paren-bracket.fixture.tsx")).toEqual([]);
  });

  it("SOUNDNESS: (setTimeout)(cb,0) con window read SIGUE flaggeando (timer corre en server, codex P1)", () => {
    // El callee envuelto se reconoce como setTimeout, pero un timer NO exime un global de
    // cliente (corre en el isolate del server). Distinto de (useEffect)(cb) (client-only).
    const code = `/** @server-safe */\nexport function C() { (setTimeout)(() => { window.location.href; }, 0); return null; }`;
    const v = checkSourceFile(code, "callee-timer.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it("SOUNDNESS: (React).useState(lazy) render-phase envuelto SIGUE flaggeando", () => {
    // Desenvolver el callee NO debe convertir un hook render-phase en diferido:
    // el lazy-initializer de useState corre en render (SSR) → debe flaggearse.
    const code = `/** @server-safe */\nimport * as React from "react";\nexport function C() { return (React).useState(() => window.innerWidth); }`;
    const v = checkSourceFile(code, "callee-soundness-state.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it("SOUNDNESS: alias-spoof (useState as useEffect) envuelto SIGUE flaggeando", () => {
    // El nombre local es useEffect pero el export canónico es useState (render-phase).
    const code = `/** @server-safe */\nimport { useState as useEffect } from "react";\nexport function C() { (useEffect)(() => { window.location.href; }); return null; }`;
    const v = checkSourceFile(code, "callee-soundness-alias.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });
});

describe("server-safe gate — DEEPEST: const-enum namespace instancia (preserveConstEnums forzado, shadow-scoping)", () => {
  it("namespace con solo const-enum SOMBREA el global (verbatimModuleSyntax → emite shell), sin FP", () => {
    const code = `/** @server-safe */\nnamespace navigator { export const enum E { a } }\nexport const v = navigator.E.a;`;
    expect(checkSourceFile(code, "const-enum-ns.fixture.tsx")).toEqual([]);
  });

  it("SOUNDNESS: namespace SOLO type-only sigue elided → ref bare SIGUE flaggeando", () => {
    const code = `/** @server-safe */\nnamespace navigator { export interface I { a: number } }\nexport const v: navigator.I = { a: 1 };\nexport const w = navigator;`;
    const v = checkSourceFile(code, "typeonly-ns-sound.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it("ANCLA BUILD-EMIT: el build (OXC/rolldown, vite 8) instancia el const-enum-namespace — verificado behavioral; esbuild.transformSync coincide como proxy", () => {
    // FP-B asume que `namespace N { export const enum E {} }` SOMBREA el global porque
    // el build lo INSTANCIA. El emisor de RUNTIME NO es tsc: `tsconfig.build.json` es
    // `emitDeclarationOnly` (solo .d.ts); el JS de runtime lo emite Vite vía esbuild
    // (loader "ts"). Anclar a `ts.transpileModule` daba falsa confianza (codex P2): si
    // esbuild elidiera/inlineara el const-enum-namespace, `namespaceIsInstantiated(_, true)`
    // lo metería en localBindings y suprimiría un read global real → BYPASS. Anclamos al
    // EMIT REAL de esbuild: con una ref bare al namespace, el shell `var navigator` DEBE
    // emitirse (→ la ref se liga al LOCAL, no al global). Verificado member-only, bare-ref
    // y minify (bajo minify esbuild renombra pero declara local). Rompe ruidoso si esbuild
    // cambiara su emit de const-enum-namespaces o si el DS cambiara de transformer.
    const out = transformSync(
      "namespace navigator { export const enum E { a } }\nexport const w = navigator;",
      { loader: "ts", format: "esm" },
    );
    expect(/\bvar navigator\b/.test(out.code)).toBe(true);
  });
});

describe("server-safe gate — DEEPEST: computed key en miembro type-space (nonref-heritage)", () => {
  it("branded type `T & { readonly [tag]: B }` con symbol ambient NO genera FP", () => {
    const code = `/** @server-safe */\ndeclare const tag: unique symbol;\nexport type Brand<T, B> = T & { readonly [tag]: B };\nexport type UserId = Brand<string, "UserId">;\nexport const z = 1;`;
    expect(checkSourceFile(code, "branded.fixture.tsx")).toEqual([]);
  });

  it("interface con computed key (PropertySignature) NO genera FP", () => {
    const code = `/** @server-safe */\ndeclare const sym: unique symbol;\nexport interface I { [sym]: number }\nexport const z = 1;`;
    expect(checkSourceFile(code, "iface-computed.fixture.tsx")).toEqual([]);
  });

  it("SOUNDNESS: computed key de CLASE (PropertyDeclaration, runtime) SIGUE flaggeando", () => {
    // Una clase EMITE la computed key → es un read runtime real, no type-space.
    const code = `/** @server-safe */\nexport class C { [window.location.href]() { return 1; } }`;
    const v = checkSourceFile(code, "class-computed-sound.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });
});

describe("server-safe gate — DEEPEST: TypePredicate parameterName en tipo standalone (new-fp-source)", () => {
  it("type alias `(val) => val is string` NO flaggea el parameterName", () => {
    const code = `/** @server-safe */\nexport type Guard = (val: unknown) => val is string;\nexport const z = 1;`;
    expect(checkSourceFile(code, "predicate-alias.fixture.tsx")).toEqual([]);
  });

  it("method-signature de interface y asserts NO generan FP", () => {
    const iface = `/** @server-safe */\nexport interface Checker { check(val: unknown): val is number; }\nexport const z = 1;`;
    expect(checkSourceFile(iface, "predicate-iface.fixture.tsx")).toEqual([]);
    const asserts = `/** @server-safe */\nexport type Assert = (val: unknown) => asserts val is number;\nexport const z = 1;`;
    expect(checkSourceFile(asserts, "predicate-asserts.fixture.tsx")).toEqual([]);
  });

  it("SOUNDNESS: función REAL con type-predicate sigue sin FP (param masked) y un read bare real SIGUE flaggeando", () => {
    const ok = `/** @server-safe */\nexport function isNum(val: unknown): val is number { return typeof val === "number"; }`;
    expect(checkSourceFile(ok, "predicate-real-fn.fixture.tsx")).toEqual([]);
    const bad = `/** @server-safe */\nexport function isNum(val: unknown): val is number { return window.innerWidth > 0 && typeof val === "number"; }`;
    const v = checkSourceFile(bad, "predicate-real-fn-sound.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });
});

describe("server-safe gate — DEEPEST: typeof-guard envuelto en cast top-level (simetría erased)", () => {
  it("`(typeof window !== \"undefined\") as boolean` se reconoce como guard, sin FP", () => {
    const code = `/** @server-safe */\nexport function C(): string | null { if ((typeof window !== "undefined") as boolean) { return window.location.href; } return null; }`;
    expect(checkSourceFile(code, "guard-as.fixture.tsx")).toEqual([]);
  });

  it("`(typeof window !== \"undefined\")!` NonNull top-level se reconoce, sin FP", () => {
    const code = `/** @server-safe */\nexport function C(): number { if ((typeof window !== "undefined")!) { return window.innerWidth; } return 0; }`;
    expect(checkSourceFile(code, "guard-nonnull.fixture.tsx")).toEqual([]);
  });

  it("SOUNDNESS: el `!` LÓGICO sigue flipando (no se desenvuelve como erased)", () => {
    // `!(typeof window !== "undefined")` es TRUE cuando window AUSENTE → el read en
    // la rama whenFalse (window presente) está guardado; un read en whenTrue NO.
    const guarded = `/** @server-safe */\nexport function C(): number { return !(typeof window !== "undefined") ? 0 : window.innerWidth; }`;
    expect(checkSourceFile(guarded, "guard-logical-not.fixture.tsx")).toEqual([]);
    const bad = `/** @server-safe */\nexport function C(): number { return !(typeof window !== "undefined") ? window.innerWidth : 0; }`;
    const v = checkSourceFile(bad, "guard-logical-not-sound.fixture.tsx");
    expect(v.some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });
});

describe("server-safe gate — DEEPEST re-hunt #173: namespaceIsInstantiated = oráculo BUILD OXC/rolldown (BYPASS-2)", () => {
  // El gate debe coincidir con el emit REAL del build (OXC transform + rolldown bundle, vite
  // 8; esbuild.transformSync es proxy per-statement que coincide aquí), NO con
  // ts.isInstantiatedModule, que divergía en namespaces ambient-anidados → bypass. Ancla
  // data-driven: para cada forma, gate-flaggea ⟺ esbuild ELIDE. Ver feedback_esbuild_emit_oracle.
  const FORMS: ReadonlyArray<readonly [string, string]> = [
    ["direct const", "namespace navigator { export const x = 1 }"],
    ["direct const-enum", "namespace navigator { export const enum E { a } }"],
    ["top-level ambient const", "namespace navigator { export declare const z: number }"],
    ["top-level ambient fn", "namespace navigator { export declare function f(): void }"],
    ["top-level ambient class", "namespace navigator { export declare class C {} }"],
    ["nested AMBIENT const-enum", "namespace navigator { export declare namespace I { const enum E { a } } }"],
    ["nested AMBIENT value", "namespace navigator { export declare namespace I { const z: number } }"],
    ["nested NON-ambient value", "namespace navigator { export namespace I { export const z = 1 } }"],
    ["type-only interface", "namespace navigator { export interface I {} }"],
    ["direct enum", "namespace navigator { export enum E { a } }"],
  ];
  for (const [label, ns] of FORMS) {
    it(`coincide con esbuild: ${label}`, () => {
      const code = `/** @server-safe */\n${ns}\nexport const w = navigator;`;
      const instantiates = /\bvar navigator\b/.test(
        transformSync(code, { loader: "ts", format: "esm" }).code,
      );
      // instancia → sombra → no flag ; elide → flag
      expect(checkSourceFile(code, "ns.fixture.tsx").length > 0).toBe(!instantiates);
    });
  }

  it("SOUNDNESS BYPASS-2: namespace ambient-anidado const-enum FLAGGEA (esbuild elide)", () => {
    const code = `/** @server-safe */\nnamespace document { export declare namespace I { const enum E { a } } }\nexport const w = document;`;
    expect(checkSourceFile(code, "bypass2.fixture.tsx").length).toBeGreaterThan(0);
  });

  it("FP-B: const-enum DIRECTO sigue sombreando (esbuild instancia, no over-flag)", () => {
    const code = `/** @server-safe */\nnamespace navigator { export const enum E { a } }\nexport const w = navigator;`;
    expect(checkSourceFile(code, "directenum.fixture.tsx")).toEqual([]);
  });
});

/**
 * FRONTERA DEL EVAL-SINK — token-UNIDAD-EN-SU-SITIO caza; ENSAMBLAJE/INDIRECCIÓN = residual.
 *
 * ADR §141. La línea NO es "legible vs ofuscado" (gradiente) sino sintáctica y decidible
 * sin folder ni call-graph: ¿el token peligroso (`constructor`/`call`/`apply`/`bind`) está
 * presente como UNIDAD —member `.constructor`, o string-literal único `["constructor"]`,
 * con wrappers value-transparentes desenvueltos— = CAZAR; o está ARMADO de piezas
 * (concat, sustitución de template, `String.fromCharCode`/`.join`/`.slice`) o alcanzado por
 * INDIRECCIÓN (variable, data-flow) = RESIDUAL POR DISEÑO?
 *
 * El `+`-concat (CLASE B, 4924427) y la sustitución de template se foldeaban antes; se
 * REVIRTIERON (deepest final hunt #173) por INCOHERENCIA con el §141 ratificado: foldear un
 * SUBCONJUNTO del ensamblaje es FALSA COMPLETITUD (caza 1-de-∞ — el ternario-concat y
 * fromCharCode pasan igual, verificado), da falsa confianza, y bajo el modelo opt-in-first-party
 * ningún autor honesto ensambla el token sin querer. Revertir hace VERDADERA la afirmación de
 * la frontera y reduce superficie de FP (§184). La alternativa (folder TODO inline-constante)
 * es el mismo 1-de-∞ + reimplementar el evaluador de constantes (out-of-design, B4/F4).
 */
describe("server-safe gate — frontera eval-sink: token-unidad caza, ensamblaje = residual (§141)", () => {
  // Token EN SU SITIO como unidad (member o literal único), wrappers value-transparentes OK → CAZA.
  it.each([
    ["member .constructor.constructor()", '/** @server-safe */\nexport function f(){ return ([] as any).constructor.constructor("return window")(); }'],
    ["literal [\"constructor\"][\"constructor\"]", '/** @server-safe */\nexport function f(){ return ([] as any)["constructor"]["constructor"]("return window")(); }'],
    ["no-sub template [`constructor`]", '/** @server-safe */\nexport function f(){ return ([] as any)[`constructor`][`constructor`]("return window")(); }'],
    ["value-transparent (0,\"constructor\")", '/** @server-safe */\nexport function f(){ return ([] as any)[(0,"constructor")][(0,"constructor")]("return window")(); }'],
    ["value-transparent 1 && \"constructor\"", '/** @server-safe */\nexport function f(){ return ([] as any)[1 && "constructor"]["constructor"]("return window")(); }'],
    [".call literal sobre .constructor", '/** @server-safe */\nexport function f(g: () => void){ return g.constructor["call"](null, "return window")(); }'],
  ])("CAZA token-unidad: %s", (_l, code) => {
    expect(checkSourceFile(code, "unit.fixture.tsx").length).toBeGreaterThan(0);
  });

  // Token ENSAMBLADO de piezas → RESIDUAL POR DISEÑO (exime). NO es bug: §141 lo declina.
  it.each([
    ["concat literal [\"construc\"+\"tor\"]", '/** @server-safe */\nexport function f(){ return ([] as any)["construc"+"tor"]["construc"+"tor"]("return window")(); }'],
    ["sustitución template [`cons${\"tructor\"}`]", '/** @server-safe */\nexport function f(){ return ([] as any)[`cons${"tructor"}`][`cons${"tructor"}`]("return window")(); }'],
    ["concat con ternario-literal (ambas keys)", '/** @server-safe */\nexport function f(){ return ([] as any)["cons"+(true?"tructor":"")]["cons"+(true?"tructor":"")]("return window")(); }'],
    ["String.fromCharCode", '/** @server-safe */\nexport function f(){ return ([] as any)[String.fromCharCode(99,111,110,115,116,114,117,99,116,111,114)]("return window")(); }'],
    ["[..].join('')", '/** @server-safe */\nexport function f(){ return ([] as any)[["construc","tor"].join("")]("return window")(); }'],
    [".call via template-substitution", '/** @server-safe */\nexport function f(g: () => void) { return g.constructor[`ca${"ll"}`](null, "return window")(); }'],
  ])("RESIDUAL §141 (token ensamblado, exime por diseño): %s", (_l, code) => {
    expect(checkSourceFile(code, "assembled.fixture.tsx")).toEqual([]);
  });

  it("SOUNDNESS: key dinámica real [k] (indirección) tampoco foldea, no crashea", () => {
    const code = `/** @server-safe */\nexport function f(g: () => void, k: string) { return (g.constructor as Record<string, (...a: unknown[]) => unknown>)[k]; }`;
    expect(() => checkSourceFile(code, "dynkey.fixture.tsx")).not.toThrow();
  });
});

// RAÍZ A (re-hunt rc.1 + Fable cross-review): el motor value-survival (`valueTransparentChildren`)
// descendía erased/ternario/coma/&&/||/??/= pero NO la proyección CONTAINER-LITERAL `[X][0]` (array-
// index literal) ni `({k:X}).k` (object-member literal). 8 fail-opens de distintos ejes (construcción
// wasm, partial-member, import()-builtin, import()-follow, import.meta, crypto-unbound, string-timer)
// evadían por proyección. Un solo descenso central los cierra; el receiver-detach lo hace por su set
// SPLIT. Fail-CLOSED (§141) ante índice no-literal/fuera-de-rango/spread, key computada, spread/accessor.
describe("server-safe gate — RAÍZ A: proyección container-literal en value-survival", () => {
  const flags = (b: string) =>
    checkSourceFile(`/** @server-safe */\n${b}`, "rootA.fixture.tsx").length > 0;

  it.each([
    ["A1 construcción wasm array-index", `export const f = (b: BufferSource) => new [WebAssembly.Module][0](b);`],
    ["A2 partial-member object-literal", `export const x = ({ p: performance }).p.eventLoopUtilization();`],
    ["A3 import()-builtin array-index", `export function C() { return import(["node:fs"][0]); }`],
    ["A5a import.meta object-literal", `export const r = () => ({ m: import.meta }).m.resolve("./x");`],
    ["A5b import.meta array-index", `export const d = [import.meta][0].dirname;`],
    ["A6 construcción wasm object-member", `export const f = (b: BufferSource) => new ({ m: WebAssembly.Module }).m(b);`],
    ["A7 crypto-unbound array-index (detach)", `export const f = (b: Uint8Array) => [crypto.getRandomValues][0](b);`],
    ["A7b crypto-unbound object-member (detach)", `export const f = (b: Uint8Array) => ({ g: crypto.getRandomValues }).g(b);`],
    ["A8 string-timer array-index", `export function C() { setTimeout(["alert(1)"][0], 0); return null; }`],
    ["nesting [[X][0]][0]", `export const f = (b: BufferSource) => new [[WebAssembly.Module][0]][0](b);`],
    ["shorthand ({performance}).performance", `export const x = ({ performance }).performance.eventLoopUtilization();`],
  ])("CIERRA proyección container: %s", (_l, code) => {
    expect(flags(code)).toBe(true);
  });

  it("A4 import()-follow por proyección audita el módulo entero (window en dep)", () => {
    const v = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nexport function C() { import(["./dirty"][0]); return null; }`,
        "/repo/src/dirty.ts": `export const x = window.location.href;\n`,
      }),
    );
    expect(v.length).toBeGreaterThan(0);
  });

  it.each([
    ["valor Edge-safe array-index", `export const x = [performance][0].now();`],
    ["valor Edge-safe object-member", `export const x = ({ p: performance }).p.timeOrigin;`],
    ["crypto bound directo (no detach)", `export const f = (b: Uint8Array) => crypto.getRandomValues(b);`],
  ])("CERO FP (proyección de valor Edge-safe): %s", (_l, code) => {
    expect(flags(code)).toBe(false);
  });

  it.each([
    ["índice fuera de rango", `export const f = (b: BufferSource) => new [WebAssembly.Module][5](b);`],
    ["spread en array (variable)", `export const f = (a: any[], b: BufferSource) => new [...a][0](b);`],
    ["key computada en object", `export const f = (k: string, b: BufferSource) => new ({ [k]: WebAssembly.Module }).x(b);`],
  ])("frontera §141 (no decidible en-sitio → exime): %s", (_l, code) => {
    expect(flags(code)).toBe(false);
  });

  // FLIP DE POLARIDAD (Fable cross-review 3): sobre un container LITERAL, una key IRRESOLUBLE ya NO exime
  // — desciende a TODOS los valores (∃-peligro), fail-closed. Un hueco de enumeración degrada a FP, no FN.
  it("índice variable sobre container literal peligroso → FLAG (fail-closed, no §141)", () => {
    expect(flags(`export const f = (i: number, b: BufferSource) => new [WebAssembly.Module][i](b);`)).toBe(true);
  });

  // Variante array del flip (Fable review 3): un spread desplaza posiciones → ∃-peligro sobre no-spread.
  it.each([
    ["spread-de-literal [...[0], X][1]", `export const f = (b: BufferSource) => new [...[0], WebAssembly.Module][1](b);`, true],
    ["spread-de-variable [...a, X][0]", `export const f = (a: unknown[], b: BufferSource) => new [...a, WebAssembly.Module][0](b);`, true],
    ["anti-FP: array con spread, sin hazard [...[0], Array][1]", `export const f = (b: BufferSource) => new [...[0], Array][1](b);`, false],
    ["anti-FP: solo spread-variable [...a][0]", `export const f = (a: unknown[], b: BufferSource) => new [...a][0](b);`, false],
  ])("spread-in-array: %s", (_l, code, exp) => {
    expect(flags(code)).toBe(exp);
  });
});

// RAÍZ B (re-hunt rc.1 + Fable cross-review): `Reflect.get(R, "k")` con key STRING-LITERAL es un
// member-read EN-SITIO ≡ `R["k"]`, decidible con los resolvers existentes (R por exprPartialRoot, k
// literal). El gate modelaba Reflect.construct/apply pero NO 'get' para el eje presencia-de-miembro.
// DISTINTO del residual §141 del eval-sink (`Reflect.get(x,"constructor")()`: x variable + result-chasing).
describe("server-safe gate — RAÍZ B: Reflect.get member-read con key literal", () => {
  const flags = (b: string) =>
    checkSourceFile(`/** @server-safe */\n${b}`, "rootB.fixture.tsx").length > 0;

  it.each([
    ["performance member Node-only", `export const x = Reflect.get(performance, "eventLoopUtilization")();`],
    ["import.meta member Node-only (vía root C)", `export const d = Reflect.get(import.meta, "dirname");`],
    ["process denegado", `export const x = Reflect.get(process, "cwd");`],
    ["callee value-transparent", `export const x = (0, Reflect).get(performance, "eventLoopUtilization");`],
  ])("CIERRA Reflect.get member-read: %s", (_l, code) => {
    expect(flags(code)).toBe(true);
  });

  it.each([
    ["miembro allowlist performance.now", `export const x = Reflect.get(performance, "now");`],
    ["miembro allowlist import.meta.url", `export const u = Reflect.get(import.meta, "url");`],
    ["key variable sobre wholesale-safe → §141", `export const f = (k: string) => Reflect.get(crypto, k);`],
    ["no-Reflect (Foo.get)", `const Foo = { get: (_a: unknown, _b: unknown) => 1 };\nexport const x = Foo.get(performance, "eventLoopUtilization");`],
    ["residual §141 eval-sink (receiver variable)", `export const f = (g: unknown) => Reflect.get(g as any, "constructor")();`],
  ])("no FP / frontera preservada: %s", (_l, code) => {
    expect(flags(code)).toBe(false);
  });
});

// RE-HUNT 2 (post-fix + Fable cross-review 2): los 8 fixes rc.1 eran correctos pero INCOMPLETOS — cerraron
// las formas LITERALES pero dejaron abiertas las value-transparent / coercidas / proyectadas del MISMO eje.
// Fix predicate-by-space: resolveKeyCandidates (VT-fold + canonicalización numérica) rutea toda resolución
// de índice/key; objectLiteralMemberValues per-key (sin poison-amplifier); forceDir chequea package.json.
describe("server-safe gate — RE-HUNT 2: formas VT/coercidas/proyectadas de índice/key", () => {
  const flags = (b: string) =>
    checkSourceFile(`/** @server-safe */\n${b}`, "rh2.fixture.tsx").length > 0;
  const B = "new Uint8Array()";

  it.each([
    // A2 — key numérica en object-literal + canonicalización por valor + string-index sobre array:
    ["({0:X})[0] key numérica", `export const a = new (({0:WebAssembly})[0]).Module(${B});`],
    ["({1e2:X})[100] canon 1e2", `export const a = new (({1e2:WebAssembly})[100]).Module(${B});`],
    ["({0x10:X})[16] canon hex", `export const a = new (({0x10:WebAssembly})[16]).Module(${B});`],
    ['[X]["0"] string-index sobre array', `export const a = new ([WebAssembly]["0"]).Module(${B});`],
    // A4 — índice VT (ternario-const, &&):
    ["[X][true?0:1] índice ternario", `export const x = new ([WebAssembly][true?0:1]).Module(${B});`],
    ["[X][1&&0] índice &&", `export const x = new ([WebAssembly][1&&0]).Module(${B});`],
    // A5 — computed-literal + SIN poison-amplifier (sibling benigno no opaca la key):
    ['({["m"]:X}).m computed-literal', `export const a = new (({["m"]:WebAssembly.Module}).m)(${B});`],
    ['({["zz"]:1, m:X}).m poison', `export const a = new (({["zz"]:1, m:WebAssembly.Module}).m)(${B});`],
    ["({noop(){}, m:X}).m método-sibling", `export const a = new (({noop(){}, m:WebAssembly.Module}).m)(${B});`],
    ["({get g(){return 1}, m:X}).m getter-sibling", `export const a = new (({get g(){return 1}, m:WebAssembly.Module}).m)(${B});`],
    // B2 — Reflect.get key VT/proyectada/ternario + cross A2×B2:
    ['Reflect.get(perf,(0,"nodeTiming")) coma', `export const x = Reflect.get(performance, (0,"nodeTiming"));`],
    ['Reflect.get(perf,["nodeTiming"][0]) proyectada', `export const x = Reflect.get(performance, ["nodeTiming"][0]);`],
    ['Reflect.get(perf,c?"nodeTiming":"now") ternario', `export const x = (c: boolean) => Reflect.get(performance, c?"nodeTiming":"now");`],
    ['Reflect.get(({0:perf})[0],["nodeTiming"][0]) cross A2×B2', `export const x = Reflect.get(({0:performance})[0], ["nodeTiming"][0]);`],
  ])("CIERRA (VT/coercida/proyectada): %s", (_l, code) => {
    expect(flags(code)).toBe(true);
  });

  it.each([
    ["({0:performance})[0].now() safe", `export const x = ({0:performance})[0].now();`],
    ['Reflect.get(performance,["now"][0]) safe', `export const x = Reflect.get(performance, ["now"][0]);`],
    ['Reflect.get(import.meta,true?"url":"url") safe', `export const x = Reflect.get(import.meta, true?"url":"url");`],
    ["({1e2:crypto})[100].randomUUID() safe (canon + bound)", `export const x = ({1e2:crypto})[100].randomUUID();`],
  ])("NO FP: %s", (_l, code) => {
    expect(flags(code)).toBe(false);
  });

  // A2 en el follow de import() (el motor value-survival compartido): un módulo dirty proyectado se sigue.
  it("import(({0:'./dirty'})[0]) sigue+flaggea el módulo dirty", () => {
    const v = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nexport function C() { import(({0:"./dirty"})[0]); return null; }`,
        "/repo/src/dirty.ts": `export const x = window.location.href;\n`,
      }),
    );
    expect(v.length).toBeGreaterThan(0);
  });

  // D2 (REGRESIÓN del fix D): forceDir debe chequear package.json (Vite resuelve main/exports antes del index).
  it.each([
    ["main→edge.ts sucio", { "pkg/index.tsx": `/** @server-safe */\nexport const c = 1;\n`, "pkg/edge.ts": `export const d = process.cwd();\n`, "pkg/package.json": `{"main":"./edge.ts"}` }, "./pkg/"],
    ["alias @/pkg/", { "pkg/index.tsx": `/** @server-safe */\nexport const c = 1;\n`, "pkg/edge.ts": `export const d = process.cwd();\n`, "pkg/package.json": `{"main":"./edge.ts"}` }, "@/pkg/"],
    ["package.json {} (frontera, fail-closed §373)", { "pkg/index.tsx": `/** @server-safe */\nexport const c = 1;\n`, "pkg/package.json": `{}` }, "./pkg/"],
    ["hermano pkg.ts + package.json (sub-caso)", { "pkg/index.tsx": `/** @server-safe */\nexport const c = 1;\n`, "pkg/edge.ts": `export const d = process.cwd();\n`, "pkg/package.json": `{"main":"./edge.ts"}`, "pkg.ts": `/** @server-safe */\nexport const clean = 1;\n` }, "./pkg/"],
  ])("D2 forceDir + package.json → unresolved-import (%s)", (_l, files, spec) => {
    const v = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nimport "${spec}";\nexport const x = 1;`,
        ...Object.fromEntries(Object.entries(files).map(([k, val]) => [`/repo/src/${k}`, val])),
      }),
    );
    expect(v.some((x) => x.rule === "unresolved-import")).toBe(true);
  });

  it("D2 control: ./pkg/ SIN package.json audita el dir-index limpio → PASA", () => {
    const v = runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nimport { c } from "./pkg/";\nexport const x = c;`,
        "/repo/src/pkg/index.tsx": `/** @server-safe */\nexport const c = 1;\n`,
      }),
    );
    expect(v).toEqual([]);
  });
});

// INV-VT (Fable cross-review 2): la matriz vtForms genera las formas VALUE-TRANSPARENT/COERCIDAS/
// PROYECTADAS de un hazard literal y asserta que TODAS flaggean — regresión INSTANTÁNEA del espacio VT.
// Es el mecanismo que habría cazado los defectos del re-hunt2 en el acto: si un fix futuro cierra una
// forma literal pero deja abierta una envuelta, aquí falla. Una fixture literal obtiene el espacio gratis.
describe("server-safe gate — INV-VT: matriz vtForms (espacio VT de índice/key/receiver)", () => {
  const flags = (b: string) =>
    checkSourceFile(`/** @server-safe */\n${b}`, "vtforms.fixture.tsx").length > 0;
  // Formas VT/coercidas/proyectadas de un VALOR `x` (receiver/constructor).
  const vtWrap = (x: string): string[] => [
    x,
    `(0, ${x})`,
    `(true ? ${x} : (0 as any))`,
    `(1 && ${x})`,
    `[${x}][0]`,
    `[${x}]["0"]`,
    `[${x}][0n]`, // BigInt índice (Fable review 3 #1)
    `[${x}][+0]`, // unary-signed (#6)
    `[${x}][-0]`,
    `[${x}][\`0\`]`, // template no-sub (#7, pin)
    `({0: ${x}})[0]`,
    `({0: ${x}})[0n]`,
    `({["k"]: ${x}}).k`,
    `({[\`m\`]: ${x}}).m`, // computed template def-side (#7, pin)
    `({"-1": ${x}})[-1]`, // clave negativa decidible (#8)
    `({k: ${x}}).k`,
    `(${x} as any)`,
  ];
  // Formas VT/coercidas/proyectadas de una KEY literal `k`.
  const vtWrapKey = (k: string): string[] => [
    k,
    `(0, ${k})`,
    `(true ? ${k} : "now")`,
    `(1 && ${k})`,
    `[${k}][0]`,
    `[${k}]["0"]`,
    `[${k}][\`0\`]`,
    `({0: ${k}})[0]`,
    `(${k} as string)`,
  ];

  it.each(vtWrap("WebAssembly.Module"))(
    "construcción wasm (dynamic codegen Edge) — forma FLAG: %s",
    (f) => {
      expect(flags(`export const a = new (${f})(new Uint8Array());`)).toBe(true);
    },
  );
  it.each(vtWrap("performance"))(
    "partial-member Node-only (eventLoopUtilization) — receiver FLAG: %s",
    (f) => {
      expect(flags(`export const x = (${f}).eventLoopUtilization();`)).toBe(true);
    },
  );
  it.each(vtWrap("import.meta"))(
    "import.meta.dirname (Node-only) — receiver FLAG: %s",
    (f) => {
      expect(flags(`export const d = (${f}).dirname;`)).toBe(true);
    },
  );
  it.each(vtWrapKey('"nodeTiming"'))(
    "Reflect.get(performance, key) — key Node-only FLAG: %s",
    (k) => {
      expect(flags(`export const x = Reflect.get(performance, ${k});`)).toBe(true);
    },
  );
});

// INV-VT meta-test: el gate se audita a sí mismo (mismo espíritu que el catálogo #150). Prohíbe que
// vuelva a aparecer la resolución de índice CRUDA (`isNumericLiteral(unwrapErased(...))` / `elements[Number(...)]`)
// fuera del helper canónico `resolveKeyCandidates` — el anti-patrón que reabrió el fail-open por-forma.
describe("server-safe gate — INV-VT meta-test: resolución de índice/key canónica", () => {
  const gateSrc = readFileSync("scripts/check-server-safe-markers.mjs", "utf8");
  // Escanear CÓDIGO, no comentarios (la doctrina INV-VT se documenta con el propio patrón prohibido).
  const code = gateSrc
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  it("resolveKeyCandidates es el resolver canónico (existe)", () => {
    expect(gateSrc).toMatch(/function resolveKeyCandidates\(/);
  });

  it("cero indexado crudo `arr.elements[Number(...)]` (debe ir por resolveKeyCandidates → índice canónico)", () => {
    expect(code.match(/\.elements\[Number\(/g) ?? []).toHaveLength(0);
  });

  it("cero `isNumericLiteral(unwrapErased(...))` inline (índice sin canonicalizar/VT-foldar)", () => {
    expect(code.match(/isNumericLiteral\(unwrapErased\(/g) ?? []).toHaveLength(0);
  });
});

// RE-HUNT 3 (Fable cross-review 3): capa canónica fiel (#1/#6/#8), spread posicional (#2), Reflect.get
// default-deny (#4). El flip de polaridad y la canonicalización fiel van cubiertos por la matriz vtForms.
describe("server-safe gate — RE-HUNT 3: canon fiel, spread posicional, Reflect.get default-deny", () => {
  const flags = (b: string) =>
    checkSourceFile(`/** @server-safe */\nconst o: Record<string, unknown> = {}; const b = new Uint8Array();\n${b}`, "rh3.fixture.tsx").length > 0;

  // #2 — tabla-oracle de spread posicional (Fable cross-review 3):
  it.each([
    ["({...o, m:X}).m → X (spread antes)", `export const a = new (({ ...o, m: WebAssembly.Module }).m as any)(b);`, true],
    ["({m:X, ...o}).m → bloqueado (spread después)", `export const a = new (({ m: WebAssembly.Module, ...o }).m as any)(b);`, false],
    ["({...o, m:MALO, m:X}).m → X (last-wins)", `export const a = new (({ ...o, m: Array, m: WebAssembly.Module }).m as any)(b);`, true],
    ["({...o, get m(){}}).m → bloqueado (accessor)", `export const a = new (({ ...o, get m() { return WebAssembly.Module; } }).m as any)(b);`, false],
    ["({[k]:A, m:X}).m k-var → X", `export const a = (k: string) => new (({ [k]: Array, m: WebAssembly.Module }).m as any)(b);`, true],
    ["({m:X, [k]:A}).m → bloqueado", `export const a = (k: string) => new (({ m: WebAssembly.Module, [k]: Array }).m as any)(b);`, false],
  ])("#2 spread posicional: %s", (_l, code, exp) => {
    expect(flags(code)).toBe(exp);
  });

  // #4 — Reflect.get con key variable espeja computedDefaultDenyRoot:
  it.each([
    ["Reflect.get(performance, m) → FLAG", `export const x = (m: string) => Reflect.get(performance, m);`, true],
    ["Reflect.get(console, m) → FLAG", `export const x = (m: string) => Reflect.get(console, m);`, true],
    // #4-OVERTURNED R10 (adjudicación Fable): `Reflect.get(import.meta, k)` ≡ `import.meta[k]` — indirección
    // CERO → default-deny fail-closed, PARIDAD con el hermano `Reflect.get(performance, m)`. El SILENT previo
    // era un fail-open del selector (import.meta usa SAFE_IMPORT_META_MEMBERS, no SAFE_PARTIAL_MEMBERS), NO
    // §141; el #4 original ratificó ese accidente sin control hermano. Ver ADR D1-P1 "#4-OVERTURNED R10".
    ["Reflect.get(import.meta, k) → FLAG (#4-OVERTURNED R10)", `export const x = (k: string) => Reflect.get(import.meta, k);`, true],
    ["Reflect.get(crypto, k) → PASA (wholesale-safe)", `export const x = (k: string) => Reflect.get(crypto, k);`, false],
    ['Reflect.get(performance, "now") → PASA', `export const x = Reflect.get(performance, "now");`, false],
  ])("#4 Reflect.get default-deny: %s", (_l, code, exp) => {
    expect(flags(code)).toBe(exp);
  });
});

// #5 (Fable cross-review 3): marker precedido de char invisible/format-control → el scanner JSDoc de TS no
// emite el tag → archivo sin auditar (fail-open silencioso). Fix = OR-de-dos-parses monótono + normalize
// (no borrar). Canarios por clase Unicode + monotonía + general (si el pipeline de markers se rompe, gritan).
describe("server-safe gate — #5: marker robusto a chars invisibles (OR + normalize, monótono)", () => {
  const BODY = "\nexport const C = () => window.location.href;";
  it.each([
    ["Cf ZWNJ U+200C", "/**‌@server-safe */"],
    ["Cf word-joiner U+2060", "/**⁠@server-safe */"],
    ["Cf BOM U+FEFF", "/**﻿@server-safe */"],
    ["Zl line-sep U+2028", "/** @server-safe */"],
    ["Zp para-sep U+2029", "/** @server-safe */"],
  ])("CIERRA fail-open: marker tras %s → detecta+audita", (_l, head) => {
    // detecta el marker...
    expect(isContentServerSafeMarked(head + BODY, "canary.tsx")).toBe(true);
    // ...Y CANARIO: el archivo se audita y el `window` interno flaggea.
    expect(checkSourceFile(head + BODY, "canary.tsx").length).toBeGreaterThan(0);
  });

  it("CANARIO de MONOTONÍA: `//nota U+2028 /** @server-safe */` sigue detectándose (el OR no pierde el original)", () => {
    const code = "// nota /** @server-safe */" + BODY;
    expect(isContentServerSafeMarked(code, "mono.tsx")).toBe(true);
  });

  it("CANARIO GENERAL: archivo marcado con window DEBE detectarse+flaggear (subsistema markers vivo)", () => {
    const code = "/** @server-safe */" + BODY;
    expect(isContentServerSafeMarked(code, "canary-general.tsx")).toBe(true);
    expect(checkSourceFile(code, "canary-general.tsx").length).toBeGreaterThan(0);
  });

  it("sin regresión: prosa pura NO marca; sin marker NO marca", () => {
    expect(isContentServerSafeMarked("/** todavía no es @server-safe */\nexport const X = () => 1;", "p.tsx")).toBe(false);
    expect(isContentServerSafeMarked("/** @internal */\nexport const x = 1;", "n.tsx")).toBe(false);
  });
});

// #3 (Fable cross-review 3): import.meta UNIFICADO en el path partial-root (root C) — eliminado el bloque
// dedicado + la supresión importMetaDirect. El safe-probe/optional-chain de c.1b aplica también al DIRECTO,
// cerrando el FP (`typeof import.meta.dirname` flaggeaba de más). Tabla-de-decisión preservada verbatim.
describe("server-safe gate — #3: import.meta unificado (safe-probe directo, sin FP)", () => {
  const flags = (b: string) => checkSourceFile(`/** @server-safe */\n${b}`, "im3.fixture.tsx").length > 0;
  it.each([
    // FP CERRADO — probes sin ejecución (typeof / optional-chain) → PASA:
    ["typeof import.meta.dirname", `export const x = typeof import.meta.dirname;`, false],
    ["import.meta.resolve?.('./a')", `export const x = import.meta.resolve?.("./a");`, false],
    ["import.meta.dirname?.length", `export const x = import.meta.dirname?.length;`, false],
    // Tabla-de-decisión preservada:
    ["import.meta.dirname directo → FLAG", `export const d = import.meta.dirname;`, true],
    ["const m=import.meta; m.dirname → FLAG", `const m = import.meta;\nexport const d = () => m.dirname;`, true],
    ["const {dirname}=import.meta → FLAG", `const { dirname } = import.meta;\nexport const d = dirname;`, true],
    ["import.meta.url → PASA", `export const u = import.meta.url;`, false],
    ["import.meta.hot → PASA", `export const h = import.meta.hot;`, false],
    ["import.meta.hot.accept() out-of-mandate → PASA (sobrevive)", `import.meta.hot.accept();\nexport const x = 1;`, false],
    ["import.meta.glob eager → FLAG", `export const g = import.meta.glob("./*", { eager: true });`, true],
  ])("%s", (_l, code, exp) => {
    expect(flags(code)).toBe(exp);
  });
});

// TEST DIFERENCIAL GENERATIVO (Fable cross-review 3, §5): el oráculo deja de ser MI enumeración y pasa a
// ser el RUNTIME de Node. Para cada expresión-key `E`, la verdad-terreno es `Object.keys({[E]:1})[0]` (el
// ToPropertyKey real); el gate debe cumplir MATCH-OR-FLAG — sobre `({[K]: hazard})[E]` (K = donde E cae en
// runtime) o resuelve E→K (flag preciso) o E queda irresoluble (flip de polaridad → ∃-peligro → flag).
// Cualquier tercer resultado (no flaggea = FN) es un bug de SOUNDNESS por definición. Esto reemplaza la
// enumeración de vtForms (que era mi lista con otro disfraz) por el estándar operativo empírico.
describe("server-safe gate — INV-VT diferencial generativo (oráculo = runtime, match-or-flag)", () => {
  const flags = (b: string) => checkSourceFile(`/** @server-safe */\n${b}`, "diff.fixture.tsx").length > 0;
  // Corpus `[expresión-fuente, VALOR JS real]`. El VALOR es la expresión evaluada por NODE (el compilador
  // del test), NO por eval — el oráculo sigue siendo el runtime: `Object.keys({[valor]:1})[0]` da el
  // ToPropertyKey exacto. Cubre cada notación de literal numérico (dec/hex/oct/bin/separador/exponente),
  // >2^53 (Number redondea) + su BigInt (exacto, diverge fielmente), unary ±, string, template, VT, proyección.
  const cases: ReadonlyArray<readonly [string, string | number | bigint]> = [
    // numérico / bigint → el VALOR es el literal REAL que Node evalúa (oráculo de la coacción numérica):
    ["0", 0], ["1e2", 1e2], ["0x10", 0x10], ["0o144", 0o144], ["0b1100100", 0b1100100],
    ["1_000", 1_000], ["0.5", 0.5], ["-1", -1], ["-0", -0], ["+0", 0], ["+1e2", 100],
    ["9007199254740993", 9007199254740993], ["0n", 0n], ["100n", 100n], ["0x64n", 0x64n],
    ["-1n", -1n], ["9007199254740993n", 9007199254740993n],
    // string / template / VT / proyección → coacción trivial a la clave del corpus:
    [`"m"`, "m"], [`"1e+21"`, "1e+21"], ["`m`", "m"], ["`0`", "0"],
    [`(0, "m")`, "m"], [`(true ? "m" : "x")`, "m"], [`(1 && "m")`, "m"],
    [`["m"][0]`, "m"], [`({ 0: "m" })[0]`, "m"],
  ];
  it.each(cases)(
    "soundness (match-or-flag): `({[K]: WebAssembly.Module})[%s]` → FLAG",
    (sourceExpr, value) => {
      // ToPropertyKey real (Node): para no-símbolos, ToPropertyKey(v) === ToString(v) === String(v).
      const k = String(value);
      // El container tiene el hazard en la clave EXACTA que E selecciona en runtime → el acceso lo alcanza.
      // El gate debe resolver E→K (flag preciso) o dejar E irresoluble (flip → ∃-peligro → flag). Nunca FN.
      const code = `export const a = new (({ [${JSON.stringify(k)}]: WebAssembly.Module })[${sourceExpr}])(new Uint8Array());`;
      expect(flags(code)).toBe(true);
    },
  );
});

// RAÍZ E (re-hunt rc.1 + Fable cross-review): VITE_ASSET_RE aplicaba UN `/i` a toda la unión, pero Vite
// matchea css-langs (CSS_LANGS_RE) + json + wasm CASE-SENSITIVE y solo KNOWN_ASSET_TYPES (media/font)
// case-insensitive (DEFAULT_ASSETS_RE = `new RegExp(…,"i")`). `.CSS`/`.JSON`/`.WASM`/mixtas NO son asset
// para Vite → caen al pipeline JS y se EJECUTAN → un body JS leyendo `process` corría sin auditar.
describe("server-safe gate — RAÍZ E: asset ext case-sensitivity (css/json/wasm sensitive, media insensitive)", () => {
  const importsFrom = (spec: string, fname: string, body: string) =>
    runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nimport { y } from "${spec}";\nexport const z = y;`,
        [`/repo/src/${fname}`]: body,
      }),
    );
  const PROC = "export const y = process.platform;\n";

  it.each([
    ["./evil.CSS", "evil.CSS"],
    ["./evil.JSON", "evil.JSON"],
    ["./evil.WASM", "evil.WASM"],
    ["./evil.Css", "evil.Css"],
    ["./evil.ScSs", "evil.ScSs"],
    ["./x.json5", "x.json5"], // json5 NO está en el set → fail-closed (status quo)
  ])("CIERRA ext ejecutable-por-Vite (%s → unresolved-import)", (spec, fname) => {
    const v = importsFrom(spec, fname, PROC);
    expect(v.some((x) => x.rule === "unresolved-import")).toBe(true);
  });

  it.each([
    ["./data.css", "data.css", "export const y = 1;\n"],
    ["./mod.wasm", "mod.wasm", "export const y = 1;\n"],
    ["./img.PNG", "img.PNG", "x"], // media case-INSENSITIVE → sin FP
    ["./font.Woff2", "font.Woff2", "x"],
    ["./doc.PDF", "doc.PDF", "x"],
  ])("NO FP: asset legítimo sigue asset (%s → PASA)", (spec, fname, body) => {
    expect(importsFrom(spec, fname, body)).toEqual([]);
  });
});

// RAÍZ D (re-hunt rc.1 + Fable cross-review): una barra final (`./pkg/`, `@/pkg/`) fuerza en Vite
// resolución DIRECTORIO-only (`pkg/index.tsx`), pero `crossOsResolve`→`path.posix.resolve` borraba la
// barra → file-beats-dir elegía el sibling `pkg.ts` (limpio) y lo auditaba mientras Vite ejecuta el dir
// (sucio) = fail-open. Fix: `forceDir` desde el specifier (tras cleanUrl) → cascada dir-index-only en el
// orden de resolve.extensions (index.mjs/.js no-auditable → fail-closed; .ts/.tsx → auditar).
describe("server-safe gate — RAÍZ D: trailing-slash fuerza resolución de directorio", () => {
  const CLEAN = `/** @server-safe */\nexport const w = 1;\n`;
  const DIRTY = `/** @server-safe */\nexport const w = screen.width;\n`;
  const imp = (spec: string, files: Record<string, string>) =>
    runWithVfs(
      "/repo/src/c.tsx",
      vfs({
        "/repo/src/c.tsx": `/** @server-safe */\nimport { w } from "${spec}";\nexport const x = w;`,
        ...Object.fromEntries(
          Object.entries(files).map(([k, v]) => [`/repo/src/${k}`, v]),
        ),
      }),
    );
  const siblingCleanDirDirty = { "pkg.ts": CLEAN, "pkg/index.tsx": DIRTY };

  it.each([
    ["./pkg/", "./pkg/"],
    ["@/pkg/", "@/pkg/"],
    ["./pkg// (doble barra)", "./pkg//"],
    ["./pkg/./", "./pkg/./"],
  ])("CIERRA: barra final audita el dir-index sucio (%s)", (_l, spec) => {
    expect(imp(spec, siblingCleanDirDirty).length).toBeGreaterThan(0);
  });

  it("control: sin barra audita el sibling file (limpio) → PASA", () => {
    expect(imp("./pkg", siblingCleanDirDirty)).toEqual([]);
  });

  it("`./pkg/.` termina en `.` → FILE, no fuerza dir → audita sibling limpio → PASA", () => {
    expect(imp("./pkg/.", siblingCleanDirDirty)).toEqual([]);
  });

  it("audita el módulo CORRECTO: sibling sucio + dir limpio, barra final → PASA (audita dir)", () => {
    expect(imp("./pkg/", { "pkg.ts": DIRTY, "pkg/index.tsx": CLEAN })).toEqual([]);
  });

  it("orden resolve.extensions: index.mjs (no auditable) gana a index.ts → unresolved-import (fail-closed)", () => {
    const v = imp("./pkg/", { "pkg/index.mjs": `export const w = 1;\n`, "pkg/index.ts": CLEAN });
    expect(v.some((x) => x.rule === "unresolved-import")).toBe(true);
  });

  it("dir sin index → unresolved-import", () => {
    const v = imp("./pkg/", { "pkg.ts": CLEAN });
    expect(v.some((x) => x.rule === "unresolved-import")).toBe(true);
  });
});

// RAÍZ H (re-hunt rc.1 + Fable cross-review, era residual 4.5 → elevado): los colectores de nombres
// añadían TODA FunctionDeclaration non-ambient a localBindings/moduleDeclaredNames, incluida una FIRMA
// SIN CUERPO (`function window();`), que sombreaba el global homónimo y eximía su read. Reachable solo
// con `@ts-ignore` (suprime TS2391) + build esbuild-only → divergencia browser-OK/Edge-throws (Fable lo
// midió). Micro-close: requerir `stmt.body` (una firma bodyless no emite; la implementación del overload
// sí la añade → 0 FP, fail-closed).
describe("server-safe gate — RAÍZ H: FunctionDeclaration sin cuerpo no sombrea el global", () => {
  const flags = (b: string) =>
    checkSourceFile(b, "rootH.fixture.tsx").length > 0;

  it.each([
    ["function window(): void; + window.location", `/** @server-safe */\nfunction window(): void;\nexport const x = window.location.href;`],
    ["function process(): void; + process.cwd", `/** @server-safe */\nfunction process(): void;\nexport const x = process.cwd();`],
  ])("firma bodyless NO sombrea → FLAG: %s", (_l, code) => {
    expect(flags(code)).toBe(true);
  });

  it.each([
    ["con cuerpo (sombra real)", `/** @server-safe */\nfunction window() { return { location: { href: "" } }; }\nexport const x = window().location.href;`],
    ["overload sig bodyless + impl con body (sombra vía impl)", `/** @server-safe */\nfunction window(x: number): unknown;\nfunction window(x: unknown) { return x; }\nexport const y = window(1);`],
    ["función normal con body sigue bindeando", `/** @server-safe */\nfunction foo() { return 1; }\nexport const x = foo();`],
  ])("no FP (binding legítimo preservado): %s", (_l, code) => {
    expect(flags(code)).toBe(false);
  });
});

describe("server-safe gate — DEEPEST re-hunt #173: FPs fase calidad (lote 1)", () => {
  const flagged = (code: string) =>
    checkSourceFile(code, "fp.fixture.tsx").length > 0;

  // — Type-space class members (FP1/2/3/16) —
  it("FP1: computed-key de `declare class` (ambient) NO flaggea", () => {
    expect(flagged(`/** @server-safe */\ndeclare const screen: { x: symbol };\ndeclare class K { [screen.x](): number; }\nexport function C() { return null; }`)).toBe(false);
  });
  it("FP2: computed-key de método `abstract` NO flaggea", () => {
    expect(flagged(`/** @server-safe */\ndeclare const screen: unique symbol;\nexport abstract class K { abstract [screen](): number; }`)).toBe(false);
  });
  it("FP3: overload-signatures NO flaggean; SOLO la implementación (con cuerpo) sí", () => {
    const v = checkSourceFile(`/** @server-safe */\ndeclare const screen: unique symbol;\nexport class K {\n  [screen](): number;\n  [screen](x: number): number;\n  [screen](x?: number): number { return x ?? 1; }\n}`, "ovl.fixture.tsx");
    expect(v.map((x) => x.line)).toEqual([6]); // solo la impl
  });
  it("FP16: computed-key en get-accessor SIGNATURE de interface NO flaggea", () => {
    expect(flagged(`/** @server-safe */\ndeclare const sym: unique symbol;\nexport interface I { get [sym](): number; }\nexport const z = 1;`)).toBe(false);
  });
  it("SOUNDNESS: computed-key de método/accessor de clase CON cuerpo SIGUE flaggeando", () => {
    expect(flagged(`/** @server-safe */\nexport class K { [window.location.href]() { return 1; } }`)).toBe(true);
    expect(flagged(`/** @server-safe */\nexport class K { get [window.location.href]() { return 1; } }`)).toBe(true);
  });

  // — import-attributes (FP17) —
  it("FP17: nombre de import-attribute (`with { type: \"json\" }`) NO flaggea", () => {
    expect(flagged(`/** @server-safe */\nimport tokens from "./tokens.json" with { type: "json" };\nexport function S() { return <div data-x={(tokens as { c: string }).c} />; }`)).toBe(false);
  });

  // — typeof-guard: string ENSAMBLADO no se reconoce (frontera §141, misma foldConstString) —
  // El string del guard se resuelve con la MISMA regla token-unidad que el eval-sink: literal
  // (`"undefined"`) y no-sub template (`` `undefined` ``) SÍ; sustitución (`` `${"undefined"}` ``)
  // es ENSAMBLAJE → no se resuelve → el guard no se reconoce → over-flag FAIL-CLOSED. Ningún
  // autor honesto escribe `typeof x !== \`${"undefined"}\`` (escribe el literal) → el over-flag
  // es sobre código contrivado, dirección segura. El fold de sustitución se revirtió con el
  // del eval-sink por coherencia (deepest final hunt #173).
  it("guard con LITERAL se reconoce (no flaggea)", () => {
    expect(flagged('/** @server-safe */\nexport function C() { if (typeof window !== "undefined") { return window.location.href; } return null; }')).toBe(false);
    expect(flagged('/** @server-safe */\nexport function C() { if (typeof window !== `undefined`) { return window.location.href; } return null; }')).toBe(false);
  });
  it("guard con string ENSAMBLADO (sustitución) → over-flag fail-closed (no se reconoce)", () => {
    expect(flagged('/** @server-safe */\nexport function C() { if (typeof window !== `${"undefined"}`) { return window.location.href; } return null; }')).toBe(true);
  });
  it("SOUNDNESS: template DINÁMICO en el guard NO se reconoce (sigue flaggeando)", () => {
    expect(flagged('/** @server-safe */\nexport function C(x: string) { if (typeof window !== `${x}`) { return window.location.href; } return null; }')).toBe(true);
  });

  // — deferred handler value-transparent (FP7) —
  it("FP7: handler en ternario/&& sobre elemento intrínseco NO flaggea", () => {
    expect(flagged(`/** @server-safe */\nexport function C(cond: boolean) { return <button onClick={cond ? () => { void window.location.href; } : undefined}>x</button>; }`)).toBe(false);
    expect(flagged(`/** @server-safe */\nexport function C(cond: boolean) { return <button onClick={cond && (() => { void window.location.href; })}>x</button>; }`)).toBe(false);
  });
  it("SOUNDNESS: handler en ternario sobre COMPONENTE custom SIGUE flaggeando", () => {
    expect(flagged(`/** @server-safe */\nfunction Foo(p: { onClick?: () => void }) { return null; }\nexport function C(cond: boolean) { return <Foo onClick={cond ? () => { void window.location.href; } : undefined} />; }`)).toBe(true);
  });

  // — import-equals alias de hook react (FP14/15) —
  it("FP14/15: import-equals alias de hook deferido (ue=React.useEffect, R=React) NO flaggea", () => {
    const base = `/** @server-safe */\nimport * as React from "react";\n`;
    expect(flagged(base + `import ue = React.useEffect;\nexport function C() { ue(() => { void window.location.href; }); return null; }`)).toBe(false);
    expect(flagged(base + `import R = React;\nexport function C() { R.useEffect(() => { void window.location.href; }); return null; }`)).toBe(false);
    // cadena
    expect(flagged(base + `import R = React;\nimport ue = R.useEffect;\nexport function C() { ue(() => { void window.location.href; }); return null; }`)).toBe(false);
  });
  it("SOUNDNESS: alias-spoof import-equals de hook render-phase (ue=React.useState) SIGUE flaggeando", () => {
    expect(flagged(`/** @server-safe */\nimport * as React from "react";\nimport ue = React.useState;\nexport function C() { return ue(() => window.innerWidth); }`)).toBe(true);
  });

  // — switch (typeof X) discriminant narrowing (FP11/12) —
  it("FP11: `switch (typeof X) { case \"object\": X.foo }` narrowea (case positivo)", () => {
    expect(flagged(`/** @server-safe */\nexport function g() { switch (typeof window) { case "object": return window.innerWidth; default: return 0; } }`)).toBe(false);
  });
  it("FP12: `default` tras `case \"undefined\": return` narrowea presencia", () => {
    expect(flagged(`/** @server-safe */\nexport function g() { switch (typeof document) { case "undefined": return null; default: return document.title; } }`)).toBe(false);
  });
  it("SOUNDNESS switch: fall-through desde `case \"undefined\"` NO narrowea", () => {
    expect(flagged(`/** @server-safe */\nexport function g() { switch (typeof window) { case "undefined": case "object": return window.innerWidth; default: return 0; } }`)).toBe(true);
  });
  it("SOUNDNESS switch: `default` SIN `case \"undefined\"` NO narrowea", () => {
    expect(flagged(`/** @server-safe */\nexport function g() { switch (typeof window) { case "object": return 0; default: return window.innerWidth; } }`)).toBe(true);
  });
  it("SOUNDNESS switch: read DENTRO de `case \"undefined\"` SIGUE flaggeando", () => {
    expect(flagged(`/** @server-safe */\nexport function g() { switch (typeof window) { case "undefined": return window.innerWidth; default: return 0; } }`)).toBe(true);
  });

  // — boolean-alias typeof-guard (FP13) —
  it("FP13: `const has = typeof X !== \"undefined\"; has ? X : 0` narrowea (alias)", () => {
    expect(flagged(`/** @server-safe */\nexport function g() { const has = typeof window !== "undefined"; return has ? window.innerWidth : 0; }`)).toBe(false);
    expect(flagged(`/** @server-safe */\nexport function g() { const has = typeof window !== "undefined"; return has && window.innerWidth; }`)).toBe(false);
    // alias NEGATIVO + `!`
    expect(flagged(`/** @server-safe */\nexport function g() { const noWin = typeof window === "undefined"; if (!noWin) { return window.innerWidth; } return 0; }`)).toBe(false);
  });
  it("SOUNDNESS alias: `let` reasignable NO narrowea", () => {
    expect(flagged(`/** @server-safe */\nexport function g() { let has = typeof window !== "undefined"; has = true; return has ? window.innerWidth : 0; }`)).toBe(true);
  });
  it("SOUNDNESS alias: const NO-guard NO narrowea", () => {
    expect(flagged(`/** @server-safe */\nexport function g() { const has = Math.random() > 0.5; return has ? window.innerWidth : 0; }`)).toBe(true);
  });
  it("SOUNDNESS alias: rama whenFalse SIGUE flaggeando", () => {
    expect(flagged(`/** @server-safe */\nexport function g() { const has = typeof window !== "undefined"; return has ? 0 : window.innerWidth; }`)).toBe(true);
  });
  it("SOUNDNESS alias: shadow interno NO-guard invalida el alias (era bypass)", () => {
    // `const has = false` en bloque interno SOMBREA el alias outer → no debe resolver.
    expect(flagged(`/** @server-safe */\nexport function g() { const has = typeof window !== "undefined"; { const has: boolean = false; if (has) return window.innerWidth; } return 0; }`)).toBe(true);
  });
  it("SOUNDNESS alias: PARÁMETRO homónimo sombrea el alias", () => {
    expect(flagged(`/** @server-safe */\nconst has = typeof window !== "undefined";\nexport function f(has: boolean) { return has ? window.innerWidth : 0; }`)).toBe(true);
  });

  // — eval-sink key con ternario de condición LITERAL (FP9) —
  it("FP9: `x.constructor[true ? \"name\" : \"constructor\"]` no flaggea (rama muerta)", () => {
    expect(flagged(`/** @server-safe */\nexport function g(x: object) { return x.constructor[true ? "name" : "constructor"]; }`)).toBe(false);
  });
  it("FP (codex P2 3ª ronda): alias en EARLY-RETURN narrowea", () => {
    // `const no = typeof X === "undefined"; if (no) return; X` — el alias debe resolver
    // también en el narrowing por early-return (no solo if/ternario/&&/||).
    expect(flagged(`/** @server-safe */\nexport function g() { const noWindow = typeof window === "undefined"; if (noWindow) return null; return window.innerWidth; }`)).toBe(false);
    expect(flagged(`/** @server-safe */\nexport function g() { const has = typeof window !== "undefined"; if (!has) return null; return window.innerWidth; }`)).toBe(false);
  });
  it("SOUNDNESS early-return alias: param/shadow homónimo SIGUE flaggeando", () => {
    expect(flagged(`/** @server-safe */\nconst isClient = typeof window !== "undefined";\nexport function g(isClient: boolean) { if (!isClient) return null; return window.innerWidth; }`)).toBe(true);
    // sin early-return real (if sin return) NO narrowea
    expect(flagged(`/** @server-safe */\nexport function g() { const no = typeof window === "undefined"; if (no) {} return window.innerWidth; }`)).toBe(true);
  });
  it("SOUNDNESS alias TDZ (codex P2 3ª ronda): shadow LEXICAL antes de la declaración invalida el alias", () => {
    // Un `const`/`let` block-scoped homónimo sombrea el alias outer para TODO el bloque
    // (TDZ) — un closure/uso ANTERIOR a la declaración NO debe resolver al guard outer.
    expect(flagged(`/** @server-safe */\nexport function g(): number { const isC = typeof window !== "undefined"; { const fn = () => isC ? window.innerWidth : 0; const isC = true; return fn(); } }`)).toBe(true);
    expect(flagged(`/** @server-safe */\nexport function g(): number { const has = typeof window !== "undefined"; { if (has) return window.innerWidth; const has = false as boolean; void has; } return 0; }`)).toBe(true);
    // CONTROL: sin shadow, el alias en bloque interno SÍ narrowea (no romper FP13)
    expect(flagged(`/** @server-safe */\nexport function g(cond: boolean) { const has = typeof window !== "undefined"; if (cond) { return has ? window.innerWidth : 0; } return 0; }`)).toBe(false);
  });
  it("SOUNDNESS alias TDZ en SWITCH CaseBlock (codex P2): shadow léxico en un case invalida el alias", () => {
    // El CaseBlock es UN scope léxico — un `const` en un case sombrea el alias outer
    // para todo el switch; un closure ANTERIOR no debe resolver al guard outer.
    expect(flagged(`/** @server-safe */\nexport function g(x: number): number { const has = typeof window !== "undefined"; switch (x) { case 0: const fn = () => has ? window.innerWidth : 0; const has = true; return fn(); default: return 0; } }`)).toBe(true);
    // CONTROL: el narrowing de `switch (typeof X)` NO se rompe
    expect(flagged(`/** @server-safe */\nexport function g() { switch (typeof window) { case "object": return window.innerWidth; default: return 0; } }`)).toBe(false);
  });
  it("SOUNDNESS alias: shadow por using/let/enum/function (block-scoped) invalida el alias (codex P2)", () => {
    const pre = `/** @server-safe */\nexport function g(): number { const has = typeof window !== "undefined"; { const fn = () => has ? window.innerWidth : 0; `;
    const post = ` return fn(); } }`;
    expect(flagged(pre + `using has = (null as unknown as Disposable);` + post)).toBe(true); // using
    expect(flagged(pre + `let has = true;` + post)).toBe(true); // let
    expect(flagged(`/** @server-safe */\nexport function g(): number { const has = typeof window !== "undefined"; { const fn = () => has ? window.innerWidth : 0; enum has { a } void has; return fn(); } }`)).toBe(true); // enum
    expect(flagged(`/** @server-safe */\nexport function g(): number { const has = typeof window !== "undefined"; { const fn = () => has ? window.innerWidth : 0; function has() { return 1; } void has; return fn(); } }`)).toBe(true); // function
  });
  it("SOUNDNESS alias: una decl TYPE-ONLY (interface) NO over-purga el alias de valor", () => {
    expect(flagged(`/** @server-safe */\nexport function g(): number { const has = typeof window !== "undefined"; { interface has { x: number } return has ? window.innerWidth : 0; } }`)).toBe(false);
  });
  it("FP (codex P2): import-equals de VALOR en cuerpo de namespace es un binding local (no global)", () => {
    // `import window = N.real` aliasa un valor → `window` es local, no el global.
    expect(flagged(`/** @server-safe */\nnamespace N { export const real = 1; import window = N.real; export const z = window; }\nexport const out = N.z;`)).toBe(false);
    // SOUNDNESS: un read bare del global real (sin alias) SIGUE flaggeando
    expect(flagged(`/** @server-safe */\nnamespace N { export const z = window.location.href; }\nexport const out = N.z;`)).toBe(true);
  });

  it("SOUNDNESS FP9: condición false / variable / rama-constructor-viva SIGUEN flaggeando", () => {
    expect(flagged(`/** @server-safe */\nexport function g(x: object) { return x.constructor[false ? "name" : "constructor"]; }`)).toBe(true);
    expect(flagged(`/** @server-safe */\nexport function g(x: object, c: boolean) { return x.constructor[c ? "name" : "constructor"]; }`)).toBe(true);
    expect(flagged(`/** @server-safe */\nexport function g(x: object) { return x.constructor[true ? "constructor" : "name"]; }`)).toBe(true);
    // base value-transparente: `false ? null : ctor` → el ctor sigue vivo
    expect(flagged(`/** @server-safe */\nexport function h() { return (false ? null : (() => {}).constructor)("return 1")(); }`)).toBe(true);
  });
});

describe("server-safe gate — Auditoría B (re-hunt 4): ∃-quantificación de raíces + reflexión + spread + marker Cc", () => {
  const flagged = (code: string) =>
    checkSourceFile(code, "auditb.fixture.tsx").length > 0;
  const W = "/** @server-safe */\n";

  // ── FIX-1/#1: exprPartialRoots ∃-quantifica un receptor value-transparent multi-rama ──
  describe("FIX-1: receptor multi-rama (∃-quantificación de raíces, no first-match)", () => {
    it.each([
      ["ternario new Module", W + "export function p(b:boolean){ return new (b?crypto:WebAssembly).Module(new Uint8Array()); }"],
      ["ternario reverso", W + "export function p(b:boolean){ return new (b?WebAssembly:crypto).Module(new Uint8Array()); }"],
      ["ternario compile", W + "export function p(b:boolean){ return (b?crypto:WebAssembly).compile(new Uint8Array()); }"],
      ["ternario elu()", W + "export function p(b:boolean){ return (b?crypto:performance).eventLoopUtilization(); }"],
      ["ternario console.table", W + "export function p(b:boolean){ return (b?crypto:console).table([1]); }"],
      ["X2 no-crypto (WA:performance)", W + "export function p(b:boolean){ return (b?WebAssembly:performance).eventLoopUtilization(); }"],
      ["|| dead-branch", W + "export function f(){ return new (crypto||WebAssembly).Module(new Uint8Array()); }"],
      ["?? dead-branch", W + "export function f(){ return (WebAssembly??performance).eventLoopUtilization(); }"],
      ["container-proj [crypto,WA][k]", W + "export function f(k:number){ return [crypto,WebAssembly][k].compile(new Uint8Array()); }"],
    ])("FLAG: %s", (_n, src) => {
      expect(flagged(src)).toBe(true);
    });

    it.each([
      ["coma = último operando (crypto)", W + "export const x = (performance, crypto).eventLoopUtilization;"],
      ["&& = derecha (crypto)", W + "export const x = (performance && crypto).eventLoopUtilization;"],
      ["ley-polaridad: rama irresoluble (objeto local) → IGNORAR", W + "export function f(b:boolean){ const o={foo(){ return 1; }}; return (b?crypto:o).foo(); }"],
      ["wholesale crypto.subtle", W + "export const x = crypto.subtle;"],
    ])("SILENT: %s", (_n, src) => {
      expect(flagged(src)).toBe(false);
    });
  });

  // ── FIX-2: alias multi-rama + FIX-1/#2: import.meta enmascarado por hoja previa ──
  describe("FIX-2 alias multi-rama + #2 import.meta enmascarado", () => {
    it.each([
      ["alias const R=(b?crypto:performance); R.elu()", W + "export function f(b:boolean){ const R=(b?crypto:performance); return R.eventLoopUtilization(); }"],
      ["#2 (c?crypto:import.meta).dirname", W + "export function f(c:boolean){ return (c?crypto:import.meta).dirname; }"],
      ["#2 [crypto,import.meta][k].dirname", W + "export function f(k:number){ return [crypto,import.meta][k].dirname; }"],
      ["Reflect.get(b?crypto:performance,k) multi-root", W + "export function f(b:boolean,k:string){ return Reflect.get(b?crypto:performance,k); }"],
      ["destructure {compile}=(b?crypto:WebAssembly)", W + "export function f(b:boolean){ const {compile}=(b?crypto:WebAssembly); return compile; }"],
    ])("FLAG: %s", (_n, src) => {
      expect(flagged(src)).toBe(true);
    });

    it("import.meta.url (safe member) vía multi-rama → SILENT (polaridad allowlist)", () => {
      expect(flagged(W + "export function f(c:boolean){ return (c?crypto:import.meta).url; }")).toBe(false);
    });
  });

  // ── INV-SYM: simetría de orden — el mecanismo de cierre DURADERO (Auditoría B §4), sobre los 6
  // consumidores value-survival (Fable watch-list #3, no solo member-read). veredicto(op(D,N)) ===
  // veredicto(op(N,D)): un residual §141/out-of-mandate pasa en AMBOS órdenes; un gap first-match no.
  // Habría cazado #1/#2 mecánicamente y blinda contra regresiones tipo 71be882 (hoja enmascarada por orden).
  describe("INV-SYM: simetría de orden sobre los 6 consumidores", () => {
    // form produce un BODY completo; D = raíz divergente (aporta el miembro), N = raíz neutra.
    it.each<[string, (a: string, b: string) => string, string]>([
      ["member-read elu()", (a, b) => `return (c?${a}:${b}).eventLoopUtilization();`, "performance"],
      ["member-read import.meta.dirname", (a, b) => `return (c?${a}:${b}).dirname;`, "import.meta"],
      ["|| dead-branch elu()", (a, b) => `return (${a}||${b}).eventLoopUtilization();`, "performance"],
      ["construcción new .Module", (a, b) => `return new (c?${a}:${b}).Module(new Uint8Array());`, "WebAssembly"],
      ["Reflect.construct .Module", (a, b) => `return Reflect.construct((c?${a}:${b}).Module, [new Uint8Array()]);`, "WebAssembly"],
      ["Reflect.get member", (a, b) => `return Reflect.get(c?${a}:${b}, "eventLoopUtilization");`, "performance"],
      ["destructure {compile}", (a, b) => `const {compile}=(c?${a}:${b}); return compile;`, "WebAssembly"],
      ["eval-sink unbound-detach", (a, b) => `return ((c?${a}:${b}).getRandomValues)(new Uint8Array(8));`, "crypto"],
      ["array-proj variable-key (existencial)", (a, b) => `return [${a},${b}][k].compile(new Uint8Array());`, "WebAssembly"],
    ])("%s: veredicto(D,N)===veredicto(N,D) y ambos FLAG", (_n, form, D) => {
      // N = raíz neutra (no aporta el miembro divergente). Para el eval-sink D=crypto → N=performance.
      const N = D === "crypto" ? "performance" : "crypto";
      const wrap = (body: string) =>
        `${W}export function f(c:boolean,k:number){ ${body} }`;
      const vDN = flagged(wrap(form(D, N)));
      const vND = flagged(wrap(form(N, D)));
      expect(vDN).toBe(vND); // simetría
      expect(vDN).toBe(true); // y ambos FLAG (D en el set, se ∃-quantifica)
    });
  });

  // ── Watch-list Fable #4 (alias transitivo) + #6 (proyección literal-key precisa) ──
  describe("Watch-list: alias transitivo (unión del set) + proyección literal-key (precisa/asimétrica)", () => {
    it.each([
      ["#4 alias-of-alias: A=(b?crypto:WA); B=A; new B.Module", W + "export function f(b:boolean){ const A=(b?crypto:WebAssembly); const B=A; return new B.Module(new Uint8Array()); }"],
      ["#4 cadena same-stmt: A=WA, B=A; new B.Module", W + "export function f(){ const A=WebAssembly, B=A; return new B.Module(new Uint8Array()); }"],
      ["#6 [crypto,WA][1].Module (elem 1 = WA)", W + "export function f(){ return new [crypto,WebAssembly][1].Module(new Uint8Array()); }"],
      ["#6b [crypto,WA][k].Module variable (existencial)", W + "export function f(k:number){ return new [crypto,WebAssembly][k].Module(new Uint8Array()); }"],
      ["#6b [WA,crypto][k].Module variable (existencial)", W + "export function f(k:number){ return new [WebAssembly,crypto][k].Module(new Uint8Array()); }"],
    ])("FLAG: %s", (_n, src) => {
      expect(flagged(src)).toBe(true);
    });

    it.each([
      ["#6 [WA,crypto][1].Module (elem 1 = crypto, precisa)", W + "export function f(){ return new [WebAssembly,crypto][1].Module(new Uint8Array()); }"],
      ["#6 [crypto,WA][0].Module (elem 0 = crypto, precisa)", W + "export function f(){ return new [crypto,WebAssembly][0].Module(new Uint8Array()); }"],
      ["#1 alias a solo-hojas-irresolubles → sin flag espurio (Set vacío → null)", W + "export function f(b:boolean){ const localA={}, localB={}; const R=(b?localA:localB); return new (R as { Module: new () => unknown }).Module(); }"],
    ])("SILENT: %s", (_n, src) => {
      expect(flagged(src)).toBe(false);
    });
  });

  // ── FIX-3: idiomas reflexivos de lectura-de-valor (ACOTA #3, no cierra) ──
  describe("FIX-3: reflexión (gOPD/gOPDs/assign/create/spread) ≡ R.k", () => {
    it.each([
      ["gOPD(import.meta,'dirname').value", W + "export const x = Object.getOwnPropertyDescriptor(import.meta,'dirname').value;"],
      ["Reflect.gOPD(...).value", W + "export const x = Reflect.getOwnPropertyDescriptor(import.meta,'dirname').value;"],
      ["gOPDs(import.meta).dirname.value", W + "export const x = Object.getOwnPropertyDescriptors(import.meta).dirname.value;"],
      ["Object.assign({},import.meta).dirname", W + "export const x = Object.assign({}, import.meta).dirname;"],
      ["({...import.meta}).dirname", W + "export const x = ({...import.meta}).dirname;"],
      ["Object.create(import.meta).dirname", W + "export const x = Object.create(import.meta).dirname;"],
      ["multi-branch gOPD(b?crypto:import.meta)", W + "export function f(b:boolean){ return Object.getOwnPropertyDescriptor(b?crypto:import.meta,'dirname').value; }"],
      ["Object.assign({},WebAssembly).compile (fail-closed)", W + "export const x = Object.assign({}, WebAssembly).compile;"],
      // R13 gap#3: import.meta es allowlist de OWN members; key irresoluble puede seleccionar
      // dirname/filename/resolve y ya no pertenece a la frontera §141 del receiver-vía-flujo.
      ["variable-key gOPD(import.meta,k).value (R13)", W + "export function f(k:string){ return Object.getOwnPropertyDescriptor(import.meta,k).value; }"],
    ])("FLAG: %s", (_n, src) => {
      expect(flagged(src)).toBe(true);
    });

    it.each([
      ["safe member gOPD(...,'url').value", W + "export const x = Object.getOwnPropertyDescriptor(import.meta,'url').value;"],
      ["fromEntries∘entries (§141 renunciado)", W + "export const x = Object.fromEntries(Object.entries(import.meta)).dirname;"],
      ["receiver-vía-flujo const c={...im}; c.dirname (§141)", W + "export function f(){ const c={...import.meta}; return c.dirname; }"],
      ["entries[0] key-implícita (§141)", W + "export const x = Object.entries(import.meta)[0];"],
      ["gOPD sin .value (descriptor, no valor)", W + "export const x = Object.getOwnPropertyDescriptor(import.meta,'dirname');"],
    ])("SILENT (renunciado/seguro): %s", (_n, src) => {
      expect(flagged(src)).toBe(false);
    });
  });

  // ── FIX-5: flatten de spread-de-array-literal ──
  describe("FIX-5: spread-de-array-literal flatten", () => {
    it.each([
      ["import([...['fs']][0])", W + "export async function f(){ return import([...['fs']][0]); }"],
      ["new ([...[WebAssembly.Module]][0])()", W + "export function f(){ return new ([...[WebAssembly.Module]][0])(new Uint8Array()); }"],
      ["doble-spread [...[...['fs']]][0]", W + "export async function f(){ return import([...[...['fs']]][0]); }"],
      ["mixto ['x',...['fs'],'y'][1]", W + "export async function f(){ return import(['x', ...['fs'], 'y'][1]); }"],
    ])("FLAG: %s", (_n, src) => {
      expect(flagged(src)).toBe(true);
    });

    it.each([
      ["spread de variable (§141)", W + "export async function f(arr:string[]){ return import([...arr][0]); }"],
      ["spread de literal seguro", W + "export async function f(){ return import([...['./safe.js']][0]); }"],
    ])("SILENT: %s", (_n, src) => {
      expect(flagged(src)).toBe(false);
    });
  });

  // ── FIX-4: marker Cc — test diferencial end-to-end contra ts.getJSDocTags (Auditoría B, oráculo real) ──
  describe("FIX-4: marker Cc (test diferencial vs ts.getJSDocTags)", () => {
    const C = (n: number) => String.fromCodePoint(n);
    const body = "\nexport const x = 1;\n";
    const tsRecognizes = (cp: number) => {
      const src = `/**${C(cp)}@server-safe */${body}`;
      const sf = ts.createSourceFile("t.ts", src, ts.ScriptTarget.Latest, true);
      const tags: string[] = [];
      const walk = (n: ts.Node) => {
        for (const t of ts.getJSDocTags(n)) tags.push(t.tagName.getText(sf));
        ts.forEachChild(n, walk);
      };
      walk(sf);
      return tags.includes("server-safe");
    };
    const gateRecognizes = (cp: number) =>
      isContentServerSafeMarked(`/**${C(cp)}@server-safe*/${body}`, "x.ts");
    const isCc = (cp: number) => cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f);

    it("regla ⊇ TS: 0 FN residual sobre todo codepoint Cc glued al @", () => {
      const below: number[] = [];
      for (let cp = 0x00; cp <= 0x9f; cp++) {
        if (!isCc(cp)) continue;
        if (!gateRecognizes(cp) && tsRecognizes(cp)) below.push(cp);
      }
      expect(below).toEqual([]);
    });

    it("todo Cc glued (60 no-ws foldean; TAB/LF/VT/FF/CR ya parsean) → detectado", () => {
      for (let cp = 0x00; cp <= 0x9f; cp++) {
        if (!isCc(cp)) continue;
        expect(gateRecognizes(cp)).toBe(true);
      }
    });

    it("NEL U+0085 glued (divergencia gate vs TS del round) → detectado tras el fold", () => {
      expect(gateRecognizes(0x85)).toBe(true);
    });

    it("marker limpio y prosa: sin cambios (no FP)", () => {
      expect(isContentServerSafeMarked("/** @server-safe */" + body, "x.ts")).toBe(true);
      expect(isContentServerSafeMarked('const s = "@server-safe";' + body, "x.ts")).toBe(false);
      expect(isContentServerSafeMarked("// @server-safe\n" + body, "x.ts")).toBe(false);
    });
  });

  // ── P3: política de guards nivel-miembro (ADR D1-P1 extensión; decisión Iván: Opción A) ──
  // Un guard de MIEMBRO no suprime el flag: (a) no discrimina present-but-throws (WebAssembly.Module EXISTE
  // en Workers → typeof==='function' pasa → construye → lanza: suprimir reintroduce el FN que este ciclo
  // cerró); (b) el lenguaje ya da la sonda flow-free `?.()`. La medición P3 se pinea como test: ningún
  // refactor futuro puede derivar esta política en silencio.
  describe("P3: guard nivel-miembro NO suprime (Opción A ratificada, D1-P1)", () => {
    it.each<[string, string, string]>([
      ["root-guard EXPR ternario", `return typeof performance!=="undefined"?performance.eventLoopUtilization():y;`, "(y:number)"],
      ["root-guard STATEMENT if", `if(typeof performance!=="undefined"){return performance.eventLoopUtilization();}return 0;`, "()"],
      ["member-guard EXPR typeof", `return typeof performance.eventLoopUtilization==="function"?performance.eventLoopUtilization():y;`, "(y:number)"],
      ["member-guard STATEMENT if", `if(typeof performance.eventLoopUtilization==="function"){return performance.eventLoopUtilization();}return 0;`, "()"],
      ["in-guard EXPR", `return "eventLoopUtilization" in performance?performance.eventLoopUtilization():y;`, "(y:number)"],
    ])("FLAG: %s", (_n, body2, sig) => {
      expect(flagged(`${W}export function f${sig}{ ${body2} }`)).toBe(true);
    });

    it("CRÍTICO present-but-throws: un member-guard NO puede suprimir (suprimir = reintroducir FN)", () => {
      // WebAssembly.Module EXISTE en Workers → typeof==='function' pasa → `new` lanza. DEBE seguir FLAG.
      expect(
        flagged(`${W}export function f(bytes:Uint8Array,fb:unknown){ return typeof WebAssembly.Module==="function" ? new WebAssembly.Module(bytes) : fb; }`),
      ).toBe(true);
    });

    // M-1 (condición de Fable, medida no asumida): la sonda `?.()` es la imagen ESPECULAR del member-guard
    // — solo discrimina AUSENCIA. Para un miembro present-but-throws (`WebAssembly.compile` EXISTE en Workers,
    // `compile?.(b)` procede y rechaza) la sonda NO protege → DEBE seguir FLAG. Si la sanción silenciara
    // `?.()` de forma UNIFORME, reintroduciría el FN present-throws por la puerta de la sanción (el mismo que
    // P3 cerró por la puerta del guard). Medido: el gate distingue.
    it.each<[string, string, boolean]>([
      ["AUSENCIA performance.eventLoopUtilization?.() → SILENT", `performance.eventLoopUtilization?.()`, true],
      ["AUSENCIA console.table?.([1]) → SILENT", `console.table?.([1])`, true],
      ["present-throws WebAssembly.compile?.(b) → FLAG", `WebAssembly.compile?.(b)`, false],
      ["present-throws WebAssembly.compileStreaming?.(b) → FLAG", `WebAssembly.compileStreaming?.(b)`, false],
      ["present-throws WebAssembly.instantiateStreaming?.(b) → FLAG", `WebAssembly.instantiateStreaming?.(b)`, false],
      ["present-throws WebAssembly.compile?.call(null,b) → FLAG", `WebAssembly.compile?.call(null,b)`, false],
    ])("M-1 sanción `?.()` distingue ausencia/present-throws: %s", (_n, expr, silent) => {
      expect(flagged(`${W}export function f(b:Uint8Array){ return ${expr}; }`)).toBe(!silent);
    });

    it("M-1: WebAssembly.instantiate?.(b) → SILENT es §141 residual (arg-type: `instantiate(Module)` es legítimo en Edge), NO efecto del `?.()` — igual que el plain", () => {
      expect(flagged(`${W}export function f(b:Uint8Array){ return WebAssembly.instantiate?.(b); }`)).toBe(false);
      expect(flagged(`${W}export function f(b:Uint8Array){ return WebAssembly.instantiate(b); }`)).toBe(false);
    });
  });

  // ── INV-WRAP: invariancia de envoltorio value-transparent (Auditoría B §4, criterio 6) ──
  // veredicto(W(D)) === veredicto(D) para composiciones de wrappers value-transparent (parens/cast/non-null/
  // coma/proyección/spread-de-literal/alias-const) hasta profundidad 3; wrapper RENUNCIADO (data-flow) → SILENT.
  describe("INV-WRAP: envoltorio value-transparent preserva el veredicto", () => {
    it.each<[string, (r: string) => string]>([
      ["identidad (prof 0)", (r) => r],
      ["paren (1)", (r) => `(${r})`],
      ["cast as any (1)", (r) => `(${r} as any)`],
      ["non-null ! (1)", (r) => `(${r}!)`],
      ["coma (0,R) (1)", (r) => `(0, ${r})`],
      ["proyección [R][0] (1)", (r) => `[${r}][0]`],
      ["spread-literal [...[R]][0] (2)", (r) => `[...[${r}]][0]`],
      ["paren×3 (3)", (r) => `(((${r})))`],
      ["cast∘proj∘paren (3)", (r) => `(([${r}][0]) as any)`],
    ])("W=%s: (W(performance)).elu() FLAG (invariante)", (_n, wrap) => {
      expect(flagged(`${W}export function f(){ return ${wrap("performance")}.eventLoopUtilization(); }`)).toBe(true);
    });

    it("alias-hop const (prof 1) preserva el flag", () => {
      expect(flagged(`${W}export function f(){ const p = performance; return p.eventLoopUtilization(); }`)).toBe(true);
    });
    it("alias-de-alias const (prof 2) preserva el flag", () => {
      expect(flagged(`${W}export function f(){ const p = performance, q = p; return q.eventLoopUtilization(); }`)).toBe(true);
    });
    it("wrapper RENUNCIADO (receptor vía función, data-flow §141) → SILENT en ambos", () => {
      expect(flagged(`${W}function getP(): typeof performance { return performance; }\nexport function f(){ return getP().eventLoopUtilization(); }`)).toBe(false);
    });
  });
});

describe("server-safe gate — Auditoría B R5 (PR-R5-A): 6 unificaciones + O4 + URL + meta-lints", () => {
  const flagged = (code: string) =>
    checkSourceFile(code, "r5.fixture.tsx").length > 0;
  const W = "/** @server-safe */\nconst b = new Uint8Array();\n";

  // U1 (#1) — ∀-lift de la sub-decisión present-throws del safe-probe (suppress=∀).
  describe("U1: safe-probe present-throws ∀-lift", () => {
    it.each([
      ["(k?performance:WebAssembly).compile?.(b)", `(k?performance:WebAssembly).compile?.(b)`, false],
      ["(performance??WebAssembly).compile?.(b)", `(performance??WebAssembly).compile?.(b)`, false],
      ["(WebAssembly??console).compileStreaming?.(b)", `(WebAssembly??console).compileStreaming?.(b)`, false],
      ["(k?performance:WebAssembly).compile?.call(null,b)", `(k?performance:WebAssembly).compile?.call(null,b)`, false],
      ["alias R=k?performance:WebAssembly; R.compile?.(b)", `((): unknown => { const R = k?performance:WebAssembly; return R.compile?.(b); })()`, false],
      ["AUSENCIA performance.eventLoopUtilization?.() SILENT", `performance.eventLoopUtilization?.()`, true],
      ["AUSENCIA (k?performance:console).eventLoopUtilization?.() SILENT", `(k?performance:console).eventLoopUtilization?.()`, true],
      ["typeof (k?performance:WebAssembly).compile SILENT", `typeof (k?performance:WebAssembly).compile`, true],
      ["WebAssembly.compile?.name metadata SILENT", `WebAssembly.compile?.name`, true],
    ])("%s", (_n, expr, silent) => {
      expect(flagged(`${W}export function f(k:boolean){ return ${expr}; }`)).toBe(!silent);
    });
  });

  // U2.2 (#3) + #2 RENUNCIADO (ratificación R5-A1: assembled = §141 vía #173, la sonda discriminante pineada).
  describe("U2.2: clave única def/use (#3) + #2 renunciado (#173)", () => {
    it.each([
      ["#3 ({100n:WebAssembly})[100].compile FLAG", `export const x = ({100n: WebAssembly})[100].compile;`, false],
      ["#3 ({100n:WebAssembly})[\"100\"].compile FLAG", `export const x = ({100n: WebAssembly})["100"].compile;`, false],
      ["#3 [WebAssembly][0n].compile use-side FLAG", `export const x = [WebAssembly][0n].compile;`, false],
      ["safe ({100n:performance})[100].now SILENT", `export const x = ({100n: performance})[100].now;`, true],
      // SONDA DISCRIMINANTE (R5-A1): now está permitido; FLAG prueba que el gate NO folda ensamblado (fail-closed allowlist).
      ["discriminante performance['n'+'ow']() FLAG-as-is (no-fold + allowlist fail-closed)", `export function f(){ return performance['n'+'ow'](); }`, false],
      ["#2 WebAssembly['comp'+'ile'](b) SILENT-renunciado (§141 #173 + polaridad denylist)", `export function f(){ return WebAssembly['comp'+'ile'](b); }`, true],
      ["WebAssembly[m](b) variable SILENT-renunciado", `export function f(m:string){ return WebAssembly[m](b); }`, true],
    ])("%s", (_n, body, silent) => {
      expect(flagged(`${W}${body}`)).toBe(!silent);
    });
  });

  // U3 (#4) — recognizer reflexivo vía resolver compartido (bracket ≡ dotted ≡ template).
  describe("U3: reflexión .value vía resolver compartido (#4)", () => {
    it.each([
      ["gOPD(im,'dirname')['value'] bracket FLAG", `Object.getOwnPropertyDescriptor(import.meta,'dirname')['value']`, false],
      ["gOPD(im,'dirname')[`value`] template FLAG", "Object.getOwnPropertyDescriptor(import.meta,'dirname')[`value`]", false],
      ["gOPD(im,'dirname')['va'+'lue'] ensamblado SILENT (#173)", `Object.getOwnPropertyDescriptor(import.meta,'dirname')['va'+'lue']`, true],
      ["safe gOPD(im,'url')['value'] SILENT", `Object.getOwnPropertyDescriptor(import.meta,'url')['value']`, true],
    ])("%s", (_n, expr, silent) => {
      expect(flagged(`/** @server-safe */\nexport const x = ${expr};`)).toBe(!silent);
    });
  });

  // #5 (D2) descriptor-transfer IN + #6/round-trips RENUNCIADOS.
  describe("#5 descriptor-transfer (D2) + round-trips renunciados", () => {
    it.each([
      ["#5 Object.create(null,gOPDs(im)).dirname FLAG", `Object.create(null, Object.getOwnPropertyDescriptors(import.meta)).dirname`, false],
      ["#5 Object.defineProperties({},gOPDs(im)).dirname FLAG", `Object.defineProperties({}, Object.getOwnPropertyDescriptors(import.meta)).dirname`, false],
      ["#5 Object.defineProperty({},'dirname',gOPD(im,'dirname')).dirname FLAG", `Object.defineProperty({}, 'dirname', Object.getOwnPropertyDescriptor(import.meta,'dirname')).dirname`, false],
      ["#6 JSON.parse(JSON.stringify(im)).dirname SILENT-renunciado", `JSON.parse(JSON.stringify(import.meta)).dirname`, true],
      ["fromEntries∘entries SILENT-renunciado", `Object.fromEntries(Object.entries(import.meta)).dirname`, true],
      ["structuredClone(im).dirname SILENT (out-of-mandate)", `structuredClone(import.meta).dirname`, true],
    ])("%s", (_n, expr, silent) => {
      expect(flagged(`/** @server-safe */\nexport const x = ${expr};`)).toBe(!silent);
    });
  });

  // U4 (#8) construcción reflexiva + U5 (#9) Reflect spread arg0 + U6 (#10) ascenso eval-sink.
  describe("U4/U5/U6: construcción reflexiva, Reflect spread, ascenso eval-sink", () => {
    it.each([
      ["U4 new (Object.assign(WebAssembly,{}).Module)(b) FLAG", `export function f(){ return new (Object.assign(WebAssembly, {}).Module)(b); }`, false],
      ["U4 new (Object.create(WebAssembly).Module)(b) FLAG", `export function f(){ return new (Object.create(WebAssembly).Module)(b); }`, false],
      ["U5 Reflect.construct(...[WebAssembly.Module,[b]]) FLAG", `export function f(){ return Reflect.construct(...[WebAssembly.Module, [b]]); }`, false],
      ["U5 doble-spread Reflect.construct(...[...[WebAssembly.Module],[b]]) FLAG", `export function f(){ return Reflect.construct(...[...[WebAssembly.Module], [b]]); }`, false],
      ["U5 §141 Reflect.construct(...args) SILENT", `export function f(args:unknown[]){ return Reflect.construct(...(args as [Function, unknown[]])); }`, true],
      ["U6 [x.constructor][0]('return window')() FLAG", `export function f(x:object){ return [x.constructor][0]('return window')(); }`, false],
      ["U6 ({k:x.constructor}).k('code')() FLAG", `export function f(x:object){ return ({k:x.constructor}).k('code')(); }`, false],
      ["U6 safe [({}).constructor][0](3) SILENT", `export function f(){ return [({}).constructor][0](3); }`, true],
    ])("%s", (_n, body, silent) => {
      expect(flagged(`${W}${body}`)).toBe(!silent);
    });
  });

  // O4 (FP #4) — value-fallback tri-forma.
  describe("O4: value-fallback `?? fb` / `|| fb` (absence SILENT, present-throws FLAG)", () => {
    const H = "/** @server-safe */\nconst fb = () => 0;\n";
    it.each([
      ["performance.eventLoopUtilization ?? fb SILENT", `export const elu = performance.eventLoopUtilization ?? fb;`, true],
      ["performance.eventLoopUtilization || fb SILENT", `export const elu = performance.eventLoopUtilization || fb;`, true],
      ["(performance.eventLoopUtilization ?? fb)() SILENT", `export const r = (performance.eventLoopUtilization ?? fb)();`, true],
      ["present-throws WebAssembly.compile ?? fb FLAG", `export const c = WebAssembly.compile ?? fb;`, false],
      ["∀ (k?performance:WebAssembly).compile ?? fb FLAG", `export function f(k:boolean){ return (k?performance:WebAssembly).compile ?? fb; }`, false],
    ])("%s", (_n, body, silent) => {
      expect(flagged(`${H}${body}`)).toBe(!silent);
    });
  });

  // URL (#11, D3) — denylist-style present-throws.
  describe("URL (#11): denylist createObjectURL/revokeObjectURL present-throws", () => {
    it.each([
      ["URL.createObjectURL(new Blob()) FLAG", `export function f(){ return URL.createObjectURL(new Blob()); }`, false],
      ["URL.revokeObjectURL(u) FLAG", `export function f(u:string){ return URL.revokeObjectURL(u); }`, false],
      ["URL.createObjectURL?.(x) present-throws FLAG (sonda no protege)", `export function f(x:Blob){ return URL.createObjectURL?.(x); }`, false],
      ["(k?crypto:URL).createObjectURL(x) ∀ FLAG", `export function f(k:boolean,x:Blob){ return (k?crypto:URL).createObjectURL(x); }`, false],
      ["URL.canParse(x) SILENT", `export function f(x:string){ return URL.canParse(x); }`, true],
      ["new URL(x).pathname SILENT", `export function f(x:string){ return new URL(x).pathname; }`, true],
    ])("%s", (_n, body, silent) => {
      expect(flagged(`/** @server-safe */\n${body}`)).toBe(!silent);
    });
  });

  // INV-WRAP consumer-edge (§8 PRED-WRAP): envolver un hazard catalogado en wrappers value-transparent, en
  // el EDGE DE CONSUMO (callee eval-sink, target de construcción, target Reflect), no cambia el veredicto.
  describe("INV-WRAP consumer-edge: wrapper value-transparent × consumidor", () => {
    it.each<[string, (h: string) => string]>([
      ["callee eval-sink: (W)('code')()", (h) => `(${h})('code')()`],
      ["ctor: new (W)(b)", (h) => `new (${h})(b)`],
      ["Reflect.construct(W,[b])", (h) => `Reflect.construct(${h}, [b])`],
    ])("%s invariante bajo paren/proyección/coma", (_n, consume) => {
      // hazard callee = x.constructor; hazard ctor/Reflect = WebAssembly.Module. Se testea por consumidor.
      const isCtor = _n.startsWith("ctor") || _n.startsWith("Reflect");
      const hazard = isCtor ? "WebAssembly.Module" : "x.constructor";
      const wrappers = [hazard, `(${hazard})`, `[${hazard}][0]`, `(0, ${hazard})`];
      for (const w of wrappers) {
        expect(
          flagged(`${W}export function f(x:object){ return ${consume(w)}; }`),
        ).toBe(true);
      }
    });
  });

  // META-LINTS de sitio (§3 patrón INV-VT): el fuente del gate no debe reintroducir las formas crudas fuera
  // de los helpers canónicos. Defensa-en-profundidad (el cierre primario son los invariantes conductuales).
  describe("meta-lints de sitio sobre el fuente del gate", () => {
    const src = readFileSync(
      "scripts/check-server-safe-markers.mjs",
      "utf8",
    );
    const noComments = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    it("resolveKeyCandidates/accessedMemberNames es la ruta de nombre de miembro (no node.name.text=='value' hardcode)", () => {
      expect(noComments.includes(`node.name.text === "value"`)).toBe(false);
    });
    it("el downgrade del safe-probe present-throws consulta ∀ (anyPresentThrows), no un root first-match", () => {
      // El bug de #1 era `if (isSafeOptionalProbe && p && partialRootName && PARTIAL_PRESENT_THROWS_ROOTS.has(
      // partialRootName))` — first-match. Debe estar el ∀-lift. (El uso de `.has(partialRootName)` en el TEXTO
      // del detail es legítimo: elige el mensaje, no decide el flag.)
      expect(noComments.includes("const anyPresentThrows =")).toBe(true);
      expect(
        noComments.includes("isSafeOptionalProbe && p && anyPresentThrows"),
      ).toBe(true);
    });
  });
});

describe("server-safe gate — #7 (D1-b): hoist monotónico de asignaciones a bindings exteriores", () => {
  const flagged = (code: string) =>
    checkSourceFile(code, "d7.fixture.tsx").length > 0;
  const W = "/** @server-safe */\n";

  describe("target (el fix): asignación en scope anidado → binding exterior", () => {
    it.each([
      ["B block→outer", `export function f(){ let c:any; { c = performance; } return c.eventLoopUtilization(); }`],
      ["C fn→outer", `export function f(){ let c:any; function g(){ c = performance; } g(); return c.eventLoopUtilization(); }`],
      ["C-split ??= en closure", `export function f(){ let cached:any; function ensure(){ cached ??= performance; } ensure(); return cached.eventLoopUtilization(); }`],
      ["RHS multi-rama en block", `export function f(k:boolean){ let c:any; { c = k?crypto:performance; } return c.eventLoopUtilization(); }`],
      ["var en block, leída fuera (function-scoped)", `export function f(){ { var c:any = performance; } return c.eventLoopUtilization(); }`],
    ])("FLAG: %s", (_n, body) => {
      expect(flagged(`${W}${body}`)).toBe(true);
    });
  });

  describe("shadowing POR-BINDING (el criterio de validez): interior FLAG, exterior SILENT", () => {
    it("shadow en block: el interior no contamina el exterior", () => {
      // exterior aislado (interior usa .now, safe) → el binding exterior NO se taintea.
      expect(
        flagged(`${W}export function f(){ let c:any; { let c:any = performance; void c; } return c.eventLoopUtilization(); }`),
      ).toBe(false);
    });
    it("shadow a través de frontera de FUNCIÓN (donde un mapa por-nombre fallaría): exterior SILENT", () => {
      expect(
        flagged(`${W}export function f(){ let c:any; function g(){ let c:any = performance; return c.now; } g(); return c.eventLoopUtilization(); }`),
      ).toBe(false);
    });
    it("param-shadow: fn(x){ x = performance } no taintea el exterior x", () => {
      expect(
        flagged(`${W}export function f(){ let x:any; function g(x:any){ x = performance; return x; } return g(1); }`),
      ).toBe(false);
    });
  });

  describe("coste ratificado — DOS caras (fail-closed FP); read-before-assign es out-of-mandate, no coste", () => {
    it("no-kill / O1: reasignar a un valor seguro no purga → FLAG (monotónico, sin kill-set)", () => {
      expect(
        flagged(`${W}export function f(){ let p:any; { p = performance; } p = { eventLoopUtilization(){ return 1; } }; return p.eventLoopUtilization(); }`),
      ).toBe(true);
    });
    it("asignación INALCANZABLE (rama muerta) → FLAG (monotónico, sin alcanzabilidad)", () => {
      expect(
        flagged(`${W}export function f(){ let p:any; if (false) { p = performance; } return p.eventLoopUtilization(); }`),
      ).toBe(true);
    });
    it("read-before-assign → SILENT: es out-of-mandate (undefined.member crashea UNIVERSAL, no divergencia-Edge)", () => {
      expect(
        flagged(`${W}export function f(){ let p:any; const r = p.eventLoopUtilization(); { p = performance; } return r; }`),
      ).toBe(false);
      // paridad con la forma directa (idéntico out-of-mandate):
      expect(
        flagged(`${W}export function f(){ let p:any; return p.eventLoopUtilization(); }`),
      ).toBe(false);
    });
  });

  describe("renunciados (medidos SILENT) + preexistentes pineados", () => {
    it.each([
      ["member-LHS obj.p=performance", `export function f(){ const o:any={}; { o.p = performance; } return o.p.eventLoopUtilization(); }`, true],
      ["call-flow c=g() (RHS retorno de fn)", `function g():any{ return performance; }\nexport function f(){ let c:any; { c = g(); } return c.eventLoopUtilization(); }`, true],
      ["copia-como-RHS c={...performance} no copia el proto", `export function f(){ let c:any; { c = {...performance}; } return c.eventLoopUtilization(); }`, true],
      ["A same-scope (preexistente, pin)", `export function f(){ let c:any; c = performance; return c.eventLoopUtilization(); }`, false],
      ["E assign+use en la misma fn (preexistente, pin)", `export function f(){ let c:any; function g(){ c = performance; return c.eventLoopUtilization(); } return g(); }`, false],
      ["F pattern-assign [c]=[performance] (preexistente, pin: FLAG, no renunciado)", `export function f(){ let c:any; [c] = [performance]; return c.eventLoopUtilization(); }`, false],
    ])("%s", (_n, body, silent) => {
      expect(flagged(`${W}${body}`)).toBe(!silent);
    });
  });
});

describe("server-safe gate — #7 vista diferida + INV-ORDER (D1-b rama 2)", () => {
  const flagged = (code: string) =>
    checkSourceFile(code, "d7def.fixture.tsx").length > 0;
  const W = "/** @server-safe */\n";

  describe("lecturas diferidas (cuerpo de función/arrow) ven la unión full-scope insensible al orden", () => {
    it.each([
      ["P-DEF-1 split use()arriba setUp()abajo", `export function f(){ let c:any; function use(){ return c.eventLoopUtilization(); } function setUp(){ c = performance; } setUp(); return use(); }`],
      ["P-DEF-2 assign top-level tras la fn que lee", `export function f(){ let c:any; function use(){ return c.eventLoopUtilization(); } c = performance; return use(); }`],
      ["P-DEF-4 arrow const", `export function f(){ let c:any; const use = () => c.eventLoopUtilization(); c = performance; return use(); }`],
      ["diferido + assign en block anidado", `export function f(){ let c:any; const use = () => c.eventLoopUtilization(); { c = performance; } return use(); }`],
    ])("FLAG: %s", (_n, body) => {
      expect(flagged(`${W}${body}`)).toBe(true);
    });
  });

  it("vista FORWARD preservada: read-before-assign en posición-statement = out-of-mandate SILENT", () => {
    expect(
      flagged(`${W}export function f(){ let p:any; const r = p.eventLoopUtilization(); { p = performance; } return r; }`),
    ).toBe(false);
  });

  describe("shadowing por-binding a través de frontera de función (la vista diferida NO contamina el shadow)", () => {
    it.each([
      ["body local c shadow", `export function f(){ let c:any; function g(){ let c:any = performance; return c.now; } g(); return c.eventLoopUtilization(); }`],
      ["param shadow", `export function f(){ let c:any; function g(cc:any){ return cc.eventLoopUtilization(); } c = performance; return g(1); }`],
      ["const alias + param shadow (regresión del test previo)", `export function f(){ const WA = WebAssembly; function g(WA:any){ return WA.compile("x"); } return g; }`],
    ])("SILENT: %s", (_n, body) => {
      expect(flagged(`${W}${body}`)).toBe(false);
    });
  });

  // INV-ORDER: simetría de orden de DECLARACIÓN para pares (asignación, lectura-DIFERIDA). Tercer invariante de
  // simetría (operandos: INV-SYM; wrappers: INV-WRAP; orden de declaración: INV-ORDER). Habría cazado el FN
  // orden-dependiente de la vista forward pura (P-DEF).
  describe("INV-ORDER: veredicto(D_assign; D_use) === veredicto(D_use; D_assign) para lectura diferida", () => {
    it.each<[string, (order: "au" | "ua") => string]>([
      [
        "fn-decl split",
        (o) =>
          o === "au"
            ? `let c:any; function setUp(){ c = performance; } function use(){ return c.eventLoopUtilization(); } setUp(); return use();`
            : `let c:any; function use(){ return c.eventLoopUtilization(); } function setUp(){ c = performance; } setUp(); return use();`,
      ],
      [
        "arrow + top-level assign",
        (o) =>
          o === "au"
            ? `let c:any; c = performance; const use = () => c.eventLoopUtilization(); return use();`
            : `let c:any; const use = () => c.eventLoopUtilization(); c = performance; return use();`,
      ],
    ])("%s: ambos órdenes coinciden y FLAG", (_n, form) => {
      const au = flagged(`${W}export function f(){ ${form("au")} }`);
      const ua = flagged(`${W}export function f(){ ${form("ua")} }`);
      expect(au).toBe(ua);
      expect(au).toBe(true);
    });
  });

  // INV-ORDER PARAMETRIZADO por CLASE DE CONTEXTO DIFERIDO (Auditoría B R5, sweep): la simetría de orden se
  // cumple para TODA lectura call-time — cuerpo fn, arrow, field-init de instancia, param-default. field-init
  // y param-default entran como CLASES de contexto en la matriz, no como celdas sueltas.
  describe("INV-ORDER por clase de contexto (fn-body / arrow / field-init / param-default)", () => {
    const CONTEXTS: [string, (order: "au" | "ua") => string][] = [
      [
        "fn-body",
        (o) =>
          o === "au"
            ? `let c:any; c = performance; function use(){ return c.eventLoopUtilization(); } return use();`
            : `let c:any; function use(){ return c.eventLoopUtilization(); } c = performance; return use();`,
      ],
      [
        "arrow-body",
        (o) =>
          o === "au"
            ? `let c:any; c = performance; const use = () => c.eventLoopUtilization(); return use();`
            : `let c:any; const use = () => c.eventLoopUtilization(); c = performance; return use();`,
      ],
      [
        "field-init (instancia)",
        (o) =>
          o === "au"
            ? `let c:any; c = performance; class K { p:any = c.eventLoopUtilization(); } return new K();`
            : `let c:any; class K { p:any = c.eventLoopUtilization(); } c = performance; return new K();`,
      ],
      [
        "param-default",
        (o) =>
          o === "au"
            ? `let c:any; c = performance; function g(x:any = c.eventLoopUtilization()){ return x; } return g();`
            : `let c:any; function g(x:any = c.eventLoopUtilization()){ return x; } c = performance; return g();`,
      ],
    ];
    it.each(CONTEXTS)(
      "%s: veredicto(D_assign; D_use) === veredicto(D_use; D_assign) y FLAG (call-time)",
      (_n, form) => {
        const au = flagged(`${W}export function f(){ ${form("au")} }`);
        const ua = flagged(`${W}export function f(){ ${form("ua")} }`);
        expect(au).toBe(ua);
        expect(au).toBe(true);
      },
    );
  });
});

describe("server-safe gate — #7 dos vistas: INV-VIEW + celdas diferidas (P-DEF-6, shadow, field-init)", () => {
  const flagged = (code: string) =>
    checkSourceFile(code, "invview.fixture.tsx").length > 0;
  const W = "/** @server-safe */\n";

  describe("P-DEF-6 / P-CHAIN: RHS alias en diferida = ∃ sobre órdenes (punto fijo → INV-VIEW por construcción)", () => {
    it.each([
      ["const A=performance; c=A; use() diferido → FLAG", `let c:any; function use(){ return c.eventLoopUtilization(); } const A = performance; c = A; return use();`, false],
      ["forward const A=performance; c=A; c.elu() → FLAG", `let c:any; const A = performance; c = A; return c.eventLoopUtilization();`, false],
      // let-ASSIGNMENT-chain: la diferida es ∃ sobre órdenes (punto fijo) → `c=d` taintea c con lo que d pueda
      // valer → FLAG en AMBOS órdenes. La forward mantiene precisión de orden (o1 FLAG, o2 out-of-mandate SILENT).
      ["let-chain d=perf; c=d DIFERIDO → FLAG (∃ órdenes)", `let c:any; let d:any; function use(){ return c.eventLoopUtilization(); } d = performance; c = d; return use();`, false],
      ["let-chain c=d; d=perf DIFERIDO → FLAG (∃ órdenes, inverso)", `let c:any; let d:any; function use(){ return c.eventLoopUtilization(); } c = d; d = performance; return use();`, false],
      ["let-chain d=perf; c=d FORWARD → FLAG (orden favorable)", `let c:any; let d:any; d = performance; c = d; return c.eventLoopUtilization();`, false],
      ["let-chain c=d; d=perf FORWARD → SILENT (out-of-mandate: c=undefined)", `let c:any; let d:any; c = d; d = performance; return c.eventLoopUtilization();`, true],
    ])("%s", (_n, body, silent) => {
      expect(flagged(`${W}export function f(){ ${body} }`)).toBe(!silent);
    });
  });

  describe("P-SHADOW-DEF: la vista diferida no filtra por-nombre al redeclarar", () => {
    it("inner lee la c LOCAL de outer (redeclarada, ={}) → el módulo c=performance NO filtra", () => {
      expect(
        flagged(`${W}let c:any;\nexport function outer(){ let c:any; function inner(){ return c.eventLoopUtilization(); } c = {}; return inner(); }\nc = performance; outer();`),
      ).toBe(false);
    });
    it("control sin shadow: inner ve el módulo c=performance (diferido) → FLAG", () => {
      expect(
        flagged(`${W}let c:any;\nexport function outer(){ function inner(){ return c.eventLoopUtilization(); } return inner(); }\nc = performance; outer();`),
      ).toBe(true);
    });
  });

  describe("contexto diferido (predicado F4): field-init/param-default diferidos, static-field eager", () => {
    it.each([
      ["field-init de INSTANCIA (corre en new) → diferido FLAG", `let c:any; class K { p:any = c.eventLoopUtilization(); } c = performance; return new K();`, false],
      ["param-default (corre al llamar) → diferido FLAG", `let c:any; function g(x:any = c.eventLoopUtilization()){ return x; } c = performance; return g();`, false],
      ["static-field EAGER pre-assign → forward SILENT", `let c:any; class K { static p:any = c.eventLoopUtilization(); } c = performance; return K;`, true],
      ["static-field EAGER post-assign → forward FLAG", `let c:any; c = performance; class K { static p:any = c.eventLoopUtilization(); } return K;`, false],
    ])("%s", (_n, body, silent) => {
      expect(flagged(`${W}export function f(){ ${body} }`)).toBe(!silent);
    });
  });

  // INV-VIEW (cuarto invariante del kit): MONOTONICIDAD ENTRE VISTAS — si una lectura en posición-statement al
  // FINAL del scope flaggea, toda lectura DIFERIDA del mismo binding flaggea (`diferida ⊇ forward-fin-de-scope`).
  // Habría cazado el desacuerdo entre vistas de P-DEF-6 (que INV-ORDER no ve, ambos órdenes diferidos simétricos).
  describe("INV-VIEW: diferida ⊇ forward-fin-de-scope", () => {
    it.each([
      ["assign top-level", `c = performance;`],
      ["assign en block", `{ c = performance; }`],
      ["const-alias chain", `const A = performance; c = A;`],
      ["assign en fn anidada", `function setUp(){ c = performance; } setUp();`],
    ])("%s: forward-fin FLAG ⟹ diferida FLAG", (_n, assign) => {
      const fwd = flagged(`${W}export function f(){ let c:any; ${assign} return c.eventLoopUtilization(); }`);
      const def = flagged(`${W}export function f(){ let c:any; const use = () => c.eventLoopUtilization(); ${assign} return use(); }`);
      expect(fwd).toBe(true); // los cuatro son hazards al fin de scope
      expect(def).toBe(true); // ⟹ la vista diferida también flaggea (monotonicidad)
    });
  });
});

describe("server-safe gate — #7 celdas del cuantificador diferido (batería adversarial de Fable)", () => {
  const flagged = (code: string) =>
    checkSourceFile(code, "cells.fixture.tsx").length > 0;
  const W = "/** @server-safe */\n";

  describe("P-DEF-7: declaración const ANIDADA resuelta por decl-threading", () => {
    it.each([
      ["forward { const A=perf; c=A; } c.elu()", `let c:any; { const A = performance; c = A; } return c.eventLoopUtilization();`, false],
      ["diferido use(){c.elu()} { const A=perf; c=A; } use()", `let c:any; function use(){ return c.eventLoopUtilization(); } { const A = performance; c = A; } return use();`, false],
    ])("FLAG: %s", (_n, body) => {
      expect(flagged(`${W}export function f(){ ${body} }`)).toBe(true);
    });
  });

  describe("P-SHADOW-CASE: `let` directo en clause (CaseBlock-scoped) no fuga a la unión exterior", () => {
    it("let c interior en case + c=perf; use() exterior → SILENT (no fuga por-nombre)", () => {
      expect(
        flagged(`${W}export function f(k:number){ let c:any; function use(){ return c.eventLoopUtilization(); } switch(k){ case 1: let c:any; c = performance; break; } return use(); }`),
      ).toBe(false);
    });
    it("control: assign a la c EXTERIOR en el case → FLAG (diferido lo ve)", () => {
      expect(
        flagged(`${W}export function f(k:number){ let c:any; function use(){ return c.eventLoopUtilization(); } switch(k){ case 1: c = performance; break; } return use(); }`),
      ).toBe(true);
    });
  });

  describe("P-KEY-EAGER: la clave computada de un field-init es EAGER (forward), no diferida", () => {
    it("[c.elu()] key eager pre-assign → SILENT (class-eval, c undefined = out-of-mandate)", () => {
      expect(
        flagged(`${W}export function f(){ let c:any; class K { [c.eventLoopUtilization()]:any = 1; } c = performance; return K; }`),
      ).toBe(false);
    });
    it("el INICIALIZADOR del field (diferido) sí ve la unión → FLAG", () => {
      expect(
        flagged(`${W}export function f(){ let c:any; class K { p:any = c.eventLoopUtilization(); } c = performance; return new K(); }`),
      ).toBe(true);
    });
  });

  describe("P-CLASSEXPR: class expression anónima (HOC) recibe la inyección diferida", () => {
    it("const K = class { p = c.elu() }; c = performance; new K() → FLAG", () => {
      expect(
        flagged(`${W}export function f(){ let c:any; const K = class { p:any = c.eventLoopUtilization(); }; c = performance; return new K(); }`),
      ).toBe(true);
    });
  });
});

describe("server-safe gate — marcador M1/R14 (near-miss /* */ y //) + O2 (@internal@server-safe higiene)", () => {
  const body = "\nexport const x = 1;\n";

  describe("M1/R14: @server-safe en comentario NO-JSDoc → near-miss (blast-radius fichero)", () => {
    const nm = (src: string) =>
      markerNearMissLines(
        ts.createSourceFile("x.ts", src, ts.ScriptTarget.Latest, true),
      ).length > 0;
    it.each<[string, string, boolean]>([
      ["/* @server-safe */ una-estrella → near-miss", "/* @server-safe */" + body, true],
      ["/*@server-safe*/ sin espacios → near-miss", "/*@server-safe*/" + body, true],
      ["multi-línea una-estrella → near-miss", "/*\n * @server-safe\n */" + body, true],
      ["/** @server-safe */ JSDoc → NO near-miss", "/** @server-safe */" + body, false],
      ["// @server-safe line-comment → near-miss", "// @server-safe" + body, true],
      ["prosa foo@server-safe pegado → NO (incidental)", "/* nota: foo@server-safe */" + body, false],
      ["string literal → NO", 'const s = "@server-safe";' + body, false],
    ])("%s", (_n, src, isNearMiss) => {
      expect(nm(src)).toBe(isNearMiss);
    });
  });

  describe("O2/M2: tag hermano en la misma línea (pegado o con espacio) → higiene line-start, no 'prosa'", () => {
    it("pegado @internal@server-safe → throw higiene M2 (línea propia)", () => {
      expect(() =>
        isContentServerSafeMarked("/** @internal@server-safe */" + body, "x.ts"),
      ).toThrow(/NO está en línea propia/);
    });
    it("con espacio @internal @server-safe → throw higiene M2 (no marca en silencio)", () => {
      expect(() =>
        isContentServerSafeMarked("/** @internal @server-safe */" + body, "x.ts"),
      ).toThrow(/NO está en línea propia/);
    });
    it("prosa real @internal foo @server-safe → throw de prosa (distinto de M2)", () => {
      expect(() =>
        isContentServerSafeMarked("/** @internal foo @server-safe */" + body, "x.ts"),
      ).toThrow(/embebido en prosa/);
    });
  });

  // P-M2-PROSE (residual preexistente, ratificado rc.1): prosa PURA (sin tag) antes del marker en la misma
  // línea → bucket "prosa pura → tolera" → NO marca y NO suena (clase M1). Se mantiene porque el discriminador
  // intención-vs-mención dentro de prosa es genuinamente ambiguo: `not yet @server-safe` es mención legítima
  // que NO debe tronar. Fixtures pinean AMBOS lados (si ronda-6 añade el trailing-token, estos documentan el
  // shift). Ver docs/server-safe-limitations.md §2 (M2 residual).
  describe("P-M2-PROSE: prosa antes del marker en la misma línea (residual tolerado)", () => {
    it("`/** Does X. @server-safe */` (intención plausible) → NO marca (tolerado, silencioso)", () => {
      expect(
        isContentServerSafeMarked("/** Does X. @server-safe */" + body, "x.ts"),
      ).toBe(false);
    });
    it("`/** not yet @server-safe */` (mención legítima) → NO marca y NO truena (ambigüedad intencional)", () => {
      expect(
        isContentServerSafeMarked("/** not yet @server-safe */" + body, "x.ts"),
      ).toBe(false);
    });
    it("control: `/** @server-safe does X */` (marker primero, prosa después) → SÍ marca (line-start)", () => {
      expect(
        isContentServerSafeMarked("/** @server-safe does X */" + body, "x.ts"),
      ).toBe(true);
    });
  });
});

describe("server-safe gate — #7 punto fijo: cota real, descendCtx, paridad CaseBlock, pattern (batería 3 de Fable)", () => {
  const flagged = (code: string) =>
    checkSourceFile(code, "audit3.fixture.tsx").length > 0;
  const W = "/** @server-safe */\n";

  describe("BLOQUEO 1: while-stable — la cota `statements.length` era falsa (cadena > #statements)", () => {
    it("cadena condensada por coma (1 statement) diferida → FLAG", () => {
      const names = Array.from({ length: 9 }, (_, i) => `x${String(i)}`);
      const decls = `let ${names.map((nm) => `${nm}:any`).join(", ")};`;
      const seq = ["x8 = performance"];
      for (let i = 7; i >= 0; i--) seq.push(`x${String(i)} = x${String(i + 1)}`);
      expect(
        flagged(
          `${W}export function f(){ ${decls} function use(){ return x0.eventLoopUtilization(); } ${seq.join(", ")}; return use(); }`,
        ),
      ).toBe(true);
    });
  });

  describe("BLOQUEO 2: descendCtx purga el ctx de resolución (childShadow gateaba emisión, no resolución)", () => {
    it.each<[string, string, boolean]>([
      ["Block: local x seguro; c=x → SILENT", `let c:any; function use(){ return c.eventLoopUtilization(); } const x = performance; { let x:any = { eventLoopUtilization(){ return 0; } }; c = x; } return use();`, true],
      ["fnLike param x sombrea; c=x → SILENT", `let c:any; function use(){ return c.eventLoopUtilization(); } const x = performance; function setup(x:any){ c = x; } setup({ eventLoopUtilization(){ return 0; } }); return use();`, true],
      ["control: local x2=WebAssembly (peligroso) NO se mezcla con exterior → FLAG", `let c:any; function use(){ return new (c as any).Module(new Uint8Array()); } const x = performance; { const x2 = WebAssembly; c = x2; } return use();`, false],
    ])("%s", (_n, body, silent) => {
      expect(flagged(`${W}export function f(){ ${body} }`)).toBe(!silent);
    });
  });

  describe("Paridad CaseBlock: el walker paralelo purga deferredAssignAliases como visitOrderedStatements", () => {
    it("let redeclarada en clause + fn interior homónimo; exterior tainted → interior SILENT (no fuga)", () => {
      expect(
        flagged(`${W}export function f(k:number){ let c:any; c = performance; switch(k){ case 1: let c:any = { eventLoopUtilization(){ return 0; } }; (function(){ return c.eventLoopUtilization(); })(); break; } return c; }`),
      ).toBe(false);
    });
    it("control: fn exterior lee c asignada dentro de una clause → FLAG", () => {
      expect(
        flagged(`${W}export function f(k:number){ let c:any; function use(){ return c.eventLoopUtilization(); } switch(k){ case 1: c = performance; break; } return use(); }`),
      ).toBe(true);
    });
  });

  describe("Pattern-assign en el hoist (asimetría diferida-vs-same-scope cerrada)", () => {
    it.each<[string, string]>([
      ["diferido { [c]=[performance]; } use()", `let c:any; function use(){ return c.eventLoopUtilization(); } { [c] = [performance]; } return use();`],
      ["same-scope forward [c]=[performance]; c.elu()", `let c:any; [c] = [performance]; return c.eventLoopUtilization();`],
      ["object-pattern diferido ({c}={c:performance}) use()", `let c:any; function use(){ return c.eventLoopUtilization(); } ({ c } = { c: performance }); return use();`],
    ])("FLAG: %s", (_n, body) => {
      expect(flagged(`${W}export function f(){ ${body} }`)).toBe(true);
    });
  });

  describe("Frontera renunciada con línea: for-of iteration-assignment target (§141, LIMITATIONS)", () => {
    it("for (c of [performance]) {} + use() → SILENT (renuncia documentada)", () => {
      expect(
        flagged(`${W}export function f(){ let c:any; function use(){ return c.eventLoopUtilization(); } for (c of [performance]) {} return use(); }`),
      ).toBe(false);
    });
  });

  // INV-VIEW GENERATIVO (Auditoría B R5, custodio del punto fijo): "por construcción" sin test generativo es
  // prosa. Para toda cadena de longitud N≤8, `diferida ⊇ forward-fin-de-scope`. Una celda enumerada jamás
  // habría encontrado la cota falsa `iter <= statements.length` — este generador SÍ (N > #statements-top-level).
  describe("INV-VIEW generativo: diferida ⊇ forward-fin sobre cadenas N=1..8", () => {
    const chainBody = (n: number) => {
      const names = Array.from({ length: n + 1 }, (_, i) => `x${String(i)}`);
      const decls = `let ${names.map((nm) => `${nm}:any`).join(", ")};`;
      const assigns = [`x${String(n)} = performance;`];
      for (let i = n - 1; i >= 0; i--)
        assigns.push(`x${String(i)} = x${String(i + 1)};`);
      return { decls, body: assigns.join(" ") };
    };
    it.each(Array.from({ length: 8 }, (_, i) => i + 1))(
      "cadena N=%i: forward-fin FLAG ⟹ diferida FLAG",
      (n) => {
        const { decls, body } = chainBody(n);
        const read = "x0.eventLoopUtilization()";
        const fwd = flagged(`${W}export function f(){ ${decls} ${body} return ${read}; }`);
        const def = flagged(`${W}export function f(){ ${decls} function use(){ return ${read}; } ${body} return use(); }`);
        expect(fwd).toBe(true);
        expect(def).toBe(true);
      },
    );
  });
});

// ============================================================================
// Ronda 6 (Auditoría B) — 6 raíces cerradas + custodios. Cada hallazgo con su PRED-X.
// ============================================================================
describe("server-safe gate — Ronda 6 (Auditoría B): 6 raíces + custodios", () => {
  const flagged = (code: string) =>
    checkSourceFile(code, "r6.fixture.tsx").length > 0;
  const W = "/** @server-safe */\n";
  const B = "\nexport const x = import.meta.dirname;\n";

  // ---- H1 [HIGH] import-equals invisible al grafo · IMPORT ----
  describe("H1: import-equals enumerado en el grafo (extractModuleReferences) · PRED-IMPORT", () => {
    it.each<[string, string, boolean]>([
      ["import fs = require('fs') node builtin", `${W}import fs = require("fs");\nexport const x = fs;`, true],
      ["export import fs = require('fs') (modif export, mismo nodo)", `${W}export import fs = require("fs");\nexport const x = fs;`, true],
      ["import p = require('node:path')", `${W}import p = require("node:path");\nexport const x = p;`, true],
      ["import type F = require('fs') → erased, SILENT", `${W}import type F = require("fs");\nexport const x = 1;`, false],
    ])("%s", (_n, code, flag) => {
      expect(runWithVfs("/repo/src/c.tsx", vfs({ "/repo/src/c.tsx": code })).length > 0).toBe(flag);
    });

    it("amplificación: import-equals oculta un SUBÁRBOL relativo entero", () => {
      const files = vfs({
        "/repo/src/c.tsx": `${W}import D = require("./dirty");\nexport const x = D;`,
        "/repo/src/dirty.tsx": `export const bad = performance.eventLoopUtilization();`,
      });
      expect(runWithVfs("/repo/src/c.tsx", files).length).toBeGreaterThan(0);
    });

    // Custodio de PARIDAD statement-kind (Fable R6): toda forma que produce un ref de módulo de runtime
    // es enumerada por extractModuleReferences. Behavioral (un dep relativo sucio se sigue por cada forma).
    it("PARIDAD: toda forma import de-valor sigue el dep sucio (import-decl / export-decl / import-equals)", () => {
      const dirty = `export const bad = performance.eventLoopUtilization();`;
      const forms: Array<[string, string]> = [
        ["import-decl", `import { bad } from "./dirty";\nexport const x = bad;`],
        ["export-decl", `export { bad } from "./dirty";`],
        ["import-equals", `import D = require("./dirty");\nexport const x = D;`],
        ["export-import-equals", `export import D = require("./dirty");\nexport const x = D;`],
      ];
      for (const [name, entry] of forms) {
        const files = vfs({ "/repo/src/c.tsx": `${W}${entry}`, "/repo/src/dirty.tsx": dirty });
        expect(runWithVfs("/repo/src/c.tsx", files).length, name).toBeGreaterThan(0);
      }
    });
  });

  // ---- H2 [MED] alias identifier-root order-gated a nivel scope · VIEW/PRED-VIEW ----
  describe("H2: declaración-alias sembrada en la vista diferida (const/let-init) · PRED-VIEW", () => {
    it.each<[string, string, boolean]>([
      ["const p=perf ABAJO, fn diferida lee → FLAG", `${W}export function g(){ return p.eventLoopUtilization(); }\nconst p = performance;`, true],
      ["let p=perf ABAJO (P-H2-LET) → FLAG", `${W}export function g(){ return p.eventLoopUtilization(); }\nlet p = performance;`, true],
      ["WA construction diferido → FLAG", `${W}export function g(b:any){ return new WA.Module(b); }\nconst WA = WebAssembly;`, true],
      ["URL present-throws diferido → FLAG", `${W}export function g(b:any){ return U.createObjectURL(b); }\nconst U = URL;`, true],
    ])("%s", (_n, code, flag) => {
      expect(flagged(code)).toBe(flag);
    });

    // INV-ORDER ampliado: la simetría de orden ahora incluye la forma decl-alias (const/let-init), no solo
    // asignación, × clases de contexto diferido. veredicto(decl; use) === veredicto(use; decl) y FLAG.
    describe("INV-ORDER × forma-de-binding {const-init, let-init} × contexto diferido", () => {
      const CTX: Array<[string, (o: "du" | "ud") => string]> = [
        ["const→fn-body", (o) => o === "du" ? `const p = performance; export function g(){ return p.eventLoopUtilization(); }` : `export function g(){ return p.eventLoopUtilization(); } const p = performance;`],
        ["let→arrow", (o) => o === "du" ? `let p = performance; export const g = () => p.eventLoopUtilization();` : `export const g = () => p.eventLoopUtilization(); let p = performance;`],
        ["const→field-init", (o) => o === "du" ? `const p = performance; export class K { m = p.eventLoopUtilization(); }` : `export class K { m = p.eventLoopUtilization(); } const p = performance;`],
        ["const→param-default", (o) => o === "du" ? `const p = performance; export function g(a = p.eventLoopUtilization()){ return a; }` : `export function g(a = p.eventLoopUtilization()){ return a; } const p = performance;`],
      ];
      it.each(CTX)("%s: du === ud y FLAG", (_n, form) => {
        const du = flagged(`${W}${form("du")}`);
        const ud = flagged(`${W}${form("ud")}`);
        expect(du).toBe(ud);
        expect(du).toBe(true);
      });
    });

    it("regresión: var-init reverse ya lo cazaba (var-hoist), P-SHADOW-DEF no fuga, descendCtx intacto", () => {
      expect(flagged(`${W}export function g(){ return p.eventLoopUtilization(); }\nvar p = performance;`)).toBe(true);
      expect(flagged(`let c:any;\n${W}export function outer(){ let c:any; function inner(){ return c.eventLoopUtilization(); } c={}; return inner(); }\nc=performance; outer();`)).toBe(false);
      expect(flagged(`${W}export function f(){ let c:any; function use(){ return c.eventLoopUtilization(); } const x=performance; { let x:any={eventLoopUtilization(){return 0;}}; c=x; } return use(); }`)).toBe(false);
    });

    // Item 1 (delta-a de Fable RECHAZADO-CON-MEDICIÓN): el seed CaseBlock del walker paralelo NO era necesario.
    // Cuantificador completo — cross-clause (CaseBlock = un scope léxico, P-SHADOW-CASE) y switch a nivel MÓDULO
    // (sin función envolvente): ambos FLAG sin seed adicional.
    it.each<[string, string]>([
      ["P-CASE-X1 cross-clause (use en case1, const p en case2)", `${W}export function f(k:number){ switch(k){ case 1: function use(){ return p.eventLoopUtilization(); } break; case 2: { const p = performance; return use(); } } }`],
      ["P-CASE-X2 switch a nivel MÓDULO (sin función envolvente)", `${W}let out:any;\nswitch(1){ case 1: function use(){ return p.eventLoopUtilization(); } const p = performance; out = use(); break; }\nexport { out };`],
    ])("%s → FLAG (seed rechazado con cuantificador)", (_n, code) => {
      expect(flagged(code)).toBe(true);
    });

    // Pin TDZ (Fable R6): la diferida es ∃-sobre-órdenes por DISEÑO — `g(); const p = performance;` (llamada
    // ANTES del const → ReferenceError universal en runtime, out-of-mandate) FLAGgea por ∃, misma clase que
    // forward-o2. Sin este pin, un futuro "arreglo del FP" reintroduce el order-gating por la puerta buena.
    it("pin TDZ: g(); const p=performance → FLAG (coste ∃-sobre-órdenes diseñado, no FP)", () => {
      expect(flagged(`${W}export function f(){ function g(){ return p.eventLoopUtilization(); } g(); const p = performance; }`)).toBe(true);
    });
  });

  // ---- H3 [MED] spread-de-object-literal en-sitio · CONTAINER ----
  describe("H3: spread-de-object-literal resoluble en-sitio + INV-PARITY array↔objeto", () => {
    it.each<[string, string, boolean]>([
      ["{...{m:perf}}.m.elu() → FLAG", `${W}export const x = ({ ...{ m: performance } }).m.eventLoopUtilization();`, true],
      ["{...{k:import.meta}}.k.dirname → FLAG", `${W}export const x = ({ ...{ k: import.meta } }).k.dirname;`, true],
      ["anidado {...{...{m:perf}}}.m → FLAG", `${W}export const x = ({ ...{ ...{ m: performance } } }).m.eventLoopUtilization();`, true],
      ["last-wins inverso {...{m:0}, m:perf}.m → FLAG", `${W}export const x = ({ ...{ m: 0 }, m: performance }).m.eventLoopUtilization();`, true],
      ["spread-de-VARIABLE {...b}.m → §141 SILENT", `${W}const b = { m: performance }; export const x = ({ ...b }).m.eventLoopUtilization();`, false],
      ["nested-blocked {...{...b}}.m → §141 SILENT", `${W}const b = { m: performance }; export const x = ({ ...{ ...b } }).m.eventLoopUtilization();`, false],
      ["last-wins safe {...{m:perf}, m:0}.m → SILENT", `${W}export const x = ({ ...{ m: performance }, m: 0 }).m;`, false],
    ])("%s", (_n, code, flag) => {
      expect(flagged(code)).toBe(flag);
    });

    // INV-PARITY (Fable R6, asciende a custodio): array↔objeto deben tener PARIDAD de trato del spread-de-literal.
    // La asimetría H3 vivió 2 rondas por falta de este test.
    it.each<[string, string, string]>([
      ["spread-literal", `[...[performance]][0]`, `({ ...{ m: performance } }).m`],
      ["directo (control)", `[performance][0]`, `({ m: performance }).m`],
    ])("INV-PARITY %s: array y objeto coinciden y FLAG", (_n, arr, obj) => {
      const a = flagged(`${W}export const x = ${arr}.eventLoopUtilization();`);
      const o = flagged(`${W}export const x = ${obj}.eventLoopUtilization();`);
      expect(a).toBe(o);
      expect(a).toBe(true);
    });
  });

  // ---- H4 [MED] near-miss M1 con puntuación pegada · MARKER ----
  describe("H4: markerNearMissLines borde SIMÉTRICO + normalizador FIX-4 · PRED-MARKER", () => {
    const fires = (src: string) =>
      markerNearMissLines(ts.createSourceFile("x.ts", src, ts.ScriptTarget.Latest, true)).length > 0;
    it.each<[string, string, boolean]>([
      ["trailing colon", "/* @server-safe: props */" + B, true],
      ["trailing semicolon", "/* @server-safe; x */" + B, true],
      ["trailing dot", "/* @server-safe. x */" + B, true],
      ["leading note:@server-safe", "/* note:@server-safe */" + B, true],
      ["leading (@server-safe)", "/* (@server-safe) */" + B, true],
      ["ZWSP pegado", "/*​@server-safe*/" + B, true],
      ["single-star + space (control previo)", "/* @server-safe props */" + B, true],
      ["multiline single-star + colon", "/*\n * @server-safe: n\n */" + B, true],
      ["negativo @server-safefoo", "/* @server-safefoo */" + B, false],
      ["negativo @server-safe-foo", "/* @server-safe-foo */" + B, false],
      ["negativo double-star (marker real)", "/** @server-safe: */" + B, false],
      ["negativo email me@server-safe.com", "/* ping me@server-safe.com */" + B, false],
    ])("%s", (_n, src, fire) => {
      expect(fires(src)).toBe(fire);
    });
  });

  // ---- H5 [MED] @server-safe EOF-orphan viola fail-loud · MARKER ----
  describe("H5: invariante generativo del marcador — todo @server-safe TS-parseado marca o LANZA · PRED-MARKER", () => {
    it("EOF-orphan (marker tras el último statement) → fail-loud, no no-op silencioso", () => {
      expect(() =>
        isContentServerSafeMarked("export const x = performance.eventLoopUtilization();\n/** @server-safe */", "x.ts"),
      ).toThrow(/posición no soportada/);
    });
    it("fichero-solo-marcador (sin statements) → fail-loud (comportamiento elegido)", () => {
      expect(() => isContentServerSafeMarked("/** @server-safe */", "x.ts")).toThrow(/posición no soportada/);
    });
    // Invariante GENERATIVO a DOMINIO COMPLETO (Auditoría B R6.1, opción 2): todo `@server-safe` bien-formado
    // según el clasificador (line-start), en CUALQUIER posición, o MARCA (top-level) o LANZA (else) — nunca skip
    // silencioso. El dominio son "posiciones que el DETECTOR VE por ENUMERACIÓN DE RANGOS" (no getJSDocTags — que
    // TS 6.0.3 del repo deja vacío en nested, medido P-ORACLE-SPLIT). Las 5 celdas nested + EOF + top-level.
    it.each<[string, string, "marks" | "throws"]>([
      ["pre-statement (top-level, línea propia)", "/** @server-safe */\nexport const x = 1;", "marks"],
      ["EOF-orphan", "export const x = 1;\n/** @server-safe */", "throws"],
      ["misma-línea tag hermano (M2)", "/** @internal @server-safe */\nexport const x = 1;", "throws"],
      ["prosa antes en la línea", "/** @internal foo @server-safe */\nexport const x = 1;", "throws"],
      ["nested: stmt en Block", "export function f(){ { /** @server-safe */ const z = performance.eventLoopUtilization(); return z; } }", "throws"],
      ["nested: stmt en cuerpo de función", "export function f(){ /** @server-safe */ const z = performance.eventLoopUtilization(); return z; }", "throws"],
      ["nested: función anidada", "export function f(){ /** @server-safe */ function g(){ return performance.eventLoopUtilization(); } return g; }", "throws"],
      ["nested: método de clase", "export class K { /** @server-safe */ m(){ return performance.eventLoopUtilization(); } }", "throws"],
      ["nested: property de clase", "export class K { /** @server-safe */ p = performance.eventLoopUtilization(); }", "throws"],
    ])("posición %s ⇒ %s (nunca silencioso)", (_n, src, outcome) => {
      if (outcome === "marks") {
        expect(isContentServerSafeMarked(src, "x.ts")).toBe(true);
      } else {
        expect(() => isContentServerSafeMarked(src, "x.ts")).toThrow();
      }
    });
    it("mensaje pedagógico: per-FICHERO no per-declaración", () => {
      expect(() =>
        isContentServerSafeMarked("export class K { /** @server-safe */ m(){ return 1; } }", "x.ts"),
      ).toThrow(/per-FICHERO|CABECERA/);
    });
    it("P-NEST-PROSE: mención en prosa nested → tolera (mismo bucket que P-M2-PROSE, position-agnostic)", () => {
      expect(
        isContentServerSafeMarked("export class K { /** helper; not yet @server-safe */ m(){ return 1; } }", "x.ts"),
      ).toBe(false);
    });
    // Par de ASIMETRÍA resuelto (antes: single-star nested avisaba, double-star nested callaba).
    it("asimetría resuelta: single-star nested → near-miss; double-star nested → misplaced (ambos fail-loud)", () => {
      const singleStar = "export class K { /* @server-safe */ m(){ return performance.eventLoopUtilization(); } }";
      const doubleStar = "export class K { /** @server-safe */ m(){ return performance.eventLoopUtilization(); } }";
      expect(
        markerNearMissLines(ts.createSourceFile("x.ts", singleStar, ts.ScriptTarget.Latest, true)).length,
      ).toBeGreaterThan(0); // single-star → near-miss
      expect(() => isContentServerSafeMarked(doubleStar, "x.ts")).toThrow(); // double-star → misplaced
    });
    // Multi-bloque (Δ2 anti-regresión): el fix NO cambió de oráculo a getJSDocTags (solo-último-bloque) — un
    // marker top-level seguido de OTRO JSDoc, o con un JSDoc nested benigno, sigue marcando.
    it.each<[string, string]>([
      ["marker top-level + segundo JSDoc top-level", "/** @server-safe */\nexport const a = 1;\n/** otro doc */\nexport const b = 2;"],
      ["marker top-level + método con @param nested (no es marker)", "/** @server-safe */\nexport class K { /** @param x */ m(x: number){ return x; } }"],
    ])("Δ2: %s → MARCA", (_n, src) => {
      expect(isContentServerSafeMarked(src, "x.ts")).toBe(true);
    });
  });

  // ---- H6 [MED] enum top-level fusionado con declare namespace · ERASE ----
  describe("H6: enum × ambient-sibling merge-elision (matriz emisor×orden) · PRED-ERASE", () => {
    // Oráculo de emit (Fable R6, oxc-transform 0.138 / esbuild 0.28 / tsc 6.0.3): OXC ELIDE el var del enum en
    // orden AMBIENT-FIRST → el read filtra al global (divergencia node-vs-Edge, in-mandate). tsc/esbuild emiten
    // local en ambos órdenes; OXC en enum-first emite local (crash universal, out-of-mandate). El gate flaggea
    // AMBOS órdenes = sobre-aproximación fail-closed (drift de emisores), no accidente. Aquí se pinea el GATE.
    it.each<[string, string, boolean]>([
      ["ambient-first (in-mandate, OXC elide) → FLAG", `${W}declare namespace performance { const q: number }\nenum performance { a }\nexport const out = () => performance.eventLoopUtilization();`, true],
      ["enum-first (out-of-mandate, sobre-aprox fail-closed) → FLAG", `${W}enum performance { a }\ndeclare namespace performance { const q: number }\nexport const out = () => performance.eventLoopUtilization();`, true],
      ["enum SIN ambient (binding local real) → SILENT", `${W}enum performance { a }\nexport const out = () => performance.eventLoopUtilization();`, false],
      ["ambient sibling de OTRO nombre (no colisiona) → SILENT", `${W}declare namespace performance { const q: number }\nenum foo { a }\nexport const out = () => foo.a;`, false],
    ])("%s", (_n, code, flag) => {
      expect(flagged(code)).toBe(flag);
    });
    it("regresión: namespace-value × ambient sigue FLAG; namespace normal instanciado SILENT", () => {
      expect(flagged(`${W}declare namespace performance { const q: number }\nnamespace performance { export const now = 1; }\nexport const out = () => performance.eventLoopUtilization();`)).toBe(true);
      expect(flagged(`${W}namespace performance { export const now = 1; }\nexport const out = () => performance.now;`)).toBe(false);
    });
  });
});

// ============================================================================
// Ronda 7 (Auditoría B) — 4 raíces cerradas (3 son regresiones del código R6/R6.1). Cada una con su PRED-X.
// ============================================================================
describe("server-safe gate — Ronda 7 (Auditoría B): 4 raíces + custodios", () => {
  const flagged = (code: string) =>
    checkSourceFile(code, "r7.fixture.tsx").length > 0;
  const W = "/** @server-safe */\n";

  // ---- R7-A [MED] enmascaramiento ∃ de la key: rama foldable-safe tapa rama irresoluble · KEY ----
  describe("R7-A: key incompleta (ternario safe + rama irresoluble) → conservador, no masked · PRED-KEY", () => {
    it.each<[string, string, boolean]>([
      ["read performance[c?'now':dyn]() masked → FLAG", `const c = Math.random() < 0.5; const dyn = "eventLoopUtilization"; export const x = performance[c ? "now" : dyn]();`, true],
      ["construct new WebAssembly[c?'Instance':mm](b) → FLAG", `const b = new Uint8Array(0); const c = Math.random() < 0.5; const mm = "Module"; export const x = new WebAssembly[c ? "Instance" : mm](b);`, true],
      ["Reflect.get(performance, c?'now':k) → FLAG", `const c = Math.random() < 0.5; const k = "eventLoopUtilization"; export const x = Reflect.get(performance, c ? "now" : k);`, true],
      ["ternario COMPLETO safe c?'now':'timeOrigin' → SILENT", `const c = Math.random() < 0.5; export const x = performance[c ? "now" : "timeOrigin"];`, false],
      ["ternario COMPLETO danger (ambos literales) → FLAG", `const c = Math.random() < 0.5; export const x = performance[c ? "now" : "eventLoopUtilization"]();`, true],
      ["dotted safe performance.now() → SILENT", `export const x = performance.now();`, false],
      ["variable-key sola performance[dyn]() → FLAG (conservador, ya lo hacía)", `const dyn = "eventLoopUtilization"; export const x = performance[dyn]();`, true],
    ])("%s", (_n, body, flag) => {
      expect(flagged(`${W}${body}`)).toBe(flag);
    });
  });

  // ---- R7-B [MED] cadena de DECLARACIÓN-alias multi-salto en la vista diferida · VIEW/TWOPASS ----
  describe("R7-B: seed diferido con PUNTO FIJO — cadena const-alias multi-salto · PRED-VIEW", () => {
    it.each<[string, string, boolean]>([
      ["two-hop fn q=p=performance → FLAG", `export function f(){ return q.eventLoopUtilization(); }\nconst p = performance;\nconst q = p;`, true],
      ["two-hop getter → FLAG", `export class Clock { get elapsed(){ return c.eventLoopUtilization(); } }\nconst p = performance;\nconst c = p;`, true],
      ["three-hop r=q=p=performance → FLAG", `export function f(){ return r.eventLoopUtilization(); }\nconst p = performance;\nconst q = p;\nconst r = q;`, true],
      ["two-hop WA construction → FLAG", `export function f(b:any){ return new W2.Module(b); }\nconst W1 = WebAssembly;\nconst W2 = W1;`, true],
      ["regresión one-hop (H2) → FLAG", `export function f(){ return p.eventLoopUtilization(); }\nconst p = performance;`, true],
      ["regresión forward two-hop → FLAG", `const p = performance; const q = p; export const x = q.eventLoopUtilization();`, true],
      ["§141 let-chain ASIGNACIÓN diferido → FLAG (∃-órdenes)", `export function f(){ let c:any; let d:any; function use(){ return c.eventLoopUtilization(); } d=performance; c=d; return use(); }`, true],
      ["const q=safeVar (no root) → SILENT", `export function f(){ return q.subtle; }\nconst p = crypto;\nconst q = p;`, false],
    ])("%s", (_n, body, flag) => {
      expect(flagged(`${W}${body}`)).toBe(flag);
    });
  });

  // ---- R7-C [MED] spread de object-literal: ∃-unión de alternativas, no last-wins overwrite · CONTAINER ----
  describe("R7-C: resolveKeyInLiteral ∃-une las alternativas del spread (INV-PARITY) · PRED-CONTAINER", () => {
    it.each<[string, string, boolean]>([
      ["disjunción danger-rama-1 {...(c?{k:WA.Module}:{k:Object})}.k → FLAG", `export function f(cond:boolean){return new (({...(cond ? {k: WebAssembly.Module} : {k: Object})}).k)(0);}`, true],
      ["disjunción danger-rama-2 (inverso) → FLAG", `export function f(cond:boolean){return new (({...(cond ? {k: Object} : {k: WebAssembly.Module})}).k)(0);}`, true],
      ["disjunción performance {...(c?{m:performance}:{m:Date})}.m.elu() → FLAG", `export function f(cond:boolean){return ({...(cond ? {m: performance} : {m: Date})}).m.eventLoopUtilization();}`, true],
      ["safe-only disjunción {...(c?{k:Object}:{k:Date})}.k → SILENT", `export function f(cond:boolean){return new (({...(cond ? {k: Object} : {k: Date})}).k)(0);}`, false],
      ["regresión H3 {...{m:performance}}.m.elu() → FLAG", `export const x = ({ ...{ m: performance } }).m.eventLoopUtilization();`, true],
      ["regresión last-wins safe {...{m:performance}, m:0}.m → SILENT", `export const x = ({ ...{ m: performance }, m: 0 }).m;`, false],
      ["regresión spread-de-VARIABLE §141 → SILENT", `const b = { m: performance }; export const x = ({ ...b }).m.eventLoopUtilization();`, false],
      ["gemelo array (INV-PARITY) [...(c?[WA.Module]:[Object])][0] → FLAG", `export function f(cond:boolean){return new ([...(cond ? [WebAssembly.Module] : [Object])][0])(0);}`, true],
    ])("%s", (_n, body, flag) => {
      expect(flagged(`${W}${body}`)).toBe(flag);
    });
  });

  // ---- R7-D [MED] enumeración de comentarios ROBUSTA a templates (scanner template-aware) · MARKER ----
  describe("R7-D: allBlockCommentRanges template-aware — un marker tras un template no se pierde · PRED-MARKER", () => {
    const M = (s: string) => {
      try {
        return isContentServerSafeMarked(s, "x.ts") ? "MARKED" : "silent";
      } catch {
        return "THROW";
      }
    };
    const fires = (s: string) =>
      markerNearMissLines(
        ts.createSourceFile("x.ts", s, ts.ScriptTarget.Latest, true),
      ).length > 0;
    it("template + marker en línea propia top-level → MARCA (no se pierde)", () => {
      expect(M("const s = `${1}`;\n/** @server-safe */\nexport const b = 2;")).toBe("MARKED");
    });
    it("template + marker double-star nested → THROW misplaced (no silent)", () => {
      expect(() =>
        isContentServerSafeMarked("const s = `${1}`;\nexport class K { /** @server-safe */ m(){ return performance.eventLoopUtilization(); } }", "x.ts"),
      ).toThrow(/posición no soportada/);
    });
    it("template + single-star nested → near-miss dispara", () => {
      expect(fires("export function B(p: any){ const c = `x-${p.v}`; /* @server-safe */ return c; }")).toBe(true);
    });
    it("template ANIDADO + marker → MARCA (scanner no se desincroniza)", () => {
      expect(M("const s = `a${`b${1}c`}d`;\n/** @server-safe */\nexport const b = 2;")).toBe("MARKED");
    });
    it("regresión SIN template: nested single-star → near-miss; nested double-star → misplaced", () => {
      expect(fires("export class K { /* @server-safe */ m(){ return 1; } }")).toBe(true);
      expect(() =>
        isContentServerSafeMarked("export class K { /** @server-safe */ m(){ return performance.eventLoopUtilization(); } }", "x.ts"),
      ).toThrow(/posición no soportada/);
    });
  });
});

// ============================================================================
// Ronda 7 — auditoría de Fable: BLOQUEO-A (subset,bit por polaridad), BLOQUEO-B (punto fijo), R7-D (getChildren).
// ============================================================================
describe("server-safe gate — R7 auditoría (Fable): BLOQUEO A/B + R7-D robusto", () => {
  const flagged = (code: string, fn = "r7b.fixture.tsx") =>
    checkSourceFile(code, fn).length > 0;
  const W = "/** @server-safe */\n";

  // ---- BLOQUEO A: (subset, bit-incompleto) por POLARIDAD de catálogo · KEY ----
  describe("BLOQUEO A: key incompleta = ∃(subset∩denegados) ∨ (incompleto ∧ polaridad-fail-closed)", () => {
    // Δ2: fixtures en AMBAS polaridades × {read, construct, Reflect}. R7-A pasó verde porque la suite miró un lado.
    it.each<[string, string, boolean]>([
      // DENYLIST (WebAssembly) con subset DENEGADO → FLAG por ∃-subset (mi return [] lo regresaba)
      ["denylist read subset-denegado WebAssembly[c?'compile':m]", `const c = Math.random() < 0.5; const m = "instantiate"; export const x = WebAssembly[c ? "compile" : m](new Uint8Array(0));`, true],
      ["denylist Reflect subset-denegado", `const c = Math.random() < 0.5; const k = "instantiate"; export const x = Reflect.get(WebAssembly, c ? "compile" : k);`, true],
      ["denylist construct subset-denegado new WebAssembly[c?'Module':m]", `const c = Math.random() < 0.5; const m = "Instance"; export const x = new WebAssembly[c ? "Module" : m](new Uint8Array(0));`, true],
      ["denylist construct fail-closed incompleto new WebAssembly[c?'Instance':mm]", `const c = Math.random() < 0.5; const mm = "Module"; export const x = new WebAssembly[c ? "Instance" : mm](new Uint8Array(0));`, true],
      // ALLOWLIST (performance) con subset SAFE + incompleto → FLAG por polaridad (masking R7-A original)
      ["allowlist read masking performance[c?'now':dyn]()", `const c = Math.random() < 0.5; const dyn = "eventLoopUtilization"; export const x = performance[c ? "now" : dyn]();`, true],
      ["allowlist Reflect masking Reflect.get(performance, c?'now':k)", `const c = Math.random() < 0.5; const k = "eventLoopUtilization"; export const x = Reflect.get(performance, c ? "now" : k);`, true],
      // DENYLIST con subset SAFE + incompleto → SILENT (renunciado, adjudicación #2)
      ["denylist renuncia WebAssembly[c?'validate':m] (safe+var)", `const c = Math.random() < 0.5; const m = "foo"; export const x = WebAssembly[c ? "validate" : m];`, false],
      // completos safe → SILENT (no sobre-flag); var-key allowlist → FLAG (ya)
      ["allowlist completo safe performance[c?'now':'timeOrigin']", `const c = Math.random() < 0.5; export const x = performance[c ? "now" : "timeOrigin"];`, false],
      ["allowlist var-key sola performance[dyn]()", `const dyn = "eventLoopUtilization"; export const x = performance[dyn]();`, true],
      // menor: gOPD partial key — rama resoluble peligrosa → FLAG vía subset
      ["gOPD(import.meta, c?'dirname':dyn).value", `const c = Math.random() < 0.5; const dyn = "x"; export const v = Object.getOwnPropertyDescriptor(import.meta, c ? "dirname" : dyn).value;`, true],
    ])("%s", (_n, body, flag) => {
      expect(flagged(`${W}${body}`)).toBe(flag);
    });
  });

  // ---- BLOQUEO B: punto fijo while-stable + unión (no cota-por-statements) · VIEW ----
  describe("BLOQUEO B: cadena de declaración-alias — punto fijo también intra-statement y en bloques", () => {
    it.each<[string, string, boolean]>([
      // intra-statement por comas (excede cualquier cota-por-#statements = el cap falso de BLOQUEO-1)
      ["comma-chain 5-hop en 1 statement diferido", `export function f(){ return e.eventLoopUtilization(); }\nconst a = performance, b = a, c = b, d = c, e = d;`, true],
      ["comma-chain 3-hop diferido", `export function f(){ return r.eventLoopUtilization(); }\nconst p = performance, q = p, r = q;`, true],
      // sibling declAliasesOf: cadena const DENTRO de un bloque / CaseBlock
      ["block-chain {const A=perf;const B=A;c=B} c.elu()", `export function f(){ let c:any; { const A = performance; const B = A; c = B; } return c.eventLoopUtilization(); }`, true],
      ["block-chain 3-hop {A;B=A;C=B;c=C}", `export function f(){ let c:any; { const A = performance; const B = A; const C = B; c = C; } return c.eventLoopUtilization(); }`, true],
      ["CaseBlock-chain {case1: const A=perf;const B=A;c=B}", `export function f(k:number){ let c:any; switch(k){ case 1: { const A = performance; const B = A; c = B; } break; } return c.eventLoopUtilization(); }`, true],
      // regresión: multi-hop separado (R7-B) + §141 asignación + shadow
      ["separado two-hop q=p=performance diferido", `export function f(){ return q.eventLoopUtilization(); }\nconst p = performance;\nconst q = p;`, true],
      ["§141 let-chain asignación diferido", `export function f(){ let c:any; let d:any; function use(){ return c.eventLoopUtilization(); } d = performance; c = d; return use(); }`, true],
      ["block shadow local safe (descendCtx) → SILENT", `export function f(){ let c:any; function use(){ return c.eventLoopUtilization(); } const x = performance; { let x:any = { eventLoopUtilization(){ return 0; } }; c = x; } return use(); }`, false],
    ])("%s", (_n, body, flag) => {
      expect(flagged(`${W}${body}`)).toBe(flag);
    });
  });

  // ---- R7-D: enumeración de comentarios por TOKENS (getChildren) — robusta a regex/JSX/templates ----
  describe("R7-D: allBlockCommentRanges robusto (regex/JSX/template) sin punto ciego class-member", () => {
    const M = (s: string, k = "x.ts") => {
      try {
        return isContentServerSafeMarked(s, k) ? "MARKED" : "silent";
      } catch (e) {
        return /posición no soportada/.test((e as Error).message) ? "THROW" : "THROW2";
      }
    };
    const fires = (s: string, k = "x.tsx") =>
      markerNearMissLines(
        ts.createSourceFile(k, s, ts.ScriptTarget.Latest, true, k.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS),
      ).length > 0;
    it("INTERSECCIÓN regex + class-member double-star → misplaced (no silent)", () => {
      expect(M("const re = /a}`b/;\nexport class K { /** @server-safe */ m(){ return performance.eventLoopUtilization(); } }")).toBe("THROW");
    });
    it("regex + single-star → near-miss dispara", () => {
      expect(fires("const re = /x}`/;\n/* @server-safe */\nexport const x=1;")).toBe(true);
    });
    it("JSX-text brace + single-star → near-miss dispara", () => {
      expect(fires('export const E = () => <div>{"}"} t</div>;\n/* @server-safe */\nexport const x=1;')).toBe(true);
    });
    it("template + nested double-star → misplaced; marker línea propia → marca", () => {
      expect(M("const s = `${1}`;\nexport class K { /** @server-safe */ m(){ return performance.eventLoopUtilization(); } }")).toBe("THROW");
      expect(M("const s = `${1}`;\n/** @server-safe */\nexport const b = 2;")).toBe("MARKED");
    });
    it("regresión: class-member single-star/double-star + EOF-orphan + control", () => {
      expect(fires("export class K { /* @server-safe */ m(){ return 1; } }")).toBe(true);
      expect(M("export class K { /** @server-safe */ m(){ return performance.eventLoopUtilization(); } }")).toBe("THROW");
      expect(M("export const x=1;\n/** @server-safe */")).toBe("THROW");
      expect(M("/** @server-safe */\nexport const z=1;")).toBe("MARKED");
    });
  });
});

// ============================================================================
// R7 — añadidos de acta de Fable: asimetría read/construct DOCUMENTADA, corpus del enumerador, custodios de clase.
// ============================================================================
describe("server-safe gate — R7 acta: asimetría documentada + corpus enumerador + custodios de clase", () => {
  const flagged = (code: string, fn = "r7a2.fixture.tsx") =>
    checkSourceFile(code, fn).length > 0;
  const W = "/** @server-safe */\n";

  // ---- (1) DOCUMENTED-ASYMMETRY: read renuncia vs construct fail-cierra en denylist con key desconocida ----
  // NO es inconsistencia de polaridad — es DISEÑO (ver ADR §R7): el espacio de ctors WASM es minúsculo (fail-closed
  // barato) y la construcción WASM es el hazard MÁS severo del catálogo (codegen present-but-throws). El bit de
  // incompletitud extiende el fail-closed preexistente de construcción; el read mantiene la renuncia (adjudicación #2).
  describe("documented-asymmetry: WebAssembly[m] read=renuncia vs new WebAssembly[m] construct=fail-closed", () => {
    it("read con key VARIABLE → SILENT (renuncia, polaridad denylist)", () => {
      expect(flagged(`${W}const m = "compile"; export const x = WebAssembly[m](new Uint8Array(0));`)).toBe(false);
    });
    it("construct con key VARIABLE → FLAG (fail-cierra en ctor desconocido)", () => {
      expect(flagged(`${W}const m = "Module"; export const x = new WebAssembly[m](new Uint8Array(0));`)).toBe(true);
    });
    it("read INCOMPLETO safe+var → SILENT; construct INCOMPLETO safe+var → FLAG (mismo par, el bit extiende)", () => {
      expect(flagged(`${W}const c = Math.random() < 0.5; const m = "x"; export const r = WebAssembly[c ? "validate" : m];`)).toBe(false);
      expect(flagged(`${W}const c = Math.random() < 0.5; const m = "x"; export const r = new WebAssembly[c ? "Instance" : m](new Uint8Array(0));`)).toBe(true);
    });
  });

  // ---- (2) CORPUS del enumerador: JSX comments (idiomático React) + combo de las celdas que mataron scanner+unión ----
  describe("corpus enumerador: JSX comments + combo (regex+template+JSX+class-member) — custodio permanente", () => {
    const M = (s: string, k = "x.tsx") => {
      try {
        return isContentServerSafeMarked(s, k) ? "MARKED" : "silent";
      } catch (e) {
        return /posición no soportada/.test((e as Error).message) ? "THROW" : "THROW2";
      }
    };
    const fires = (s: string, k = "x.tsx") =>
      markerNearMissLines(
        ts.createSourceFile(k, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
      ).length > 0;
    it("JSX single-star {/* @server-safe */} → near-miss dispara (forma idiomática React)", () => {
      expect(fires("export const E = () => <div>{/* @server-safe */}txt</div>;\nexport const x = performance.eventLoopUtilization();")).toBe(true);
    });
    it("JSX double-star {/** @server-safe */} → misplaced (nested en JsxExpression)", () => {
      expect(M("export const E = () => <div>{/** @server-safe */}txt</div>;\nexport const x = performance.eventLoopUtilization();")).toBe("THROW");
    });
    it("COMBO near-miss: regex + template + JSX ANTES de un class-member single-star → dispara igual", () => {
      const combo =
        "const re = /a}`b/;\nconst t = `x${re.source}y`;\nexport const E = () => <div>{/* c */}{t}</div>;\nexport class K { /* @server-safe */ m(){ return 1; } }";
      expect(fires(combo)).toBe(true);
    });
    it("COMBO misplaced: regex + template + JSX ANTES de un class-member double-star → misplaced igual", () => {
      const combo =
        "const re = /a}`b/;\nconst t = `x${re.source}y`;\nexport const E = () => <div>{/* c */}{t}</div>;\nexport class K { /** @server-safe */ m(){ return performance.eventLoopUtilization(); } }";
      expect(M(combo)).toBe("THROW");
    });
    it("COMBO marca: marker top-level SOBREVIVE a regex+template+JSX posteriores (range-scan no falsea)", () => {
      const combo =
        "/** @server-safe */\nexport const A = 1;\nconst re = /a}`b/;\nconst t = `x${re.source}y`;\nexport const E = () => <div>{/* c */}{t}</div>;";
      expect(M(combo)).toBe("MARKED");
    });
  });

  // ---- (3) META-LINT de clase (confirmación a): prohíbe la COTA FALSA `iter <= X.length` en loops de resolución ----
  it("meta-lint: ningún fixed-point de resolución usa cota `iter <= *.length` (3ª aparición del patrón — BLOQUEO-1/B)", () => {
    const gate = readFileSync(
      `${process.cwd()}/scripts/check-server-safe-markers.mjs`,
      "utf8",
    );
    // Cinturón sintáctico de los custodios BEHAVIORAL (comma-5-hop / block-chain): una cota por longitud-de-array
    // en un contador de punto-fijo es sub-punto-fijo silencioso. Los loops legítimos son `while (changed)` o
    // `for (let iter…; iter <= cap` con `cap` = nº REAL de nodos de la cadena. Matchea SOLO la CABECERA
    // `for (let iter = 0; … <= X.length` (la forma EXACTA del anti-patrón), NO la prosa que lo documenta (L3230
    // del gate cita `iter <= statements.length` como cota FALSA) ni `arr[arr.length-1]`.
    expect(gate).not.toMatch(
      /for\s*\(\s*let\s+iter\s*=\s*0\s*;[^;)]*<=\s*[\w.]+\.length/,
    );
  });
});

// ============================================================================
// R8 — custodios ampliados (capa RECOGNIZER). Escritos ANTES de los fixes (protocolo pre-registrado):
// fallan ahora, los fixes los ponen verdes. Clasificación MEDIDA (runtime own+enum) — incluye out-of-mandate
// (SILENT-correcto pineado) y over-aproximación fail-closed documentada.
// ============================================================================
describe("server-safe gate — R8 custodios (recognizer bajo invariantes)", () => {
  const flagged = (code: string, fn = "r8.fixture.tsx") =>
    checkSourceFile(`/** @server-safe */\n${code}`, fn).length > 0;

  // ---- MEC-A · INV-WRAP gana el eje deref-de-resultado-de-sonda-`?.()` (value-transparent, no solo erased) ----
  describe("MEC-A: deref del resultado de una sonda ?.() tras wrapper value-transparent → FLAG", () => {
    // matriz: wrapper {ternario,coma,&&,||,asignación} × deref {.p,[k],()} sobre partial-deny root (performance).
    // E = `performance.eventLoopUtilization?.()`.
    it.each<[string, string, boolean]>([
      ["ternario .p  (c ? E : o).foo", `export function f(o,c){ return (c ? performance.eventLoopUtilization?.() : o).foo; }`, true],
      ["ternario [k] (c ? E : o)['foo']", `export function f(o,c){ return (c ? performance.eventLoopUtilization?.() : o)["foo"]; }`, true],
      ["ternario ()  (c ? E : o)()", `export function f(o,c){ return (c ? performance.eventLoopUtilization?.() : o)(); }`, true],
      ["coma  (0, E).foo", `export function f(){ return (0, performance.eventLoopUtilization?.()).foo; }`, true],
      ["and   (E && o).foo", `export function f(o){ return (performance.eventLoopUtilization?.() && o).foo; }`, true],
      // R9-4b CORRECCIÓN (custodio R8 defendía un BUG): oráculo runtime `(E || o).foo` — E undefined en Edge → `||`
      // cae a `o` → `o.foo` SEGURO → SILENT. `||`-izq = rama de RESCATE, no deref. El expected sale del oráculo.
      ["or    (E || o).foo → SILENT", `export function f(o){ return (performance.eventLoopUtilization?.() || o).foo; }`, false],
      ["asign (o.x = E).foo", `export function f(o){ return (o.x = performance.eventLoopUtilization?.()).foo; }`, true],
      ["reflective bajo ternario (true ? Object.create(perf) : 0).elu()", `export const a = (true ? Object.create(performance) : 0).eventLoopUtilization();`, true],
      // frontera §141 pineada: el deref es del RETORNO de g, no del resultado de la sonda → SILENT correcto
      ["wrapper-consume g(E).foo → SILENT", `export function f(o){ function g(z){return o;} return g(performance.eventLoopUtilization?.()).foo; }`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- MEC-B · reflectiveValueReads: tres familias con condición de aplicabilidad distinta (matriz MEDIDA) ----
  describe("MEC-B: catálogo reflexivo tres-familias (identity-return / proto-walk / own-copy)", () => {
    it.each<[string, string, boolean]>([
      // identity-return (arg0/target idéntico → cadena intacta → cualquier miembro) → FLAG
      ["identity freeze read WA.compile", `export const x = Object.freeze(WebAssembly).compile;`, true],
      ["identity freeze call perf.elu()", `export const x = Object.freeze(performance).eventLoopUtilization();`, true],
      ["identity seal perf.elu()", `export const x = Object.seal(performance).eventLoopUtilization();`, true],
      ["identity preventExtensions perf.elu()", `export const x = Object.preventExtensions(performance).eventLoopUtilization();`, true],
      ["identity defineProperty(perf) target.elu()", `export const x = Object.defineProperty(performance,"z",{value:1}).eventLoopUtilization();`, true],
      ["identity defineProperties(perf) target.elu()", `export const x = Object.defineProperties(performance,{}).eventLoopUtilization();`, true],
      ["identity freeze construct new(WA).Module", `const b=new Uint8Array(8); export const x = new (Object.freeze(WebAssembly)).Module(b);`, true],
      // proto-walk (R como prototipo → lee heredado) → FLAG
      ["proto setPrototypeOf({},perf).elu()", `export const x = Object.setPrototypeOf({}, performance).eventLoopUtilization();`, true],
      ["proto getPrototypeOf(create(perf)).elu()", `export const x = Object.getPrototypeOf(Object.create(performance)).eventLoopUtilization();`, true],
      ["proto __proto__ literal .elu()", `export const x = ({__proto__: performance}).eventLoopUtilization();`, true],
      // B3 composición que LEE (medido runtime = función) → FLAG
      ["compose create∘create WA.compile", `export const x = Object.create(Object.create(WebAssembly)).compile;`, true],
      ["compose {...{...WA}}.compile (own+enum)", `export const x = ({...{...WebAssembly}}).compile;`, true],
      ["compose freeze(create(WA)).compile", `export const x = Object.freeze(Object.create(WebAssembly)).compile;`, true],
      // own-copy que ALCANZA (own+ENUMERABLE) → FLAG-genuino
      ["own-copy {...WA}.compile (own+enum)", `export const x = ({...WebAssembly}).compile;`, true],
      ["own-copy {...console}.table (own+enum)", `export const x = ({...console}).table;`, true],
      // own-copy que NO alcanza en runtime → OUT-OF-MANDATE, SILENT-correcto (NO fixear = sería FP). PINEADO.
      ["OOM assign({},create(WA)).compile → SILENT", `export const x = Object.assign({}, Object.create(WebAssembly)).compile;`, false],
      ["OOM {...create(WA)}.compile → SILENT", `export const x = ({...Object.create(WebAssembly)}).compile;`, false],
      // negativos de catálogo: Reflect.defineProperty/setPrototypeOf devuelven boolean → NO añadir → SILENT
      ["NEG Reflect.defineProperty → SILENT", `export const x = Reflect.defineProperty(performance,"z",{value:1});`, false],
      ["NEG Reflect.setPrototypeOf → SILENT", `export const x = Reflect.setPrototypeOf(performance, null);`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
    // R16: own-copy de performance no fabrica miembros heredados/non-enumerable.
    it("{...performance}.elu() → SILENT (elu heredado, undefined en la copia)", () => {
      expect(flagged(`export const x = ({...performance}).eventLoopUtilization();`)).toBe(false);
    });
  });

  // ---- MEC-C · ∃ completo en destructure-default + spread-drop ----
  describe("MEC-C: ∃ sobre roots en destructure-default (C1) + spread en enum conservadora (C2)", () => {
    it.each<[string, string, boolean]>([
      ["C1 bug multi-rama+default {compile=fb}=c?perf:WA", `export function f(c){ const {compile = () => 0} = c ? performance : WebAssembly; return compile; }`, true],
      ["C1 cross-family {createObjectURL=fb}=c?console:URL", `export function f(c){ const {createObjectURL = () => 0} = c ? console : URL; return createObjectURL; }`, true],
      // no regresar: absence-only con default en TODOS los roots → SILENT (el default se activa, seguro)
      ["C1 absence-only {measure=fb}=c?perf:console → SILENT", `export function f(c){ const {measure = () => 0} = c ? performance : console; return measure; }`, false],
      ["C1 single-root+default present-throws {compile=fb}=WA", `export function f(){ const {compile = () => 0} = WebAssembly; return compile; }`, true],
      // C2 spread-drop: key irresoluble sobre {...{a:R}} → los tres sinks
      ["C2 read {...{a:perf}}[k].elu()", `export function f(k){ return ({...{a:performance}})[k].eventLoopUtilization(); }`, true],
      ["C2 construct new({...{a:WA}})[k].Module()", `export function f(k,u){ return new (({...{a:WebAssembly}})[k]).Module(u); }`, true],
      ["C2 import {...{a:'node:fs'}}[k]", `export function f(k){ return import(({...{a:"node:fs"}})[k]); }`, true],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- MEC-D · param-hermano en el default de un param posterior (extiende el mecanismo body-read L2R) ----
  describe("MEC-D: alias de param-hermano visible en el default de un param posterior", () => {
    it.each<[string, string, boolean]>([
      ["param-sibling eager f(p=perf, x=p.elu())", `export function f(p=performance, x=p.eventLoopUtilization()){ return x; }`, true],
      ["param-sibling closure f(p=perf, x=()=>p.elu())", `export function f(p=performance, x=()=>p.eventLoopUtilization()){ return x; }`, true],
      // no regresar: body-read (ya FLAG) + destructured (ya FLAG)
      ["body-read f(p=perf){ p.elu() }", `export function f(p = performance){ return p.eventLoopUtilization(); }`, true],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- MEC-E · degradación de cap: excedido → fail-closed, JAMÁS fail-open ----
  describe("MEC-E: cap de profundidad excedido degrada fail-closed (blocked), no oculta el root", () => {
    const nest = (n: number, inner: string) => "[...".repeat(n) + inner + "]".repeat(n);
    it("17 spreads anidados read → FLAG (no dropea el root)", () => {
      expect(flagged(`export const x = ${nest(17, "[performance]")}[0].eventLoopUtilization();`)).toBe(true);
    });
    it("17 spreads anidados construct → FLAG", () => {
      expect(flagged(`export const x = new ${nest(17, "[WebAssembly]")}[0].Module();`)).toBe(true);
    });
    it("cap fail-closed no invierte: 5 spreads normales siguen FLAG (no over-block espurio)", () => {
      expect(flagged(`export const x = ${nest(5, "[performance]")}[0].eventLoopUtilization();`)).toBe(true);
    });
    // Custodio DURABLE (Auditoría B R8, adjudicado en vez del meta-lint sintáctico — la dirección de degradación
    // es semántica, no matcheable por regex): un fixture conductual PROFUNDO (muy por encima de cualquier cota
    // razonable) revienta si alguien reintroduce un cap que degrade FAIL-OPEN. La doctrina escrita + la tabla
    // custodio-audit + este fixture son el guardián; un lint sintáctico de "return de lo acumulado" dispararía
    // sobre recursión legítima por todo el gate (bajo valor, no se añade).
    it("40 spreads anidados read → FLAG (guarda contra reintroducir un cap fail-open)", () => {
      expect(flagged(`export const x = ${nest(40, "[performance]")}[0].eventLoopUtilization();`)).toBe(true);
    });
    it("40 spreads anidados construct → FLAG", () => {
      expect(flagged(`export const x = new ${nest(40, "[WebAssembly]")}[0].Module();`)).toBe(true);
    });
  });
});

// ============================================================================
// R9 — custodios ampliados (protocolo pre-registrado B-con-tope). Fallan ahora, los fixes los ponen verdes.
// DOCTRINA 4b: los valores esperados se derivan del ORÁCULO DE RUNTIME (medido en Node), jamás del fix.
// ============================================================================
describe("server-safe gate — R9 custodios", () => {
  const flagged = (code: string, fn = "r9.fixture.tsx") =>
    checkSourceFile(`/** @server-safe */\n${code}`, fn).length > 0;
  const nestSpread = (n: number) => "{..." .repeat(n) + "{p: performance}" + "}".repeat(n);
  const nestFreeze = (n: number) => "Object.freeze(".repeat(n) + "performance" + ")".repeat(n);
  const nestObj = (n: number) => "{...".repeat(n) + "{a: performance}" + "}".repeat(n);

  // ---- CAUSA 1 · Reflect.get comparte el resolver de familias (reflectiveCarrierSources) con sus hermanos ----
  describe("Causa 1: Reflect.get sobre carrier reflexivo → FLAG (mismo cableado que member-read/construct)", () => {
    it.each<[string, string, boolean]>([
      ["identity freeze", `export const x = Reflect.get(Object.freeze(performance), "eventLoopUtilization");`, true],
      ["proto create", `export const x = Reflect.get(Object.create(performance), "eventLoopUtilization");`, true],
      ["proto setPrototypeOf", `export const x = Reflect.get(Object.setPrototypeOf({}, performance), "eventLoopUtilization");`, true],
      ["proto __proto__", `export const x = Reflect.get({__proto__: performance}, "eventLoopUtilization");`, true],
      ["compose getPrototypeOf∘create", `export const x = Reflect.get(Object.getPrototypeOf(Object.create(performance)), "eventLoopUtilization");`, true],
      ["denylist WA freeze", `export const x = Reflect.get(Object.freeze(WebAssembly), "compile");`, true],
      // R16: performance no aporta own-enumerable string members; Reflect.get observa undefined.
      ["own-copy Reflect.get({...perf}) → SILENT", `export const x = Reflect.get({...performance}, "eventLoopUtilization");`, false],
      // OOM real (own-copy sobre PROTO-CARRIER = sin own props = undefined runtime) → SILENT-correcto, NO tocar
      ["OOM Reflect.get(assign({},create(R))) → SILENT", `export const x = Reflect.get(Object.assign({}, Object.create(performance)), "eventLoopUtilization");`, false],
      // §141 pineado: DENYLIST (WebAssembly) + key variable → renunciado (asimetría read/construct #2)
      ["§141 denylist+keyvar Reflect.get(freeze(WA),k) → SILENT", `export function f(k:string){ return Reflect.get(Object.freeze(WebAssembly), k); }`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- CAUSA 2 · paridad de proyección posicional: Reflect.get(lit,lit) + array.at(0) se pliegan como [X][0] ----
  describe("Causa 2: proyección posicional gemela → FLAG (INV-PARITY forma-de-proyección)", () => {
    it.each<[string, string, boolean]>([
      ["Reflect.get([X],'0') member-read", `export const x = Reflect.get([performance],"0").eventLoopUtilization();`, true],
      ["Reflect.get({p:X},'p') member-read", `export const x = Reflect.get({p:performance},"p").eventLoopUtilization();`, true],
      ["[X].at(0) member-read", `export const x = [performance].at(0).eventLoopUtilization();`, true],
      ["[WA].at(0) codegen-member read", `export const x = [WebAssembly].at(0).compile;`, true],
      // R16: `.at(i)` comparte precisión posicional con `[i]` para enteros literales (también negativos).
      // Solo un índice variable/float conserva el descenso ∃ fail-closed.
      ["[X,safe].at(1) preciso → SILENT", `export const x = [performance, 0].at(1).valueOf();`, false],
      ["Δ2 gemelo preciso [X,safe][1] → SILENT", `export const x = [performance, 0][1].valueOf();`, false],
      ["import(Reflect.get(['node:fs'],'0'))", `export const x = import(Reflect.get(["node:fs"],"0"));`, true],
      ["new ([WA].at(0)).Module() construct", `export const x = new ([WebAssembly].at(0)).Module();`, true],
      // fail-closed: container o key/índice variable → §141 SILENT
      // container LITERAL + key/índice VARIABLE → ∃-descenso fail-closed (consistente con `[X][k]`) → FLAG.
      ["literal+keyvar Reflect.get([X],k) → FLAG", `export function f(k:string){ return Reflect.get([performance],k).eventLoopUtilization(); }`, true],
      ["literal+idxvar [X].at(i) → FLAG", `export function f(i:number){ return [performance].at(i).eventLoopUtilization(); }`, true],
      // §141 REAL: container vía VARIABLE (data-flow) → renunciado → SILENT.
      ["§141 container-VARIABLE Reflect.get(c,'0') → SILENT", `export function f(){ const c=[performance]; return Reflect.get(c,"0").eventLoopUtilization(); }`, false],
      ["§141 container-VARIABLE a.at(0) → SILENT", `export function f(){ const a=[performance]; return a.at(0).eventLoopUtilization(); }`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- CAUSA 3 · provenance de iteración for-of sobre literal inline (extracción posicional del destructuring) ----
  describe("Causa 3: for-of sobre array-literal inline → FLAG (variable-iterable sigue §141)", () => {
    it.each<[string, string, boolean]>([
      ["const p of [perf]", `for (const p of [performance]) { p.eventLoopUtilization(); } export const x = 1;`, true],
      ["let p reassign of [perf]", `let p:any; for (p of [performance]) { p.eventLoopUtilization(); } export const x = 1;`, true],
      ["const M of [WA] construct", `for (const M of [WebAssembly]) { new M.Module(); } export const x = 1;`, true],
      // RESIDUAL (R9→limitations, Δ1 Fable): el head de un for-of (`for (p of …)`) NO es un AssignmentExpression
      // y NO está en el conjunto de operadores que enumera D1-b para la unión monotónica de taint (`=`, `??=`,
      // `||=`, `&&=`) → la reasignación del loop-var queda FUERA del dominio de la unión por la LETRA de la
      // frontera firmada. (NO es "el gate no propaga reasignaciones de cuerpo-de-loop": un `p = performance`
      // explícito en el body SÍ hoistea y flaggea post-loop — fixture B del #7.) El caso IN-BODY (arriba) SÍ se
      // modela (Causa 3, vía scopePartialAliases del body). Pin SILENT defendible; enmienda a rc.2 = añadir el
      // head de for-of al conjunto de operadores (firma Iván, toca D1-b).
      ["use-after-loop (for-of head fuera del set D1-b) → SILENT", `let p:any; for (p of [performance]) {} p.eventLoopUtilization(); export const x = 1;`, false],
      // §141: iterable por VARIABLE (data-flow) → SILENT-correcto
      ["§141 variable-iterable → SILENT", `const arr=[performance]; for (const p of arr) { p.eventLoopUtilization(); } export const x = 1;`, false],
      // for-in (key=string, member undefined universal) → out-of-mandate SILENT
      ["for-in → SILENT (out-of-mandate)", `for (const k in [performance]) { k; } export const x = 1;`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- 4b · FP de disyunción/fusión: el ascenso cruza el operando izq SOLO en conjunción (RELEASE-RELEVANTE) ----
  describe("4b: sonda ?.() bajo ||/?? a la IZQUIERDA = rescate → SILENT; && a la izq = deref → FLAG", () => {
    const E = "performance.eventLoopUtilization?.()";
    it.each<[string, string, boolean]>([
      // ORÁCULO RUNTIME: (E || o).foo — E undefined en Edge → || → o → o.foo SEGURO; E truthy en Node → E.foo (num, sin crash) → SILENT
      ["|| left (E||o).foo → SILENT", `export function f(o){ return (${E} || o).foo; }`, false],
      ["?? left (E??o).foo → SILENT", `export function f(o){ return (${E} ?? o).foo; }`, false],
      ["|| left [k] (E||o)['x'] → SILENT", `export function f(o){ return (${E} || o)["x"]; }`, false],
      // && a la izq: E falsy en Edge → && → E (undefined) → deref crashea → FLAG (MEC-A intacto)
      ["&& left (E&&o).foo → FLAG (MEC-A)", `export function f(o){ return (${E} && o).foo; }`, true],
      // consejo del propio gate (?? fallback / ?.()) NO se auto-flaggea
      ["?? fallback directo (consejo gate) → SILENT", `export const x = ${E} ?? 0;`, false],
      ["|| fallback directo → SILENT", `export const x = ${E} || 0;`, false],
      // el deref-directo del probe sigue FLAG (no romper el core de MEC-A)
      ["deref directo (E).foo → FLAG", `export function f(){ return (${E}).foo; }`, true],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- 4c · el ∃ present-throws del destructure-default cuantifica también sobre las alternativas de CLAVE ----
  describe("4c: destructure-default con clave COMPUTADA multi-alternativa → ∃ sobre roots × claves", () => {
    it.each<[string, string, boolean]>([
      ["clave computada present-throws {[c?mark:compile]:fn=fb}=b?perf:WA", `export function f(c:boolean,b:boolean){ const {[c?"mark":"compile"]:fn=()=>0}=b?performance:WebAssembly; return fn; }`, true],
      // no regresar: clave computada absence-only en todos → SILENT
      ["clave computada absence-only → SILENT", `export function f(c:boolean){ const {[c?"mark":"measure"]:fn=()=>0}=performance; return fn; }`, false],
      // regresión C1 (clave fija) intacta
      ["C1 clave fija {compile=fb}=b?perf:WA → FLAG", `export function f(b:boolean){ const {compile=()=>0}=b?performance:WebAssembly; return compile; }`, true],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- 4a · doctrina de degradación aplicada al CONJUNTO COMPLETO de caps (custodio conductual profundo/sitio) ----
  describe("4a: los tres helpers recursivos con cap degradan sin fail-open (custodio profundo por sitio)", () => {
    // reflectiveCarrierSources (L4283, depth>64): 70 Object.freeze anidados → el root sigue alcanzable
    it("reflectiveCarrierSources: 70 freeze anidados → FLAG (no return [] fail-open)", () => {
      expect(flagged(`export const x = Reflect.get(${nestFreeze(70)}, "eventLoopUtilization");`)).toBe(true);
    });
    it("member-read directo 70 freeze anidados → FLAG", () => {
      expect(flagged(`export const x = ${nestFreeze(70)}.eventLoopUtilization();`)).toBe(true);
    });
    // resolveKeyInLiteral (L4566, depth>16): 20 spreads de objeto anidados → el root sigue alcanzable
    it("resolveKeyInLiteral: 20 object-spreads anidados → FLAG (no blocked-como-fail-open)", () => {
      expect(flagged(`export const x = (${nestSpread(20)}).p.eventLoopUtilization();`)).toBe(true);
    });
    // allObjectLiteralValuesDeep (L3961, depth>64): 70 object-spreads + key irresoluble → root alcanzable
    it("allObjectLiteralValuesDeep: 70 object-spreads + key var → FLAG (no return out fail-open)", () => {
      expect(flagged(`export function f(k:string){ return (${nestObj(70)})[k].eventLoopUtilization(); }`)).toBe(true);
    });
  });
});

// ============================================================================
// R10 — custodios (Fable autorizó fixear la ronda, no-bloqueante). Fallan ahora, los fixes los ponen verdes.
// Expected desde el ORÁCULO de runtime (doctrina R9-4b).
// ============================================================================
describe("server-safe gate — R10 custodios", () => {
  const flagged = (code: string, fn = "r10.fixture.tsx") =>
    checkSourceFile(`/** @server-safe */\n${code}`, fn).length > 0;

  // ---- PROBE+CRITIC · consumers del resultado de `R.m?.()` que deref'an (crash sobre undefined en Edge) ----
  describe("PROBE: destructure/spread/for-of/new del resultado de una safe-probe → FLAG", () => {
    const E = "performance.eventLoopUtilization?.()";
    const G = "performance.getEntries?.()";
    it.each<[string, string, boolean]>([
      ["destructure {x}=R.m?.()", `const {utilization} = ${E};`, true],
      ["array-destructure [x]=R.m?.()", `const [a] = ${G};`, true],
      ["array-spread [...R.m?.()]", `const z = [...${G}];`, true],
      ["for-of R.m?.()", `for (const x of ${G}) {} export const q = 1;`, true],
      ["new (R.m?.())()", `export const x = new (performance.timerify?.(function(){}))();`, true],
      // controles (no romper): deref paren-directo ya FLAG; probe suelto safe SILENT; formas de remediación SILENT
      ["control (probe).foo → FLAG", `export const x = (${E}).idle;`, true],
      ["control probe suelto → SILENT", `export const x = ${E};`, false],
      ["remediación ?? fallback → SILENT", `export const x = ${E} ?? 0;`, false],
      ["remediación default-destructure {x=fb}=perf → SILENT", `export function f(){ const {eventLoopUtilization = () => 0} = performance; return eventLoopUtilization; }`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- REFLECT · gOPD(carrier(R)).value une reflectiveCarrierSources (= Causa 1 en la rama descriptor) ----
  describe("REFLECT: gOPD/gOPDs(carrier(R)).value → FLAG (carrier reflexivo bajo el descriptor)", () => {
    it.each<[string, string, boolean]>([
      ["gOPD(freeze(import.meta)).value", `export const x = Object.getOwnPropertyDescriptor(Object.freeze(import.meta), "dirname").value;`, true],
      ["gOPD(freeze(WA),'compile').value", `export const x = Object.getOwnPropertyDescriptor(Object.freeze(WebAssembly), "compile").value;`, true],
      ["gOPD(create(performance),'elu').value", `export const x = Object.getOwnPropertyDescriptor(Object.create(performance), "eventLoopUtilization").value;`, true],
      ["control gOPD(R,'k').value directo → FLAG", `export const x = Object.getOwnPropertyDescriptor(performance, "eventLoopUtilization").value;`, true],
      // OOM pin: gOPD sobre own-copy-de-proto-carrier → SILENT (undefined runtime)
      ["OOM gOPD({...create(R)}).value → SILENT", `export const x = Object.getOwnPropertyDescriptor({...Object.create(performance)}, "eventLoopUtilization")?.value;`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- EVAL · `.constructor` (Function) invocado vía proyección de contenedor literal ----
  // EVAL · `.constructor` (Function) invocado a través de una PROYECCIÓN de contenedor literal → FLAG (codegen
  // in-mandate; el contenedor es literal decidible, sin tensión §141).
  describe("EVAL: .constructor vía proyección de contenedor → FLAG", () => {
    it.each<[string, string, boolean]>([
      ["spread {...{k:fn.ctor}}.k(str)()", `export function f(fn:Function){ return ({...{k: fn.constructor}}).k("return 1")(); }`, true],
      ["array [{k:fn.ctor}][0].k(str)", `export function f(fn:Function){ return [{k: fn.constructor}][0].k("return 1")(); }`, true],
      ["control directo fn.ctor(str)() → FLAG", `export function f(fn:Function){ return fn.constructor("return 1")(); }`, true],
      ["FP e.constructor.name → SILENT", `export function f(e:Error){ return e.constructor.name; }`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // DESTRUCT · spread INLINE de un LITERAL en el init de un destructure → FLAG (decidible; spread de VARIABLE §141).
  describe("DESTRUCT: spread inline (literal) en el init → FLAG", () => {
    it.each<[string, string, boolean]>([
      // member-extract vía flagPartialDestructure (objeto) + alias vía collectStructuralAliases (array)
      ["object member {p:{compile}}={...{p:WA}}", `const {p:{compile}} = {...{p: WebAssembly}}; export const y = compile;`, true],
      ["array alias [x]=[...[performance]]", `const [x] = [...[performance]]; export const y = x.eventLoopUtilization();`, true],
      // gemelos simétricos: alias vía object-spread (collectStructuralAliases obj) + member vía array-spread (flagPartialDestructure arr)
      ["object alias {x}={...{x:perf}}", `const {x} = {...{x: performance}}; export const y = x.eventLoopUtilization();`, true],
      ["array member [{compile}]=[...[WA]]", `const [{compile}] = [...[WebAssembly]]; export const y = compile;`, true],
      // §141 pins: spread de VARIABLE en el init (ambos ejes) → indeterminado → SILENT
      ["§141 [x]=[...arr] (arr variable) → SILENT", `const arr = [performance]; const [x] = [...arr]; export const y = x.eventLoopUtilization();`, false],
      ["§141 {x}={...o} (o variable) → SILENT", `const o = {x: performance}; const {x} = {...o}; export const y = x.eventLoopUtilization();`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- R9FIX · elementProjection: `.at()` sin-args e `["at"]` bracket-llamado (mi código R9) ----
  describe("R9FIX: elementProjection .at() sin-args + ['at'] bracket → FLAG", () => {
    it.each<[string, string, boolean]>([
      [".at() sin-args new([WA].at().Module)", `export function f(buf:any){ return new ([WebAssembly].at().Module)(buf); }`, true],
      ["['at'] bracket [perf]['at'](0)", `export const x = [performance]["at"](0).eventLoopUtilization();`, true],
      // control: .at(0) dotted ya FLAG (R9)
      ["control [perf].at(0) dotted → FLAG", `export const x = [performance].at(0).eventLoopUtilization();`, true],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // ---- KEY · import.meta[computedKey] entra en el default-deny (#4-OVERTURNED R10) ----
  // KEY · OVERTURN adjudicado por Fable (rama FLAG del probe discriminante): `import.meta[<computado/incompleto>]`
  // DIRECTO es in-mandate — indirección CERO (root conocido, key no probable ∈ allowlist) → default-deny
  // fail-closed, PARIDAD EXACTA con el hermano `performance[c]` (probe: FLAG). El SILENT previo era un fail-open
  // del selector `computedDefaultDenyRoot` (import.meta usa SAFE_IMPORT_META_MEMBERS, no SAFE_PARTIAL_MEMBERS),
  // NO §141; el #4 original ratificó ese accidente sin cuantificar sobre el sibling. Fix: `|| root ===
  // IMPORT_META_ROOT` en los DOS selectores (read + Reflect.get) + `?? SAFE_IMPORT_META_MEMBERS` en el detail.
  // FUERA del overturn (§141 GENUINO, siguen SILENT): object-rest {...r}=import.meta, spread-de-VARIABLE,
  // assembled (fromEntries∘entries), gOPD(...,k).value con k variable, own-copy {...im}.k. Ver ADR D1-P1.
  describe("KEY: import.meta[computed key] → FLAG (#4-OVERTURNED R10, paridad performance[c])", () => {
    it.each<[string, string, boolean]>([
      ["import.meta[c]() → FLAG", `export function f(c:string){ return import.meta[c](); }`, true],
      ["import.meta[c?'url':d] incompleto → FLAG", `export function f(c:boolean,d:string){ return import.meta[c ? "url" : d]; }`, true],
      ["const m=import.meta; m[c] → FLAG", `export function f(c:string){ const m = import.meta; return m[c]; }`, true],
      ["let m; m=import.meta; m[c] → FLAG (forward-decidable)", `export function f(c:string){ let m:any; m = import.meta; return m[c]; }`, true],
      ["Reflect.get(import.meta,k) → FLAG (#4-OVERTURNED)", `export function f(k:string){ return Reflect.get(import.meta, k); }`, true],
      ["control import.meta['dirname'] → FLAG (resoluble deny)", `export const x = import.meta["dirname"];`, true],
      // no regresar: safe SILENT; remediación sancionada SILENT
      ["safe import.meta['url'] → SILENT", `export const x = import.meta["url"];`, false],
      ["remediación import.meta[c]?.() → SILENT", `export function f(c:string){ return import.meta[c]?.(); }`, false],
      // §141 GENUINO fuera del overturn: spread de VARIABLE + own-copy → SILENT
      ["§141 {...rest}=import.meta → SILENT", `export function f(){ const { ...rest } = import.meta; return rest; }`, false],
      ["§141 {...im}.dirname own-copy → SILENT", `export function f(){ const c = {...import.meta}; return c.dirname; }`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });
});

// ============================================================================
// R11 — custodios (auditoría de centralización + pasada Fable). gap-5/F1 dup-key last-wins unificados
// al resolver canónico; gap-6 reflective-value bajo VT-wrapper. Expected = ORÁCULO de runtime.
// ============================================================================
describe("server-safe gate — R11 custodios (centralización: dup-key resolver + reflective VT)", () => {
  const flagged = (code: string, fn = "r11.fixture.tsx") =>
    checkSourceFile(`/** @server-safe */\n${code}`, fn).length > 0;

  // gap-5 + F1: dup-key `{p: safe, p: danger}` — LAST-WINS (runtime) resuelve al SEGUNDO; el first-match
  // resolvía al primero (safe) y perdía el override → FN. Cerrado en AMBOS loci object (member-extract +
  // alias) vía el resolver canónico objectLiteralMemberValues (unificación, no parche de celda — Fable).
  describe("dup-key last-wins en destructure (gap-5) y alias (F1) → FLAG", () => {
    it.each<[string, string, boolean]>([
      ["gap-5 member {p:{compile}}={p:Math,p:WA}", `const {p:{compile}}={p:Math,p:WebAssembly}; export const g=(b:any)=>compile(b);`, true],
      ["F1 alias {p}={p:Math,p:perf}", `const {p}={p:Math,p:performance}; export const y=p.eventLoopUtilization();`, true],
      ["F1b alias {p}={p:{},p:perf}", `const {p}={p:{},p:performance}; export const y=p.eventLoopUtilization();`, true],
      // no regresión: single-key directo + spread inline (R10) siguen FLAG
      ["control single {p}={p:perf}", `const {p}={p:performance}; export const y=p.eventLoopUtilization();`, true],
      ["control R10 spread {p:{compile}}={...{p:WA}}", `const {p:{compile}}={...{p:WebAssembly}}; export const y=compile;`, true],
      // last-wins FIEL en ambos sentidos: reversal {p:danger,p:safe} → p=safe runtime → SILENT (cierra el FP simétrico)
      ["reversal {p}={p:perf,p:Math} → SILENT", `const {p}={p:performance,p:Math}; export const y=p.eventLoopUtilization();`, false],
      // §141 pin: spread de VARIABLE sigue SILENT (no resoluble last-wins)
      ["§141 {x}={...o} (o variable) → SILENT", `const o={x:performance}; const {x}={...o}; export const y=x.eventLoopUtilization();`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });

  // gap-6: el receptor de `<descriptor>.value` se resuelve VALUE-TRANSPARENTE por-hoja (||/??/ternario/
  // coma), no solo unwrapErased — simetría con reflectGetMemberRead/staticNamespaceCall (twins).
  describe("reflective-value read bajo VT-wrapper (gap-6) → FLAG", () => {
    it.each<[string, string, boolean]>([
      ["gap-6 (gOPD(perf,'elu')||alt).value", `export const x=(alt:any)=>(Object.getOwnPropertyDescriptor(performance,"eventLoopUtilization")||alt).value;`, true],
      ["gap-6b (a??gOPD(perf,'elu')).value", `export const x=(a:any)=>(a ?? Object.getOwnPropertyDescriptor(performance,"eventLoopUtilization")).value;`, true],
      ["gap-6c (c?gOPD(perf,'elu'):a).value", `export const x=(c:boolean,a:any)=>(c?Object.getOwnPropertyDescriptor(performance,"eventLoopUtilization"):a).value;`, true],
      // control directo ya FLAG (R8)
      ["control directo gOPD(perf,'elu').value", `export const x=Object.getOwnPropertyDescriptor(performance,"eventLoopUtilization").value;`, true],
      // §141 pin: key VARIABLE en gOPD → SILENT (paridad EXACTA con el directo)
      ["§141 (gOPD(perf,k)||a).value k var → SILENT", `export const x=(k:string,a:any)=>(Object.getOwnPropertyDescriptor(performance,k)||a).value;`, false],
    ])("%s", (_n, code, exp) => {
      expect(flagged(code)).toBe(exp);
    });
  });
});

// ============================================================================
// R11 pt.2 — carrier-root cableado solo en consumidores en-sitio.
// resolveRoots NO participa en el enrolado de alias: receiver-vía-flujo sigue §141.
// ============================================================================
describe("server-safe gate — R11 pt.2 custodios (carrier-root en consumidores in-site)", () => {
  const flagged = (code: string) =>
    checkSourceFile(`/** @server-safe */\n${code}`, "r11-carrier.fixture.tsx").length > 0;

  it.each<[string, string]>([
    [
      "gap read: allowlist computed bajo identity carrier",
      `export function f(k:string){ return Object.freeze(performance)[k](); }`,
    ],
    [
      "F3c: import.meta computed bajo identity carrier",
      `export function f(k:string){ return Object.freeze(import.meta)[k]; }`,
    ],
    [
      "gap construct: denylist computed bajo identity carrier",
      `export function f(k:string,b:any){ return new (Object.freeze(WebAssembly)[k] as any)(b); }`,
    ],
    [
      "gap unbound: branded host method bajo identity carrier",
      `export const x=(0,Object.freeze(crypto).getRandomValues)(new Uint8Array(1));`,
    ],
    [
      "gap destructure: present-throws bajo proto carrier",
      `const {compile}=Object.create(WebAssembly); export const x=compile(new Uint8Array());`,
    ],
    [
      "gap for-of: literal element carrier conserva la raíz",
      `export function f(){ for (const W of [Object.freeze(WebAssembly)]) W.compile(new Uint8Array()); }`,
    ],
    [
      "control present-throws: optional call no protege",
      `export const x=Object.freeze(WebAssembly).compile?.(new Uint8Array());`,
    ],
  ])("%s → FLAG", (_name, code) => {
    expect(flagged(code)).toBe(true);
  });

  it.each<[string, string]>([
    [
      "absent-member optional call bajo carrier",
      `export const x=Object.freeze(performance).eventLoopUtilization?.();`,
    ],
    [
      "absent-member typeof bajo carrier",
      `export const x=typeof Object.freeze(performance).eventLoopUtilization;`,
    ],
    [
      "absent-member fallback bajo carrier",
      `export const x=(Object.freeze(performance).eventLoopUtilization ?? (()=>0))();`,
    ],
    [
      "own-copy sobre proto-carrier no copia el miembro",
      `export const x=({...Object.create(performance)}).eventLoopUtilization();`,
    ],
    [
      "§141 receiver-vía-flujo: alias de identity carrier",
      `const p=Object.freeze(performance); export const x=p.eventLoopUtilization();`,
    ],
    [
      "§141 receiver-vía-flujo: copia guardada en local",
      `export function f(){ const m={...import.meta}; return m.dirname; }`,
    ],
  ])("%s → SILENT", (_name, code) => {
    expect(flagged(code)).toBe(false);
  });
});

// ============================================================================
// R11 pt.3 — residual verificado cross-agente: identity-carrier ∘ contenedor-proyectado.
// El carrier se pela SOLO si preserva identidad+contenido (freeze/seal/preventExtensions), y SOLO
// en el sitio de la proyección/destructure. Un carrier guardado en variable continúa siendo §141.
// ============================================================================
describe("server-safe gate — R11 pt.3 custodios (carrier identity sobre contenedor proyectado)", () => {
  const flagged = (code: string) =>
    checkSourceFile(`/** @server-safe */\n${code}`, "r11-carrier-container.fixture.tsx").length > 0;

  it.each<[string, string]>([
    [
      "member-read por object projection",
      `export const x=Object.freeze({m:performance}).m.eventLoopUtilization();`,
    ],
    [
      "member-read por array projection",
      `export const x=Object.freeze([performance])[0].eventLoopUtilization();`,
    ],
    [
      "construction por array projection",
      `export const x=new (Object.freeze([WebAssembly])[0].Module)(new Uint8Array());`,
    ],
    [
      "Reflect.get receiver por array projection",
      `export const x=Reflect.get(Object.freeze([performance]),0).eventLoopUtilization();`,
    ],
    [
      "string-timer por object projection (gap-7)",
      `export const x=Object.freeze({t:setTimeout}).t("doWork()",0);`,
    ],
    [
      "eval-sink por object projection (gap-8)",
      `export const x=Object.freeze({k:(function(){}).constructor}).k("return 1")();`,
    ],
    [
      "destructure structural alias desde carrier",
      `const {m}=Object.freeze({m:WebAssembly}); export const x=m.compile(new Uint8Array());`,
    ],
    [
      "seal conserva el contenedor",
      `export const x=Object.seal({m:performance}).m.eventLoopUtilization();`,
    ],
    [
      "preventExtensions conserva el contenedor",
      `export const x=Object.preventExtensions([WebAssembly])[0].compile(new Uint8Array());`,
    ],
    [
      "carriers identity anidados terminan por descenso AST",
      `export const x=Object.freeze(Object.seal({m:performance})).m.eventLoopUtilization();`,
    ],
    [
      "callee identity proyectado conserva la semántica de staticNamespaceCall",
      `export const x=Object.freeze({f:Object.freeze}).f({m:performance}).m.eventLoopUtilization();`,
    ],
    [
      "la proyección ocurre in-site antes de enrolar el alias de root",
      `const m=Object.freeze({m:performance}).m; export const x=m.eventLoopUtilization();`,
    ],
  ])("%s → FLAG", (_name, code) => {
    expect(flagged(code)).toBe(true);
  });

  it("40 carriers identity sobre el contenedor → FLAG (sin cap fail-open)", () => {
    const nested = "Object.freeze(".repeat(40) + "{m:performance}" + ")".repeat(40);
    expect(flagged(`export const x=${nested}.m.eventLoopUtilization();`)).toBe(true);
  });

  it.each<[string, string]>([
    [
      "§141: el carrier-container se guarda antes de proyectar",
      `const o=Object.freeze({m:performance}); export const x=o.m.eventLoopUtilization();`,
    ],
    [
      "OOM: own-copy sobre proto-carrier no copia el miembro",
      `export const x=({...Object.create(performance)}).eventLoopUtilization();`,
    ],
    [
      "defineProperty puede sobrescribir la key: no es carrier de contenido",
      `export const x=Object.defineProperty({m:performance},"m",{value:Math}).m.eventLoopUtilization();`,
    ],
    [
      "defineProperties puede sobrescribir la key: no es carrier de contenido",
      `export const x=Object.defineProperties({m:performance},{m:{value:Math}}).m.eventLoopUtilization();`,
    ],
  ])("%s → SILENT", (_name, code) => {
    expect(flagged(code)).toBe(false);
  });
});

// ============================================================================
// R12 — corpus congelado tras re-hunt adversarial + critic independiente.
// 33 FILAS (29 sources únicos): 18 deltas SILENT→FLAG autorizados, 15 pins que deben seguir SILENT.
// Los pins Codex duplican dos casos deliberadamente: funcionan como contrato explícito del merge/proto resolver.
// ============================================================================
describe("server-safe gate — R12 custodios (container result carriers semánticos)", () => {
  const flagged = (code: string) =>
    checkSourceFile(`/** @server-safe */\n${code}`, "r12.fixture.tsx").length > 0;

  it.each<[string, string, boolean]>([
    ["A-assign1-member-obj", `export const x=Object.assign({m:performance}).m.eventLoopUtilization();`, true],
    ["A-assign1-member-arr", `export const x=Object.assign([performance])[0].eventLoopUtilization();`, true],
    ["A-assign1-at", `export const x=Object.assign([performance]).at(0).eventLoopUtilization();`, true],
    ["A-assign1-destr", `const {m}=Object.assign({m:performance}); export const y=m.eventLoopUtilization();`, true],
    ["A-assign1-forof", `for(const w of Object.assign([performance])) { w.eventLoopUtilization(); } export const q=1;`, true],
    ["A-owncopy-obj", `export const x=Object.assign({},{m:performance}).m.eventLoopUtilization();`, true],
    ["A-owncopy-arr", `export const x=Object.assign([],[performance])[0].eventLoopUtilization();`, true],
    ["A-override-DANGER", `export const x=Object.assign({m:Math},{m:performance}).m.eventLoopUtilization();`, true],
    ["A-timer-string", `export const x=Object.assign({t:setTimeout}).t("doWork()",0);`, true],
    ["A-override-SAFE", `export const x=Object.assign({m:performance},{m:Math}).m.eventLoopUtilization();`, false],
    ["A-alias-var", `const o=Object.assign({m:performance}); export const y=()=>o.m.eventLoopUtilization();`, false],
    ["A-source-var", `export const x=(s:any)=>Object.assign({m:performance},s).m.eventLoopUtilization();`, false],
    ["A-defineProperty", `export const x=Object.defineProperty({m:performance},"m",{value:0}).m.eventLoopUtilization();`, false],
    ["B-create-member", `export const x=Object.create({m:performance}).m.eventLoopUtilization();`, true],
    ["B-create-destr", `const {m}=Object.create({m:performance}); export const y=m.eventLoopUtilization();`, true],
    ["B-setproto", `export const x=Object.setPrototypeOf({},{m:performance}).m.eventLoopUtilization();`, true],
    ["B-descriptors-shadow", `export const x=Object.create({m:performance},{m:{value:Math}}).m.eventLoopUtilization();`, false],
    ["B-owncopy-proto-OOM", `export const x=({...Object.create({m:performance})}).m.eventLoopUtilization();`, false],
    ["C-Array-from", `export const x=Array.from([performance])[0].eventLoopUtilization();`, true],
    ["C-Array-of", `export const x=Array.of(performance)[0].eventLoopUtilization();`, true],
    ["C-concat", `export const x=[].concat([performance])[0].eventLoopUtilization();`, true],
    ["C-slice0", `export const x=[performance].slice(0)[0].eventLoopUtilization();`, true],
    ["C-slice1-OOM", `export const x=[performance].slice(1)[0].eventLoopUtilization();`, false],
    ["C-map-141", `export const x=[performance].map(z=>z)[0].eventLoopUtilization();`, false],
    ["D-values", `export const x=Object.values({m:performance})[0].eventLoopUtilization();`, false],
    ["D-entries", `export const x=Object.entries({m:performance})[0][1].eventLoopUtilization();`, false],
    // R15 adjudica la variante de key LITERAL en-sitio; el round-trip Object.entries sigue renunciado.
    ["D-fromEntries", `export const x=Object.fromEntries([["m",performance]]).m.eventLoopUtilization();`, true],
    ["D-structuredClone", `export const x=structuredClone({m:performance}).m.eventLoopUtilization();`, false],
    ["PIN-override-danger", `export const x=Object.assign({m:Math},{m:performance}).m.eventLoopUtilization();`, true],
    ["PIN-override-safe", `export const x=Object.assign({m:performance},{m:Math}).m.eventLoopUtilization();`, false],
    ["PIN-3way-safe", `export const x=Object.assign({m:performance},{},{m:Math}).m.eventLoopUtilization();`, false],
    ["PIN-create-simple", `export const x=Object.create({m:performance}).m.eventLoopUtilization();`, true],
    ["PIN-create-descriptors", `export const x=Object.create({m:performance},{m:{value:Math}}).m.eventLoopUtilization();`, false],
  ])("%s", (_name, code, expected) => {
    expect(flagged(code)).toBe(expected);
  });

  it.each<[string, string, boolean]>([
    [
      "assign array: un source posterior danger sobrescribe por índice",
      `export const x=Object.assign([Math],[performance])[0].eventLoopUtilization();`,
      true,
    ],
    [
      "assign array: un source posterior safe sobrescribe por índice",
      `export const x=Object.assign([performance],[Math])[0].eventLoopUtilization();`,
      false,
    ],
    [
      "assign object: un source opaco queda bloqueado si es el último",
      `export const x=(s:any)=>Object.assign({m:performance},s).m.eventLoopUtilization();`,
      false,
    ],
    [
      "assign object: un override danger posterior restaura certeza",
      `export const x=(s:any)=>Object.assign({m:Math},s,{m:performance}).m.eventLoopUtilization();`,
      true,
    ],
    [
      "assign object: un override safe posterior restaura certeza",
      `export const x=(s:any)=>Object.assign({m:performance},s,{m:Math}).m.eventLoopUtilization();`,
      false,
    ],
    [
      "composición R11→R12: source identity-carrier",
      `export const x=Object.assign({},Object.freeze({m:performance})).m.eventLoopUtilization();`,
      true,
    ],
    [
      "create: un descriptor sibling no sombrea la key heredada",
      `export const x=Object.create({m:performance},{z:{value:1}}).m.eventLoopUtilization();`,
      true,
    ],
    [
      "create: un descriptor danger sombrea con el mismo danger",
      `export const x=Object.create({m:Math},{m:{value:performance}}).m.eventLoopUtilization();`,
      true,
    ],
    [
      "setPrototypeOf: una own-property safe sombrea el proto danger",
      `export const x=Object.setPrototypeOf({m:Math},{m:performance}).m.eventLoopUtilization();`,
      false,
    ],
    [
      "setPrototypeOf: una own-property danger sombrea el proto safe",
      `export const x=Object.setPrototypeOf({m:performance},{m:Math}).m.eventLoopUtilization();`,
      true,
    ],
    [
      "create: el descriptor-map heredado no aporta own descriptors",
      `export const x=Object.create({m:Math},Object.create({m:{value:performance}})).m.eventLoopUtilization();`,
      false,
    ],
    [
      "setPrototypeOf: reemplazar un proto danger por uno safe no conserva el viejo",
      `export const x=Object.setPrototypeOf(Object.create({m:performance}),{m:Math}).m.eventLoopUtilization();`,
      false,
    ],
    [
      "setPrototypeOf: reemplazar un proto safe por uno danger expone el nuevo",
      `export const x=Object.setPrototypeOf(Object.create({m:Math}),{m:performance}).m.eventLoopUtilization();`,
      true,
    ],
  ])("edge: %s", (_name, code, expected) => {
    expect(flagged(code)).toBe(expected);
  });
});

// ============================================================================
// R13 — 5 gaps in-mandate del hunt generalista post-R12.
// Custodios escritos antes del fix: cada positivo tiene su control inverso §141/OOM/FP.
// ============================================================================
describe("server-safe gate — R13 custodios (5 gaps post-R12)", () => {
  const flagged = (code: string, file = "r13.fixture.tsx") =>
    checkSourceFile(`/** @server-safe */\n${code}`, file).length > 0;

  describe("gap#1: carriers array/Map/Set compartidos por value-survival", () => {
    it.each<[string, string]>([
      ["reverse", `export const x=[performance].reverse()[0].eventLoopUtilization();`],
      ["toReversed", `export const x=[performance].toReversed()[0].eventLoopUtilization();`],
      ["toSorted", `export const x=[performance].toSorted()[0].eventLoopUtilization();`],
      ["toSpliced", `export const x=[performance].toSpliced()[0].eventLoopUtilization();`],
      ["flat un nivel", `export const x=[[performance]].flat()[0].eventLoopUtilization();`],
      ["Map.get key literal", `export const x=new Map([["k",performance]]).get("k").eventLoopUtilization();`],
      ["Set spread", `export const x=[...new Set([performance])][0].eventLoopUtilization();`],
      ["Map.values spread", `export const x=[...new Map([["k",performance]]).values()][0].eventLoopUtilization();`],
      ["Map dup-key last-wins danger", `export const x=new Map([["k",Math],["k",performance]]).get("k").eventLoopUtilization();`],
      ["eval-sink hereda reverse", `const g=()=>{}; export const x=[g.constructor].reverse()[0]("return 1")();`],
      ["string-timer hereda Map.get", `export const x=new Map([["k",setTimeout]]).get("k")("doWork()",0);`],
      ["construcción hereda toReversed", `export const x=new ([WebAssembly.Module].toReversed()[0])(new Uint8Array());`],
      ["dynamic import hereda flat", `export const x=import([["node:fs"]].flat()[0]);`],
    ])("FLAG: %s", (_name, code) => {
      expect(flagged(code)).toBe(true);
    });

    it.each<[string, string]>([
      ["constructor inocuo tras reverse", `export const x=[({}).constructor].reverse()[0]("code");`],
      ["Map key miss = OOM universal", `export const x=new Map([["k",performance]]).get("nomatch").eventLoopUtilization();`],
      ["Map dup-key last-wins safe", `export const x=new Map([["k",performance],["k",Math]]).get("k").eventLoopUtilization();`],
      ["flatMap callback = §141", `export const x=[[performance]].flatMap(z=>z)[0].eventLoopUtilization();`],
      ["Set.forEach callback = §141", `new Set([performance]).forEach(p=>p.eventLoopUtilization()); export const x=1;`],
    ])("SILENT: %s", (_name, code) => {
      expect(flagged(code)).toBe(false);
    });
  });

  describe("gap#2: marker Unicode Category-M/variation selector", () => {
    it.each([
      ["combining mark U+0301", "/** @\u0301server-safe */\nexport const x=1;"],
      ["variation selector U+FE0F", "/** @\uFE0Fserver-safe */\nexport const x=1;"],
      ["enclosing mark U+20DD", "/** @\u20DDserver-safe */\nexport const x=1;"],
    ])("rescata %s", (_name, code) => {
      expect(isContentServerSafeMarked(code, "r13-marker.fixture.ts")).toBe(true);
    });

    it("no fabrica un marker a partir de prosa con marks", () => {
      expect(
        isContentServerSafeMarked(
          "/** café\u0301 docs */\nexport const x=1;",
          "r13-marker-control.fixture.ts",
        ),
      ).toBe(false);
    });

    it("unknown Unicode junto al token degrada a near-miss fail-loud", () => {
      const source = ts.createSourceFile(
        "r13-marker-unknown.fixture.ts",
        "/** @💥server-safe */\nexport const x=1;",
        ts.ScriptTarget.Latest,
        true,
      );
      expect(markerNearMissLines(source)).toEqual([1]);
    });
  });

  describe("gap#3: descriptor-value computado de import.meta", () => {
    it.each<[string, string]>([
      ["gOPD(import.meta,k).value", `export const x=(k:string)=>Object.getOwnPropertyDescriptor(import.meta,k).value;`],
      ["gOPDs(import.meta)[k].value", `export const x=(k:string)=>Object.getOwnPropertyDescriptors(import.meta)[k].value;`],
      ["create + gOPDs + computed read", `export const x=(k:string)=>Object.create(null,Object.getOwnPropertyDescriptors(import.meta))[k];`],
      ["defineProperties + gOPDs + computed read", `export const x=(k:string)=>Object.defineProperties({},Object.getOwnPropertyDescriptors(import.meta))[k];`],
    ])("FLAG: %s", (_name, code) => {
      expect(flagged(code)).toBe(true);
    });

    it.each<[string, string]>([
      ["safe own member url", `export const x=Object.getOwnPropertyDescriptor(import.meta,"url").value;`],
      ["performance own-descriptor OOM", `export const x=(k:string)=>Object.getOwnPropertyDescriptor(performance,k).value;`],
      ["receiver vía variable = §141", `const R=import.meta; export const x=(k:string)=>Object.getOwnPropertyDescriptor(R,k).value;`],
    ])("SILENT: %s", (_name, code) => {
      expect(flagged(code)).toBe(false);
    });
  });

  describe("gap#4: mutador React con receptor const-aliaseado", () => {
    const H = `import React from "react";\n`;
    it.each<[string, string]>([
      ["const O=Object", `const O=Object; export function C(){ O.assign(React,{useEffect:(cb:any)=>cb()}); React.useEffect(()=>{void window.location.href}); return null; }`],
      ["const R2=Reflect", `const R2=Reflect; export function C(){ R2.set(React,"useEffect",(cb:any)=>cb()); React.useEffect(()=>{void window.location.href}); return null; }`],
      ["cadena const O2=O", `const O=Object; const O2=O; export function C(){ O2.assign(React,{useEffect:(cb:any)=>cb()}); React.useEffect(()=>{void window.location.href}); return null; }`],
    ])("FLAG: %s", (_name, code) => {
      expect(flagged(H + code)).toBe(true);
    });

    it("let reasignable permanece §141", () => {
      expect(
        flagged(
          H + `let O=Object; export function C(){ O.assign(React,{useEffect:(cb:any)=>cb()}); React.useEffect(()=>{void window.location.href}); return null; }`,
        ),
      ).toBe(false);
    });
  });

  describe("gap#5: fallback de valor consumido", () => {
    it.each<[string, string]>([
      ["?? undefined invocado", `export const x=(performance.eventLoopUtilization ?? undefined)();`],
      ["?? 0 invocado", `export const x=(performance.eventLoopUtilization ?? 0)();`],
      ["|| null invocado", `export const x=(performance.eventLoopUtilization || null)();`],
      ["?? undefined dereferenciado", `export const x=(performance.eventLoopUtilization ?? undefined).name;`],
      ["const no-callable invocado", `const n=0; export const x=(performance.eventLoopUtilization ?? n)();`],
      ["parámetro sombrea const callable", `const fb=()=>0; export const x=(fb:any)=>(performance.eventLoopUtilization ?? fb)();`],
    ])("FLAG: %s", (_name, code) => {
      expect(flagged(code)).toBe(true);
    });

    it.each<[string, string]>([
      ["fallback callable inline", `export const x=(performance.eventLoopUtilization ?? (()=>0))();`],
      ["fallback callable const", `const fb=()=>0; export const x=(performance.eventLoopUtilization ?? fb)();`],
      ["fallback no consumido", `export const x=performance.eventLoopUtilization ?? 0;`],
      ["optional call", `export const x=performance.eventLoopUtilization?.();`],
      ["fallback exterior rescata", `export const x=((performance.eventLoopUtilization ?? undefined) || (()=>0))();`],
    ])("SILENT: %s", (_name, code) => {
      expect(flagged(code)).toBe(false);
    });
  });
});

// ============================================================================
// R14 — carrier estructural anti-drift + discovery completo + near-miss de línea.
// Solo se codifican los findings adjudicados por el informe; runtime/ADR pendientes quedan intactos.
// ============================================================================
describe("server-safe gate — R14 custodios (estructura + driver)", () => {
  const flagged = (code: string, file = "r14.fixture.tsx") =>
    checkSourceFile(`/** @server-safe */\n${code}`, file).length > 0;

  describe("gap#1: proyección de métodos Array por estructura, con default anti-drift", () => {
    it.each<[string, string]>([
      ["with conserva receiver", `export const x=setTimeout(["code",0].with(1,9)[0],0);`],
      ["with puede introducir replacement", `export const x=setTimeout([0].with(0,"code")[0],0);`],
      ["slice(0,N)", `export const x=setTimeout(["code",0].slice(0,5)[0],0);`],
      ["copyWithin", `export const x=setTimeout(["code",0].copyWithin(1,0)[0],0);`],
      ["fill toma arguments[0]", `export const x=setTimeout([0].fill("code")[0],0);`],
      ["método futuro desconocido falla cerrado", `export const x=setTimeout((["code"] as any).futureCopy()[0],0);`],
      ["otro consumidor hereda el seam", `export const x=import((["node:fs"] as any).futureCopy()[0]);`],
    ])("FLAG: %s", (_name, code) => {
      expect(flagged(code)).toBe(true);
    });

    it.each<[string, string]>([
      ["with index variable = §141", `export const x=(i:number)=>setTimeout(["code",0].with(i,9)[0],0);`],
      ["slice end variable = §141", `export const x=(n:number)=>setTimeout(["code"].slice(0,n)[0],0);`],
      ["copyWithin arg variable = §141", `export const x=(i:number)=>setTimeout(["code",0].copyWithin(i,0)[0],0);`],
      ["fill range variable = §141", `export const x=(i:number)=>setTimeout([0].fill("code",i)[0],0);`],
      ["índice resultante fuera de rango", `export const x=setTimeout([0].fill("code")[4],0);`],
      ["fill benigno no arrastra receiver", `export const x=setTimeout(["code"].fill(String)[0],0);`],
      ["map callback permanece §141", `export const x=setTimeout(["code"].map(x=>x)[0],0);`],
      ["filter callback permanece §141", `export const x=setTimeout(["code"].filter(Boolean)[0],0);`],
    ])("SILENT: %s", (_name, code) => {
      expect(flagged(code)).toBe(false);
    });
  });

  it("discovery recorre TODO src, no solo components/hooks", () => {
    const root = mkdtempSync(join(tmpdir(), "r14-server-safe-discovery-"));
    try {
      for (const dir of ["components", "hooks", "utils", "theme"]) {
        mkdirSync(join(root, dir), { recursive: true });
      }
      writeFileSync(join(root, "components", "A.tsx"), "/** @server-safe */ export const A=1;");
      writeFileSync(join(root, "hooks", "useA.ts"), "/** @server-safe */ export const useA=()=>1;");
      writeFileSync(join(root, "utils", "marked.ts"), "/** @server-safe */ export const x=1;");
      writeFileSync(join(root, "theme", "runtime.ts"), "export const theme=1;");
      writeFileSync(join(root, "utils", "marked.test.ts"), "/** @server-safe */ export const x=window;");

      const found = discoverServerSafeSourceFiles(root)
        .map((file) => relative(root, file).split("\\").join("/"))
        .sort();
      expect(found).toEqual([
        "components/A.tsx",
        "hooks/useA.ts",
        "theme/runtime.ts",
        "utils/marked.ts",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  describe("near-miss de marker en line-comment", () => {
    const lines = (source: string) =>
      markerNearMissLines(
        ts.createSourceFile("r14-marker.ts", source, ts.ScriptTarget.Latest, true),
      );

    it("// @server-safe falla loud", () => {
      expect(lines("// @server-safe\nexport const x=1;")).toEqual([1]);
    });

    it("no confunde strings ni tokens con sufijo", () => {
      expect(lines('export const a="// @server-safe";\n// @server-safe-helper')).toEqual([]);
    });
  });
});

// ============================================================================
// R15 — cierre carrier-completo por construcción.
// El contrato no es una lista de builtins: todo carrier en-sitio no clasificado
// degrada a unión ∃, sin cruzar las fronteras de data-flow (§141) ni OOM.
// ============================================================================
describe("server-safe gate — R15 custodios (carrier-completo por construcción)", () => {
  const flagged = (code: string) =>
    checkSourceFile(`/** @server-safe */\n${code}`, "r15.fixture.tsx").length > 0;

  it.each<[string, string]>([
    ["with ∘ slice", `export const x=setTimeout(["code"].with(0,"code").slice()[0],0);`],
    ["copyWithin ∘ slice", `export const x=setTimeout(["code",0].copyWithin(1,0).slice()[0],0);`],
    ["fill ∘ slice", `export const x=setTimeout([0].fill("code").slice()[0],0);`],
    ["sort ∘ slice", `export const x=setTimeout(["code"].sort().slice(0)[0],0);`],
    ["unknown ∘ slice", `export const x=setTimeout(((["code"] as any).fooBar(0)).slice()[0],0);`],
    ["unknown ∘ unknown", `export const x=setTimeout(((["code"] as any).fooBar().futureCopy())[0],0);`],
    ["constructor sink compuesto", `const g=()=>{}; export const x=[g.constructor].with(0,g.constructor).slice()[0]("return 1")();`],
  ])("composición FLAG: %s", (_name, code) => {
    expect(flagged(code)).toBe(true);
  });

  it.each<[string, string]>([
    ["Array.from(Set)", `export const x=setTimeout(Array.from(new Set(["code"]))[0],0);`],
    ["Array.from(array-like)", `export const x=setTimeout(Array.from({length:1,0:"code"})[0],0);`],
    ["Array.from(Map.values)", `export const x=setTimeout(Array.from(new Map([["k","code"]]).values())[0],0);`],
    ["Array.from identidad", `export const x=setTimeout(Array.from(["code"],z=>z)[0],0);`],
    ["Map.keys", `export const x=setTimeout([...new Map([["code",1]]).keys()][0],0);`],
    ["Map.entries", `export const x=setTimeout([...new Map([["k","code"]]).entries()][0][1],0);`],
    ["Map iterador default", `export const x=setTimeout([...new Map([["k","code"]])][0][1],0);`],
    ["Set.entries", `export const x=setTimeout([...new Set(["code"]).entries()][0][0],0);`],
    ["Set producer desconocido", `export const x=setTimeout([...(new Set(["code"]) as any).futureValues()][0],0);`],
    ["WeakRef.deref", `export const x=new WeakRef((()=>{}).constructor).deref()("return 1")();`],
  ])("iterables FLAG: %s", (_name, code) => {
    expect(flagged(code)).toBe(true);
  });

  it.each<[string, string]>([
    ["Object.fromEntries key literal", `export const x=setTimeout(Object.fromEntries([["k","code"]]).k,0);`],
    ["object spread de array", `export const x=setTimeout(({...["code"]})[0],0);`],
    ["Object.create(null, descriptors)", `export const x=Object.create(null,{m:{value:performance}}).m.eventLoopUtilization();`],
    ["defineProperty value", `export const x=Object.defineProperty({},"m",{value:performance}).m.eventLoopUtilization();`],
    ["Object.getPrototypeOf(create)", `export const x=Object.getPrototypeOf(Object.create({m:performance})).m.eventLoopUtilization();`],
    ["Reflect.getPrototypeOf(setPrototypeOf)", `export const x=Reflect.getPrototypeOf(Object.setPrototypeOf({},{m:performance})).m.eventLoopUtilization();`],
    ["Reflect.get con spread literal", `export const x=Reflect.get(...[{m:performance},"m"]).eventLoopUtilization();`],
    ["iterator helper toArray", `export const x=[performance].values().toArray()[0].eventLoopUtilization();`],
    ["iterator helper intermedio", `export const x=[performance].values().drop(0).toArray()[0].eventLoopUtilization();`],
    ["Iterator.from", `export const x=Iterator.from([performance]).toArray()[0].eventLoopUtilization();`],
  ])("Object/Reflect/Iterator FLAG: %s", (_name, code) => {
    expect(flagged(code)).toBe(true);
  });

  it.each<[string, string]>([
    ["with spread literal", `export const x=setTimeout(["a"].with(...[0,"code"])[0],0);`],
    ["fill spread literal", `export const x=setTimeout([0].fill(...["code"])[0],0);`],
    ["slice spread literal", `export const x=setTimeout(["code","x"].slice(...[0,1])[0],0);`],
    ["copyWithin spread literal", `export const x=setTimeout(["code",0].copyWithin(...[1,0])[0],0);`],
    ["pop último", `export const x=setTimeout(["x","code"].pop(),0);`],
    ["shift primero", `export const x=setTimeout(["code","x"].shift(),0);`],
    ["pop constructor", `const g=()=>{}; export const x=["x",g.constructor].pop()("return 1")();`],
    ["new Array valor", `export const x=setTimeout(new Array("code")[0],0);`],
    ["bare Array valor", `export const x=setTimeout(Array("code")[0],0);`],
    ["new Array varios", `export const x=setTimeout(new Array("x","code")[1],0);`],
  ])("args/scalars/producers FLAG: %s", (_name, code) => {
    expect(flagged(code)).toBe(true);
  });

  it.each<[string, string]>([
    ["receiver variable", `const a=["code"]; export const x=setTimeout(a.with(0,"code").slice()[0],0);`],
    ["spread variable", `export const x=(a:any[])=>setTimeout(["x"].with(...a)[0],0);`],
    ["arg identifier", `export const x=(i:number)=>setTimeout(["code"].slice(i)[0],0);`],
    ["índice final variable sobre unknown", `export const x=(i:number)=>setTimeout(((["code"] as any).futureCopy())[i],0);`],
    ["callback no-identidad", `export const x=setTimeout(Array.from(["code"],()=>"safe")[0],0);`],
    ["with fuera de rango", `export const x=setTimeout(["code"].with(5,"code")[0],0);`],
    ["new Array length", `export const x=setTimeout(new Array(16)[0],0);`],
    ["bare Array length", `export const x=setTimeout(Array(16)[0],0);`],
    ["pop vacío", `export const x=setTimeout([].pop(),0);`],
    ["shift vacío", `export const x=setTimeout([].shift(),0);`],
    ["structuredClone Function", `const g=()=>{}; export const x=structuredClone([g])[0]();`],
    ["WeakRef primitive", `export const x=new WeakRef("code" as any).deref();`],
    ["fromEntries ∘ entries renunciado", `export const x=Object.fromEntries(Object.entries({k:performance})).k.eventLoopUtilization();`],
    ["Object.values renunciado", `export const x=Object.values({k:performance})[0].eventLoopUtilization();`],
    ["defineProperty override-safe", `export const x=Object.defineProperty({m:performance},"m",{value:Math}).m.eventLoopUtilization();`],
  ])("frontera SILENT: %s", (_name, code) => {
    expect(flagged(code)).toBe(false);
  });

  it.each<[string, string]>([
    ["slice", `export const x=setTimeout(["code"].slice()[0],0);`],
    ["toShuffled", `export const x=setTimeout((["code"] as any).toShuffled()[0],0);`],
    ["at", `export const x=setTimeout(["code"].at(0),0);`],
    ["concat spread", `export const x=setTimeout([].concat(...[["code"]])[0],0);`],
    ["Array.from array", `export const x=setTimeout(Array.from(["code"])[0],0);`],
    ["Map.get", `export const x=setTimeout(new Map([["k","code"]]).get("k"),0);`],
  ])("control positivo sigue FLAG: %s", (_name, code) => {
    expect(flagged(code)).toBe(true);
  });
});

// ============================================================================
// R16 — robustez del driver + precisión en seams ya adjudicados.
// MIXED-KEY permanece deliberadamente en §141: el informe lo deja como frontera
// discutible y no se amplía el mandato sin una decisión explícita.
// ============================================================================
describe("server-safe gate — R16 custodios (robustez + precisión)", () => {
  const flagged = (code: string) =>
    checkSourceFile(`/** @server-safe */\n${code}`, "r16.fixture.tsx").length > 0;

  describe("Tier-1: marker por sustitución Unicode", () => {
    it.each<[string, string]>([
      ["guion U+2011", "/** @server\u2011safe */\nexport const x=1;"],
      ["arroba fullwidth U+FF20", "/** \uFF20server-safe */\nexport const x=1;"],
    ])("reconoce %s", (_name, code) => {
      expect(isContentServerSafeMarked(code, "r16-marker.fixture.ts")).toBe(true);
    });

    it("no inventa el marker con el homoglifo cirílico excluido", () => {
      const code = "/** @s\u0435rver-safe */\nexport const x=1;";
      const source = ts.createSourceFile(
        "r16-marker-control.fixture.ts",
        code,
        ts.ScriptTarget.Latest,
        true,
      );
      expect(isContentServerSafeMarked(code, source.fileName)).toBe(false);
      expect(markerNearMissLines(source)).toEqual([]);
    });
  });

  describe("Tier-1: shadow de alias diferido cruza closures correctamente", () => {
    it.each<[string, string]>([
      [
        "parámetro simple",
        `const p=performance; function g(p:any){ const h=()=>p.eventLoopUtilization(); return h; } export {g};`,
      ],
      [
        "parámetro destructurado",
        `const WA=WebAssembly; function g({WA}:{WA:any}){ function h(){ return WA.compile(new Uint8Array()); } return h; } export {g};`,
      ],
      [
        "local var hoisted",
        `const p=performance; function g(){ function h(){ return p.eventLoopUtilization(); } var p:any; return h; } export {g};`,
      ],
    ])("SILENT: %s", (_name, code) => {
      expect(flagged(code)).toBe(false);
    });

    it("el alias enclosing no sombreado sigue FLAG", () => {
      expect(
        flagged(
          `const p=performance; function g(){ const h=()=>p.eventLoopUtilization(); return h; } export {g};`,
        ),
      ).toBe(true);
    });
  });

  it("elige el alias tsconfig más específico aunque se declare después", () => {
    const exists = (p: string) =>
      p === "/repo/src/clean/feature/mod.ts" ||
      p === "/repo/src/dirty/mod.ts";
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const broadFirst = [
      { prefix: "@/", targetPrefix: "src/clean/" },
      { prefix: "@/feature/", targetPrefix: "src/dirty/" },
    ];
    const specificFirst = [...broadFirst].reverse();

    expect(
      resolveImportPath(
        "@/feature/mod",
        "/repo/src/entry.ts",
        broadFirst,
        exists,
        roots,
      ),
    ).toMatchObject({ kind: "internal", absPath: "/repo/src/dirty/mod.ts" });
    expect(
      resolveImportPath(
        "@/feature/mod",
        "/repo/src/entry.ts",
        specificFirst,
        exists,
        roots,
      ),
    ).toMatchObject({ kind: "internal", absPath: "/repo/src/dirty/mod.ts" });
  });

  it("audita directorios internos cuyo nombre empieza por `..` sin confundirlos con un parent segment", () => {
    const roots = { repoRoot: "/repo", srcRoot: "/repo/src" };
    const files = vfs({
      "/repo/src/entry.ts": `/** @server-safe */\nimport { dirty } from "./..private/dirty";\nexport const value = dirty;`,
      "/repo/src/..private/dirty.ts": `export const dirty = window.location.href;`,
      "/repo/outside.ts": `export const outside = window.location.href;`,
    });

    expect(
      resolveImportPath(
        "./..private/dirty",
        "/repo/src/entry.ts",
        [],
        (p) => files.has(p),
        roots,
      ),
    ).toMatchObject({ kind: "internal", absPath: "/repo/src/..private/dirty.ts" });
    expect(
      resolveImportPath("../outside", "/repo/src/entry.ts", [], (p) => files.has(p), roots),
    ).toMatchObject({ kind: "external" });

    const violations = runWithVfs("/repo/src/entry.ts", files);
    expect(violations.some((v) => v.file.endsWith("/..private/dirty.ts"))).toBe(true);
  });

  describe("Tier-1: carrier ancho no explota y el driver falla loud", () => {
    it("completa una cadena 8-wide de doce sort sin blowup", () => {
      const wide = `["code",0,1,2,3,4,5,6]${".sort()".repeat(12)}`;
      expect(flagged(`export const x=setTimeout(${wide}[0],0);`)).toBe(true);
    });

    it("convierte una excepción por fichero en violation y sigue el driver", () => {
      const content = `/** @server-safe */\nexport const x=window;`;
      const files = vfs({ "/repo/src/entry.ts": content });
      const sourceFile = ts.createSourceFile(
        "src/entry.ts",
        content,
        ts.ScriptTarget.Latest,
        true,
      );
      sourceFile.getLineAndCharacterOfPosition = () => {
        throw new RangeError("R16 synthetic analyzer failure");
      };
      const violations = checkFileWithImports("/repo/src/entry.ts", {
        repoRoot: "/repo",
        srcRoot: "/repo/src",
        tsconfigPaths: [],
        readFile: (p: string) => files.get(p)!.content,
        fileExists: (p: string) => files.has(p),
        parseCache: new Map([["/repo/src/entry.ts", { sourceFile, content }]]),
      });
      expect(violations).toHaveLength(1);
      expect(violations[0]?.file).toBe("src/entry.ts");
      expect(violations[0]?.rule).toBe("server-safe-analysis-error");
      expect(violations[0]?.detail).toContain("R16 synthetic analyzer failure");
    });
  });

  describe("Tier-1: own-copy de globals respeta miembros de prototipo", () => {
    it.each<[string, string]>([
      ["spread + destructuring", `const {eventLoopUtilization}={...performance}; void eventLoopUtilization;`],
      ["Object.assign source", `const {eventLoopUtilization}=Object.assign({},performance); void eventLoopUtilization;`],
      ["Reflect.get del spread", `export const x=Reflect.get({...performance},"eventLoopUtilization");`],
    ])("SILENT: %s", (_name, code) => {
      expect(flagged(code)).toBe(false);
    });

    it.each<[string, string]>([
      ["read directo", `export const x=performance.eventLoopUtilization();`],
      ["performance como target identity", `export const x=Object.assign(performance,{}).eventLoopUtilization();`],
      ["own de WebAssembly", `export const x=({...WebAssembly}).compile(new Uint8Array());`],
      ["own de console", `export const x=({...console}).table([]);`],
    ])("FLAG: %s", (_name, code) => {
      expect(flagged(code)).toBe(true);
    });
  });

  describe("Tier-2 batch: own-source usa los resolvers de carrier", () => {
    it.each<[string, string]>([
      ["spread de Object.assign", `export const x=({...Object.assign({m:performance})}).m.eventLoopUtilization();`],
      ["descriptor defineProperty vía assign", `export const x=Object.defineProperty({},"m",Object.assign({},{value:performance})).m.eventLoopUtilization();`],
      ["descriptor create vía assign", `export const x=Object.create(null,Object.assign({},{m:{value:performance}})).m.eventLoopUtilization();`],
      ["target array vía slice", `export const x=Object.setPrototypeOf([performance].slice(),{})[0].eventLoopUtilization();`],
    ])("FLAG: %s", (_name, code) => {
      expect(flagged(code)).toBe(true);
    });
  });

  describe("Tier-2 batch: Array.at selecciona el índice literal exacto", () => {
    it.each<[string, string]>([
      ["índice seguro", `export const x=setTimeout(["code",0].at(1),0);`],
      ["fuera de rango", `export const x=setTimeout(["code"].at(4),0);`],
    ])("SILENT: %s", (_name, code) => {
      expect(flagged(code)).toBe(false);
    });

    it.each<[string, string]>([
      ["índice cero", `export const x=setTimeout(["code",0].at(0),0);`],
      ["índice negativo", `export const x=setTimeout([0,"code"].at(-1),0);`],
      ["índice variable = unión fail-closed", `export const x=(i:number)=>setTimeout(["code",0].at(i),0);`],
    ])("FLAG: %s", (_name, code) => {
      expect(flagged(code)).toBe(true);
    });
  });

  describe("Tier-2 batch: Map.get pela receptores estructurales", () => {
    it.each<[string, string]>([
      ["array projection", `export const x=setTimeout([new Map([["k","code"]])][0].get("k"),0);`],
      ["object projection", `export const x=setTimeout(({m:new Map([["k","code"]])}).m.get("k"),0);`],
      ["Map dentro de Map", `export const x=setTimeout(new Map([["outer",new Map([["inner","code"]])]]).get("outer").get("inner"),0);`],
    ])("FLAG: %s", (_name, code) => {
      expect(flagged(code)).toBe(true);
    });

    it("receiver variable conserva §141", () => {
      expect(flagged(`const m=new Map([["k","code"]]); export const x=setTimeout(m.get("k"),0);`)).toBe(false);
    });
  });

  describe("Tier-2 batch: Function proyectada vía call/apply/bind", () => {
    it.each<[string, string]>([
      ["call", `const g=()=>{}; export const x=new Map([["k",g.constructor]]).get("k").call(null,"return 1")();`],
      ["apply", `const g=()=>{}; export const x=new Map([["k",g.constructor]]).get("k").apply(null,["return 1"])();`],
      ["bind", `const g=()=>{}; export const x=new Map([["k",g.constructor]]).get("k").bind(null)("return 1")();`],
    ])("FLAG: %s", (_name, code) => {
      expect(flagged(code)).toBe(true);
    });

    it("constructor benigno proyectado no se convierte en Function", () => {
      expect(flagged(`export const x=new Map([["k",Object]]).get("k").call(null,"safe");`)).toBe(false);
    });
  });
});
