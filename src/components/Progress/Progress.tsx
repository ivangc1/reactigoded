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
  /**
   * Etiqueta accesible (aria-label) cuando el componente no recibe
   * `aria-label` explícito. Default `"Cargando"` (ES intencional —
   * audience inicial hispanohablante; ver Storybook → *Fundamentos /
   * CSS API pública* (renderizada desde `docs/CSSAPI.mdx`) sección
   * "i18n y a11y strings").
   *
   * Override para apps en otros idiomas:
   * ```tsx
   * <Progress loadingLabel="Loading" indeterminate />
   * ```
   *
   * Si pasas `aria-label` como prop HTML estándar, gana sobre
   * `loadingLabel` y `formatLabel`.
   */
  loadingLabel?: string;
  /**
   * Función opcional para formatear el `aria-label` con el porcentaje
   * actual. Útil con sistemas i18n con interpolación. No aplica en
   * `indeterminate` (no hay porcentaje).
   *
   * @example
   * ```tsx
   * <Progress value={75} formatLabel={(p) => `${p}% done`} />
   * // i18n:
   * <Progress
   *   value={percent}
   *   formatLabel={(p) => t("progress.format", { percent: p })}
   * />
   * ```
   */
  formatLabel?: (percent: number) => string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Progress — barra de progreso lineal.
 *
 * Expone `role="progressbar"` con `aria-valuenow/min/max` (o sin `valuenow`
 * en modo `indeterminate`). El relleno es un `<div>` interno cuya `width`
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
  loadingLabel = "Cargando",
  formatLabel,
  className,
  ref,
  ...rest
}: ProgressProps) {
  // Defensa contra max ≤ 0, NaN, Infinity en `max`. Cae al default 100
  // sin contaminar la API ARIA con valores que rompen el ratio.
  // Para `value`: NaN colapsa a 0 (no podemos clampear NaN); ±Infinity
  // pasa por el clamp normal y se queda en [0, safeMax].
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isNaN(value) ? 0 : value;
  const clamped = Math.min(Math.max(safeValue, 0), safeMax);
  const percent = (clamped / safeMax) * 100;
  // 1.0.0-beta.4: aria-label del rest (HTML std). Si no llega, resolver
  // por prioridad: aria-label > formatLabel(percent) > loadingLabel
  // (en indeterminate) > fallback español "X por ciento completado"
  // (determinate sin formatLabel). beta.20: añadido loadingLabel +
  // formatLabel para i18n.
  const { "aria-label": ariaLabelOverride, ...divRest } = rest;
  const resolvedAriaLabel =
    ariaLabelOverride ??
    (indeterminate
      ? loadingLabel
      : (formatLabel?.(Math.round(percent)) ??
        `${String(Math.round(percent))} por ciento completado`));

  return (
    <div
      {...divRest}
      ref={ref}
      role="progressbar"
      aria-label={resolvedAriaLabel}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={indeterminate ? undefined : clamped}
      className={cn(
        "ig-progress",
        variant && `ig-progress-${variant}`,
        size !== "md" && `ig-progress-${size}`,
        indeterminate && "ig-progress-indeterminate",
        className,
      )}
    >
      <div
        className="ig-progress-bar"
        // M-08 (RC1): inline style necesario porque `width` depende
        // de `value` runtime (0-100%), no es expressable como clase
        // estática. Consumer con CSP estricto sin `'unsafe-inline'`
        // debe aceptar `style-src 'self' 'unsafe-inline'` o usar
        // CSS-in-JS con nonce. Excepción legítima documentada en
        // gate review § IV.3 M-08.
        style={indeterminate ? undefined : { width: `${String(percent)}%` }}
      />
    </div>
  );
}
