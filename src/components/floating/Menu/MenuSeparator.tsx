import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface MenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined;
}

/** MenuSeparator — separador horizontal entre grupos de items. */
export function MenuSeparator({
  className,
  ref,
  ...rest
}: MenuSeparatorProps) {
  return (
    <div
      {...rest}
      ref={ref}
      role="separator"
      className={cn("ig-menu-separator", className)}
    />
  );
}
