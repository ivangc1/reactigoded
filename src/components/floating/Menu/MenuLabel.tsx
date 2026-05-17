import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface MenuLabelProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** MenuLabel — cabecera tipo etiqueta para agrupar items. */
export function MenuLabel({
  className,
  children,
  ref,
  ...rest
}: MenuLabelProps) {
  return (
    <div
      ref={ref}
      className={cn("ig-menu-label", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
