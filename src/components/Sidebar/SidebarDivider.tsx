import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface SidebarDividerProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** SidebarDivider — separador horizontal entre grupos de items. */
export function SidebarDivider({
  className,
  ref,
  ...rest
}: SidebarDividerProps) {
  return (
    <div
      {...rest}
      ref={ref}
      role="separator"
      className={cn("ig-sidebar-divider", className)}
    />
  );
}
