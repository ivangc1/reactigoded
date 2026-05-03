import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Divider } from "./Divider";

describe("Divider", () => {
  it("renderiza un <hr> con `ig-divider` por defecto", () => {
    const { container } = render(<Divider />);
    const el = container.querySelector("hr");
    expect(el).not.toBeNull();
    expect(el).toHaveClass("ig-divider");
  });

  it("vertical renderiza <span> con role=separator y aria-orientation", () => {
    render(<Divider vertical data-testid="d" />);
    const el = screen.getByTestId("d");
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("ig-divider-vertical");
    expect(el).toHaveAttribute("role", "separator");
    expect(el).toHaveAttribute("aria-orientation", "vertical");
  });

  it("con children usa modo with-text", () => {
    render(<Divider>ó</Divider>);
    const el = screen.getByText("ó");
    expect(el.tagName).toBe("DIV");
    expect(el).toHaveClass("ig-divider-with-text");
  });

  describe.each([
    ["brand"],
    ["secondary"],
    ["success"],
    ["warning"],
    ["danger"],
    ["info"],
  ] as const)("variant=%s", (v) => {
    it(`<hr> recibe ig-divider-${v}`, () => {
      const { container } = render(<Divider variant={v} />);
      expect(container.querySelector("hr")).toHaveClass(`ig-divider-${v}`);
    });
  });

  it("dashed añade ig-divider-dashed", () => {
    const { container } = render(<Divider dashed />);
    expect(container.querySelector("hr")).toHaveClass("ig-divider-dashed");
  });
});
