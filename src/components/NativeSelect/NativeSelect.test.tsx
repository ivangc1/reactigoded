import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NativeSelect } from "./NativeSelect";

describe("NativeSelect", () => {
  it("renderiza <select> con options", () => {
    render(
      <NativeSelect aria-label="plan">
        <option value="a">A</option>
        <option value="b">B</option>
      </NativeSelect>,
    );
    const sel = screen.getByLabelText("plan");
    expect(sel.tagName).toBe("SELECT");
    expect(sel).toHaveClass("ig-native-select");
  });

  it("state=error aplica clase y aria-invalid", () => {
    render(
      <NativeSelect aria-label="plan" state="error">
        <option>A</option>
      </NativeSelect>,
    );
    const sel = screen.getByLabelText("plan");
    expect(sel).toHaveClass("ig-input-error");
    expect(sel).toHaveAttribute("aria-invalid", "true");
  });

  it("dispara onChange al seleccionar", async () => {
    const onChange = vi.fn();
    render(
      <NativeSelect aria-label="plan" onChange={onChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </NativeSelect>,
    );
    await userEvent.selectOptions(screen.getByLabelText("plan"), "b");
    expect(onChange).toHaveBeenCalled();
  });

  it("describedBy prop concatena en aria-describedby", () => {
    render(
      <NativeSelect aria-label="plan" describedBy={["a", "b"]}>
        <option>x</option>
      </NativeSelect>,
    );
    expect(screen.getByLabelText("plan")).toHaveAttribute(
      "aria-describedby",
      "a b",
    );
  });

  it("aria-describedby nativo SOBREVIVE sin describedBy (regression beta.3)", () => {
    render(
      <NativeSelect aria-label="plan" aria-describedby="native-id">
        <option>x</option>
      </NativeSelect>,
    );
    expect(screen.getByLabelText("plan")).toHaveAttribute(
      "aria-describedby",
      "native-id",
    );
  });

  it("aria-describedby nativo + describedBy se concatenan (regression beta.3)", () => {
    render(
      <NativeSelect
        aria-label="plan"
        aria-describedby="native"
        describedBy={["a", "b"]}
      >
        <option>x</option>
      </NativeSelect>,
    );
    expect(screen.getByLabelText("plan")).toHaveAttribute(
      "aria-describedby",
      "native a b",
    );
  });
});
