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
