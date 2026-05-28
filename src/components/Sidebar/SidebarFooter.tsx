import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface SidebarFooterProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined;
}

/** SidebarFooter — sección inferior de la sidebar (suele alojar `SidebarToggle`).  *
 * @server-safe
 */
export function SidebarFooter({
  className,
  children,
  ref,
  ...rest
}: SidebarFooterProps) {
  return (
    <div
      ref={ref}
      className={cn("ig-sidebar-footer", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
