import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface SidebarSectionProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * SidebarSection — etiqueta de grupo (estilo "Principal", "Herramientas").
 * Oculta automáticamente cuando la sidebar está colapsada (vía CSS).
 */
export function SidebarSection({
  className,
  children,
  ref,
  ...rest
}: SidebarSectionProps) {
  return (
    <div
      ref={ref}
      className={cn("ig-sidebar-section", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
