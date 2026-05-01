import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

/**
 * Variantes de color/estilo del botón. Cada una corresponde a una clase
 * `.ig-btn-<variant>` definida en `igoded-design.css`.
 */
export type ButtonVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline"
  | "ghost"
  | "link";

/**
 * Tamaños del botón. `md` es el por defecto (sin clase de tamaño aplicada).
 * Los demás corresponden a `.ig-btn-<size>`.
 */
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Apariencia del botón cuando se combina con una variante color.
 * - `"solid"` (default): fondo sólido del color de la variant.
 * - `"outline"`: borde del color de la variant, fondo transparente
 *   (`ig-btn-outline-<variant>`).
 * - `"ghost"`: sin borde, color del texto/hover según variant
 *   (`ig-btn-ghost-<variant>`).
 *
 * Solo se aplica cuando `variant` es uno de los 6 colores semánticos. Si
 * `variant` ya es `"outline"`, `"ghost"` o `"link"` (apariencias planas
 * legacy), `appearance` se ignora.
 */
export type ButtonAppearance = "solid" | "outline" | "ghost";

const COLOR_VARIANTS = new Set<ButtonVariant>([
  "brand",
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
]);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variante visual. Por defecto `"brand"`. */
  variant?: ButtonVariant;
  /**
   * Apariencia cuando `variant` es un color (brand, secondary, success...).
   * Combina para producir `ig-btn-outline-<variant>` o `ig-btn-ghost-<variant>`.
   * Por defecto `"solid"`.
   */
  appearance?: ButtonAppearance;
  /** Tamaño. `"md"` (default) no añade clase modificadora. */
  size?: ButtonSize;
  /** Muestra spinner y bloquea clicks. */
  loading?: boolean;
  /** Ocupa el ancho completo del contenedor. */
  block?: boolean;
  /** Botón solo-icono (cuadrado, padding equilibrado). */
  icon?: boolean;
  /** Ref al `<button>` subyacente. En React 19 es prop normal. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Botón base del design system.
 *
 * Soporta 9 variantes y 5 tamaños. El estado `loading` desactiva el click
 * y aplica una clase `.ig-btn-loading` que el CSS usa para mostrar spinner.
 *
 * @example
 * <Button onClick={save}>Guardar</Button>
 * <Button variant="danger" loading>Eliminando…</Button>
 * <Button variant="success" appearance="outline">OK</Button>
 * <Button icon aria-label="Favorito">★</Button>
 */
export function Button({
  variant = "brand",
  appearance = "solid",
  size = "md",
  loading = false,
  block = false,
  icon = false,
  disabled,
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  const isColor = COLOR_VARIANTS.has(variant);
  const variantClass =
    isColor && appearance !== "solid"
      ? `ig-btn-${appearance}-${variant}`
      : `ig-btn-${variant}`;
  return (
    <button
      {...rest}
      ref={ref}
      type={rest.type ?? "button"}
      disabled={disabled === true || loading}
      className={cn(
        "ig-btn",
        variantClass,
        size !== "md" && `ig-btn-${size}`,
        loading && "ig-btn-loading",
        block && "ig-btn-block",
        icon && "ig-btn-icon",
        className,
      )}
    >
      {children}
    </button>
  );
}
