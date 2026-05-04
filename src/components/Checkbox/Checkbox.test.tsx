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

  it("renderiza con clase wrapper y default variant=brand", () => {
    const { container } = render(<Checkbox>x</Checkbox>);
    expect(container.querySelector("label")).toHaveClass(
      "ig-checkbox",
      "ig-checkbox-brand",
    );
  });

  describe.each([
    ["brand"],
    ["secondary"],
    ["success"],
    ["warning"],
    ["danger"],
    ["info"],
  ] as const)("variant=%s", (v) => {
    it(`label recibe ig-checkbox-${v}`, () => {
      const { container } = render(<Checkbox variant={v}>x</Checkbox>);
      expect(container.querySelector("label")).toHaveClass(`ig-checkbox-${v}`);
    });
  });

  it("className del consumer se mergea sin pisar las del componente", () => {
    const { container } = render(
      <Checkbox variant="brand" className="extra otra">
        x
      </Checkbox>,
    );
    expect(container.querySelector("label")).toHaveClass(
      "ig-checkbox",
      "ig-checkbox-brand",
      "extra",
      "otra",
    );
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

  it("indeterminate=true aplica .indeterminate y aria-checked=mixed", () => {
    render(<Checkbox indeterminate>Parcial</Checkbox>);
    const input = screen.getByRole("checkbox");
    expect(input).toBePartiallyChecked();
  });

  it("indeterminate sigue true tras click si la prop sigue true (sticky)", async () => {
    // Click en un checkbox con .indeterminate=true hace que el browser limpie
    // .indeterminate (toggle a checked). Si el consumer mantiene la prop
    // indeterminate=true, el componente debe re-aplicarla en el change.
    render(<Checkbox indeterminate>Parcial</Checkbox>);
    const input = screen.getByRole("checkbox");
    expect(input).toBePartiallyChecked();
    await userEvent.click(input);
    expect(input).toBePartiallyChecked();
  });
});

describe("Checkbox — AllStates regression", () => {
  const VARIANTS = [
    "brand",
    "secondary",
    "success",
    "warning",
    "danger",
    "info",
  ] as const;

  it("AllStates renderiza variants × estados", async () => {
    const { composeStory } = await import("@storybook/react");
    const stories = await import("./Checkbox.stories");
    const Story = composeStory(stories.AllStates, stories.default);
    const { container } = render(<Story />);
    for (const v of VARIANTS) {
      expect(container.querySelector(`.ig-checkbox-${v}`)).not.toBeNull();
    }
  });
});
