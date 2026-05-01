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
  /** Texto accesible para lectores de pantalla (`aria-label` del status). */
  ariaLabel?: string;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Spinner — indicador de carga circular animado.
 *
 * Aplica `role="status"` y `aria-label` para que los lectores de pantalla
 * anuncien el estado de carga.
 *
 * @example
 * <Spinner />
 * <Spinner variant="success" size="lg" />
 * <Spinner ariaLabel="Procesando pago…" />
 */
export function Spinner({
  variant = "brand",
  size = "md",
  ariaLabel = "Cargando…",
  className,
  ref,
  ...rest
}: SpinnerProps) {
  return (
    <span
      {...rest}
      ref={ref}
      role="status"
      aria-label={ariaLabel}
      className={cn(
        "ig-spinner",
        `ig-spinner-${variant}`,
        size !== "md" && `ig-spinner-${size}`,
        className,
      )}
    />
  );
}
