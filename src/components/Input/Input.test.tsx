import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";
import { Label } from "./Label";
import { Helper } from "./Helper";
import { ErrorText } from "./ErrorText";
import { InputGroup } from "./InputGroup";
import { InputAddon } from "./InputAddon";

describe("Input", () => {
  it("renderiza un <input> con `ig-input`", () => {
    render(<Input placeholder="x" />);
    const el = screen.getByPlaceholderText("x");
    expect(el).toHaveClass("ig-input");
    expect(el.tagName).toBe("INPUT");
  });

  it("aplica size sólo si no es md", () => {
    const { rerender } = render(<Input size="md" placeholder="x" />);
    expect(screen.getByPlaceholderText("x")).not.toHaveClass("ig-input-md");
    rerender(<Input size="lg" placeholder="x" />);
    expect(screen.getByPlaceholderText("x")).toHaveClass("ig-input-lg");
  });

  it("state=error aplica clase y aria-invalid", () => {
    render(<Input state="error" placeholder="x" />);
    const el = screen.getByPlaceholderText("x");
    expect(el).toHaveClass("ig-input-error");
    expect(el).toHaveAttribute("aria-invalid", "true");
  });

  it("state=success aplica clase y no añade aria-invalid", () => {
    render(<Input state="success" placeholder="x" />);
    const el = screen.getByPlaceholderText("x");
    expect(el).toHaveClass("ig-input-success");
    expect(el).not.toHaveAttribute("aria-invalid");
  });

  it("acepta input del usuario", async () => {
    render(<Input placeholder="email" />);
    const el = screen.getByPlaceholderText("email");
    await userEvent.type(el, "hola@test.com");
    expect(el).toHaveValue("hola@test.com");
  });
});

describe("Label", () => {
  it("required añade asterisco visible y clase", () => {
    render(<Label required>Email</Label>);
    const label = screen.getByText("Email").closest("label");
    expect(label).toHaveClass("ig-label", "ig-label-required");
    expect(label).toHaveTextContent("*");
  });
});

describe("Helper / ErrorText", () => {
  it("Helper renderiza un <p> con `ig-helper`", () => {
    render(<Helper>Texto de ayuda</Helper>);
    const el = screen.getByText("Texto de ayuda");
    expect(el.tagName).toBe("P");
    expect(el).toHaveClass("ig-helper");
  });

  it("ErrorText renderiza con role=alert y aria-live=polite", () => {
    render(<ErrorText>Error grave</ErrorText>);
    const el = screen.getByRole("alert");
    expect(el).toHaveTextContent("Error grave");
    expect(el).toHaveClass("ig-error");
    expect(el).toHaveAttribute("aria-live", "polite");
  });
});

describe("InputGroup / InputAddon", () => {
  it("InputGroup wrappea con `ig-input-group`", () => {
    render(
      <InputGroup data-testid="g">
        <InputAddon>$</InputAddon>
        <Input />
      </InputGroup>,
    );
    expect(screen.getByTestId("g")).toHaveClass("ig-input-group");
  });

  it("InputAddon renderiza con `ig-input-addon`", () => {
    render(<InputAddon>USD</InputAddon>);
    expect(screen.getByText("USD")).toHaveClass("ig-input-addon");
  });

  it("describedBy string aplica aria-describedby con ese id", () => {
    render(<Input placeholder="x" describedBy="helper-1" />);
    expect(screen.getByPlaceholderText("x")).toHaveAttribute(
      "aria-describedby",
      "helper-1",
    );
  });

  it("describedBy array concatena los ids con espacio", () => {
    render(
      <Input placeholder="x" describedBy={["helper-1", "error-1"]} />,
    );
    expect(screen.getByPlaceholderText("x")).toHaveAttribute(
      "aria-describedby",
      "helper-1 error-1",
    );
  });

  it("describedBy array filtra valores vacíos/falsy", () => {
    render(
      <Input
        placeholder="x"
        describedBy={["", "helper-1", "", "error-1"]}
      />,
    );
    expect(screen.getByPlaceholderText("x")).toHaveAttribute(
      "aria-describedby",
      "helper-1 error-1",
    );
  });

  it("sin describedBy NO emite aria-describedby", () => {
    render(<Input placeholder="x" />);
    expect(screen.getByPlaceholderText("x")).not.toHaveAttribute(
      "aria-describedby",
    );
  });
});
