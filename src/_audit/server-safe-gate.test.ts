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
import ts from "typescript";
import { transformSync } from "esbuild";
import {
  SAFE_GLOBALS,
  INTENTIONAL_DENY,
  EDGE_MISSING_GLOBALS,
  DYNAMIC_EVAL_SINKS,
  checkSourceFile,
  checkFileWithImports,
  isContentServerSafeMarked,
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
  ])("caza el string-handler de timer como eval-sink: %s", (_label, body) => {
    const v = checkSourceFile(fixture(body), "str-timer.fixture.tsx");
    expect(v.some((it) => it.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it("NO flaggea setTimeout con callback función (no string)", () => {
    const v = checkSourceFile(fixture(`setTimeout(() => { let n = 0; n += 1; void n; }, 0);`), "fn-timer.fixture.tsx");
    expect(v).toEqual([]);
  });

  it("NO flaggea setTimeout.bind con callback función (no string)", () => {
    const v = checkSourceFile(fixture(`setTimeout.bind(null, () => {})();`), "bind-fn-timer.fixture.tsx");
    expect(v).toEqual([]);
  });

  // codex P2 (b22a600, #133): destructuring con DEFAULT de un miembro AUSENTE (performance.measure
  // es undefined en el floor → el default se activa → seguro). Para un root PRESENT-throws el
  // miembro EXISTE → el default no se activa → sigue lanzando.
  it.each([
    ["perf.measure con default (rename)", `/** @server-safe */\nexport function f() { const { measureUserAgentSpecificMemory: m = () => 0 } = performance; return m(); }`],
    ["perf.measure con default (shorthand)", `/** @server-safe */\nexport function f() { const { measureUserAgentSpecificMemory = () => 0 } = performance as any; return measureUserAgentSpecificMemory(); }`],
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
  ])("FLAGGEA handler en COMPONENTE custom (corre síncrono en render): %s", (_l, code) => {
    expect(flagged(code)).toBe(true);
  });

  // B — no-regresión: handler en INTRÍNSECO (lowercase letter) sigue exento
  it.each([
    ["<button onClick>", '/** @server-safe */\nexport function C() { return <button onClick={() => { window.alert(document.cookie); }}>x</button>; }'],
    ["<div onMouseEnter>", '/** @server-safe */\nexport function C() { return <div onMouseEnter={() => { void localStorage.length; }} />; }'],
    ["<x$ onClick> (lowercase-first intrínseco)", '/** @server-safe */\nexport function C() { return <x$ onClick={() => { void window.name; }} />; }'],
  ])("0-FP: handler en intrínseco lowercase sigue EXENTO: %s", (_l, code) => {
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

  // deepest re-hunt #7: miembro browser-only de un SAFE global (performance.measureUserAgent
  // SpecificMemory) — el root existe pero el método falta en Node → la llamada lanza. typeof-
  // guard del root no protege; solo exento en client-only.
  it.each([
    ["render", `/** @server-safe */\nexport function f() { return performance.measureUserAgentSpecificMemory(); }`],
    ["bajo typeof guard", `/** @server-safe */\nexport function f() { if (typeof performance !== "undefined") return performance.measureUserAgentSpecificMemory(); return null; }`],
    // codex P1: el receiver se desenvuelve value-transparente (el cast a `any` es probable).
    ["(performance as any).measure...", `/** @server-safe */\nexport function f() { return (performance as any).measureUserAgentSpecificMemory(); }`],
    ["(0, performance).measure...", `/** @server-safe */\nexport function f() { return (0, performance).measureUserAgentSpecificMemory(); }`],
    // codex P2 (e3418ee): el PARÉNTESIS rompe la cadena opcional → el undefined se derefencia y
    // crashea. `(x?.()).foo` NO es un probe seguro (a diferencia de `x?.().foo` sin paréntesis).
    ["grouped optional deref (M?.()).foo", `/** @server-safe */\nexport function f() { return ((performance.measureUserAgentSpecificMemory?.()) as any).foo; }`],
    ["grouped optional deref (M?.())[0]", `/** @server-safe */\nexport function f() { return ((performance.measureUserAgentSpecificMemory?.()) as any)[0]; }`],
    ["grouped optional call (M?.())()", `/** @server-safe */\nexport function f() { return ((performance.measureUserAgentSpecificMemory?.()) as any)(); }`],
    ["grouped optional access (M?.name).x", `/** @server-safe */\nexport function f() { return ((performance.measureUserAgentSpecificMemory?.name) as any).x; }`],
    ["grouped optional + non-null (M?.())!.foo", `/** @server-safe */\nexport function f() { return (performance.measureUserAgentSpecificMemory?.())!.foo; }`],
    // codex P2 (058b1f6): TaggedTemplate guarda el callee en \`.tag\`, no \`.expression\` →
    // \`(M?.())\\\`x\\\`\` ejecuta \`undefined\\\`x\\\`\` (TypeError). Antes escapaba el branch.
    ["grouped optional tagged-template (M?.())`x`", "/** @server-safe */\nexport function f() { return ((performance.measureUserAgentSpecificMemory?.()) as any)`x`; }"],
  ])("FLAGGEA performance.measureUserAgentSpecificMemory (partial SAFE-global member): %s", (_l, code) => {
    expect(checkSourceFile(code, "perf-partial.fixture.tsx").some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it("NO flaggea performance.now() (presente en Node)", () => {
    expect(checkSourceFile(`/** @server-safe */\nexport function f() { return performance.now(); }`, "perf-now.fixture.tsx")).toEqual([]);
  });

  // codex P2: un PROBE SEGURO del miembro parcial no crashea → no se flaggea (feature-detection).
  it.each([
    ["optional call ?.()", `/** @server-safe */\nexport function f() { return performance.measureUserAgentSpecificMemory?.(); }`],
    ["typeof operand", `/** @server-safe */\nexport function f() { return typeof performance.measureUserAgentSpecificMemory === "function"; }`],
    ["optional access ?.name", `/** @server-safe */\nexport function f() { return performance.measureUserAgentSpecificMemory?.name; }`],
    // codex P2: el probe envuelto en parens/cast también es seguro (ascenso value-transparent).
    ["typeof (parenthesized)", `/** @server-safe */\nexport function f() { return typeof (performance.measureUserAgentSpecificMemory) === "function"; }`],
    ["(cast as any)?.()", `/** @server-safe */\nexport function f() { return (performance.measureUserAgentSpecificMemory as any)?.(); }`],
    // codex P2 (e3418ee): SIN paréntesis la cadena opcional corta entera → seguro. Contraste
    // con el caso `(x?.()).foo` agrupado (que SÍ flaggea, arriba).
    ["optional chain M?.().foo (sin paréntesis)", `/** @server-safe */\nexport function f() { return performance.measureUserAgentSpecificMemory?.().foo; }`],
    ["optional chain M?.()!.foo (non-null, sin paréntesis)", `/** @server-safe */\nexport function f() { return performance.measureUserAgentSpecificMemory?.()!.foo; }`],
    ["optional consumer (M?.())?.foo (consumer opcional)", `/** @server-safe */\nexport function f() { return (performance.measureUserAgentSpecificMemory?.())?.foo; }`],
  ])("NO flaggea un probe seguro del miembro parcial: %s", (_l, code) => {
    expect(checkSourceFile(code, "perf-probe.fixture.tsx")).toEqual([]);
  });

  // codex P2: el miembro parcial extraído por DESTRUCTURING (`const { measure...: m } =
  // performance; m()`) escapaba al check de property-access. Fail-closed: flaggear la extracción.
  it.each([
    ["destr renombrado", `/** @server-safe */\nexport function f() { const { measureUserAgentSpecificMemory: m } = performance as any; return m(); }`],
    ["destr shorthand", `/** @server-safe */\nexport function f() { const { measureUserAgentSpecificMemory } = performance as any; return measureUserAgentSpecificMemory; }`],
    ["destr computed string", `/** @server-safe */\nexport function f() { const { ["measureUserAgentSpecificMemory"]: m } = performance as any; return m; }`],
    // codex P2 (e3418ee): key computada VALUE-TRANSPARENTE — el property-access path ya la
    // normaliza (`performance[1 && "M"]` flaggea), el destructuring debe ser consistente.
    ["destr computed [1 && M]", `/** @server-safe */\nexport function f() { const { [1 && "measureUserAgentSpecificMemory"]: m } = performance as any; return m(); }`],
    ["destr computed [(0, M)]", `/** @server-safe */\nexport function f() { const { [(0, "measureUserAgentSpecificMemory")]: m } = performance as any; return m(); }`],
    ["assignment-destr", `/** @server-safe */\nexport function f() { let m: any; ({ measureUserAgentSpecificMemory: m } = performance as any); return m; }`],
  ])("FLAGGEA el destructuring de un miembro parcial: %s", (_l, code) => {
    expect(checkSourceFile(code, "perf-destr.fixture.tsx").some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it("NO flaggea destructuring de un miembro PRESENTE (now)", () => {
    expect(checkSourceFile(`/** @server-safe */\nexport function f() { const { now } = performance; return now; }`, "perf-now-destr.fixture.tsx")).toEqual([]);
  });

  // codex P3 (fd84c07): el path de destructuring debe respetar el forward value-read igual que el
  // de property-access — un binding MODULE-LEVEL declarado DESPUÉS de la función (leído a call-time
  // = el local, no el global) no debe flaggearse.
  it.each([
    ["destr performance module-local (decl después)", `/** @server-safe */\nexport function C() { const { measureUserAgentSpecificMemory: x } = performance; return x; }\nconst performance: any = { measureUserAgentSpecificMemory: () => 0 };`],
    ["destr WebAssembly module-local (decl después)", `/** @server-safe */\nexport function C() { const { compile } = WebAssembly; return compile; }\nconst WebAssembly: any = { compile: () => 0 };`],
  ])("NO flaggea destructuring de un shadow MODULE-LEVEL (forward value-read): %s", (_l, code) => {
    expect(checkSourceFile(code, "partial-fwd.fixture.tsx")).toEqual([]);
  });

  // codex P2 (3ae4423): ALIAS scope-aware de un root parcial-safe — el root está en SAFE_GLOBALS,
  // así que `const WA = WebAssembly; WA.compile()` era invisible aguas arriba = bypass.
  it.each([
    ["alias WA.compile()", `/** @server-safe */\nexport function f() { const WA = WebAssembly; return WA.compile(new Uint8Array()); }`],
    ["alias perf.measure()", `/** @server-safe */\nexport function f() { const perf = performance; return perf.measureUserAgentSpecificMemory(); }`],
    ["alias multi-hop b.compile()", `/** @server-safe */\nexport function f() { const a = WebAssembly; const b = a; return b.compile(new Uint8Array()); }`],
    ["alias destructure const {compile}=WA", `/** @server-safe */\nexport function f() { const WA = WebAssembly as any; const { compile } = WA; return compile(new Uint8Array()); }`],
    ["alias value-transparent (0,WebAssembly)", `/** @server-safe */\nexport function f() { const WA = (0, WebAssembly); return WA.compile(new Uint8Array()); }`],
    ["alias present-throws optional-call WA.compile?.()", `/** @server-safe */\nexport function f() { const WA = WebAssembly; return WA.compile?.(new Uint8Array()); }`],
  ])("FLAGGEA el acceso a un miembro parcial vía ALIAS del root: %s", (_l, code) => {
    expect(checkSourceFile(code, "partial-alias.fixture.tsx").some((x) => x.rule === "no-bare-dom-access")).toBe(true);
  });

  it.each([
    ["alias de miembro SAFE perf.now()", `/** @server-safe */\nexport function f() { const perf = performance; return perf.now(); }`],
    ["alias de miembro SAFE WA.validate()", `/** @server-safe */\nexport function f() { const WA = WebAssembly; return WA.validate(new Uint8Array()); }`],
    ["typeof sobre alias", `/** @server-safe */\nexport function f() { const WA = WebAssembly; return typeof WA.compile; }`],
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
    ["instantiate(bytes)", `/** @server-safe */\nexport function f() { return WebAssembly.instantiate(new Uint8Array()); }`],
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
    ["typeof WebAssembly (namespace existe en Edge)", `/** @server-safe */\nexport function f() { return typeof WebAssembly; }`],
    // codex P1 (3ae4423): optional-access a METADATA (no invoca) sigue siendo probe seguro.
    ["compile?.name (metadata, no invoca)", `/** @server-safe */\nexport function f() { return WebAssembly.compile?.name; }`],
    ["compile?.length (metadata, no invoca)", `/** @server-safe */\nexport function f() { return WebAssembly.compile?.length; }`],
    // miembro AUSENTE: `?.call` corta a undefined (measure es undefined) → seguro.
    ["perf.measure?.call(null) ausente (short-circuit)", `/** @server-safe */\nexport function f() { return performance.measureUserAgentSpecificMemory?.call(null); }`],
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
