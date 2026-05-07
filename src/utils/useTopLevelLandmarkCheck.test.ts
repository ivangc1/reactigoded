import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { type RefObject } from "react";
import { renderHook } from "@testing-library/react";
import {
  useTopLevelLandmarkCheck,
  __resetTopLevelLandmarkCheckForTests,
} from "./useTopLevelLandmarkCheck";

/**
 * Helper local para spyon de console.warn que evita el `let warn:
 * ReturnType<typeof vi.spyOn>` global tratado como `any` por
 * typescript-eslint.
 */
function spyWarn() {
  return vi.spyOn(console, "warn").mockImplementation(() => {});
}

describe("useTopLevelLandmarkCheck", () => {
  beforeEach(() => {
    __resetTopLevelLandmarkCheckForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    __resetTopLevelLandmarkCheckForTests();
  });

  function setup(parentTag: string | null, parentAttrs: Record<string, string>) {
    const header = document.createElement("header");
    if (parentTag) {
      const parent = document.createElement(parentTag);
      for (const [k, v] of Object.entries(parentAttrs)) parent.setAttribute(k, v);
      parent.appendChild(header);
      document.body.appendChild(parent);
    } else {
      document.body.appendChild(header);
    }
    const ref: RefObject<HTMLElement | null> = { current: header };
    renderHook(() => {
      useTopLevelLandmarkCheck(ref, "banner");
    });
  }

  it("UN <header> top-level: NO warn", () => {
    const warn = spyWarn();
    setup(null, {});
    expect(warn).not.toHaveBeenCalled();
  });

  it("DOS <header> top-level: SÍ warn", () => {
    const warn = spyWarn();
    setup(null, {});
    setup(null, {});
    expect(warn).toHaveBeenCalled();
    const firstCall = warn.mock.calls[0];
    const msg = firstCall ? String(firstCall[0]) : "";
    expect(msg).toContain("banner");
    expect(msg).toContain("landmark-no-duplicate-banner");
  });

  it("<header> envuelto en <section aria-label>: NO warn (despromovido a region)", () => {
    const warn = spyWarn();
    setup("section", { "aria-label": "Demo banner" });
    setup("section", { "aria-label": "Demo banner 2" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("<header> envuelto en <main>: NO warn", () => {
    const warn = spyWarn();
    setup("main", {});
    setup("main", {});
    expect(warn).not.toHaveBeenCalled();
  });

  it("<header> envuelto en [role=region]: NO warn", () => {
    const warn = spyWarn();
    setup("div", { role: "region" });
    setup("div", { role: "region" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("mezcla: 1 top-level + 1 envuelto: NO warn", () => {
    const warn = spyWarn();
    setup(null, {});
    setup("section", { "aria-label": "Demo" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("mezcla: 2 top-level + 1 envuelto: SÍ warn (los dos top-level chocan)", () => {
    const warn = spyWarn();
    setup(null, {});
    setup("section", { "aria-label": "Demo" });
    setup(null, {});
    expect(warn).toHaveBeenCalled();
  });

  // Sectioning content sin aria-label — HTML5 spec: dentro de
  // `<aside>`, `<nav>`, `<section>`, `<article>` un `<header>` NO
  // es banner top-level. Cubre el P2 de codex review post-RC1.
  describe("sectioning content sin aria-label despromueve banner", () => {
    it("<header> envuelto en <aside>: NO warn", () => {
      const warn = spyWarn();
      setup("aside", {});
      setup("aside", {});
      expect(warn).not.toHaveBeenCalled();
    });

    it("<header> envuelto en <nav>: NO warn", () => {
      const warn = spyWarn();
      setup("nav", {});
      setup("nav", {});
      expect(warn).not.toHaveBeenCalled();
    });

    it("<header> envuelto en <section> (sin aria-label): NO warn", () => {
      const warn = spyWarn();
      setup("section", {});
      setup("section", {});
      expect(warn).not.toHaveBeenCalled();
    });

    it("<header> envuelto en <article>: NO warn", () => {
      const warn = spyWarn();
      setup("article", {});
      setup("article", {});
      expect(warn).not.toHaveBeenCalled();
    });

    it("<header> envuelto en [role=complementary]: NO warn", () => {
      const warn = spyWarn();
      setup("div", { role: "complementary" });
      setup("div", { role: "complementary" });
      expect(warn).not.toHaveBeenCalled();
    });

    it("<header> envuelto en [role=navigation]: NO warn", () => {
      const warn = spyWarn();
      setup("div", { role: "navigation" });
      setup("div", { role: "navigation" });
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
