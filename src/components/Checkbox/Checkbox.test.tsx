import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("renderiza input checkbox con label asociado", () => {
    render(<Checkbox>Acepto</Checkbox>);
    const input = screen.getByRole("checkbox", { name: "Acepto" });
    expect(input).toHaveAttribute("type", "checkbox");
  });

  it("aplica variant brand por defecto", () => {
    const { container } = render(<Checkbox>x</Checkbox>);
    expect(container.querySelector("label")).toHaveClass(
      "ig-checkbox",
      "ig-checkbox-brand",
    );
  });

  it("variant=danger aplica la clase", () => {
    const { container } = render(<Checkbox variant="danger">x</Checkbox>);
    expect(container.querySelector("label")).toHaveClass("ig-checkbox-danger");
  });

  it("disabled propaga al input", () => {
    render(<Checkbox disabled>x</Checkbox>);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("dispara onChange al click sobre el label", async () => {
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange}>Click</Checkbox>);
    await userEvent.click(screen.getByText("Click"));
    expect(onChange).toHaveBeenCalledOnce();
  });
});
