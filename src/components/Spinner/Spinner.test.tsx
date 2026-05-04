import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("expone role=status con aria-label por defecto", () => {
    render(<Spinner />);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-label", "Cargando…");
  });

  it("permite ariaLabel personalizado", () => {
    render(<Spinner aria-label="Procesando pago" />);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-label", "Procesando pago");
  });

  describe.each([
    ["brand"],
    ["secondary"],
    ["success"],
    ["warning"],
    ["danger"],
    ["info"],
  ] as const)("variant=%s", (v) => {
    it(`aplica clase ig-spinner-${v}`, () => {
      render(<Spinner variant={v} />);
      expect(screen.getByRole("status")).toHaveClass(`ig-spinner-${v}`);
    });
  });

  describe.each(["sm", "lg", "xl"] as const)("size=%s", (s) => {
    it(`aplica clase ig-spinner-${s}`, () => {
      render(<Spinner size={s} />);
      expect(screen.getByRole("status")).toHaveClass(`ig-spinner-${s}`);
    });
  });

  it("forwarda ref al span", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Spinner ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});

describe("Spinner — AllStates regression", () => {
  const VARIANTS = [
    "brand",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
  ] as const;

  it("AllStates renderiza variants × sizes", async () => {
    const { composeStory } = await import("@storybook/react");
    const stories = await import("./Spinner.stories");
    const Story = composeStory(stories.AllStates, stories.default);
    const { container } = render(<Story />);
    for (const v of VARIANTS) {
      expect(container.querySelector(`.ig-spinner-${v}`)).not.toBeNull();
    }
    expect(container.querySelectorAll('[role="status"]').length).toBeGreaterThan(20);
  });
});

describe("Spinner — i18n label prop", () => {
  it("label custom override aria-label default", () => {
    render(<Spinner label="Loading…" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading…");
  });

  it("aria-label directo vía rest gana sobre label prop", () => {
    render(<Spinner label="Loading…" aria-label="Custom override" />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Custom override",
    );
  });

  it("sin label ni aria-label cae a 'Cargando…' ES", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Cargando…");
  });
});
