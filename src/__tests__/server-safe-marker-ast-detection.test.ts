/**
 * #158: detección AST del marker `@server-safe` cierra grietas que
 * tenía el predecesor por substring. Este test demuestra los 3
 * vectores cerrados + el caso positivo del JSDoc real.
 *
 * No testea la implementación del parser JSDoc de TypeScript (que ya
 * tiene su propio test suite upstream); testea NUESTRO contrato:
 * "el marker se reconoce SOLO cuando el parser de TS lo identifica
 * como tag de un bloque JSDoc real".
 */
import { describe, it, expect } from "vitest";
import { isContentServerSafeMarked } from "../../scripts/check-server-safe-markers.mjs";

describe("isContentServerSafeMarked — AST detection del marker (#158)", () => {
  it("positivo: JSDoc real con @server-safe en tag → true", () => {
    const content = `/**
 * Component description.
 *
 * @server-safe
 */
export function Foo() { return null; }
`;
    expect(isContentServerSafeMarked(content, "Foo.tsx")).toBe(true);
  });

  it("positivo: JSDoc en variable export → true", () => {
    const content = `import type { ReactNode } from "react";

/**
 * @server-safe
 */
export const Foo = (): ReactNode => null;
`;
    expect(isContentServerSafeMarked(content, "Foo.tsx")).toBe(true);
  });

  it("vector (a) cerrado: string literal con @server-safe → false", () => {
    const content = `export const message = "use @server-safe to mark this component";
export function Foo() { return null; }
`;
    expect(isContentServerSafeMarked(content, "Foo.tsx")).toBe(false);
  });

  it("vector (b) cerrado: line comment // con @server-safe en prosa → false", () => {
    const content = `// Este componente NO es @server-safe porque toca document.cookie.
export function Foo() {
  document.cookie = "x";
  return null;
}
`;
    expect(isContentServerSafeMarked(content, "Foo.tsx")).toBe(false);
  });

  it("vector (c) cerrado: block comment NO-JSDoc (un solo *) con @server-safe → false", () => {
    // /* ... */ es block comment normal; /** ... */ es JSDoc.
    // El parser de TS solo trata el segundo como JSDoc-aware.
    const content = `/* @server-safe */
export function Foo() { return null; }
`;
    expect(isContentServerSafeMarked(content, "Foo.tsx")).toBe(false);
  });

  it("negativo: archivo sin marker en ningún sitio → false", () => {
    const content = `import { useState } from "react";

/**
 * Component normal sin marker.
 */
export function Foo() {
  const [x, setX] = useState(0);
  return <div>{x}</div>;
}
`;
    expect(isContentServerSafeMarked(content, "Foo.tsx")).toBe(false);
  });

  it("negativo: JSDoc con otros tags pero NO @server-safe → false", () => {
    const content = `/**
 * @deprecated usa la nueva versión.
 * @see https://example.com
 */
export function Foo() { return null; }
`;
    expect(isContentServerSafeMarked(content, "Foo.tsx")).toBe(false);
  });

  it("positivo: marker en JSDoc de top-level interface también cuenta", () => {
    // Convención: el marker suele ir en el JSDoc del export principal
    // (función/componente). Pero si lo ponen en otro top-level
    // declaration (interface, type alias, const), también vale —
    // la intención es file-level.
    const content = `/**
 * @server-safe
 */
export interface FooProps {
  name: string;
}
`;
    expect(isContentServerSafeMarked(content, "Foo.tsx")).toBe(true);
  });
});
