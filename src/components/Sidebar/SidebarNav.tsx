import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { useLandmarkRegistry } from "@/utils/useLandmarkRegistry";

export interface SidebarNavProps extends HTMLAttributes<HTMLElement> {
  ref?: Ref<HTMLElement>;
}

/**
 * SidebarNav — `<nav>` que envuelve los items de navegación. `aria-label`
 * por defecto "Principal"; sobreescribible vía rest.
 *
 * **A11y dev warn**: si dos SidebarNav (u otro `<nav>` con role
 * navigation) comparten `aria-label`, se emite warn (capa 1.2 debt
 * doc).
 */
export function SidebarNav({
  className,
  children,
  ref,
  ...rest
}: SidebarNavProps) {
  // 1.0.0-beta.4: aria-label del rest (HTML std).
  const { "aria-label": ariaLabelOverride, ...navRest } = rest;
  const resolvedAriaLabel = ariaLabelOverride ?? "Principal";
  useLandmarkRegistry("navigation", resolvedAriaLabel);
  return (
    <nav
      {...navRest}
      ref={ref}
      aria-label={resolvedAriaLabel}
      className={cn("ig-sidebar-nav", className)}
    >
      {children}
    </nav>
  );
}
