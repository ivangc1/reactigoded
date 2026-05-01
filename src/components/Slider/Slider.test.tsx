import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Slider } from "./Slider";

describe("Slider", () => {
  it("renderiza un input[type=range] con `ig-slider`", () => {
    render(<Slider aria-label="vol" />);
    const el = screen.getByLabelText("vol");
    expect(el).toHaveAttribute("type", "range");
    expect(el).toHaveClass("ig-slider");
  });

  it("showValue muestra el valor inicial", () => {
    render(<Slider aria-label="vol" showValue defaultValue={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("formatValue formatea el valor visible", () => {
    render(
      <Slider
        aria-label="vol"
        showValue
        defaultValue={70}
        formatValue={(v) => `${String(v)}%`}
      />,
    );
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("dispara onChange y actualiza el valor visible no-controlado", () => {
    const onChange = vi.fn();
    render(
      <Slider
        aria-label="vol"
        showValue
        defaultValue={10}
        onChange={onChange}
      />,
    );
    const el = screen.getByLabelText("vol");
    fireEvent.change(el, { target: { value: "85" } });
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("onValueChange recibe el valor decodificado como número", () => {
    const onValueChange = vi.fn();
    render(<Slider aria-label="v" onValueChange={onValueChange} defaultValue={10} />);
    const el = screen.getByLabelText("v");
    fireEvent.change(el, { target: { value: "55" } });
    expect(onValueChange).toHaveBeenCalledWith(55);
  });

  it("formatValue produce aria-valuetext", () => {
    render(
      <Slider
        aria-label="vol"
        defaultValue={75}
        formatValue={(v) => `${String(v)}%`}
      />,
    );
    expect(screen.getByLabelText("vol")).toHaveAttribute(
      "aria-valuetext",
      "75%",
    );
  });

  it("sin formatValue NO emite aria-valuetext", () => {
    render(<Slider aria-label="v" defaultValue={50} />);
    expect(screen.getByLabelText("v")).not.toHaveAttribute("aria-valuetext");
  });

  it("transición uncontrolled→controlled emite warning de React", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(<Slider aria-label="v" defaultValue={20} />);
    rerender(<Slider aria-label="v" value={50} onChange={() => {}} />);
    expect(
      errSpy.mock.calls.some((call) =>
        String(call[0]).includes("controlled"),
      ),
    ).toBe(true);
    errSpy.mockRestore();
  });
});
