import { type AnchorHTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";

export interface NavbarLinkProps
  extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Marca el link como activo (`aria-current="page"`). */
  active?: boolean;
  ref?: Ref<HTMLAnchorElement>;
}

/**
 * NavbarLink — link de navegación dentro de `NavbarNav`. Aplica
 * `aria-current="page"` cuando `active` es true.
  *
 * @server-safe
 */
export function NavbarLink({
  className,
  active,
  ref,
  ...rest
}: NavbarLinkProps) {
  return (
    // `children` viaja vía `...rest`. NavbarLink envuelve siempre texto.
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    <a
      {...rest}
      ref={ref}
      aria-current={active ? "page" : undefined}
      className={cn(
        "ig-navbar-link",
        active && "ig-navbar-link-active",
        className,
      )}
    />
  );
}
