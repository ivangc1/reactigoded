import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/utils/cn";
import { useSidebar } from "./SidebarContext";

export interface SidebarToggleProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Contenido del botón. Por defecto `"☰"`. */
  children?: ReactNode;
  /** Texto a11y al expandir. Por defecto `"Expandir sidebar"`. */
  expandLabel?: string;
  /** Texto a11y al colapsar. Por defecto `"Colapsar sidebar"`. */
  collapseLabel?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * SidebarToggle — botón que alterna el estado colapsado de la `Sidebar`.
 * Aplica `aria-expanded` (true cuando expandida) y un `aria-label` distinto
 * según el estado para que los lectores de pantalla anuncien la acción.
 */
export function SidebarToggle({
  className,
  children = "☰",
  type = "button",
  expandLabel = "Expandir sidebar",
  collapseLabel = "Colapsar sidebar",
  onClick,
  ref,
  ...rest
}: SidebarToggleProps) {
  const { collapsed, setCollapsed } = useSidebar();
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-expanded={!collapsed}
      aria-label={collapsed ? expandLabel : collapseLabel}
      className={cn("ig-sidebar-toggle", className)}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) setCollapsed(!collapsed);
      }}
    >
      {children}
    </button>
  );
}
