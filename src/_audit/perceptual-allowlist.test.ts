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

describe("perceptual allowlist invariants [B-13]", () => {
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
    // Defensiva contra drift de tokens al alza: si el valor real sube por
    // encima del warn_threshold (axis-kobalium ya no es problemático),
    // la entry debe RETIRARSE, no quedar como excepción muerta.
    expect(entry?.deltaE_at_decision).toBeLessThan(data.warn_threshold);
  });

  it("error_threshold is below warn_threshold", () => {
    expect(data.error_threshold).toBeLessThan(data.warn_threshold);
  });

  it("every allowlist entry has a non-empty justification + ISO date", () => {
    for (const entry of data.allowlist) {
      expect(entry.justification.length).toBeGreaterThan(20);
      expect(entry.decision_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
