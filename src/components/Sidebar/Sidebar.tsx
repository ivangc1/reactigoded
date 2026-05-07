import { useMemo, type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";
import { useControllableState } from "@/hooks/useControllableState";
import { useLandmarkRegistry } from "@/utils/useLandmarkRegistry";
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
  // Precedencia desde beta.22: aria-label (rest) > default ES.
  // La prop `ariaLabel` separada se eliminó en beta.22 por consistencia
  // con el resto del DS (Pagination, Spinner, Stepper, TabList, Rating
  // ya usaban aria-label estándar desde beta.4). Migration: rename
  // ariaLabel → aria-label en el JSX consumidor.
  const { "aria-label": ariaLabelOverride, ...asideRest } = rest;
  const resolvedAriaLabel = ariaLabelOverride ?? "Navegación lateral";
  // Capa 1.2 debt doc: warn dev si dos <aside aria-label="..."> con
  // mismo label viven simultáneamente (ej. galería con varios sidebars
  // sin labels únicos).
  useLandmarkRegistry("complementary", resolvedAriaLabel);
  const { value: collapsed, setValue: setCollapsed } = useControllableState<boolean>({
    value: collapsedProp,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
  });

  const ctxValue = useMemo(
    () => ({ collapsed, setCollapsed }),
    [collapsed, setCollapsed],
  );

  return (
    <SidebarContext.Provider value={ctxValue}>
      <aside
        {...asideRest}
        ref={ref}
        aria-label={resolvedAriaLabel}
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
