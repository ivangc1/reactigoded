import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export type BadgeVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Variante de color. Por defecto `"brand"`. */
  variant?: BadgeVariant;
  /** Tamaño. `"md"` (default) no añade clase modificadora. */
  size?: BadgeSize;
  /** Pill/píldora con esquinas totalmente redondeadas. */
  pill?: boolean;
  /** Outline en vez de relleno sólido. */
  outline?: boolean;
  /**
   * Modo "punto": un círculo sin texto. Cuando `dot=true`, los `children`
   * se ignoran visualmente y se mueven a `aria-label` para SR. Útil como
   * indicador de estado (online, notificación, etc.).
   */
  dot?: boolean;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Badge — etiqueta breve de estado o categoría. Inline, no clickeable
 * (si necesitas algo clickeable usa Chip o Button).
 *
 * @example
 * <Badge>Nuevo</Badge>
 * <Badge variant="success" pill>Activo</Badge>
 * <Badge variant="danger" outline>Bloqueado</Badge>
 * <Badge variant="success" dot>Conectado</Badge>
 *
 * @server-safe
 */
export function Badge({
  variant = "brand",
  size = "md",
  pill = false,
  outline = false,
  dot = false,
  className,
  children,
  ref,
  role: roleProp,
  "aria-label": ariaLabelProp,
  ...rest
}: BadgeProps) {
  const ariaLabel =
    dot && !ariaLabelProp && typeof children === "string"
      ? children
      : ariaLabelProp;
  // En modo dot el span es un indicador visual sin texto: aria-label sobre
  // un span requiere role para no violar `aria-prohibited-attr`. Aplicamos
  // role="img" si el consumer no especifica otro, salvo que tampoco haya
  // aria-label (entonces el dot es 100% decorativo y no necesita role).
  const role = roleProp ?? (dot && ariaLabel ? "img" : undefined);
  return (
    <span
      {...rest}
      ref={ref}
      role={role}
      className={cn(
        "ig-badge",
        outline ? `ig-badge-outline-${variant}` : `ig-badge-${variant}`,
        size !== "md" && `ig-badge-${size}`,
        pill && "ig-badge-pill",
        dot && "ig-badge-dot",
        className,
      )}
      aria-label={ariaLabel}
    >
      {dot ? null : children}
    </span>
  );
}
