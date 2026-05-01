import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface DropdownDividerProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** DropdownDivider — separador horizontal entre grupos de items. */
export function DropdownDivider({
  className,
  ref,
  ...rest
}: DropdownDividerProps) {
  return (
    <div
      {...rest}
      ref={ref}
      role="separator"
      className={cn("ig-dropdown-divider", className)}
    />
  );
}
