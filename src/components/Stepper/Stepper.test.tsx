import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
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
      <Stepper active={0} ariaLabel="Checkout">
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
