/* eslint-disable jest-dom/prefer-to-have-value -- `aria-valuenow` es un ATRIBUTO
   ARIA, no el value de un control de formulario. `toHaveValue()` lee la
   propiedad `value` del elemento, que en un `<div role="progressbar">` no
   existe: el autofix de esta regla convirtió estas 5 aserciones y rompió 10
   tests (medido). La regla se equivoca al tratar `aria-value*` como value de
   formulario; `toHaveAttribute` es aquí la aserción correcta, no una menos
   idiomática. No se desactiva en todo el repo — solo en este fichero, que es
   el único con progressbar. */
import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Progress } from "./Progress";

describe("Progress", () => {
  it("renderiza role=progressbar con valuemin/max", () => {
    render(<Progress value={40} />);
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-valuemin", "0");
    expect(el).toHaveAttribute("aria-valuemax", "100");
    expect(el).toHaveAttribute("aria-valuenow", "40");
  });

  // H-03 (beta.24): porcentaje runtime se emite como custom property
  // `--ig-progress-percent` (consumido por la regla `.ig-progress-bar`
  // del stylesheet via `width: var(--ig-progress-percent, 0%)`), no
  // como `style="width: …"` arbitrario. Mantiene CSP estricto sin
  // perder driveability runtime.
  it("emite porcentaje como --ig-progress-percent en bar interno", () => {
    render(<Progress value={25} data-testid="p" />);
    const bar = screen.getByTestId("p").firstChild as HTMLElement;
    expect(bar).toHaveClass("ig-progress-bar");
    expect(bar).toHaveStyle("--ig-progress-percent: 25%");
    // H-03 guard: el style attribute NO contiene `width:` literal.
    // Inspeccionamos el atributo crudo (vs property access) para
    // tener un assert insensible al stylesheet (jsdom no aplica
    // la regla `.ig-progress-bar { width: var(...) }` en tests).
    expect(bar.getAttribute("style") ?? "").not.toMatch(/\bwidth\s*:/);
  });

  it("respeta max custom", () => {
    render(<Progress value={5} max={10} data-testid="p" />);
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-valuemax", "10");
    expect(el).toHaveAttribute("aria-valuenow", "5");
    const bar = screen.getByTestId("p").firstChild as HTMLElement;
    expect(bar).toHaveStyle("--ig-progress-percent: 50%");
  });

  it("clampa value fuera de rango", () => {
    render(<Progress value={150} data-testid="p" />);
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-valuenow", "100");
    const bar = screen.getByTestId("p").firstChild as HTMLElement;
    expect(bar).toHaveStyle("--ig-progress-percent: 100%");
  });

  // H-03 codex P2 sobre PR #81: porcentaje runtime se cuantiza a
  // entero 0..100 antes de emitir. Sin esto, value=1 max=3 emitía
  // `33.33333333333333%`, fuera del conjunto hashable que un CSP
  // con `'unsafe-hashes'` puede pre-computar. El round matchea
  // el `aria-label` que ya redondea.
  it("cuantiza porcentaje fraccional a entero (codex P2 #81)", () => {
    render(<Progress value={1} max={3} data-testid="p" />);
    const bar = screen.getByTestId("p").firstChild as HTMLElement;
    expect(bar).toHaveStyle("--ig-progress-percent: 33%");
    // aria-valuenow sigue siendo el raw clamped (no el porcentaje),
    // así que NO se redondea aquí — sólo se redondea el porcentaje
    // visual cuando se proyecta al 0..100.
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-valuenow", "1");
    expect(el).toHaveAttribute("aria-valuemax", "3");
  });

  // H-03 guard: indeterminate NO emite style attribute (la regla
  // `.ig-progress-indeterminate .ig-progress-bar { width: 30% !important }`
  // toma el control en CSS, no en JS).
  it("indeterminate NO emite --ig-progress-percent inline", () => {
    render(<Progress indeterminate data-testid="p" />);
    const bar = screen.getByTestId("p").firstChild as HTMLElement;
    // Sin style attribute (React omite el attribute cuando style={undefined}).
    expect(bar).not.toHaveAttribute("style");
  });

  it("indeterminate omite aria-valuenow y aplica clase", () => {
    render(<Progress indeterminate data-testid="p" />);
    const el = screen.getByRole("progressbar");
    expect(el).not.toHaveAttribute("aria-valuenow");
    expect(el).toHaveClass("ig-progress-indeterminate");
    expect(el).toHaveAttribute("aria-label", "Cargando");
  });

  describe.each([
    ["brand"],
    ["secondary"],
    ["success"],
    ["warning"],
    ["danger"],
    ["info"],
  ] as const)("variant=%s", (v) => {
    it(`aplica clase ig-progress-${v}`, () => {
      render(<Progress value={50} variant={v} data-testid="p" />);
      expect(screen.getByTestId("p")).toHaveClass(`ig-progress-${v}`);
    });
  });

  describe.each(["sm", "lg"] as const)("size=%s", (s) => {
    it(`aplica clase ig-progress-${s}`, () => {
      render(<Progress value={50} size={s} data-testid="p" />);
      expect(screen.getByTestId("p")).toHaveClass(`ig-progress-${s}`);
    });
  });

  it("aria-label custom override", () => {
    render(<Progress value={30} aria-label="Subiendo archivo" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "Subiendo archivo",
    );
  });

  it("loadingLabel override en indeterminate", () => {
    render(<Progress indeterminate loadingLabel="Loading…" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "Loading…",
    );
  });

  it("formatLabel formatea aria-label en determinate", () => {
    render(
      <Progress
        value={75}
        loadingLabel="Cargando"
        formatLabel={(p) => `${String(p)}% done`}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "75% done",
    );
  });

  it("aria-label HTML std gana sobre formatLabel y loadingLabel", () => {
    render(
      <Progress
        value={50}
        aria-label="Override total"
        loadingLabel="Loading…"
        formatLabel={(p) => `${String(p)}%`}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "Override total",
    );
  });

  it("formatLabel NO aplica en indeterminate (sin porcentaje)", () => {
    render(
      <Progress
        indeterminate
        loadingLabel="Loading…"
        formatLabel={(p) => `${String(p)}% done`}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "Loading…",
    );
  });

  it("forwarda ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress ref={ref} value={0} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  describe.each([
    ["max negativo", -5, 50, 100, 50],
    ["max=0", 0, 50, 100, 50],
    ["max=NaN", Number.NaN, 50, 100, 50],
    ["max=Infinity", Number.POSITIVE_INFINITY, 50, 100, 50],
    ["value=NaN", 100, Number.NaN, 100, 0],
    ["value=Infinity", 100, Number.POSITIVE_INFINITY, 100, 100],
  ] as const)("guard %s", (_label, max, value, expectedMax, expectedNow) => {
    it("cae a defaults seguros sin romper aria", () => {
      render(<Progress value={value} max={max} data-testid="p" />);
      const el = screen.getByRole("progressbar");
      expect(el).toHaveAttribute("aria-valuemax", String(expectedMax));
      expect(el).toHaveAttribute("aria-valuenow", String(expectedNow));
    });
  });
});

describe("Progress — AllStates regression", () => {
  const VARIANTS = [
    "brand",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
  ] as const;

  it("AllStates renderiza variants × valores", async () => {
    const { composeStory } = await import("@storybook/react");
    const stories = await import("./Progress.stories");
    const Story = composeStory(stories.AllStates, stories.default);
    const { container } = render(<Story />);
    for (const v of VARIANTS) {
      expect(container.querySelector(`.ig-progress-${v}`)).not.toBeNull();
    }
    expect(container.querySelector(".ig-progress-indeterminate")).not.toBeNull();
  });
});
