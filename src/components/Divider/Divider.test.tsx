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

  it("aplica `ig-divider-dashed` y la clase de variant", () => {
    const { container } = render(<Divider dashed variant="success" />);
    const el = container.querySelector("hr");
    expect(el).toHaveClass("ig-divider-dashed", "ig-divider-success");
  });

  it("variant=default no añade clase de variant", () => {
    const { container } = render(<Divider variant="default" />);
    const el = container.querySelector("hr");
    expect(el).not.toHaveClass("ig-divider-default");
  });
});
