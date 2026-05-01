import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface DropdownHeaderProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** DropdownHeader — cabecera tipo etiqueta para agrupar items. */
export function DropdownHeader({
  className,
  children,
  ref,
  ...rest
}: DropdownHeaderProps) {
  return (
    <div
      ref={ref}
      className={cn("ig-dropdown-header", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
