import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { useControllableState } from "./useControllableState";

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

  // ─── Dev warn: controlled sin onChange ─────────────────────────

  it("dev: warn al pasar value sin onChange (UI bloqueada)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderHook(() => useControllableState({ value: "ext" }));
    expect(warn).toHaveBeenCalledOnce();
    const msg = String(warn.mock.calls[0]?.[0] ?? "");
    expect(msg).toContain("controlled");
    expect(msg).toContain("onChange");
    warn.mockRestore();
  });

  it("dev: NO warn cuando value + onChange están ambos", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderHook(() =>
      useControllableState({ value: "ext", onChange: () => {} }),
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("dev: NO warn en uncontrolled (sin value)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderHook(() => useControllableState({ defaultValue: "a" }));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
