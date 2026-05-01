import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/utils/cn";

export interface SidebarHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Icono / logo a la izquierda. Visible incluso colapsada. */
  icon?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * SidebarHeader — cabecera de la sidebar. El icono/logo permanece visible
 * en modo colapsado; el texto (children) lo oculta el CSS automáticamente.
 */
export function SidebarHeader({
  icon,
  className,
  children,
  ref,
  ...rest
}: SidebarHeaderProps) {
  return (
    <div
      ref={ref}
      className={cn("ig-sidebar-header", className)}
      {...rest}
    >
      {icon}
      {children !== undefined && <span>{children}</span>}
    </div>
  );
}
