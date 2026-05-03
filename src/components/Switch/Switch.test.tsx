import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("renderiza un input[type=checkbox] con role=switch dentro de un label", () => {
    render(<Switch>Activar</Switch>);
    const input = screen.getByRole("switch", { name: "Activar" });
    expect(input).toHaveAttribute("type", "checkbox");
    expect(input).not.toBeChecked();
  });

  it("aria-checked refleja el estado interno (uncontrolled)", async () => {
    render(<Switch>Activar</Switch>);
    const input = screen.getByRole("switch");
    expect(input).not.toBeChecked();
    await userEvent.click(input);
    expect(input).toBeChecked();
  });

  it("aria-checked sigue a la prop checked (controlled)", () => {
    const { rerender } = render(<Switch checked={false} onChange={() => {}}>x</Switch>);
    expect(screen.getByRole("switch")).not.toBeChecked();
    rerender(<Switch checked onChange={() => {}}>x</Switch>);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("aplica variant brand por defecto", () => {
    const { container } = render(<Switch>x</Switch>);
    const label = container.querySelector("label");
    expect(label).toHaveClass("ig-switch", "ig-switch-brand");
  });

  it("variant=success aplica la clase correspondiente", () => {
    const { container } = render(<Switch variant="success">x</Switch>);
    expect(container.querySelector("label")).toHaveClass("ig-switch-success");
  });

  it("disabled propaga al input y marca data-disabled en label", () => {
    const { container } = render(<Switch disabled>x</Switch>);
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(container.querySelector("label")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("dispara onChange al click", async () => {
    const onChange = vi.fn();
    render(<Switch onChange={onChange}>x</Switch>);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("indeterminate sigue true tras click si la prop sigue true (sticky)", async () => {
    render(<Switch indeterminate>Mixto</Switch>);
    const input = screen.getByRole("switch");
    expect(input).toBePartiallyChecked();
    await userEvent.click(input);
    expect(input).toBePartiallyChecked();
  });

  it("transición controlled→uncontrolled emite warning de React", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(<Switch checked onChange={() => {}}>x</Switch>);
    rerender(<Switch>x</Switch>);
    expect(
      errSpy.mock.calls.some((call) =>
        String(call[0]).includes("controlled"),
      ),
    ).toBe(true);
    errSpy.mockRestore();
  });
});
