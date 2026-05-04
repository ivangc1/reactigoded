import { useMemo, type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";
import { useControllableState } from "@/hooks/useControllableState";
import { SidebarContext } from "./SidebarContext";

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  /** Estado colapsado (modo controlado). */
  collapsed?: boolean;
  /** Estado inicial (modo no controlado). Por defecto `false`. */
  defaultCollapsed?: boolean;
  /** Callback al cambiar collapsed. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * Etiqueta accesible del `<aside>`. Por defecto `"Navegación lateral"`
   * (ES). Sustituye el `aria-label` para i18n. Si pasas también
   * `aria-label` directo (vía rest), `aria-label` gana sobre `ariaLabel`.
   */
  ariaLabel?: string;
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
  ariaLabel,
  className,
  children,
  ref,
  ...rest
}: SidebarProps) {
  // Precedencia desde beta.19: aria-label (rest) > ariaLabel prop > default ES.
  const { "aria-label": ariaLabelOverride, ...asideRest } = rest;
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
        aria-label={ariaLabelOverride ?? ariaLabel ?? "Navegación lateral"}
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
