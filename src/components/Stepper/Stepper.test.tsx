import { describe, it, expect, vi } from "vitest";
import { createRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Stepper, Step } from "./index";

describe("Stepper", () => {
  it("renderiza role=group con aria-label", () => {
    render(
      <Stepper active={0}>
        <Step />
        <Step />
      </Stepper>,
    );
    expect(
      screen.getByRole("group", { name: "Progreso" }),
    ).toBeInTheDocument();
  });

  it("aria-label custom", () => {
    render(
      <Stepper active={0} aria-label="Checkout">
        <Step />
      </Stepper>,
    );
    expect(screen.getByRole("group", { name: "Checkout" })).toBeInTheDocument();
  });

  it("inyecta index 1-based en cada step", () => {
    render(
      <Stepper active={1}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    // El step 0 está completo → muestra ✓; el 1 activo → "2"; el 2 pending → "3"
    expect(screen.getByText("✓")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("step activo lleva aria-current=step y clase ig-step-active en el círculo interno", () => {
    render(
      <Stepper active={1} data-testid="s">
        <Step data-testid="s0" />
        <Step data-testid="s1" />
      </Stepper>,
    );
    // El aria-current vive en el `span.ig-step` (no en el wrapper `<div>`).
    const dot = screen.getByText("2");
    expect(dot).toHaveAttribute("aria-current", "step");
    expect(dot).toHaveClass("ig-step", "ig-step-active");
    // El step 0 (complete, muestra "✓") no debe tener aria-current.
    const dot0 = screen.getByText("✓");
    expect(dot0).not.toHaveAttribute("aria-current");
  });

  it("steps anteriores marcados complete con clase y check", () => {
    render(
      <Stepper active={2}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const checks = screen.getAllByText("✓");
    expect(checks).toHaveLength(2);
    checks.forEach((c) => expect(c).toHaveClass("ig-step-complete"));
  });

  it("intercala líneas entre steps en modo compacto", () => {
    const { container } = render(
      <Stepper active={1}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const lines = container.querySelectorAll(".ig-step-line");
    expect(lines).toHaveLength(2);
    // Sólo la primera (idx 0 < active 1) está completa
    expect(lines[0]).toHaveClass("ig-step-line-complete");
    expect(lines[1]).not.toHaveClass("ig-step-line-complete");
  });

  it("modo labeled usa ig-stepper-labeled y renderiza labels", () => {
    render(
      <Stepper active={1} labeled data-testid="s">
        <Step label="Datos" />
        <Step label="Pago" />
        <Step label="Confirmación" />
      </Stepper>,
    );
    expect(screen.getByTestId("s")).toHaveClass("ig-stepper-labeled");
    expect(screen.getByText("Datos")).toHaveClass("ig-step-label");
    expect(screen.getByText("Pago")).toHaveClass("ig-step-label");
    expect(screen.getByText("Confirmación")).toHaveClass("ig-step-label");
  });

  it("modo labeled NO añade líneas externas (usa ::after del CSS)", () => {
    const { container } = render(
      <Stepper active={0} labeled>
        <Step label="A" />
        <Step label="B" />
      </Stepper>,
    );
    expect(container.querySelectorAll(".ig-step-line")).toHaveLength(0);
  });

  it("forwarda ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Stepper ref={ref} active={0}>
        <Step />
      </Stepper>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("Stepper — modo interactive (keyboard nav, beta.20)", () => {
  it("sin onActiveChange los dots NO son focuseables (presentational)", () => {
    const { container } = render(
      <Stepper active={1}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = container.querySelectorAll(".ig-step");
    for (const d of dots) {
      expect(d).not.toHaveAttribute("role", "button");
      expect(d).not.toHaveAttribute("tabindex");
    }
  });

  it("con onActiveChange cada dot es role=button con roving tabIndex", () => {
    const { container } = render(
      <Stepper active={1} onActiveChange={() => {}}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = container.querySelectorAll<HTMLElement>(
      '.ig-step[role="button"]',
    );
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute("tabindex", "-1");
    expect(dots[1]).toHaveAttribute("tabindex", "0"); // active
    expect(dots[2]).toHaveAttribute("tabindex", "-1");
  });

  it("ArrowRight avanza al siguiente step", async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    render(
      <Stepper active={0} onActiveChange={onActiveChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[0]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(onActiveChange).toHaveBeenCalledWith(1);
  });

  it("ArrowLeft retrocede al anterior", async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    render(
      <Stepper active={2} onActiveChange={onActiveChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[2]?.focus();
    await user.keyboard("{ArrowLeft}");
    expect(onActiveChange).toHaveBeenCalledWith(1);
  });

  it("ArrowRight en último step wrappea al primero", async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    render(
      <Stepper active={2} onActiveChange={onActiveChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[2]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(onActiveChange).toHaveBeenCalledWith(0);
  });

  it("ArrowLeft en primer step wrappea al último", async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    render(
      <Stepper active={0} onActiveChange={onActiveChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[0]?.focus();
    await user.keyboard("{ArrowLeft}");
    expect(onActiveChange).toHaveBeenCalledWith(2);
  });

  it("Home va al primer step", async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    render(
      <Stepper active={2} onActiveChange={onActiveChange}>
        <Step />
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[2]?.focus();
    await user.keyboard("{Home}");
    expect(onActiveChange).toHaveBeenCalledWith(0);
  });

  it("End va al último step", async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    render(
      <Stepper active={0} onActiveChange={onActiveChange}>
        <Step />
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[0]?.focus();
    await user.keyboard("{End}");
    expect(onActiveChange).toHaveBeenCalledWith(3);
  });

  it("Enter activa el step focuseado (vía click semantics)", async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    render(
      <Stepper active={0} onActiveChange={onActiveChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    // En modo interactive solo el active tiene tabindex 0; para forzar el
    // foco en otro hacemos focus manual (simula que el usuario navegó).
    dots[2]?.focus();
    await user.keyboard("{Enter}");
    expect(onActiveChange).toHaveBeenCalledWith(2);
  });

  it("Space activa el step focuseado", async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    render(
      <Stepper active={0} onActiveChange={onActiveChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[1]?.focus();
    await user.keyboard(" ");
    expect(onActiveChange).toHaveBeenCalledWith(1);
  });

  it("click en dot dispara onActiveChange con su índice 0-based", async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    render(
      <Stepper active={0} onActiveChange={onActiveChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    if (dots[2]) await user.click(dots[2]);
    expect(onActiveChange).toHaveBeenCalledWith(2);
  });

  it("click en el dot active NO dispara onActiveChange (no-op)", async () => {
    const user = userEvent.setup();
    const onActiveChange = vi.fn();
    render(
      <Stepper active={1} onActiveChange={onActiveChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    if (dots[1]) await user.click(dots[1]);
    expect(onActiveChange).not.toHaveBeenCalled();
  });

  it("aria-label del dot interactivo es 'Paso N'", () => {
    render(
      <Stepper active={0} onActiveChange={() => {}}>
        <Step />
        <Step />
      </Stepper>,
    );
    expect(screen.getByRole("button", { name: "Paso 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paso 2" })).toBeInTheDocument();
  });

  // H-25 (beta.22): focus management sin setTimeout. Tras un ArrowRight
  // que dispara onActiveChange, cuando el consumer aplica el cambio
  // (rerender con active+1), el effect post-commit debe focusear el
  // nuevo dot. Sin la prop active actualizándose, el effect no
  // dispara — es el contrato del componente: el focus salta solo
  // cuando el state realmente cambia, no por intent solo.
  it("mueve foco al nuevo step tras keyboard nav cuando active se actualiza [H-25]", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [active, setActive] = useState(0);
      return (
        <Stepper active={active} onActiveChange={setActive}>
          <Step />
          <Step />
          <Step />
        </Stepper>
      );
    }
    render(<Wrapper />);
    const dots = screen.getAllByRole("button");
    dots[0]?.focus();
    expect(dots[0]).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    // El effect H-25 corrió tras el rerender con active=1 y movió focus.
    expect(dots[1]).toHaveFocus();
  });
});

describe("Stepper — regresión scope CSS step-active (beta.20)", () => {
  it("step active no aplica selector global al wrapper item", () => {
    // Bug latente desde beta.5: la regla CSS `.ig-step-active` global
    // matcheaba tanto el dot como el wrapper `.ig-step-item.ig-step-active`,
    // pintando el wrapper de axis-nox y dejando el `.ig-step-label`
    // (color cinis-nox via `var(--ig-text-body)`) en contraste 1.02.
    // Fix beta.20: selector compound `.ig-step.ig-step-active` limita
    // la regla al dot. Este test ancla la separación a nivel DOM.
    const { container } = render(
      <Stepper labeled active={2} aria-label="test">
        <Step label="Uno" />
        <Step label="Dos" />
        <Step label="Tres" />
      </Stepper>,
    );

    const wrapper = container.querySelector(".ig-step-item.ig-step-active");
    const dot = container.querySelector(".ig-step.ig-step-active");

    expect(wrapper).toBeTruthy();
    expect(dot).toBeTruthy();

    // Selector compound `.ig-step.ig-step-active` solo debe matchear el dot.
    expect(wrapper?.matches(".ig-step.ig-step-active")).toBe(false);
    expect(dot?.matches(".ig-step.ig-step-active")).toBe(true);

    // Misma garantía para complete:
    const completeWrapper = container.querySelector(
      ".ig-step-item.ig-step-complete",
    );
    const completeDot = container.querySelector(".ig-step.ig-step-complete");
    expect(completeWrapper?.matches(".ig-step.ig-step-complete")).toBe(false);
    expect(completeDot?.matches(".ig-step.ig-step-complete")).toBe(true);
  });

  // B-05 (gate review): Stepper con `active` fuera de rango clampa al
  // último step válido en vez de dejar el tablist sin tab stop.
  describe("active fuera de rango (B-05) — clamp + dev warn", () => {
    it("active > lastIdx clampa al último step (mantiene tab stop)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const onActive = vi.fn();
      const { container } = render(
        <Stepper active={999} onActiveChange={onActive}>
          <Step label="A" />
          <Step label="B" />
          <Step label="C" />
        </Stepper>,
      );
      const dots = container.querySelectorAll<HTMLElement>(
        '.ig-step[role="button"]',
      );
      const tabIndexes = Array.from(dots).map((d) =>
        d.getAttribute("tabIndex"),
      );
      // El último step recibe tabIndex=0 (clamp), no todos -1.
      expect(tabIndexes).toEqual(["-1", "-1", "0"]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("clamping a 2"),
      );
      warnSpy.mockRestore();
    });

    it("active < 0 clampa a 0 (mantiene tab stop)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const onActive = vi.fn();
      const { container } = render(
        <Stepper active={-1} onActiveChange={onActive}>
          <Step label="A" />
          <Step label="B" />
        </Stepper>,
      );
      const dots = container.querySelectorAll<HTMLElement>(
        '.ig-step[role="button"]',
      );
      const tabIndexes = Array.from(dots).map((d) =>
        d.getAttribute("tabIndex"),
      );
      expect(tabIndexes).toEqual(["0", "-1"]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("clamping a 0"),
      );
      warnSpy.mockRestore();
    });

    it("active=NaN clampa a 0 (mantiene tab stop)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const onActive = vi.fn();
      const { container } = render(
        <Stepper active={Number.NaN} onActiveChange={onActive}>
          <Step label="A" />
          <Step label="B" />
        </Stepper>,
      );
      const dots = container.querySelectorAll<HTMLElement>(
        '.ig-step[role="button"]',
      );
      const tabIndexes = Array.from(dots).map((d) =>
        d.getAttribute("tabIndex"),
      );
      expect(tabIndexes).toEqual(["0", "-1"]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("no es un número finito"),
      );
      warnSpy.mockRestore();
    });

    it("active dentro de rango NO emite warn", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const onActive = vi.fn();
      render(
        <Stepper active={1} onActiveChange={onActive}>
          <Step label="A" />
          <Step label="B" />
          <Step label="C" />
        </Stepper>,
      );
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("active=0 con stepCount=0 no crashea", () => {
      const onActive = vi.fn();
      expect(() =>
        render(
          <Stepper active={0} onActiveChange={onActive}>
            {null}
          </Stepper>,
        ),
      ).not.toThrow();
    });
  });
});
