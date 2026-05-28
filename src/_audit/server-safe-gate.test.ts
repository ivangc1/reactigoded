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
  CLIENT_GLOBALS,
  DYNAMIC_EVAL_SINKS,
  checkSourceFile,
  checkFileWithImports,
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

  it("CLIENT_GLOBALS exporta el catálogo completo con browser-only adds", () => {
    expect(CLIENT_GLOBALS.has("localStorage")).toBe(true);
    expect(CLIENT_GLOBALS.has("screen")).toBe(true);
    expect(CLIENT_GLOBALS.has("matchMedia")).toBe(true);
    expect(CLIENT_GLOBALS.has("DOMParser")).toBe(true);
    expect(CLIENT_GLOBALS.has("Worker")).toBe(true);
    expect(CLIENT_GLOBALS.has("IntersectionObserver")).toBe(true);
    // Sanity: existentes no removidos.
    expect(CLIENT_GLOBALS.has("window")).toBe(true);
    expect(CLIENT_GLOBALS.has("document")).toBe(true);
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
