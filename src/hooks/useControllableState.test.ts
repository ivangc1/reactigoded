import { describe, it, expect, vi } from "vitest";
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
});
