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
import {
  SAFE_GLOBALS,
  INTENTIONAL_DENY,
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

  it("inline `import { type X }` puro NO sigue (codex P2 round 1 sobre #106)", () => {
    // verbatimModuleSyntax (en este repo) emite el JS preservando el
    // `type` modifier. TS elide la import completa si TODOS los
    // specifiers son `type`. Sin chequear specifier-level, mi código
    // anterior traversaba el módulo.
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
    expect(leak).toBeUndefined();
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
    ["Event/CustomEvent (overlap Node)", `const e = new CustomEvent("x"); void e;`],
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
 * con base literal/SAFE pasaba. Ahora se flaggea toda invocación de
 * `.constructor` independientemente de la base, preservando los usos
 * legítimos (reflexión / comparación / clon `new`).
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
    ["reflexión Reflect.apply sobre .constructor", `const w = Reflect.apply((() => {}).constructor, null, ["return 1"])();`],
  ])("residual fuera de alcance POR DISEÑO (ofuscado, no es amenaza): %s", (_label, body) => {
    expect(probe(body)).toEqual([]);
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
  ])("FLAGGEA pese al guard typeof: %s", (_label, code) => {
    expect(checkSourceFile(code, "guard-evalsink.fixture.tsx").length).toBeGreaterThan(0);
  });

  it.each([
    ["typeof window (hazard = ausencia)", `/** @server-safe */\nexport const C = () => { if (typeof window !== "undefined") { return window.innerWidth; } return 0; };`],
    ["typeof process (portabilidad)", `/** @server-safe */\nexport const C = () => { if (typeof process !== "undefined") { return process.env.X; } return null; };`],
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
    ['paren + bracket combinado', `/** @server-safe */\nexport const t = (({}).constructor)["call"](null, "x")();`],
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
  ])("FLAGGEA pese al operador value-transparente: %s", (_label, code) => {
    const v = checkSourceFile(code, "vt-sink.fixture.tsx");
    expect(v.some((x) => x.rule === "no-dynamic-eval-sink")).toBe(true);
  });

  it.each([
    // EL BOUND: call/IIFE NO es transparente → residual out-of-scope (data-flow).
    ['IIFE devuelve ctor (call NO transparente)', `/** @server-safe */\nexport const t = ((() => (() => {}).constructor)())("x")();`],
    // &&-left NO carga el valor (base truthy pasa a la derecha) → no FP.
    ['(ctor && safeFn)() → safeFn', `/** @server-safe */\nexport const t = ((() => {}).constructor && ((s: string) => s))("x");`],
    ['(x.constructor || Object) === Object', `/** @server-safe */\nexport const eq = (x: any) => (x.constructor || Object) === Object;`],
    ['ternario .name no llamado', `/** @server-safe */\nexport const n = (e: any) => (true ? e.constructor : null)?.name;`],
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

  it.each([
    ["setTimeout callback diferido", Comp(`setTimeout(() => { void window.innerWidth; }, 0); return null;`)],
    ["queueMicrotask callback diferido", Comp(`queueMicrotask(() => { void document.title; }); return null;`)],
  ])("web-standard timer sigue safe + deferred → clean: %s", (_label, code) => {
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
