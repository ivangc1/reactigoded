import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./Select";

describe("Select", () => {
  it("renderiza <select> con options", () => {
    render(
      <Select aria-label="plan">
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    const sel = screen.getByLabelText("plan");
    expect(sel.tagName).toBe("SELECT");
    expect(sel).toHaveClass("ig-select");
  });

  it("state=error aplica clase y aria-invalid", () => {
    render(
      <Select aria-label="plan" state="error">
        <option>A</option>
      </Select>,
    );
    const sel = screen.getByLabelText("plan");
    expect(sel).toHaveClass("ig-input-error");
    expect(sel).toHaveAttribute("aria-invalid", "true");
  });

  it("dispara onChange al seleccionar", async () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="plan" onChange={onChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    await userEvent.selectOptions(screen.getByLabelText("plan"), "b");
    expect(onChange).toHaveBeenCalled();
  });
});
