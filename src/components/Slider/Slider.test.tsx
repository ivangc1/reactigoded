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

  it("transición uncontrolled → controlled: el wrapper React→DOM respeta value externo", () => {
    // Smoke test del wrapping React→DOM. Antes este test verificaba el
    // warning de React vía `console.error` mock, pero React deduplica
    // ese warning por worker y vitest corre con `isolate: false` —
    // resultaba flaky según orden. El comportamiento importante para el
    // consumer es que el input nativo refleje el value externo tras la
    // transición; el warning de React es side-effect de React, no del DS.
    const onChange = vi.fn();
    const { rerender } = render(
      <Slider aria-label="v" defaultValue={20} />,
    );
    expect(screen.getByLabelText<HTMLInputElement>("v").value).toBe("20");

    rerender(<Slider aria-label="v" value={50} onChange={onChange} />);
    expect(screen.getByLabelText<HTMLInputElement>("v").value).toBe("50");
  });

  it("transición controlled → uncontrolled: el wrapper React→DOM mantiene el input nativo", () => {
    // Smoke test del wrapping React→DOM en input[type=range]. El
    // contrato abstracto del hook lo cubre useControllableState.test.ts;
    // aquí solo verificamos que el componente sigue vivo y rendereando
    // un input válido tras la transición.
    const onChange = vi.fn();
    const { rerender } = render(
      <Slider aria-label="v" value={50} onChange={onChange} />,
    );
    const input = screen.getByLabelText<HTMLInputElement>("v");
    expect(input.value).toBe("50");
    expect(input).toHaveAttribute("type", "range");

    rerender(<Slider aria-label="v" defaultValue={20} />);
    const inputAfter = screen.getByLabelText<HTMLInputElement>("v");
    expect(inputAfter).toHaveAttribute("type", "range");
    expect(inputAfter).toHaveClass("ig-slider");
  });
});
