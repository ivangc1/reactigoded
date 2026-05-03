import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment, useSyncExternalStore } from "react";

const meta: Meta = {
  title: "Fundamentos/Paleta",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Visualización viva de los 7 cardinales del DS con geometría OKLCH dual. Cada cardinal tiene `-lux` (variante para tema light, L≈0.32) y `-nox` (variante para tema dark, L≈0.84). ΔH OKLCH ≤ 10° entre los dos hex de cada par. Validado en CI por `scripts/check-component-contrast.mjs`.",
      },
    },
  },
};
export default meta;

type Story = StoryObj;

const CARDINALS = [
  { name: "vitreus", role: "brand", hue: 195, char: "teal-cyan" },
  { name: "axis", role: "secondary", hue: 300, char: "violeta" },
  { name: "cinis", role: "text-body", hue: 267, char: "gris azulado" },
  { name: "rutilus", role: "warning", hue: 55, char: "cobre" },
  { name: "laurus", role: "success", hue: 140, char: "verde laurel" },
  { name: "malum", role: "danger", hue: 8, char: "rojo-granate" },
  { name: "kobalium", role: "info", hue: 260, char: "azul cobalto" },
] as const;

// sRGB → linear → relative luminance (WCAG)
function relLuminance(hex: string): number {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return 0;
  const hex6 = m[1] as string;
  const r = parseInt(hex6.slice(0, 2), 16) / 255;
  const g = parseInt(hex6.slice(2, 4), 16) / 255;
  const b = parseInt(hex6.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToOklch(hex: string): { L: number; C: number; H: number } | null {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const hex6 = m[1] as string;
  const r = parseInt(hex6.slice(0, 2), 16) / 255;
  const g = parseInt(hex6.slice(2, 4), 16) / 255;
  const b = parseInt(hex6.slice(4, 6), 16) / 255;
  const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lr = toLin(r), lg = toLin(g), lb = toLin(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m2 = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m2 - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m2 + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m2 - 0.808675766 * s;
  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

const EMPTY_TOKENS: Record<string, string> = {};

// Cacheamos para que `getSnapshot` devuelva referencia ESTABLE entre
// llamadas (requisito de useSyncExternalStore). Los tokens son literales
// en :root, no cambian en runtime — leerlos una vez basta.
let cachedTokens: Record<string, string> | null = null;

function readTokensFromDom(): Record<string, string> {
  if (cachedTokens) return cachedTokens;
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const c of CARDINALS) {
    out[`${c.name}-lux`] = cs.getPropertyValue(`--ig-${c.name}-lux`).trim();
    out[`${c.name}-nox`] = cs.getPropertyValue(`--ig-${c.name}-nox`).trim();
  }
  out["fundus-lux"] = cs.getPropertyValue("--ig-fundus-lux").trim();
  out["fundus-nox"] = cs.getPropertyValue("--ig-fundus-nox").trim();
  cachedTokens = out;
  return out;
}

function subscribe() {
  return () => {};
}

function useResolvedTokens(): Record<string, string> {
  return useSyncExternalStore(
    subscribe,
    readTokensFromDom,
    () => EMPTY_TOKENS,
  );
}

const cellStyle: React.CSSProperties = {
  padding: "var(--ig-space-3)",
  fontSize: 12,
  fontFamily: "var(--ig-font-mono)",
};

export const Cardinales: Story = {
  render: () => {
    const t = useResolvedTokens();
    return (
      <div style={{ padding: "var(--ig-space-6)" }}>
        <h2 style={{ marginTop: 0 }}>Paleta cardinal — geometría OKLCH dual</h2>
        <p style={{ maxWidth: 720, color: "var(--ig-text-muted)" }}>
          Cada cardinal tiene dos hex (<code>-lux</code> para tema light,
          <code>-nox</code> para tema dark). Por construcción, el ΔH entre
          ambos es ≤ 10°, L_lux ≈ 0.32, L_nox ≈ 0.84 y todos pasan AAA
          contra el fundus opuesto.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 1fr",
            gap: 0,
            border: "1px solid var(--ig-border-subtle)",
            borderRadius: "var(--ig-rounded-md)",
            overflow: "hidden",
            marginTop: "var(--ig-space-4)",
          }}
        >
          <div style={{ ...cellStyle, fontWeight: 600, background: "var(--ig-bg-muted)" }}>
            Cardinal
          </div>
          <div style={{ ...cellStyle, fontWeight: 600, background: "var(--ig-bg-muted)" }}>
            Lux (light)
          </div>
          <div style={{ ...cellStyle, fontWeight: 600, background: "var(--ig-bg-muted)" }}>
            Nox (dark)
          </div>
          {CARDINALS.map((c) => {
            const luxHex = t[`${c.name}-lux`] || "";
            const noxHex = t[`${c.name}-nox`] || "";
            const fundusLux = t["fundus-lux"] || "#faf9fc";
            const fundusNox = t["fundus-nox"] || "#0c1515";
            const luxOklch = luxHex ? rgbToOklch(luxHex) : null;
            const noxOklch = noxHex ? rgbToOklch(noxHex) : null;
            const luxRatio = luxHex && fundusLux ? contrast(luxHex, fundusLux).toFixed(2) : "-";
            const noxRatio = noxHex && fundusNox ? contrast(noxHex, fundusNox).toFixed(2) : "-";
            // Geometría: ΔH circular, suma L_lux+L_nox
            let dH: number | null = null;
            let sumL: number | null = null;
            if (luxOklch && noxOklch) {
              const raw = Math.abs(luxOklch.H - noxOklch.H);
              dH = Math.min(raw, 360 - raw);
              sumL = luxOklch.L + noxOklch.L;
            }
            const dhOk = dH !== null && dH <= 10;
            const sumOk = sumL !== null && Math.abs(sumL - 1.16) <= 0.08;
            const okColor = "var(--ig-laurus)";
            const failColor = "var(--ig-malum)";
            return (
              <Fragment key={c.name}>
                <div style={{ ...cellStyle, alignSelf: "center" }}>
                  <strong>{c.name}</strong>
                  <br />
                  <span style={{ color: "var(--ig-text-muted)" }}>
                    {c.role} · {c.char}
                    <br />
                    H≈{c.hue}°
                  </span>
                  <br />
                  <span style={{ color: dhOk ? okColor : failColor }}>
                    {dhOk ? "✓" : "✗"} ΔH={dH !== null ? dH.toFixed(1) : "-"}°
                  </span>
                  <br />
                  <span style={{ color: sumOk ? okColor : failColor }}>
                    {sumOk ? "✓" : "✗"} L_sum={sumL !== null ? sumL.toFixed(2) : "-"}
                  </span>
                </div>
                <div
                  style={{
                    ...cellStyle,
                    background: luxHex,
                    color: fundusLux,
                  }}
                >
                  {luxHex}
                  <br />
                  <span style={{ opacity: 0.85 }}>
                    L={luxOklch?.L.toFixed(3)} C={luxOklch?.C.toFixed(3)} H=
                    {luxOklch?.H.toFixed(1)}°
                  </span>
                  <br />
                  <span style={{ opacity: 0.85 }}>contraste vs fundus-lux: {luxRatio}</span>
                </div>
                <div
                  style={{
                    ...cellStyle,
                    background: noxHex,
                    color: fundusNox,
                  }}
                >
                  {noxHex}
                  <br />
                  <span style={{ opacity: 0.85 }}>
                    L={noxOklch?.L.toFixed(3)} C={noxOklch?.C.toFixed(3)} H=
                    {noxOklch?.H.toFixed(1)}°
                  </span>
                  <br />
                  <span style={{ opacity: 0.85 }}>contraste vs fundus-nox: {noxRatio}</span>
                </div>
              </Fragment>
            );
          })}
        </div>
        <p style={{ marginTop: "var(--ig-space-6)", color: "var(--ig-text-muted)" }}>
          Validado en CI por <code>npm run test:contrast</code>: ΔH ≤ 10°,
          L_lux ∈ [0.28, 0.36], L_nox ∈ [0.80, 0.88], suma ≈ 1.16. WCAG ≥ 4.5
          en cada par bg/color de los componentes.
        </p>
      </div>
    );
  },
};
