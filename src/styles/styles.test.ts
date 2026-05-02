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

describe("igoded-design.css — a11y media queries", () => {
  it("respeta prefers-reduced-motion globalmente", () => {
    expect(designCss).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
    );
    // La regla universal debe afectar a `*, *::before, *::after`.
    expect(designCss).toMatch(/\*,[\s\S]*?\*::before,[\s\S]*?\*::after/);
    expect(designCss).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(designCss).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });

  it("declara prefers-contrast: more con bordes reforzados", () => {
    expect(designCss).toMatch(/@media\s*\(prefers-contrast:\s*more\)/);
  });

  it("declara forced-colors: active (Windows High Contrast Mode)", () => {
    expect(designCss).toMatch(/@media\s*\(forced-colors:\s*active\)/);
    // Debe haber un :focus-visible con outline Highlight.
    expect(designCss).toMatch(/:focus-visible\s*\{[\s\S]*?Highlight/);
  });

  it("Modal con dialog respeta reduced-motion (override específico)", () => {
    // Hay una regla específica que cancela `animation` del .ig-dialog[open]
    // dentro de @media (prefers-reduced-motion: reduce).
    expect(designCss).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.ig-dialog\[open\][\s\S]*?animation:\s*none/,
    );
  });

  it("design.css importa tokens.css (split 1.0.0-beta.1)", () => {
    // Tras el split de tokens, design.css depende de tokens.css vía @import.
    expect(designCss).toMatch(/@import\s+["']\.\/igoded-tokens\.css["']\s*;/);
  });
});

describe("igoded-tokens.css — tokens contraste WCAG AA", () => {
  it("--ig-text-muted en light cumple ratio AA sobre bg-muted", () => {
    // Tras el fix de pasada 6: light usa #6e6679 (4.85 > 4.5).
    // Hay varios bloques [data-theme="light"] (uno por sección de tokens),
    // verificamos solo que existe la declaración correcta en algún sitio.
    expect(tokensCss).toMatch(/--ig-text-muted:\s*#6e6679/);
    // Y que la versión vieja (4.06, fail) no esté.
    expect(tokensCss).not.toMatch(/--ig-text-muted:\s*#7a7288/);
  });

  it("--ig-text-muted en dark cumple ratio AA sobre bg-muted", () => {
    // Tras el fix de pasada 6: dark usa #7e9696 (5.31 > 4.5).
    expect(tokensCss).toMatch(/--ig-text-muted:\s*#7e9696/);
    // Y que la versión vieja (4.42, fail) no esté.
    expect(tokensCss).not.toMatch(/--ig-text-muted:\s*#708888/);
  });

  it("tokens.css contiene los 7 colores cardinales (Fundus + 6)", () => {
    expect(tokensCss).toMatch(/--ig-fundus:/);
    expect(tokensCss).toMatch(/--ig-vitreus:/);
    expect(tokensCss).toMatch(/--ig-axis:/);
    expect(tokensCss).toMatch(/--ig-cinis:/);
    expect(tokensCss).toMatch(/--ig-laurus:/);
    expect(tokensCss).toMatch(/--ig-rutilus:/);
    expect(tokensCss).toMatch(/--ig-malum:/);
  });

  it("tokens.css NO contiene clases de componentes (solo tokens y keyframes)", () => {
    // No debería haber selectores `.ig-btn`, `.ig-card`, etc. en tokens.css —
    // esos viven en design.css.
    expect(tokensCss).not.toMatch(/^\.ig-btn\s*\{/m);
    expect(tokensCss).not.toMatch(/^\.ig-card\s*\{/m);
    expect(tokensCss).not.toMatch(/^\.ig-modal\s*\{/m);
  });
});
