import {
  Children,
  Fragment,
  isValidElement,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  /** Separador entre items. Por defecto `"/"`. Puede ser nodo (icono). */
  separator?: ReactNode;
  /** Texto a11y para el `<nav>`. */
  ariaLabel?: string;
  ref?: Ref<HTMLElement>;
}

/**
 * Breadcrumb — `<nav>` con jerarquía de navegación. Pasa `BreadcrumbItem`s
 * como children; el componente intercala el `separator` automáticamente.
 *
 * El último item debería tener `current=true` (renderiza `<span aria-current="page">`
 * en vez de `<a>`).
 */
export function Breadcrumb({
  separator = "/",
  ariaLabel = "Migas de pan",
  className,
  children,
  ref,
  ...rest
}: BreadcrumbProps) {
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <nav
      {...rest}
      ref={ref}
      aria-label={ariaLabel}
      className={cn("ig-breadcrumb", className)}
    >
      {items.map((item, idx) => (
        <Fragment key={idx}>
          {item}
          {idx < items.length - 1 && (
            <span className="ig-breadcrumb-separator" aria-hidden="true">
              {separator}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
