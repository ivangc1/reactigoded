import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("renderiza un <textarea> con `ig-textarea` por defecto", () => {
    render(<Textarea aria-label="bio" />);
    const el = screen.getByLabelText("bio");
    expect(el.tagName).toBe("TEXTAREA");
    expect(el).toHaveClass("ig-textarea");
  });

  it("auto=true sustituye la clase base por `ig-textarea-auto`", () => {
    render(<Textarea auto aria-label="bio" />);
    const el = screen.getByLabelText("bio");
    expect(el).toHaveClass("ig-textarea-auto");
    expect(el).not.toHaveClass("ig-textarea");
  });

  it("state=error aplica clase y aria-invalid", () => {
    render(<Textarea state="invalid" aria-label="bio" />);
    const el = screen.getByLabelText("bio");
    expect(el).toHaveClass("ig-input-invalid");
    expect(el).toHaveAttribute("aria-invalid", "true");
  });

  it("acepta input multilínea", async () => {
    render(<Textarea aria-label="bio" />);
    const el = screen.getByLabelText("bio");
    await userEvent.type(el, "linea 1{enter}linea 2");
    expect(el).toHaveValue("linea 1\nlinea 2");
  });

  it("aria-describedby nativo SOBREVIVE sin describedBy (regression beta.3)", () => {
    render(<Textarea aria-label="bio" aria-describedby="helper-1" />);
    expect(screen.getByLabelText("bio")).toHaveAttribute(
      "aria-describedby",
      "helper-1",
    );
  });

  it("aria-describedby nativo + describedBy se concatenan (regression beta.3)", () => {
    render(
      <Textarea
        aria-label="bio"
        aria-describedby="native-id"
        describedBy={["a", "b"]}
      />,
    );
    expect(screen.getByLabelText("bio")).toHaveAttribute(
      "aria-describedby",
      "native-id a b",
    );
  });
});
