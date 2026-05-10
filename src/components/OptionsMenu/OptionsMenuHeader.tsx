import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface OptionsMenuHeaderProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** OptionsMenuHeader — cabecera tipo etiqueta para agrupar items. */
export function OptionsMenuHeader({
  className,
  children,
  ref,
  ...rest
}: OptionsMenuHeaderProps) {
  return (
    <div
      ref={ref}
      className={cn("ig-options-menu-header", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
