import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Radio } from "./Radio";

describe("Radio", () => {
  it("renderiza input radio con label", () => {
    render(<Radio name="x">Opción</Radio>);
    const input = screen.getByRole("radio", { name: "Opción" });
    expect(input).toHaveAttribute("type", "radio");
    expect(input).toHaveAttribute("name", "x");
  });

  it("renderiza con clase wrapper y default variant=brand", () => {
    const { container } = render(<Radio>x</Radio>);
    expect(container.querySelector("label")).toHaveClass(
      "ig-radio",
      "ig-radio-brand",
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
    it(`label recibe ig-radio-${v}`, () => {
      const { container } = render(<Radio variant={v}>x</Radio>);
      expect(container.querySelector("label")).toHaveClass(`ig-radio-${v}`);
    });
  });

  it("className del consumer se mergea sin pisar las del componente", () => {
    const { container } = render(
      <Radio variant="brand" className="extra otra">
        x
      </Radio>,
    );
    expect(container.querySelector("label")).toHaveClass(
      "ig-radio",
      "ig-radio-brand",
      "extra",
      "otra",
    );
  });

  it("disabled propaga al input", () => {
    render(<Radio disabled>x</Radio>);
    expect(screen.getByRole("radio")).toBeDisabled();
  });

  it("solo uno puede estar marcado dentro del mismo name", async () => {
    function Demo() {
      return (
        <>
          <Radio name="g" value="a" defaultChecked>
            A
          </Radio>
          <Radio name="g" value="b">
            B
          </Radio>
        </>
      );
    }
    render(<Demo />);
    const a = screen.getByRole("radio", { name: "A" });
    const b = screen.getByRole("radio", { name: "B" });
    expect(a).toBeChecked();
    expect(b).not.toBeChecked();
    await userEvent.click(b);
    expect(b).toBeChecked();
    expect(a).not.toBeChecked();
  });

  it("dispara onChange al click", async () => {
    const onChange = vi.fn();
    render(
      <Radio name="g" value="a" onChange={onChange}>
        A
      </Radio>,
    );
    await userEvent.click(screen.getByRole("radio"));
    expect(onChange).toHaveBeenCalledOnce();
  });
});
