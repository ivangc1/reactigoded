import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface SidebarNavProps extends HTMLAttributes<HTMLElement> {
  /** Texto a11y para el `<nav>`. Por defecto `"Principal"`. */
  ariaLabel?: string;
  ref?: Ref<HTMLElement>;
}

/** SidebarNav — `<nav>` que envuelve los items de navegación. */
export function SidebarNav({
  ariaLabel = "Principal",
  className,
  children,
  ref,
  ...rest
}: SidebarNavProps) {
  return (
    <nav
      {...rest}
      ref={ref}
      aria-label={ariaLabel}
      className={cn("ig-sidebar-nav", className)}
    >
      {children}
    </nav>
  );
}
