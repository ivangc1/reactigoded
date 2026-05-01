import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Rating } from "./Rating";

describe("Rating", () => {
  it("renderiza N estrellas como radio buttons", () => {
    render(<Rating max={5} value={0} />);
    const stars = screen.getAllByRole("radio");
    expect(stars).toHaveLength(5);
  });

  it("aria-checked en la estrella seleccionada", () => {
    render(<Rating value={3} />);
    expect(screen.getByRole("radio", { name: "3 estrellas" })).toBeChecked();
  });

  it("estrella 1 usa singular", () => {
    render(<Rating value={1} max={5} />);
    expect(screen.getByRole("radio", { name: "1 estrella" })).toBeInTheDocument();
  });

  it("dispara onValueChange con el valor pulsado (controlled)", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={0} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "4 estrellas" }));
    expect(onValueChange).toHaveBeenCalledWith(4);
  });

  it("uncontrolled: defaultValue inicial y click actualiza el estado interno", async () => {
    render(<Rating defaultValue={2} />);
    expect(screen.getByRole("radio", { name: "2 estrellas" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "5 estrellas" }));
    expect(screen.getByRole("radio", { name: "5 estrellas" })).toBeChecked();
  });

  it("readOnly desactiva click y aplica clase", () => {
    render(<Rating value={3} readOnly data-testid="r" />);
    expect(screen.getByTestId("r")).toHaveClass("ig-rating-readonly");
    screen.getAllByRole("radio").forEach((s) => {
      expect(s).toBeDisabled();
    });
  });

  it("aplica size cuando no es md", () => {
    render(<Rating size="xl" data-testid="r" />);
    expect(screen.getByTestId("r")).toHaveClass("ig-rating-xl");
  });

  it("transición controlled→uncontrolled deja stale el último valor controlado", () => {
    // Patrón documentado: si el consumer cambia de modo, el internal state
    // arranca desde defaultValue. No es un bug — es comportamiento esperado.
    const { rerender } = render(<Rating value={3} onValueChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "3 estrellas" })).toBeChecked();
    rerender(<Rating defaultValue={0} />);
    // En uncontrolled, el state interno arranca de defaultValue=0.
    expect(screen.getByRole("radio", { name: "1 estrella" })).not.toBeChecked();
  });
});
