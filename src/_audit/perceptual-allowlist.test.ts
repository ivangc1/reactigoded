import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface AllowlistEntry {
  pair: string;
  theme: "light" | "dark";
  deltaE_at_decision: number;
  decision_date: string;
  justification: string;
}

interface AllowlistData {
  _doc?: string;
  version: number;
  warn_threshold: number;
  error_threshold: number;
  drift_tolerance: number;
  allowlist: AllowlistEntry[];
}

const raw: unknown = JSON.parse(
  readFileSync(
    resolve(__dirname, "..", "..", "scripts", "perceptual-allowlist.json"),
    "utf8",
  ),
);
const data = raw as AllowlistData;

describe("perceptual allowlist invariants [B-13, L-07]", () => {
  it("dark axis-kobalium is explicitly allowlisted (reversión consciente de c8a5202)", () => {
    // Si alguien borra esta entrada por error en una refactor de
    // perceptual-allowlist.json, este test falla con un pointer al
    // commit que la introdujo. La justificación documenta que es
    // una decisión política, no un par "natural" perceptualmente OK.
    const entry = data.allowlist.find(
      (e) => e.pair === "axis-kobalium" && e.theme === "dark",
    );
    expect(entry).toBeDefined();
    expect(entry?.justification).toContain("c8a5202");
  });

  it("error_threshold is below warn_threshold (gating coherente)", () => {
    expect(data.error_threshold).toBeLessThan(data.warn_threshold);
  });

  it("warn_threshold y error_threshold son positivos finitos", () => {
    // L-07: thresholds inválidos romperían el script de check.
    expect(data.warn_threshold).toBeGreaterThan(0);
    expect(Number.isFinite(data.warn_threshold)).toBe(true);
    expect(data.error_threshold).toBeGreaterThan(0);
    expect(Number.isFinite(data.error_threshold)).toBe(true);
  });

  it("drift_tolerance ∈ (0, 1] (porcentaje válido de banda)", () => {
    // L-07: drift_tolerance fuera de rango invalida el detector de drift
    // del script (tolerance=0 dispararía siempre, tolerance>1 nunca).
    expect(data.drift_tolerance).toBeGreaterThan(0);
    expect(data.drift_tolerance).toBeLessThanOrEqual(1);
  });

  it("version es entero positivo", () => {
    expect(Number.isInteger(data.version)).toBe(true);
    expect(data.version).toBeGreaterThanOrEqual(1);
  });

  it("every allowlist entry has a non-empty justification + ISO date", () => {
    for (const entry of data.allowlist) {
      expect(entry.justification.length).toBeGreaterThan(20);
      expect(entry.decision_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("cada `pair` está alfabético (`a-b` con a < b) — invariante documentada en _doc", () => {
    // L-07: el _doc del JSON dice "Nombre del par alfabético (a-b, no b-a)"
    // pero nada lo enforzaba. Sin esto, una entry "rutilus-malum" y otra
    // "malum-rutilus" coexistirían sin que el lookup del script las
    // unifique → ΔE de un par podría chequear contra entry equivocada.
    for (const entry of data.allowlist) {
      const parts = entry.pair.split("-");
      expect(parts).toHaveLength(2);
      const [a, b] = parts as [string, string];
      expect(a.length).toBeGreaterThan(0);
      expect(b.length).toBeGreaterThan(0);
      expect(a < b).toBe(true);
    }
  });

  it("cada `(pair, theme)` es único en la allowlist", () => {
    // L-07: duplicados harían el script no determinista (qué entry
    // gana en `find` depende del orden del array).
    const seen = new Set<string>();
    for (const entry of data.allowlist) {
      const key = `${entry.pair}|${entry.theme}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("cada `theme` es 'light' o 'dark'", () => {
    // L-07: el JSON no es validado por TS contra el union literal;
    // un typo en theme ("ligth", "dim") rompería el lookup silently
    // porque el script compara contra strings exactos.
    for (const entry of data.allowlist) {
      expect(["light", "dark"]).toContain(entry.theme);
    }
  });

  it("cada `deltaE_at_decision` < warn_threshold (sino la entry es muerta)", () => {
    // L-07: generalizado del check específico que existía para
    // axis-kobalium. Si un par tiene ΔE_at_decision >= warn_threshold,
    // ya pasaba como ok sin allowlist y la entry no aporta nada — debe
    // RETIRARSE, no quedar como decoración. El test fuerza la limpieza
    // cuando el ΔE real sube tras un recalibrado de tokens.
    for (const entry of data.allowlist) {
      expect(entry.deltaE_at_decision).toBeLessThan(data.warn_threshold);
      expect(entry.deltaE_at_decision).toBeGreaterThan(0);
    }
  });

  it("cada `decision_date` no es futuro", () => {
    // L-07: una fecha futura suele indicar typo (escribir 2027 en
    // lugar de 2026) o copy/paste sin actualizar. El test valida que
    // la decision_date <= la fecha del run del CI.
    const today = new Date().toISOString().slice(0, 10);
    for (const entry of data.allowlist) {
      expect(entry.decision_date <= today).toBe(true);
    }
  });
});
