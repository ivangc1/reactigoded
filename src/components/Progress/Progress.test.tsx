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

  it("calcula porcentaje en width del bar interno", () => {
    render(<Progress value={25} data-testid="p" />);
    const bar = screen.getByTestId("p").firstChild as HTMLElement;
    expect(bar).toHaveClass("ig-progress-bar");
    expect(bar).toHaveStyle({width:"25%"});
  });

  it("respeta max custom", () => {
    render(<Progress value={5} max={10} data-testid="p" />);
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-valuemax", "10");
    expect(el).toHaveAttribute("aria-valuenow", "5");
    const bar = screen.getByTestId("p").firstChild as HTMLElement;
    expect(bar).toHaveStyle({width:"50%"});
  });

  it("clampa value fuera de rango", () => {
    render(<Progress value={150} data-testid="p" />);
    const el = screen.getByRole("progressbar");
    expect(el).toHaveAttribute("aria-valuenow", "100");
    const bar = screen.getByTestId("p").firstChild as HTMLElement;
    expect(bar).toHaveStyle({width:"100%"});
  });

  it("indeterminate omite aria-valuenow y aplica clase", () => {
    render(<Progress indeterminate data-testid="p" />);
    const el = screen.getByRole("progressbar");
    expect(el).not.toHaveAttribute("aria-valuenow");
    expect(el).toHaveClass("ig-progress-indeterminate");
    expect(el).toHaveAttribute("aria-label", "Cargando");
  });

  it("aplica variant y size", () => {
    render(<Progress value={50} variant="success" size="lg" data-testid="p" />);
    expect(screen.getByTestId("p")).toHaveClass(
      "ig-progress-success",
      "ig-progress-lg",
    );
  });

  it("size=md no añade clase modificadora", () => {
    render(<Progress value={10} data-testid="p" />);
    expect(screen.getByTestId("p")).not.toHaveClass("ig-progress-md");
  });

  it("aria-label custom override", () => {
    render(<Progress value={30} aria-label="Subiendo archivo" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "Subiendo archivo",
    );
  });

  it("forwarda ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress ref={ref} value={0} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
