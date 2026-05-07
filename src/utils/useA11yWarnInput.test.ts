import { describe, it, expect, vi, afterEach } from "vitest";
import { type RefObject } from "react";
import { renderHook } from "@testing-library/react";
import { useA11yWarnInput } from "./useA11yWarnInput";

describe("useA11yWarnInput", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Limpiar el DOM entre tests — vitest usa `isolate: false` y los
    // tests cross-archivo comparten document si no limpiamos.
    document.body.innerHTML = "";
  });

  // Helper que crea un input mock + ref que apunta a él, espía
  // console.warn, y luego invoca el hook. Devuelve { input, warn }
  // para asserts.
  function setup(setupAttrs: (el: HTMLInputElement) => void) {
    const input = document.createElement("input");
    setupAttrs(input);
    document.body.appendChild(input);
    const refObj: RefObject<HTMLInputElement | null> = { current: input };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderHook(() => {
      useA11yWarnInput(refObj, "Input");
    });
    return { input, warn };
  }

  it("warn cuando el input NO tiene aria-label, aria-labelledby, htmlFor ni placeholder", () => {
    const { warn } = setup(() => {});
    expect(warn).toHaveBeenCalledOnce();
    const firstCall = warn.mock.calls[0];
    const msg = firstCall ? String(firstCall[0]) : "";
    expect(msg).toContain("<Input>");
    expect(msg).toContain("sin label asociado");
  });

  it("NO warn cuando hay aria-label", () => {
    const { warn } = setup((el) => {
      el.setAttribute("aria-label", "Email del usuario");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("NO warn cuando hay aria-labelledby", () => {
    const labelEl = document.createElement("span");
    labelEl.id = "label-x";
    document.body.appendChild(labelEl);
    const { warn } = setup((el) => {
      el.setAttribute("aria-labelledby", "label-x");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("NO warn cuando hay placeholder no vacío", () => {
    const { warn } = setup((el) => {
      el.setAttribute("placeholder", "alguien@ejemplo.com");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("SÍ warn cuando placeholder es string vacío", () => {
    const { warn } = setup((el) => {
      el.setAttribute("placeholder", "");
    });
    expect(warn).toHaveBeenCalledOnce();
  });

  it("NO warn cuando hay <label htmlFor> apuntando al id del input", () => {
    const label = document.createElement("label");
    label.setAttribute("for", "input-x");
    label.textContent = "Email";
    document.body.appendChild(label);
    const { warn } = setup((el) => {
      el.id = "input-x";
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("incluye el componentName en el mensaje", () => {
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    const refObj: RefObject<HTMLTextAreaElement | null> = { current: ta };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderHook(() => {
      useA11yWarnInput(refObj, "Textarea");
    });
    const firstCall = warn.mock.calls[0];
    const msg = firstCall ? String(firstCall[0]) : "";
    expect(msg).toContain("<Textarea>");
  });

  it("dispara solo una vez por instancia (rerender no re-warn)", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const refObj: RefObject<HTMLInputElement | null> = { current: input };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = renderHook(() => {
      useA11yWarnInput(refObj, "Input");
    });
    rerender();
    rerender();
    expect(warn).toHaveBeenCalledOnce();
  });
});
