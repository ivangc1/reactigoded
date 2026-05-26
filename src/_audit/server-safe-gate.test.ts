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
