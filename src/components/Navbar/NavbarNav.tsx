import { type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";
import { useLandmarkRegistry } from "@/utils/useLandmarkRegistry";

export interface NavbarNavProps extends HTMLAttributes<HTMLElement> {
  ref?: Ref<HTMLElement>;
}

/**
 * NavbarNav — `<nav>` que contiene los `NavbarLink`s del navbar. `aria-label`
 * por defecto "Principal"; sobreescribible vía atributo HTML estándar.
 *
 * **A11y dev warn**: si dos NavbarNav (u otro `<nav>` con role
 * navigation) comparten `aria-label` vivos al mismo tiempo, se emite
 * warn `[reactigoded] dos landmarks role="navigation" comparten…`
 * (capa 1.2 debt doc).
 */
export function NavbarNav({
  className,
  ref,
  ...rest
}: NavbarNavProps) {
  // 1.0.0-beta.4: aria-label del rest (HTML std).
  const { "aria-label": ariaLabelOverride, ...navRest } = rest;
  const resolvedAriaLabel = ariaLabelOverride ?? "Principal";
  useLandmarkRegistry("navigation", resolvedAriaLabel);
  return (
    <nav
      {...navRest}
      ref={ref}
      aria-label={resolvedAriaLabel}
      className={cn("ig-navbar-nav", className)}
    />
  );
}
