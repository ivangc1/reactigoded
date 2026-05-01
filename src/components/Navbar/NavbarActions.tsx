import { type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";

export interface NavbarActionsProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * NavbarActions — contenedor de acciones globales (botones, menús de cuenta).
 */
export function NavbarActions({
  className,
  ref,
  ...rest
}: NavbarActionsProps) {
  return (
    <div
      ref={ref}
      className={cn("ig-navbar-actions", className)}
      {...rest}
    />
  );
}
