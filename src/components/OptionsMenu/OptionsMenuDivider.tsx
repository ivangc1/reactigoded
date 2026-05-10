import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface OptionsMenuDividerProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** OptionsMenuDivider — separador horizontal entre grupos de items. */
export function OptionsMenuDivider({
  className,
  ref,
  ...rest
}: OptionsMenuDividerProps) {
  return (
    <div
      {...rest}
      ref={ref}
      role="separator"
      className={cn("ig-options-menu-divider", className)}
    />
  );
}
