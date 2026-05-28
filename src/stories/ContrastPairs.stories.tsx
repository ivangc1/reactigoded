/**
 * ContrastPairs.stories.tsx — #152 Playwright fixture contraste pares
 * componente (beta.27 MEDIUM-4).
 *
 * Renderiza los 7 pares allowlisted del `scripts/perceptual-allowlist.json`
 * como elementos DOM reales y mide su separación perceptual (ΔE OKLab)
 * en runtime browser (Chromium vía vitest-browser-playwright + Storybook).
 *
 * Complementa el gate `scripts/check-component-contrast.mjs` (#154) que
 * mide ΔE sobre tokens CSS resueltos. Aquí:
 *   - El measure pasa por `getComputedStyle(el).backgroundColor` →
 *     parseo rgb() → conversion a OKLab vía `culori`.
 *   - El asserta es contra `deltaE_at_decision` del JSON con la misma
 *     tolerancia de drift (5%) que el CSS gate.
 *
 * Cubre regresiones que el CSS-resolver gate no caza:
 *   - Cascada/specificity bugs que sobreescriban background en context
 *     de componente.
 *   - Re-escritura de variables CSS via `color-mix()` que se resuelve
 *     distinto en el browser engine vs el JSON node.
 *   - Cambios en el orden de carga del CSS que afecten resolución.
 *
 * Convención: el wrap `<div data-theme="...">` fuerza el tema dentro
 * del scope (las CSS variables son scoped por el selector
 * `[data-theme="..."]` del `src/styles/igoded-tokens.css`).
 *
 * @server-safe NO aplica: esta story corre en client (browser test).
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { differenceEuclidean, oklab, parse } from "culori";
import { Badge, type BadgeVariant } from "../components/Badge";
import allowlistJson from "../../scripts/perceptual-allowlist.json";

/**
 * Mapping cardinal → role semántico del DS. Las utility classes
 * (`ig-badge-brand`, `ig-bg-success`, etc.) son semánticas, no
 * cardinal-directas. Usamos componentes reales del DS (`<Badge>`) en
 * vez de inline styles para que el `getComputedStyle` mida lo que la
 * cascade del componente produce, NO un inline style forzado (que
 * ganaría a cualquier regla CSS normal y haría el test ciego a
 * regresiones de cascade — codex P2 sobre PR #129).
 *
 * Cardinal `cinis` es text-body, sin variant Badge equivalente — no
 * aparece en los 7 pares allowlisted, así que no necesitamos mapearlo.
 */
const CARDINAL_TO_VARIANT: Record<string, BadgeVariant> = {
  vitreus: "brand",
  axis: "secondary",
  laurus: "success",
  rutilus: "warning",
  malum: "danger",
  kobalium: "info",
};

interface AllowlistEntry {
  pair: string;
  theme: "light" | "dark";
  deltaE_at_decision: number;
  decision_date: string;
  justification: string;
}

const allowlist = allowlistJson.allowlist as AllowlistEntry[];
const driftTolerance = allowlistJson.drift_tolerance;

const meta: Meta = {
  title: "Fundamentos/ContrastPairs",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Fixture #152: los 7 pares perceptualmente cercanos del DS renderizados como elementos DOM reales para verificar que el ΔE OKLab measured en browser matchea el `deltaE_at_decision` del allowlist. Complementa el CSS-resolver gate `check-component-contrast.mjs` con cobertura sobre runtime DOM.",
      },
    },
  },
};
export default meta;

type Story = StoryObj;

const deltaE = differenceEuclidean("oklab");

function parseRgbToOklab(rgbString: string) {
  const color = parse(rgbString);
  if (!color) return null;
  return oklab(color);
}

interface PairCellProps {
  cardinalA: string;
  cardinalB: string;
  theme: "light" | "dark";
  deltaERef: number;
}

function PairCell({ cardinalA, cardinalB, theme, deltaERef }: PairCellProps) {
  const pairKey = [cardinalA, cardinalB].sort().join("-");
  return (
    <div
      data-testid={`pair-${pairKey}-${theme}`}
      data-pair={pairKey}
      data-theme-tag={theme}
      data-delta-e-ref={String(deltaERef)}
      style={{
        display: "inline-flex",
        gap: "0.5rem",
        padding: "1rem",
        background: "var(--ig-bg-surface)",
        fontFamily: "system-ui, sans-serif",
        flexDirection: "column",
        borderRadius: "0.5rem",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--ig-text-body)",
        }}
      >
        {pairKey} ({theme}) — ΔE ref: {deltaERef.toFixed(4)}
      </div>
      <div style={{ display: "inline-flex", gap: "0.5rem" }}>
        <Badge
          variant={CARDINAL_TO_VARIANT[cardinalA]}
          data-testid={`pair-${pairKey}-${theme}-a`}
          data-cardinal={cardinalA}
        >
          {cardinalA}
        </Badge>
        <Badge
          variant={CARDINAL_TO_VARIANT[cardinalB]}
          data-testid={`pair-${pairKey}-${theme}-b`}
          data-cardinal={cardinalB}
        >
          {cardinalB}
        </Badge>
      </div>
    </div>
  );
}

interface ThemeMatrixProps {
  theme: "light" | "dark";
}

function ThemeMatrix({ theme }: ThemeMatrixProps) {
  // El tema se aplica a nivel <html> por el addon-themes de Storybook
  // (preview.tsx: parentSelector: "html"). Las stories abajo fijan
  // `globals: { theme }` para forzar el tema correspondiente sin
  // wrappers data-theme interiores (esos no propagan correctamente
  // text-on-X via cascade, codex P2 + axe color-contrast lo cazaban).
  const pairs = allowlist.filter((e) => e.theme === theme);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1.5rem",
        padding: "1.5rem",
        background: "var(--ig-bg-base)",
        minHeight: "100vh",
      }}
    >
      {pairs.map((entry) => {
        const [a, b] = entry.pair.split("-");
        if (!a || !b) return null;
        return (
          <PairCell
            key={`${entry.pair}-${entry.theme}`}
            cardinalA={a}
            cardinalB={b}
            theme={entry.theme}
            deltaERef={entry.deltaE_at_decision}
          />
        );
      })}
    </div>
  );
}

/**
 * Espera a que el addon-themes haya aplicado el `data-theme` esperado
 * al `<html>` Y que la cascade haya recalculado los colores de los
 * Badges de la story. Dos verificaciones independientes:
 *
 *   1. `<html data-theme="...">` matcha el esperado (el decorator de
 *      addon-themes corre con `useEffect` async, así que el attribute
 *      llega DESPUÉS del primer render).
 *
 *   2. Un Badge de la story tiene un `backgroundColor` resuelto a un
 *      color de tema (no el default transparent). Sin esta verificación,
 *      entre "atributo puesto" y "estilos recalculados" hay un frame de
 *      delay en runs cargados (CI), y `play()` podría medir colores del
 *      tema anterior antes de que la cascade termine.
 */
/**
 * Espera a que la cascade haya recalculado los colores de los Badges
 * tras el set del `data-theme`. Verifica que el atributo está Y que un
 * Badge tiene un `backgroundColor` resuelto (no transparente). Entre
 * "atributo puesto" y "estilos recalculados" hay un frame de delay en
 * runs cargados (CI); este polling lo absorbe.
 */
async function waitForCascade(canvasElement: HTMLElement, expectedTheme: "light" | "dark") {
  const maxWaitMs = 2000;
  const pollInterval = 16;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const themeOk =
      document.documentElement.getAttribute("data-theme") === expectedTheme;
    const firstBadge =
      canvasElement.querySelector<HTMLElement>("[data-cardinal]");
    const bgOk = firstBadge
      ? getComputedStyle(firstBadge).backgroundColor !== "rgba(0, 0, 0, 0)" &&
        getComputedStyle(firstBadge).backgroundColor !== "transparent"
      : false;
    if (themeOk && bgOk) return;
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
  throw new Error(
    `Timeout esperando cascade resuelta para data-theme="${expectedTheme}" (actual: "${document.documentElement.getAttribute("data-theme") ?? "null"}")`,
  );
}

/**
 * Fuerza el `data-theme` esperado en `<html>` durante el alcance de
 * la story. Necesario porque el decorator del addon-themes aplica el
 * `themeOverride` vía `useEffect` async, y no llega a tiempo antes de
 * que `play()` mida (verificado con debug: el data-theme se queda en
 * "dark" default cuando la story declara `themeOverride: "light"`).
 *
 * Manipulamos el DOM directamente y restauramos el valor previo en
 * `finally` — patrón estándar de test fixture, explícito sobre la
 * mutación. Sin desactivar reglas de lint ni de axe.
 */
async function withForcedTheme<T>(
  expectedTheme: "light" | "dark",
  callback: () => Promise<T>,
): Promise<T> {
  const prev = document.documentElement.getAttribute("data-theme");
  document.documentElement.setAttribute("data-theme", expectedTheme);
  try {
    return await callback();
  } finally {
    if (prev !== null) {
      document.documentElement.setAttribute("data-theme", prev);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }
}

async function assertPairsDeltaE(
  canvasElement: HTMLElement,
  theme: "light" | "dark",
) {
  await waitForCascade(canvasElement, theme);
  const pairs = allowlist.filter((e) => e.theme === theme);
  for (const entry of pairs) {
    const [a, b] = entry.pair.split("-");
    if (!a || !b) continue;
    const pairKey = entry.pair;
    const elA = canvasElement.querySelector<HTMLElement>(
      `[data-testid="pair-${pairKey}-${entry.theme}-a"]`,
    );
    const elB = canvasElement.querySelector<HTMLElement>(
      `[data-testid="pair-${pairKey}-${entry.theme}-b"]`,
    );
    await expect(
      elA,
      `${pairKey}-${entry.theme}: element A renderizado`,
    ).not.toBeNull();
    await expect(
      elB,
      `${pairKey}-${entry.theme}: element B renderizado`,
    ).not.toBeNull();
    if (!elA || !elB) continue;

    const bgA = getComputedStyle(elA).backgroundColor;
    const bgB = getComputedStyle(elB).backgroundColor;
    const okA = parseRgbToOklab(bgA);
    const okB = parseRgbToOklab(bgB);
    await expect(
      okA,
      `${pairKey}-${entry.theme}: bg A parseable a OKLab (${bgA})`,
    ).not.toBeNull();
    await expect(
      okB,
      `${pairKey}-${entry.theme}: bg B parseable a OKLab (${bgB})`,
    ).not.toBeNull();
    if (!okA || !okB) continue;

    const measured = deltaE(okA, okB);
    const expected = entry.deltaE_at_decision;
    const driftLowerBound = expected * driftTolerance;
    const driftToleranceStr = driftTolerance.toFixed(2);
    await expect(
      measured,
      `${pairKey}-${entry.theme}: ΔE measured (${measured.toFixed(4)}) debe ser >= drift_lower_bound (${driftLowerBound.toFixed(4)}, derivado de ref ${expected.toFixed(4)} * ${driftToleranceStr})`,
    ).toBeGreaterThanOrEqual(driftLowerBound);
  }
}

export const LightThemePairs: Story = {
  name: "Light theme pairs (4 allowlisted)",
  // `globals.theme` es la sintaxis canónica documentada por Storybook
  // para forzar el theme global per-story. `withThemeByDataAttribute`
  // (.storybook/preview.tsx) lee este global vía `pluckThemeFromContext`
  // y aplica el data-theme correspondiente al `<html>`. Codex P2 sobre
  // PR #129: usar `globals.theme` en lugar de
  // `parameters.themes.themeOverride` para cobertura consistente en
  // Storybook UI (manual inspection, screenshots, axe).
  globals: { theme: "light" },
  render: () => <ThemeMatrix theme="light" />,
  play: async ({ canvasElement }) => {
    // `withForcedTheme` sigue siendo necesario para el test runner
    // (vitest-browser-playwright): el decorator del addon-themes
    // aplica el data-theme vía `useEffect` async, que no llega antes
    // de que `play()` empiece a medir. Verificado por debug en #152.
    await withForcedTheme("light", () =>
      assertPairsDeltaE(canvasElement, "light"),
    );
  },
};

export const DarkThemePairs: Story = {
  name: "Dark theme pairs (3 allowlisted)",
  globals: { theme: "dark" },
  render: () => <ThemeMatrix theme="dark" />,
  play: async ({ canvasElement }) => {
    await withForcedTheme("dark", () =>
      assertPairsDeltaE(canvasElement, "dark"),
    );
  },
};
