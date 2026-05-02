import {
  useCallback,
  useMemo,
  useState,
  type HTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { SidebarContext } from "./SidebarContext";

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  /** Estado colapsado (modo controlado). */
  collapsed?: boolean;
  /** Estado inicial (modo no controlado). Por defecto `false`. */
  defaultCollapsed?: boolean;
  /** Callback al cambiar collapsed. */
  onCollapsedChange?: (collapsed: boolean) => void;
  ref?: Ref<HTMLElement>;
}

/**
 * Sidebar — barra lateral persistente tipo "rail" con modo colapsado.
 *
 * Provee context a `SidebarToggle`, `SidebarItem`, etc. Compón con
 * `SidebarHeader`, `SidebarNav`, `SidebarItem`, `SidebarSection`,
 * `SidebarDivider`, `SidebarFooter`, `SidebarToggle`. En modo colapsado el
 * CSS oculta automáticamente `.ig-sidebar-text` y `.ig-sidebar-section`.
 *
 * @example
 * <Sidebar>
 *   <SidebarHeader>Mi App</SidebarHeader>
 *   <SidebarNav>
 *     <SidebarItem href="/" icon="🏠" active>Inicio</SidebarItem>
 *   </SidebarNav>
 *   <SidebarFooter><SidebarToggle /></SidebarFooter>
 * </Sidebar>
 */
export function Sidebar({
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  className,
  children,
  ref,
  ...rest
}: SidebarProps) {
  // 1.0.0-beta.4: aria-label del rest (HTML std).
  const { "aria-label": ariaLabelOverride, ...asideRest } = rest;
  const isControlled = collapsedProp !== undefined;
  const [internal, setInternal] = useState(defaultCollapsed);
  const collapsed = isControlled ? collapsedProp : internal;

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternal(next);
      onCollapsedChange?.(next);
    },
    [isControlled, onCollapsedChange],
  );

  const ctxValue = useMemo(
    () => ({ collapsed, setCollapsed }),
    [collapsed, setCollapsed],
  );

  return (
    <SidebarContext.Provider value={ctxValue}>
      <aside
        {...asideRest}
        ref={ref}
        aria-label={ariaLabelOverride ?? "Navegación lateral"}
        className={cn(
          "ig-sidebar",
          collapsed && "ig-sidebar-collapsed",
          className,
        )}
      >
        {children}
      </aside>
    </SidebarContext.Provider>
  );
}
