// @vitest-environment node
//
// Forzamos environment `node` (no jsdom): este test verifica el
// runtime real de Node. El default `jsdom` del proyecto polyfilla
// `window`, `document`, `localStorage`, etc. — todos darían "existe"
// como global y el test sería trivialmente falso. Bajo `node` el
// globalThis es el real, exponiendo solo lo que Node realmente provee.

/**
 * #150: verificación del catálogo `CLIENT_GLOBALS` vs Node runtime.
 *
 * El server-safe gate flaggea acceso bare a `CLIENT_GLOBALS` en código
 * `@server-safe`. La premisa original (gate review CONV-2 beta.25) era:
 * "estos nombres NO existen como global en Node >=22.12.0, así que
 * acceder a ellos en render server lanza ReferenceError tal como
 * `window`".
 *
 * Esa premisa se erosiona conforme Node añade APIs web (v21 trajo
 * `navigator`, releases recientes traen más). Este test verifica que:
 *
 *   1. Ningún nombre del catálogo que NO esté documentado como
 *      overlap intencional con Node existe como global runtime.
 *      Si Node añade un nuevo nombre (p.ej. en Node 30 añaden
 *      `WebSocket` como global y aún no lo documentamos), el test
 *      falla en la matriz CI y nos avisa para decidir: ¿overlap
 *      intencional (multi-runtime portability) o quitar del catálogo?
 *
 *   2. Los nombres documentados como overlap (4 entries actuales)
 *      SIGUEN en `CLIENT_GLOBALS`. Anti-regresión por si alguien
 *      borra una entry sin actualizar la doc.
 *
 *   3. Node runtime sí provee cada nombre documentado como overlap.
 *      Si Node deprecase alguno (p.ej. Node 30 quita `Buffer` por
 *      `Uint8Array`), el set documentado debería simplificarse y el
 *      test nos avisa.
 *
 * Cobertura cross-Node: este test corre en cada celda de la matriz
 * CI (#151) — ubuntu/windows × Node 22.12/24. Drift en cualquier
 * versión soportada se caza automáticamente.
 *
 * Codex sugirió este gate en el cruce beta.26 (MEDIUM-2).
 */
import { describe, it, expect } from "vitest";
import { CLIENT_GLOBALS } from "../../scripts/check-server-safe-markers.mjs";

/**
 * Nombres del catálogo `CLIENT_GLOBALS` que TAMBIÉN existen como
 * global en Node 22.12+. Cada uno está en `CLIENT_GLOBALS` por
 * decisión consciente — NO porque Node no lo provea — y el rationale
 * vive en el comment del catálogo (`scripts/check-server-safe-markers.mjs`).
 *
 * Si cambias este set, actualiza también el comment del catálogo.
 */
const DOCUMENTED_NODE_OVERLAPS = new Set([
  // Caza bypasses tipo `globalThis.constructor.constructor("return window")()`.
  "globalThis",
  // Multi-runtime portability (Cloudflare Workers / Deno no lo tienen).
  "process",
  // Multi-runtime: usar `Uint8Array` en su lugar.
  "Buffer",
  // Añadido a Node en v21. Subset de browser navigator — semántica
  // inestable entre runtimes.
  "navigator",
]);

describe("CLIENT_GLOBALS catálogo vs Node runtime (#150)", () => {
  it("ningún CLIENT_GLOBAL no-documentado existe como global en Node actual", () => {
    const unexpected: string[] = [];
    for (const name of CLIENT_GLOBALS) {
      if (DOCUMENTED_NODE_OVERLAPS.has(name)) continue;
      // typeof sobre globalThis[name] no lanza si no existe;
      // "undefined" significa "Node no lo provee como global".
      const present =
        typeof (globalThis as Record<string, unknown>)[name] !== "undefined";
      if (present) unexpected.push(name);
    }
    expect(unexpected).toEqual([]);
  });

  it("DOCUMENTED_NODE_OVERLAPS sigue siendo subset de CLIENT_GLOBALS", () => {
    // Defensivo: si alguien borra un entry de `CLIENT_GLOBALS` sin
    // tocar este test, el set documentado quedaría con un nombre
    // huérfano. Esta aserción lo caza.
    const missing: string[] = [];
    for (const name of DOCUMENTED_NODE_OVERLAPS) {
      if (!CLIENT_GLOBALS.has(name)) missing.push(name);
    }
    expect(missing).toEqual([]);
  });

  it("Node runtime provee TODOS los DOCUMENTED_NODE_OVERLAPS", () => {
    // Anti-regresión sobre el lado Node: si una versión soportada deja
    // de proveer alguno (p.ej. `Buffer` deprecation en Node 30), el
    // set documentado debería simplificarse — quitar el entry tanto
    // de aquí como del comment de `CLIENT_GLOBALS`.
    const missing: string[] = [];
    for (const name of DOCUMENTED_NODE_OVERLAPS) {
      const present =
        typeof (globalThis as Record<string, unknown>)[name] !== "undefined";
      if (!present) missing.push(name);
    }
    expect(missing).toEqual([]);
  });
});
