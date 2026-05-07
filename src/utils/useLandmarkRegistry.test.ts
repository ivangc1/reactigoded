import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useLandmarkRegistry,
  __resetLandmarkRegistryForTests,
} from "./useLandmarkRegistry";

describe("useLandmarkRegistry", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    __resetLandmarkRegistryForTests();
  });

  afterEach(() => {
    warn.mockRestore();
    __resetLandmarkRegistryForTests();
  });

  it("UN landmark único: NO warn", () => {
    renderHook(() => {
      useLandmarkRegistry("navigation", "Migas de pan");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("DOS landmarks distinto role + mismo label: NO warn", () => {
    renderHook(() => {
      useLandmarkRegistry("navigation", "Principal");
    });
    renderHook(() => {
      useLandmarkRegistry("complementary", "Principal");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("DOS landmarks mismo role + label DISTINTO: NO warn", () => {
    renderHook(() => {
      useLandmarkRegistry("navigation", "Migas de pan");
    });
    renderHook(() => {
      useLandmarkRegistry("navigation", "Paginación");
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("DOS landmarks mismo role + mismo label: SÍ warn (colisión)", () => {
    renderHook(() => {
      useLandmarkRegistry("navigation", "Principal");
    });
    renderHook(() => {
      useLandmarkRegistry("navigation", "Principal");
    });
    expect(warn).toHaveBeenCalled();
    const msg = String(warn.mock.calls[0]?.[0] ?? "");
    expect(msg).toContain("navigation");
    expect(msg).toContain("Principal");
    expect(msg).toContain("aria-label");
  });

  it("ariaLabel undefined: NO warn (regla aparte)", () => {
    renderHook(() => {
      useLandmarkRegistry("navigation", undefined);
    });
    renderHook(() => {
      useLandmarkRegistry("navigation", undefined);
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("unmount limpia el registry: re-mount con mismo label NO warn", () => {
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
