import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export type ProgressVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type ProgressSize = "sm" | "md" | "lg";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** Valor actual (0..max). Ignorado si `indeterminate`. */
  value?: number;
  /** Valor máximo. Por defecto 100. */
  max?: number;
  /** Color del progress bar. */
  variant?: ProgressVariant;
  /** Altura del track. */
  size?: ProgressSize;
  /** Modo indeterminado: barra animada sin valor concreto. */
  indeterminate?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Progress — barra de progreso lineal.
 *
 * Expone `role="progressbar"` con `aria-valuenow/min/max` (o sin `valuenow`
 * en modo `indeterminate`). El relleno es un `<span>` interno cuya `width`
 * se calcula a partir de `value/max`.
 *
 * @example
 * <Progress value={70} variant="success" />
 * <Progress indeterminate aria-label="Subiendo archivo" />
 * <Progress value={3} max={5} size="lg" />
 */
export function Progress({
  value = 0,
  max = 100,
  variant,
  size = "md",
  indeterminate = false,
  className,
  ref,
  ...rest
}: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (clamped / max) * 100 : 0;
  // 1.0.0-beta.4: aria-label del rest (HTML std). Si no llega, calcula uno
  // descriptivo basado en porcentaje (o "Cargando" si indeterminate).
  const { "aria-label": ariaLabelOverride, ...divRest } = rest;
  const resolvedAriaLabel =
    ariaLabelOverride ??
    (indeterminate
      ? "Cargando"
      : `${String(Math.round(percent))} por ciento completado`);

  return (
    <div
      {...divRest}
      ref={ref}
      role="progressbar"
      aria-label={resolvedAriaLabel}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : clamped}
      className={cn(
        "ig-progress",
        variant && `ig-progress-${variant}`,
        size !== "md" && `ig-progress-${size}`,
        indeterminate && "ig-progress-indeterminate",
        className,
      )}
    >
      <span
        className="ig-progress-bar"
        style={indeterminate ? undefined : { width: `${String(percent)}%` }}
      />
    </div>
  );
}
