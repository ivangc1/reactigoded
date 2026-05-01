import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export type CardVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Color de la card. Outline por defecto; con `filled` aplica fondo sólido. */
  variant?: CardVariant;
  /** Variante con fondo sólido (`ig-card-<variant>-filled`). */
  filled?: boolean;
  /** Borde más marcado. */
  bordered?: boolean;
  /** Sombra elevada. */
  elevated?: boolean;
  /** Efecto glass (backdrop-filter). */
  glass?: boolean;
  /** Hover lift + cursor pointer (úsalo cuando la card es clickable). */
  interactive?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Card — contenedor de contenido con variantes de color y modificadores
 * visuales (bordered, elevated, glass, interactive).
 *
 * Combina con `CardHeader`, `CardBody`, `CardFooter`, `CardImage`,
 * `CardDivider` para layouts compuestos.
 *
 * Si la card actúa como botón (`interactive`), el consumidor debe pasar
 * `role="button"` + `tabIndex={0}` + `onClick`/`onKeyDown` para que sea
 * accesible por teclado.
 */
export function Card({
  variant,
  filled = false,
  bordered = false,
  elevated = false,
  glass = false,
  interactive = false,
  className,
  children,
  ref,
  ...rest
}: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "ig-card",
        variant && (filled ? `ig-card-${variant}-filled` : `ig-card-${variant}`),
        bordered && "ig-card-bordered",
        elevated && "ig-card-elevated",
        glass && "ig-card-glass",
        interactive && "ig-card-interactive",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
