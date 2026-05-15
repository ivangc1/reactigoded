"use client";

import {
  Children,
  Fragment,
  isValidElement,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { useLandmarkRegistry } from "@/utils/useLandmarkRegistry";

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  /** Separador entre items. Por defecto `"/"`. Puede ser nodo (icono). */
  separator?: ReactNode;
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
  className,
  children,
  ref,
  ...rest
}: BreadcrumbProps) {
  const items = Children.toArray(children).filter(isValidElement);
  // 1.0.0-beta.4: aria-label del rest (HTML std).
  const { "aria-label": ariaLabelOverride, ...navRest } = rest;
  const resolvedAriaLabel = ariaLabelOverride ?? "Migas de pan";
  // Capa 1.2 debt doc: warn dev si dos <nav aria-label="..."> con el
  // mismo label viven al mismo tiempo (axe rule landmark-unique).
  useLandmarkRegistry("navigation", resolvedAriaLabel);

  return (
    <nav
      {...navRest}
      ref={ref}
      aria-label={resolvedAriaLabel}
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
