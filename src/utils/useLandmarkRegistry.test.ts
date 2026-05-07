import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useLandmarkRegistry,
  __resetLandmarkRegistryForTests,
} from "./useLandmarkRegistry";

/**
 * Helper que crea un spy local en `console.warn`. El cleanup lo
 * hace `vi.restoreAllMocks()` en `afterEach` global. Devolver el
 * spy desde una función evita el `let warn: ReturnType<typeof
 * vi.spyOn>` global que typescript-eslint trata como `any`.
 */
function spyWarn() {
  return vi.spyOn(console, "warn").mockImplementation(() => {});
}

describe("useLandmarkRegistry", () => {
  beforeEach(() => {
    __resetLandmarkRegistryForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __resetLandmarkRegistryForTests();
  });

  it("UN landmark único: NO warn", () => {
    const warn = spyWarn();
    renderHook(() => {
      useLandmarkRegistry("navigation", "Migas de pan");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("DOS landmarks distinto role + mismo label: NO warn", () => {
    const warn = spyWarn();
    renderHook(() => {
      useLandmarkRegistry("navigation", "Principal");
    });
    renderHook(() => {
      useLandmarkRegistry("complementary", "Principal");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("DOS landmarks mismo role + label DISTINTO: NO warn", () => {
    const warn = spyWarn();
    renderHook(() => {
      useLandmarkRegistry("navigation", "Migas de pan");
    });
    renderHook(() => {
      useLandmarkRegistry("navigation", "Paginación");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("DOS landmarks mismo role + mismo label: SÍ warn (colisión)", () => {
    const warn = spyWarn();
    renderHook(() => {
      useLandmarkRegistry("navigation", "Principal");
    });
    renderHook(() => {
      useLandmarkRegistry("navigation", "Principal");
    });
    expect(warn).toHaveBeenCalled();
    const firstCall = warn.mock.calls[0];
    const msg = firstCall ? String(firstCall[0]) : "";
    expect(msg).toContain("navigation");
    expect(msg).toContain("Principal");
    expect(msg).toContain("aria-label");
  });

  it("ariaLabel undefined: NO warn (regla aparte)", () => {
    const warn = spyWarn();
    renderHook(() => {
      useLandmarkRegistry("navigation", undefined);
    });
    renderHook(() => {
      useLandmarkRegistry("navigation", undefined);
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("unmount limpia el registry: re-mount con mismo label NO warn", () => {
    const warn = spyWarn();
    const { unmount } = renderHook(() => {
      useLandmarkRegistry("navigation", "Principal");
    });
    unmount();
    renderHook(() => {
      useLandmarkRegistry("navigation", "Principal");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("3 instancias mismo label: warn en 2ª y 3ª (cada colisión nueva)", () => {
    const warn = spyWarn();
    renderHook(() => {
      useLandmarkRegistry("navigation", "Principal");
    });
    renderHook(() => {
      useLandmarkRegistry("navigation", "Principal");
    });
    renderHook(() => {
      useLandmarkRegistry("navigation", "Principal");
    });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
