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
    render(<Spinner ariaLabel="Procesando pago" />);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-label", "Procesando pago");
  });

  it("aplica clase de variant y size", () => {
    render(<Spinner variant="danger" size="xl" />);
    const el = screen.getByRole("status");
    expect(el).toHaveClass("ig-spinner", "ig-spinner-danger", "ig-spinner-xl");
  });

  it("size=md no añade clase modificadora", () => {
    render(<Spinner size="md" />);
    expect(screen.getByRole("status")).not.toHaveClass("ig-spinner-md");
  });

  it("forwarda ref al span", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Spinner ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
