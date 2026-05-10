import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import {
  SUPPRESS_NO_HANDLER_WARN,
  useControllableState,
} from "./useControllableState";

describe("useControllableState", () => {
  it("uncontrolled: defaultValue inicial", () => {
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: "a" }),
    );
    expect(result.current.value).toBe("a");
    expect(result.current.isControlled).toBe(false);
  });

  it("uncontrolled: setValue actualiza state interno", () => {
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: "a" }),
    );
    act(() => {
      result.current.setValue("b");
    });
    expect(result.current.value).toBe("b");
  });

  it("uncontrolled: setValue dispara onChange", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: "a", onChange }),
    );
    act(() => {
      result.current.setValue("b");
    });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("controlled: value externo gana sobre defaultValue", () => {
    const { result } = renderHook(() =>
      useControllableState({ value: "ext", defaultValue: "a" }),
    );
    expect(result.current.value).toBe("ext");
    expect(result.current.isControlled).toBe(true);
  });

  it("controlled: setValue NO actualiza state interno", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useControllableState({ value, onChange }),
      { initialProps: { value: "ext" } },
    );
    act(() => {
      result.current.setValue("b");
    });
    expect(result.current.value).toBe("ext");
    expect(onChange).toHaveBeenCalledWith("b");
    rerender({ value: "b" });
    expect(result.current.value).toBe("b");
  });

  it("setValue es estable entre renders", () => {
    const { result, rerender } = renderHook(() =>
      useControllableState({ defaultValue: 0 }),
    );
    const first = result.current.setValue;
    rerender();
    expect(result.current.setValue).toBe(first);
  });

  it("setValue silent actualiza state interno sin disparar onChange", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: "a", onChange }),
    );
    act(() => {
      result.current.setValue("b", { silent: true });
    });
    expect(result.current.value).toBe("b");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("setValue silent en controlled tampoco dispara onChange", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useControllableState({ value, onChange }),
      { initialProps: { value: "ext" } },
    );
    act(() => {
      result.current.setValue("b", { silent: true });
    });
    expect(onChange).not.toHaveBeenCalled();
    rerender({ value: "b" });
    expect(result.current.value).toBe("b");
  });

  it("onChange actualizado se respeta sin recrear setValue", () => {
    const onChange1 = vi.fn();
    const onChange2 = vi.fn();
    const { result, rerender } = renderHook(
      ({ onChange }: { onChange: typeof onChange1 }) =>
        useControllableState({ defaultValue: "a", onChange }),
      { initialProps: { onChange: onChange1 } },
    );
    rerender({ onChange: onChange2 });
    act(() => {
      result.current.setValue("b");
    });
    expect(onChange1).not.toHaveBeenCalled();
    expect(onChange2).toHaveBeenCalledWith("b");
  });

  // ─── Modo derive ──────────────────────────────────────────────

  it("derived uncontrolled: derive() es la fuente de verdad", () => {
    const { result } = renderHook(() => {
      const [backing, setBacking] = useState("a");
      return useControllableState<string>({
        derive: () => backing,
        setDerivedValue: setBacking,
      });
    });
    expect(result.current.value).toBe("a");
    expect(result.current.isControlled).toBe(false);
    act(() => {
      result.current.setValue("b");
    });
    expect(result.current.value).toBe("b");
  });

  it("derived uncontrolled: setValue dispara onChange", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      const [backing, setBacking] = useState("a");
      return useControllableState<string>({
        derive: () => backing,
        setDerivedValue: setBacking,
        onChange,
      });
    });
    act(() => {
      result.current.setValue("b");
    });
    expect(result.current.value).toBe("b");
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("derived uncontrolled: silent actualiza backing sin onChange", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      const [backing, setBacking] = useState("a");
      return useControllableState<string>({
        derive: () => backing,
        setDerivedValue: setBacking,
        onChange,
      });
    });
    act(() => {
      result.current.setValue("b", { silent: true });
    });
    expect(result.current.value).toBe("b");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("derived controlled: value externo gana sobre derive()", () => {
    const setDerivedValue = vi.fn();
    const { result } = renderHook(() =>
      useControllableState<string>({
        value: "controlled",
        derive: () => "derived",
        setDerivedValue,
      }),
    );
    expect(result.current.value).toBe("controlled");
    expect(result.current.isControlled).toBe(true);
  });

  it("derived controlled: setValue no llama setDerivedValue, sólo onChange", () => {
    const setDerivedValue = vi.fn();
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useControllableState<string>({
          value,
          derive: () => "derived",
          setDerivedValue,
          onChange,
        }),
      { initialProps: { value: "a" } },
    );
    act(() => {
      result.current.setValue("b");
    });
    expect(result.current.value).toBe("a");
    expect(setDerivedValue).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith("b");
    rerender({ value: "b" });
    expect(result.current.value).toBe("b");
  });

  it("derived: setValue mantiene identidad estable entre renders", () => {
    const { result, rerender } = renderHook(() => {
      const [backing, setBacking] = useState("a");
      return useControllableState<string>({
        derive: () => backing,
        setDerivedValue: setBacking,
      });
    });
    const first = result.current.setValue;
    rerender();
    expect(result.current.setValue).toBe(first);
  });

  it("derived: respeta onChange actualizado sin recrear setValue", () => {
    const onChange1 = vi.fn();
    const onChange2 = vi.fn();
    const { result, rerender } = renderHook(
      ({ onChange }: { onChange: (value: string) => void }) => {
        const [backing, setBacking] = useState("a");
        return useControllableState<string>({
          derive: () => backing,
          setDerivedValue: setBacking,
          onChange,
        });
      },
      { initialProps: { onChange: onChange1 } },
    );
    const first = result.current.setValue;
    rerender({ onChange: onChange2 });
    expect(result.current.setValue).toBe(first);
    act(() => {
      result.current.setValue("b");
    });
    expect(onChange1).not.toHaveBeenCalled();
    expect(onChange2).toHaveBeenCalledWith("b");
  });

  // ─── Transiciones controlled ↔ uncontrolled ──────────────────
  // Tests del CONTRATO ABSTRACTO del hook. Si pasan, los 9
  // componentes que wrappean el hook (Accordion, Alert, Dropdown,
  // Rating, Sidebar, Slider, Switch, Tabs, ThemeSwitch) respetan
  // por construcción el contrato de transición — sin necesidad de
  // duplicar el test 9×.

  describe("transiciones controlled ↔ uncontrolled", () => {
    it("uncontrolled → controlled: el value externo gana sobre el state interno (modo clásico)", () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string | undefined }) =>
          useControllableState({
            value,
            defaultValue: "internal-initial",
            onChange: vi.fn(),
          }),
        { initialProps: { value: undefined as string | undefined } },
      );

      expect(result.current.value).toBe("internal-initial");
      expect(result.current.isControlled).toBe(false);

      act(() => {
        result.current.setValue("internal-modified");
      });
      expect(result.current.value).toBe("internal-modified");

      rerender({ value: "external-controlled" });

      expect(result.current.value).toBe("external-controlled");
      expect(result.current.isControlled).toBe(true);
    });

    it("controlled → uncontrolled: vuelve al state interno preservado (modo clásico)", () => {
      const initialProps: { value: string | undefined } = {
        value: "external-a",
      };
      const { result, rerender } = renderHook(
        ({ value }: { value: string | undefined }) =>
          useControllableState({
            value,
            defaultValue: "internal-initial",
          }),
        { initialProps },
      );

      expect(result.current.value).toBe("external-a");
      expect(result.current.isControlled).toBe(true);

      rerender({ value: undefined });

      // NOTA: comportamiento documentado del hook. El state interno
      // mantuvo su valor inicial mientras estaba controlled (setValue
      // era no-op en isControlled), por lo que al destransicionar
      // vuelve al defaultValue, NO al último external value.
      expect(result.current.value).toBe("internal-initial");
      expect(result.current.isControlled).toBe(false);
    });

    it("derive mode uncontrolled → controlled: respeta value externo", () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string | undefined }) => {
          const [backing, setBacking] = useState("derived-internal");
          return useControllableState<string>({
            value,
            derive: () => backing,
            setDerivedValue: setBacking,
          });
        },
        { initialProps: { value: undefined as string | undefined } },
      );

      expect(result.current.value).toBe("derived-internal");
      expect(result.current.isControlled).toBe(false);

      rerender({ value: "external" });

      expect(result.current.value).toBe("external");
      expect(result.current.isControlled).toBe(true);
    });

    it("derive mode controlled → uncontrolled: vuelve a derive()", () => {
      const initialProps: { value: string | undefined } = {
        value: "external-controlled",
      };
      const { result, rerender } = renderHook(
        ({ value }: { value: string | undefined }) => {
          const [backing] = useState("derived-stable");
          return useControllableState<string>({
            value,
            derive: () => backing,
            setDerivedValue: vi.fn(),
          });
        },
        { initialProps },
      );

      expect(result.current.value).toBe("external-controlled");
      expect(result.current.isControlled).toBe(true);

      rerender({ value: undefined });

      expect(result.current.value).toBe("derived-stable");
      expect(result.current.isControlled).toBe(false);
    });
  });

  // ─── Dev warn: controlled sin onChange (Option E, beta.21) ───
  describe("dev warn: controlled sin onChange", () => {
    it("avisa cuando isControlled && !onChange && !SUPPRESS_NO_HANDLER_WARN", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderHook(() => useControllableState({ value: "x" }));
      expect(warn).toHaveBeenCalledOnce();
      const msg = String(warn.mock.calls[0]?.[0] ?? "");
      expect(msg).toContain("controlled");
      expect(msg).toContain("onChange");
      warn.mockRestore();
    });

    it("NO avisa con onChange definido", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderHook(() =>
        useControllableState({ value: "x", onChange: () => {} }),
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it("NO avisa en uncontrolled (sin value)", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderHook(() => useControllableState({ defaultValue: "a" }));
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it("NO avisa con SUPPRESS_NO_HANDLER_WARN Symbol=true (escape hatch)", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderHook(() =>
        useControllableState({
          value: "x",
          [SUPPRESS_NO_HANDLER_WARN]: true,
        }),
      );
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    // C-07: regresión guard — un consumer NO puede suprimir el warn
    // intentando recrear el Symbol desde fuera. `Symbol(...)` y
    // `Symbol.for(...)` con la misma description producen Symbols
    // distintos al SUPPRESS_NO_HANDLER_WARN exportado por el módulo.
    it("Symbol recreado por el consumer NO suprime el warn (regression C-07)", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fakeSymbol = Symbol("reactigoded.suppressNoHandlerWarn");
      const fakeRegistrySymbol = Symbol.for("reactigoded.suppressNoHandlerWarn");
      // El consumer intenta inyectar la propiedad con un Symbol fake.
      // El warn debe dispararse igual porque el hook compara contra el
      // Symbol REAL exportado del módulo, no contra cualquier Symbol con
      // misma description.
      renderHook(() =>
        useControllableState({
          value: "x",
          [fakeSymbol]: true,
          [fakeRegistrySymbol]: true,
        } as Parameters<typeof useControllableState>[0]),
      );
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    });

    it("avisa solo una vez por instancia (no en cada rerender)", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { rerender } = renderHook(
        ({ value }: { value: string }) =>
          useControllableState({ value }),
        { initialProps: { value: "a" } },
      );
      rerender({ value: "b" });
      rerender({ value: "c" });
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    });
  });
});
