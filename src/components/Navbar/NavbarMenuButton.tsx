import { type ButtonHTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";

export interface NavbarMenuButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Si el menú asociado está expandido. */
  expanded?: boolean;
  /** ID del elemento que controla (para `aria-controls`). */
  controlsId?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * NavbarMenuButton — botón hamburguesa que sólo se muestra en mobile vía CSS
 * (`@media max-width: 768px`). Pensado para abrir un menú lateral o drawer.
 */
export function NavbarMenuButton({
  className,
  expanded,
  controlsId,
  children,
  "aria-label": ariaLabel = "Abrir menú",
  ref,
  ...rest
}: NavbarMenuButtonProps) {
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      aria-expanded={expanded}
      aria-controls={controlsId}
      className={cn("ig-navbar-menu-btn", className)}
    >
      {children ?? <span aria-hidden="true">☰</span>}
    </button>
  );
}
