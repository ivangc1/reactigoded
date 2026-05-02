import { type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";

export interface NavbarNavProps extends HTMLAttributes<HTMLElement> {
  ref?: Ref<HTMLElement>;
}

/**
 * NavbarNav — `<nav>` que contiene los `NavbarLink`s del navbar. `aria-label`
 * por defecto "Principal"; sobreescribible vía atributo HTML estándar.
 */
export function NavbarNav({
  className,
  ref,
  ...rest
}: NavbarNavProps) {
  // 1.0.0-beta.4: aria-label del rest (HTML std).
  const { "aria-label": ariaLabelOverride, ...navRest } = rest;
  return (
    <nav
      {...navRest}
      ref={ref}
      aria-label={ariaLabelOverride ?? "Principal"}
      className={cn("ig-navbar-nav", className)}
    />
  );
}
