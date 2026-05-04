import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export type SpinnerVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** Color del spinner. Por defecto `"brand"`. */
  variant?: SpinnerVariant;
  /** Tamaño. `"md"` por defecto. */
  size?: SpinnerSize;
  /**
   * Etiqueta accesible para SR. Por defecto `"Cargando…"` (ES). Sustituye
   * el `aria-label` del componente para i18n. Si pasas también
   * `aria-label` directo (vía rest), `aria-label` gana sobre `label`.
   */
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Spinner — indicador de carga circular animado.
 *
 * Aplica `role="status"` y `aria-label` (default "Cargando…") para que los
 * lectores de pantalla anuncien el estado de carga. Pasa `aria-label` para
 * personalizar (i18n o contexto específico).
 *
 * @example
 * <Spinner />
 * <Spinner variant="success" size="lg" />
 * <Spinner aria-label="Procesando pago…" />
 */
export function Spinner({
  variant = "brand",
  size = "md",
  label,
  className,
  ref,
  ...rest
}: SpinnerProps) {
  // 1.0.0-beta.4: aria-label se extrae del rest (HTML std). Antes existía
  // una prop `ariaLabel` separada. Migration: rename ariaLabel→aria-label.
  // Desde beta.19: prop `label` explícita para i18n. Precedencia:
  // aria-label (rest) > label > default ES "Cargando…".
  const { "aria-label": ariaLabelOverride, ...spanRest } = rest;
  return (
    <span
      {...spanRest}
      ref={ref}
      role="status"
      aria-label={ariaLabelOverride ?? label ?? "Cargando…"}
      className={cn(
        "ig-spinner",
        `ig-spinner-${variant}`,
        size !== "md" && `ig-spinner-${size}`,
        className,
      )}
    />
  );
}
