import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useRef, type RefObject } from "react";
import { renderHook } from "@testing-library/react";
import { useA11yWarnInput } from "./useA11yWarnInput";

describe("useA11yWarnInput", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    // Limpiar el DOM entre tests — vitest usa `isolate: false` y los
    // tests cross-archivo comparten document si no limpiamos.
    document.body.innerHTML = "";
  });

  // Helper que crea un input mock + ref que apunta a él, y luego invoca
  // el hook. Devuelve el spy para asserts.
  function setup(setupAttrs: (el: HTMLInputElement) => void) {
    const input = document.createElement("input");
    setupAttrs(input);
    document.body.appendChild(input);
    const refObj: RefObject<HTMLInputElement | null> = { current: input };
    renderHook(() => {
      useA11yWarnInput(refObj, "Input");
    });
    return input;
  }

  it("warn cuando el input NO tiene aria-label, aria-labelledby, htmlFor ni placeholder", () => {
    setup(() => {});
    expect(warn).toHaveBeenCalledOnce();
    const msg = String(warn.mock.calls[0]?.[0] ?? "");
    expect(msg).toContain("<Input>");
    expect(msg).toContain("sin label asociado");
  });

  it("NO warn cuando hay aria-label", () => {
    setup((el) => {
      el.setAttribute("aria-label", "Email del usuario");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("NO warn cuando hay aria-labelledby", () => {
    const labelEl = document.createElement("span");
    labelEl.id = "label-x";
    document.body.appendChild(labelEl);
    setup((el) => {
      el.setAttribute("aria-labelledby", "label-x");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("NO warn cuando hay placeholder no vacío", () => {
    setup((el) => {
      el.setAttribute("placeholder", "alguien@ejemplo.com");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("SÍ warn cuando placeholder es string vacío", () => {
    setup((el) => {
      el.setAttribute("placeholder", "");
    });
    expect(warn).toHaveBeenCalledOnce();
  });

  it("NO warn cuando hay <label htmlFor> apuntando al id del input", () => {
    const label = document.createElement("label");
    label.setAttribute("for", "input-x");
    label.textContent = "Email";
    document.body.appendChild(label);
    setup((el) => {
      el.id = "input-x";
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("incluye el componentName en el mensaje", () => {
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    const refObj: RefObject<HTMLTextAreaElement | null> = { current: ta };
    renderHook(() => {
      useA11yWarnInput(refObj, "Textarea");
    });
    const msg = String(warn.mock.calls[0]?.[0] ?? "");
    expect(msg).toContain("<Textarea>");
  });

  it("dispara solo una vez por instancia (rerender no re-warn)", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const refObj: RefObject<HTMLInputElement | null> = { current: input };
    const { rerender } = renderHook(() => {
      useA11yWarnInput(refObj, "Input");
    });
    rerender();
    rerender();
    expect(warn).toHaveBeenCalledOnce();
  });
});
