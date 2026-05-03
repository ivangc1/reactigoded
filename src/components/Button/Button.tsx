import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

/**
 * Variantes semánticas de color (las 6 cardinales del DS). Cada una
 * corresponde a una clase `.ig-btn-<variant>` (solid) y a su par
 * `.ig-btn-outline-<variant>` / `.ig-btn-ghost-<variant>` para apariencias.
 *
 * `outline`, `ghost` y `link` ya NO viven aquí — pasaron a `appearance`
 * (1.0.0-beta.1) para separar el eje "color/semántica" del eje
 * "estilo visual". Antes se podía hacer `variant="outline"` Y
 * `appearance="outline"`: redundante y confuso.
 */
export type ButtonVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

/**
 * Tamaños del botón. `md` es el por defecto (sin clase de tamaño aplicada).
 * Los demás corresponden a `.ig-btn-<size>`.
 */
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Apariencia visual del botón. Combina con `variant` para producir la clase
 * CSS final.
 *
 * - `"solid"` (default): fondo sólido del color de la variant → `ig-btn-<variant>`.
 * - `"outline"`: borde del color, fondo transparente → `ig-btn-outline-<variant>`.
 * - `"ghost"`: sin borde, hover sutil → `ig-btn-ghost-<variant>`.
 * - `"link"`: aspecto de link de texto → `ig-btn-link` (variant ignorado).
 */
export type ButtonAppearance = "solid" | "outline" | "ghost" | "link";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variante semántica de color. Por defecto `"brand"`. */
  variant?: ButtonVariant;
  /** Apariencia visual. Por defecto `"solid"`. */
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
 * API en dos ejes ortogonales: `variant` (color/semántica) × `appearance`
 * (estilo visual). Junto con `size`/`loading`/`block`/`icon` cubre todos los
 * casos sin combinaciones redundantes.
 *
 * @example
 * <Button onClick={save}>Guardar</Button>
 * <Button variant="danger" loading>Eliminando…</Button>
 * <Button variant="success" appearance="outline">OK</Button>
 * <Button appearance="link">Saber más</Button>
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
  const variantClass =
    appearance === "link"
      ? "ig-btn-link"
      : appearance === "solid"
        ? `ig-btn-${variant}`
        : `ig-btn-${appearance}-${variant}`;
  return (
    <button
      {...rest}
      ref={ref}
      type={rest.type ?? "button"}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
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
