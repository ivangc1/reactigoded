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
  SAFE_GLOBALS,
  INTENTIONAL_DENY,
  DYNAMIC_EVAL_SINKS,
  checkSourceFile,
  checkFileWithImports,
  isContentServerSafeMarked,
} from "../../scripts/check-server-safe-markers.mjs";

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
});
