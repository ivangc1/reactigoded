import { type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";

export interface NavbarNavProps extends HTMLAttributes<HTMLElement> {
  /** Etiqueta accesible del `<nav>`. */
  ariaLabel?: string;
  ref?: Ref<HTMLElement>;
}

/**
 * NavbarNav — `<nav>` que contiene los `NavbarLink`s del navbar.
 */
export function NavbarNav({
  className,
  ariaLabel = "Principal",
  ref,
  ...rest
}: NavbarNavProps) {
  return (
    <nav
      {...rest}
      ref={ref}
      aria-label={ariaLabel}
      className={cn("ig-navbar-nav", className)}
    />
  );
}
