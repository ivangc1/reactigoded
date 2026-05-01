import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renderiza un span con `ig-badge` y variant brand por defecto", () => {
    render(<Badge>Nuevo</Badge>);
    const el = screen.getByText("Nuevo");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("ig-badge", "ig-badge-brand");
  });

  it("aplica la variant solicitada", () => {
    render(<Badge variant="success">OK</Badge>);
    expect(screen.getByText("OK")).toHaveClass("ig-badge-success");
  });

  it("outline=true sustituye la clase rellena por la outline", () => {
    render(
      <Badge outline variant="danger">
        Err
      </Badge>,
    );
    const el = screen.getByText("Err");
    expect(el).toHaveClass("ig-badge-outline-danger");
    expect(el).not.toHaveClass("ig-badge-danger");
  });

  it("pill añade `ig-badge-pill`", () => {
    render(<Badge pill>P</Badge>);
    expect(screen.getByText("P")).toHaveClass("ig-badge-pill");
  });

  it("añade clase de size solo si no es `md`", () => {
    const { rerender } = render(<Badge size="md">A</Badge>);
    expect(screen.getByText("A")).not.toHaveClass("ig-badge-md");
    rerender(<Badge size="lg">A</Badge>);
    expect(screen.getByText("A")).toHaveClass("ig-badge-lg");
  });

  it("forwarda ref al span", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>X</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
