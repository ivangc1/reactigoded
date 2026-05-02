import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const designCss = readFileSync(
  resolve(__dirname, "./igoded-design.css"),
  "utf8",
);
const tokensCss = readFileSync(
  resolve(__dirname, "./igoded-tokens.css"),
  "utf8",
);
const baseCss = readFileSync(
  resolve(__dirname, "./igoded-base.css"),
  "utf8",
);
const componentsCss = readFileSync(
  resolve(__dirname, "./igoded-components.css"),
  "utf8",
);

describe("igoded-design.css — meta-importer", () => {
  it("hace @import de tokens, base y components en orden", () => {
    expect(designCss).toMatch(/@import\s+["']\.\/igoded-tokens\.css["']\s*;/);
    expect(designCss).toMatch(/@import\s+["']\.\/igoded-base\.css["']\s*;/);
    expect(designCss).toMatch(
      /@import\s+["']\.\/igoded-components\.css["']\s*;/,
    );
    // Orden: tokens DEBE preceder a base, y base a components.
    const iTokens = designCss.indexOf("igoded-tokens.css");
    const iBase = designCss.indexOf("igoded-base.css");
    const iComponents = designCss.indexOf("igoded-components.css");
    expect(iTokens).toBeGreaterThan(-1);
    expect(iBase).toBeGreaterThan(iTokens);
    expect(iComponents).toBeGreaterThan(iBase);
  });
});

describe("igoded-base.css — a11y media queries y baseline global", () => {
  it("box-sizing universal vive aquí (ya no en tokens.css)", () => {
    expect(baseCss).toMatch(
      /\*,\s*\*::before,\s*\*::after\s*\{[\s\S]*?box-sizing:\s*border-box/,
    );
    // tokens.css NO debe tener box-sizing global.
    expect(tokensCss).not.toMatch(/^\s*\*,\s*\*::before/m);
  });

  it("respeta prefers-reduced-motion globalmente", () => {
    expect(baseCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    // La regla universal debe afectar a `*, *::before, *::after`.
    expect(baseCss).toMatch(/\*,[\s\S]*?\*::before,[\s\S]*?\*::after/);
    expect(baseCss).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(baseCss).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });

  it("declara prefers-contrast: more con bordes reforzados", () => {
    expect(baseCss).toMatch(/@media\s*\(prefers-contrast:\s*more\)/);
  });

  it("declara forced-colors: active (Windows High Contrast Mode)", () => {
    expect(baseCss).toMatch(/@media\s*\(forced-colors:\s*active\)/);
    // Debe haber un :focus-visible con outline Highlight.
    expect(baseCss).toMatch(/:focus-visible\s*\{[\s\S]*?Highlight/);
  });

  it("scrollbar tematizada y ::selection", () => {
    expect(baseCss).toMatch(/::-webkit-scrollbar\s*\{/);
    expect(baseCss).toMatch(/::selection\s*\{/);
  });
});

describe("igoded-components.css — Modal y selectores específicos del DS", () => {
  it("Modal con dialog respeta reduced-motion (override específico)", () => {
    // Hay una regla específica que cancela `animation` del .ig-dialog[open]
    // dentro de @media (prefers-reduced-motion: reduce). Vive en components.css
    // porque depende de la clase `.ig-dialog`.
    expect(componentsCss).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.ig-dialog\[open\][\s\S]*?animation:\s*none/,
    );
  });
});

describe("igoded-tokens.css — solo variables, sin selectores globales", () => {
  it("--ig-text-muted en light cumple ratio AA sobre bg-muted", () => {
    expect(tokensCss).toMatch(/--ig-text-muted:\s*#6e6679/);
    expect(tokensCss).not.toMatch(/--ig-text-muted:\s*#7a7288/);
  });

  it("--ig-text-muted en dark cumple ratio AA sobre bg-muted", () => {
    expect(tokensCss).toMatch(/--ig-text-muted:\s*#7e9696/);
    expect(tokensCss).not.toMatch(/--ig-text-muted:\s*#708888/);
  });

  it("contiene los 7 colores cardinales (Fundus + 6)", () => {
    expect(tokensCss).toMatch(/--ig-fundus:/);
    expect(tokensCss).toMatch(/--ig-vitreus:/);
    expect(tokensCss).toMatch(/--ig-axis:/);
    expect(tokensCss).toMatch(/--ig-cinis:/);
    expect(tokensCss).toMatch(/--ig-laurus:/);
    expect(tokensCss).toMatch(/--ig-rutilus:/);
    expect(tokensCss).toMatch(/--ig-malum:/);
  });

  it("NO contiene clases de componentes ni globales (solo :root y data-theme)", () => {
    expect(tokensCss).not.toMatch(/^\.ig-btn\s*\{/m);
    expect(tokensCss).not.toMatch(/^\.ig-card\s*\{/m);
    expect(tokensCss).not.toMatch(/^\.ig-modal\s*\{/m);
    // No selectores de elemento HTML
    expect(tokensCss).not.toMatch(/^html\s*\{/m);
    expect(tokensCss).not.toMatch(/^::selection/m);
  });
});
