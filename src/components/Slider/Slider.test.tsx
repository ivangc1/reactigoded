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

  it("dispara onValueChange y actualiza el valor visible no-controlado", () => {
    const onValueChange = vi.fn();
    render(
      <Slider
        aria-label="vol"
        showValue
        defaultValue={10}
        onValueChange={onValueChange}
      />,
    );
    const el = screen.getByLabelText("vol");
    fireEvent.change(el, { target: { value: "85" } });
    expect(onValueChange).toHaveBeenCalled();
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
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Slider aria-label="v" defaultValue={20} />,
    );
    expect(screen.getByLabelText<HTMLInputElement>("v").value).toBe("20");

    rerender(<Slider aria-label="v" value={50} onValueChange={onValueChange} />);
    expect(screen.getByLabelText<HTMLInputElement>("v").value).toBe("50");
  });

  it("transición controlled → uncontrolled: el wrapper React→DOM mantiene el input nativo", () => {
    // Smoke test del wrapping React→DOM en input[type=range]. El
    // contrato abstracto del hook lo cubre useControllableState.test.ts;
    // aquí solo verificamos que el componente sigue vivo y rendereando
    // un input válido tras la transición.
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Slider aria-label="v" value={50} onValueChange={onValueChange} />,
    );
    const input = screen.getByLabelText<HTMLInputElement>("v");
    expect(input.value).toBe("50");
    expect(input).toHaveAttribute("type", "range");

    rerender(<Slider aria-label="v" defaultValue={20} />);
    const inputAfter = screen.getByLabelText<HTMLInputElement>("v");
    expect(inputAfter).toHaveAttribute("type", "range");
    expect(inputAfter).toHaveClass("ig-slider");
  });

  // H-27 (beta.22): warn dev-only cuando el consumer pasa value=NaN.
  // El warn de defaultValue no-finito ya existía; faltaba el de value
  // controlado no-finito.
  it("avisa en dev cuando value es NaN [H-27]", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Slider aria-label="v" value={NaN} onValueChange={() => undefined} />,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no es un número finito"),
    );
    warn.mockRestore();
  });

  it("NO avisa cuando value es un number válido [H-27]", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Slider aria-label="v" value={50} onValueChange={() => undefined} />,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  // H-16 (gate review): value no-finito ANTES dejaba el slider en
  // modo uncontrolled silencioso (passControlled=undefined). AHORA
  // clampa a safeMin y mantiene controlled — patrón Pagination.
  describe("H-16 — value no-finito clampa + mantiene controlled", () => {
    it("value=NaN clampa a min y el input refleja min, no el último uncontrolled", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Slider
          aria-label="v"
          min={5}
          max={100}
          value={Number.NaN}
          onValueChange={() => undefined}
        />,
      );
      const input = screen.getByLabelText<HTMLInputElement>("v");
      // El DOM refleja el clamp a min (5), no NaN ni undefined.
      expect(input.value).toBe("5");
      // El warn explica el clamp.
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("clampando a min=5"),
      );
      warn.mockRestore();
    });

    it("value=NaN sigue controlled tras re-render con value válido", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { rerender } = render(
        <Slider
          aria-label="v"
          value={Number.NaN}
          onValueChange={() => undefined}
        />,
      );
      const input = screen.getByLabelText<HTMLInputElement>("v");
      expect(input.value).toBe("0");
      // Re-render con value válido: el componente sigue controlled y
      // refleja el nuevo valor (NO se queda en el clamp anterior).
      rerender(
        <Slider
          aria-label="v"
          value={42}
          onValueChange={() => undefined}
        />,
      );
      expect(input.value).toBe("42");
      warn.mockRestore();
    });

    it('value="abc" (string no parseable) clampa a min sin caer a uncontrolled', () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Slider aria-label="v" value="abc" onValueChange={() => undefined} />,
      );
      const input = screen.getByLabelText<HTMLInputElement>("v");
      expect(input.value).toBe("0");
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  // H-05 (gate review): describedBy alineado con Input/NativeSelect/Textarea.
  it("describedBy aplica aria-describedby + concatena con nativo", () => {
    render(
      <Slider
        aria-label="v"
        aria-describedby="native-id"
        describedBy={["helper-1", "error-1"]}
      />,
    );
    const input = screen.getByLabelText("v");
    expect(input).toHaveAttribute(
      "aria-describedby",
      "native-id helper-1 error-1",
    );
  });
});
