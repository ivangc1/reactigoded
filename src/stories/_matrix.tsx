/**
 * Layout helpers para stories AllStates / matrices visuales del DS.
 *
 * **Antes de añadir una story de catálogo nueva**, lee
 * `docs/STORY_CATALOG_CONVENTIONS.md` (reglas axe + a11y + plays
 * verificadas en producción durante beta.19/20).
 *
 * Reglas mínimas resumidas:
 *   - aria-label único por landmark (Sidebar/Navbar/Breadcrumb…).
 *   - Multi-banner/contentinfo: envolver cada uno en `<section aria-label>`.
 *   - Inputs sueltos: `aria-label` / `placeholder` o `Label htmlFor`.
 *   - Use `defaultValue=` (no `value=`) si no hay onChange.
 *   - `play()`: usa `queryAllByRoleSafe` y `expectAtLeast` de `src/test-utils`.
 */
import type { ReactNode } from "react";

const VARIANTS = [
  "brand",
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
] as const;
const SIZES = ["sm", "md", "lg"] as const;

export type Variant = (typeof VARIANTS)[number];
export type Size = (typeof SIZES)[number];

export const VARIANTS_LIST = VARIANTS;
export const SIZES_LIST = SIZES;

/**
 * Layout grid para matrices AllStates. Una fila por variant con un
 * label monoespaciado a la izquierda y `renderRow(variant)` a la
 * derecha. Reutilizable en todos los AllStates de Ola 1.
 *
 * NO se publica al paquete (vive bajo `src/stories/`, excluido del
 * build de la lib).
 */
export function MatrixGrid({
  variants = VARIANTS,
  renderRow,
}: {
  variants?: readonly string[];
  renderRow: (variant: string) => ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {variants.map((v) => (
        <div
          key={v}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <span
            style={{
              minWidth: 80,
              fontFamily: "var(--ig-font-mono)",
              fontSize: "0.75rem",
              color: "var(--ig-text-muted)",
            }}
          >
            {v}
          </span>
          {renderRow(v)}
        </div>
      ))}
    </div>
  );
}
