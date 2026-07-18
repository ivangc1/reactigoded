import { describe, it, expect } from "vitest";
import {
  crossOsResolve,
  crossOsRelative,
  crossOsDirname,
} from "../../scripts/check-server-safe-markers.mjs";

/**
 * #25 — resolución de paths cross-OS en el gate `@server-safe`.
 *
 * `crossOsResolve`/`crossOsRelative` trabajan en forma POSIX (lo que
 * `toPosix` produce a partir del path de la plataforma). En Windows, un
 * UNC `\\host\share\...` se normaliza a `//host/share/...`; `pathPosix`
 * colapsa el `//` inicial y pierde el share root → los helpers extraen
 * `//host/share` como raíz (igual que la drive letter) y re-prependen.
 *
 * Los inputs de este test ya vienen en forma POSIX a propósito: así
 * ejercen la MISMA lógica en la celda Linux y en la Windows de la matriz
 * CI, sin depender del `path.sep` de la plataforma. Regresión: PR #121
 * (drive letter) + #25 (UNC).
 */
describe("cross-OS path resolve/relative (#25 UNC + drive letter)", () => {
  describe("UNC (Windows network share) — el share root sobrevive", () => {
    it("resolve: no colapsa el `//host/share`", () => {
      expect(crossOsResolve("//server/share/repo", "src/utils/cn")).toBe(
        "//server/share/repo/src/utils/cn",
      );
    });

    it("resolve: normaliza `..` DENTRO del share", () => {
      expect(crossOsResolve("//host/sh/a/b", "../c")).toBe("//host/sh/a/c");
    });

    it("resolve: share root sin path extra", () => {
      expect(crossOsResolve("//host/share", "src")).toBe("//host/share/src");
    });

    it("relative: dentro del mismo share", () => {
      expect(
        crossOsRelative(
          "//server/share/repo/dist/x",
          "//server/share/repo/src/cn",
        ),
      ).toBe("../../src/cn");
    });

    it("relative: shares distintos → path imposible (lo rechaza inSrc)", () => {
      const rel = crossOsRelative("//a/b/repo/x", "//c/d/repo/y");
      expect(rel.startsWith("..")).toBe(true);
    });

    it("dirname: preserva el share root", () => {
      expect(crossOsDirname("//host/share/a/b")).toBe("//host/share/a");
    });
  });

  describe("drive letter (Windows) — no se rompe (PR #121)", () => {
    it("resolve", () => {
      expect(crossOsResolve("D:/a/repo", "src/cn")).toBe("D:/a/repo/src/cn");
    });

    it("relative dentro de la misma drive", () => {
      expect(crossOsRelative("D:/a/repo/dist/x", "D:/a/repo/src/cn")).toBe(
        "../../src/cn",
      );
    });
  });

  describe("POSIX real-disk / VFS — intacto", () => {
    it("resolve", () => {
      expect(crossOsResolve("/home/u/repo", "src/cn")).toBe(
        "/home/u/repo/src/cn",
      );
    });

    it("relative", () => {
      expect(crossOsRelative("/repo/dist/x", "/repo/src/cn")).toBe(
        "../../src/cn",
      );
    });
  });
});
