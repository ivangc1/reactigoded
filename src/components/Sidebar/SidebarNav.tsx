import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface SidebarNavProps extends HTMLAttributes<HTMLElement> {
  ref?: Ref<HTMLElement>;
}

/**
 * SidebarNav — `<nav>` que envuelve los items de navegación. `aria-label`
 * por defecto "Principal"; sobreescribible vía rest.
 */
export function SidebarNav({
  className,
  children,
  ref,
  ...rest
}: SidebarNavProps) {
  // 1.0.0-beta.4: aria-label del rest (HTML std).
  const { "aria-label": ariaLabelOverride, ...navRest } = rest;
  return (
    <nav
      {...navRest}
      ref={ref}
      aria-label={ariaLabelOverride ?? "Principal"}
      className={cn("ig-sidebar-nav", className)}
    >
      {children}
    </nav>
  );
}
