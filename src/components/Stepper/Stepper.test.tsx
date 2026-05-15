import { describe, it, expect, vi } from "vitest";
import { createRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
  it("sin onValueChange los dots NO son focuseables (presentational)", () => {
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

  it("con onValueChange cada dot es role=button con roving tabIndex", () => {
    const { container } = render(
      <Stepper active={1} onValueChange={() => {}}>
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
    const onValueChange = vi.fn();
    render(
      <Stepper active={0} onValueChange={onValueChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[0]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith(1);
  });

  it("ArrowLeft retrocede al anterior", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Stepper active={2} onValueChange={onValueChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[2]?.focus();
    await user.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenCalledWith(1);
  });

  it("ArrowRight en último step wrappea al primero", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Stepper active={2} onValueChange={onValueChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[2]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith(0);
  });

  it("ArrowLeft en primer step wrappea al último", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Stepper active={0} onValueChange={onValueChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[0]?.focus();
    await user.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenCalledWith(2);
  });

  it("Home va al primer step", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Stepper active={2} onValueChange={onValueChange}>
        <Step />
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[2]?.focus();
    await user.keyboard("{Home}");
    expect(onValueChange).toHaveBeenCalledWith(0);
  });

  it("End va al último step", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Stepper active={0} onValueChange={onValueChange}>
        <Step />
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[0]?.focus();
    await user.keyboard("{End}");
    expect(onValueChange).toHaveBeenCalledWith(3);
  });

  it("Enter activa el step focuseado (vía click semantics)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Stepper active={0} onValueChange={onValueChange}>
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
    expect(onValueChange).toHaveBeenCalledWith(2);
  });

  it("Space activa el step focuseado", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Stepper active={0} onValueChange={onValueChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    dots[1]?.focus();
    await user.keyboard(" ");
    expect(onValueChange).toHaveBeenCalledWith(1);
  });

  it("click en dot dispara onValueChange con su índice 0-based", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Stepper active={0} onValueChange={onValueChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    if (dots[2]) await user.click(dots[2]);
    expect(onValueChange).toHaveBeenCalledWith(2);
  });

  it("click en el dot active NO dispara onValueChange (no-op)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Stepper active={1} onValueChange={onValueChange}>
        <Step />
        <Step />
        <Step />
      </Stepper>,
    );
    const dots = screen.getAllByRole("button");
    if (dots[1]) await user.click(dots[1]);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("aria-label del dot interactivo es 'Paso N'", () => {
    render(
      <Stepper active={0} onValueChange={() => {}}>
        <Step />
        <Step />
      </Stepper>,
    );
    expect(screen.getByRole("button", { name: "Paso 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paso 2" })).toBeInTheDocument();
  });

  // H-25 (beta.22): focus management sin setTimeout. Tras un ArrowRight
  // que dispara onValueChange, cuando el consumer aplica el cambio
  // (rerender con active+1), el effect post-commit debe focusear el
  // nuevo dot. Sin la prop active actualizándose, el effect no
  // dispara — es el contrato del componente: el focus salta solo
  // cuando el state realmente cambia, no por intent solo.
  it("mueve foco al nuevo step tras keyboard nav cuando active se actualiza [H-25]", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [active, setActive] = useState(0);
      return (
        <Stepper active={active} onValueChange={setActive}>
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
        <Stepper active={999} onValueChange={onActive}>
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
        <Stepper active={-1} onValueChange={onActive}>
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
        <Stepper active={Number.NaN} onValueChange={onActive}>
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
        <Stepper active={1} onValueChange={onActive}>
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
          <Stepper active={0} onValueChange={onActive}>
            {null}
          </Stepper>,
        ),
      ).not.toThrow();
    });
  });

  // Codex P2 sobre commit antiguo del Stepper: arrow nav debe
  // computar desde el step que TIENE FOCUS, no desde `active`. Si el
  // parent rechaza `onValueChange` (wizard que valida, async, etc.),
  // el user keyboard quedaba atrapado pulsando arrows y recibiendo
  // siempre el mismo destination active±1.
  describe("arrow nav usa focused step, no active prop (codex P2)", () => {
    it("ArrowRight desde focused N, active=0 (parent rechaza) → onValueChange(N+1)", () => {
      const onActive = vi.fn();
      const { container } = render(
        // active=0 simula el caso post-rejection: parent NO actualiza
        // pese a que el handler intentó moverse. User tabula al step
        // 1 manualmente y pulsa ArrowRight — el handler debería
        // computar desde 1, no desde 0.
        <Stepper active={0} onValueChange={onActive}>
          <Step label="A" />
          <Step label="B" />
          <Step label="C" />
        </Stepper>,
      );
      const dots = container.querySelectorAll<HTMLElement>(
        '.ig-step[role="button"]',
      );
      expect(dots).toHaveLength(3);
      // El user mueve focus al step 1 manualmente (Tab + ArrowRight
      // previo que fue rejected, etc.).
      dots[1]!.focus();
      fireEvent.keyDown(dots[1]!, { key: "ArrowRight" });
      // Antes del fix: nextIdx = clampedActive(0) + 1 = 1 → callback
      // con el MISMO destino, user atrapado. Ahora: focused(1) + 1 = 2.
      expect(onActive).toHaveBeenLastCalledWith(2);
    });

    it("ArrowLeft desde focused N, active=último (parent rechaza wrap) → onValueChange(N-1)", () => {
      const onActive = vi.fn();
      const { container } = render(
        <Stepper active={2} onValueChange={onActive}>
          <Step label="A" />
          <Step label="B" />
          <Step label="C" />
        </Stepper>,
      );
      const dots = container.querySelectorAll<HTMLElement>(
        '.ig-step[role="button"]',
      );
      // Focus al step 0; active sigue 2.
      dots[0]!.focus();
      fireEvent.keyDown(dots[0]!, { key: "ArrowLeft" });
      // Antes: clampedActive(2) - 1 = 1 (perspectiva incorrecta).
      // Ahora: focused(0) - 1 = wrap a lastIdx = 2.
      expect(onActive).toHaveBeenLastCalledWith(2);
    });

    it("Home / End siguen siendo absolutos (no dependen del focused)", () => {
      const onActive = vi.fn();
      const { container } = render(
        <Stepper active={1} onValueChange={onActive}>
          <Step label="A" />
          <Step label="B" />
          <Step label="C" />
        </Stepper>,
      );
      const dots = container.querySelectorAll<HTMLElement>(
        '.ig-step[role="button"]',
      );
      dots[2]!.focus();
      fireEvent.keyDown(dots[2]!, { key: "Home" });
      expect(onActive).toHaveBeenLastCalledWith(0);
      fireEvent.keyDown(dots[0]!, { key: "End" });
      expect(onActive).toHaveBeenLastCalledWith(2);
    });
  });

  // Codex P1 post-audit sobre PR #19: si el padre rechaza una
  // transición (no commitea active), `focusTargetIdxRef` queda stale.
  // Cuando posteriormente el padre commitea una transición DISTINTA,
  // el guard `idx !== clampedActive` debe abortar para evitar que el
  // focus salte al idx rechazado antiguo.
  describe("guard idx-mismatch en focus (codex P1 post-audit)", () => {
    it("padre rechaza ArrowRight, luego commitea idx distinto: focus NO va al idx rechazado", async () => {
      const user = userEvent.setup();
      function Harness() {
        const [active, setActive] = useState(0);
        return (
          <>
            <button
              data-testid="set-2"
              onClick={() => {
                setActive(2);
              }}
            >
              set 2
            </button>
            <Stepper
              active={active}
              onValueChange={(next) => {
                // Padre rechaza si next === 1 (simulación de validación).
                if (next === 1) return;
                setActive(next);
              }}
            >
              <Step label="S0" />
              <Step label="S1" />
              <Step label="S2" />
            </Stepper>
          </>
        );
      }
      render(<Harness />);
      const dots = document.querySelectorAll<HTMLElement>(
        '.ig-step[role="button"]',
      );
      const step0 = dots[0];
      step0?.focus();
      // ArrowRight: intent=1, padre rechaza. focusTargetIdxRef queda en 1.
      await user.keyboard("{ArrowRight}");
      expect(step0).toHaveFocus();
      // Padre commitea programáticamente idx=2 (distinto del rechazado).
      await user.click(screen.getByTestId("set-2"));
      // Guard debe abortar: focus NO va al idx=1 stale.
      // Lo crítico es que el focus NO termine en el step 1 (idx stale).
      expect(dots[1]).not.toHaveFocus();
    });
  });
});
