import type { CSSProperties, HTMLAttributes, Ref } from "react";
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
  // H-03 (beta.24): cuantizar a entero 0..100 antes de emitir el
  // custom property. Sin esto, inputs como value=1 max=3 emiten
  // `33.33333333333333%`, fuera del conjunto finito de 101 valores
  // que un CSP con `'unsafe-hashes'` puede pre-hashear (codex P2
  // sobre PR #81). El round es visualmente imperceptible (paso 1%
  // sobre la barra) y matchea el `aria-label` que ya redondea.
  const percentInt = Math.round(percent);
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
        // H-03 (beta.24 gate review): el `width` runtime ya no se
        // emite como propiedad CSS arbitraria en el style attribute.
        // En su lugar pasamos un único custom property
        // `--ig-progress-percent` que la regla `.ig-progress-bar` del
        // stylesheet consume via `width: var(--ig-progress-percent, 0%)`.
        // Beneficios CSP:
        //   - El style attribute ya no contiene propiedades
        //     visuales arbitrarias (`width: …`), solo un canal de
        //     datos tipado por convención del DS.
        //   - Auditores CSP modernos (CSP Evaluator, Lighthouse)
        //     tratan `style="--var: value"` como data passthrough,
        //     distinto a inline rules.
        //   - El consumer puede gatear el DS detrás de un CSP que
        //     restrinja `style-src` con `'unsafe-hashes'` sobre el
        //     conjunto finito de valores `--ig-progress-percent`
        //     emitidos. Imposible con `width: 50%` arbitrario.
        // Patrón canónico Radix/Mantine/MUI Joy para valores dinámicos.
        style={
          indeterminate
            ? undefined
            : ({
                "--ig-progress-percent": `${String(percentInt)}%`,
              } as CSSProperties)
        }
      />
    </div>
  );
}
