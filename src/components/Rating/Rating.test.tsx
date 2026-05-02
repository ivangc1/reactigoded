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

describe("Rating — roving tabindex + keyboard nav (WAI-ARIA APG)", () => {
  it("solo la estrella checked tiene tabIndex=0; el resto -1", () => {
    render(<Rating value={3} max={5} />);
    const stars = screen.getAllByRole("radio");
    expect(stars[0]).toHaveAttribute("tabindex", "-1");
    expect(stars[1]).toHaveAttribute("tabindex", "-1");
    expect(stars[2]).toHaveAttribute("tabindex", "0"); // value=3
    expect(stars[3]).toHaveAttribute("tabindex", "-1");
    expect(stars[4]).toHaveAttribute("tabindex", "-1");
  });

  it("sin valor (value=0): la primera estrella es tab stop", () => {
    render(<Rating value={0} max={5} />);
    const stars = screen.getAllByRole("radio");
    expect(stars[0]).toHaveAttribute("tabindex", "0");
    stars.slice(1).forEach((s) => {
      expect(s).toHaveAttribute("tabindex", "-1");
    });
  });

  it("readOnly: todas las estrellas tabIndex=-1", () => {
    render(<Rating value={3} readOnly />);
    screen.getAllByRole("radio").forEach((s) => {
      expect(s).toHaveAttribute("tabindex", "-1");
    });
  });

  it("ArrowRight selecciona la siguiente estrella y mueve foco", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={2} onValueChange={onValueChange} />);
    const star2 = screen.getByRole("radio", { name: "2 estrellas" });
    star2.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(3);
    expect(screen.getByRole("radio", { name: "3 estrellas" })).toHaveFocus();
  });

  it("ArrowLeft selecciona la anterior", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={3} onValueChange={onValueChange} />);
    const star3 = screen.getByRole("radio", { name: "3 estrellas" });
    star3.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole("radio", { name: "2 estrellas" })).toHaveFocus();
  });

  it("ArrowRight tope = max (no se sale)", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={5} max={5} onValueChange={onValueChange} />);
    const last = screen.getByRole("radio", { name: "5 estrellas" });
    last.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    expect(last).toHaveFocus();
  });

  it("ArrowLeft tope = 1 (no se sale)", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={1} onValueChange={onValueChange} />);
    const first = screen.getByRole("radio", { name: "1 estrella" });
    first.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(first).toHaveFocus();
  });

  it("Home → primera estrella, End → última", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={3} max={5} onValueChange={onValueChange} />);
    const star3 = screen.getByRole("radio", { name: "3 estrellas" });
    star3.focus();
    await userEvent.keyboard("{End}");
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    expect(screen.getByRole("radio", { name: "5 estrellas" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByRole("radio", { name: "1 estrella" })).toHaveFocus();
  });

  it("Space/Enter sobre una estrella la selecciona", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={0} onValueChange={onValueChange} />);
    const first = screen.getByRole("radio", { name: "1 estrella" });
    first.focus();
    await userEvent.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });

  it("readOnly ignora keyboard nav", async () => {
    const onValueChange = vi.fn();
    render(<Rating value={3} readOnly onValueChange={onValueChange} />);
    const star3 = screen.getByRole("radio", { name: "3 estrellas" });
    star3.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
