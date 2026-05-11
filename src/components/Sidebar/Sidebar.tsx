import { useId, useMemo, type HTMLAttributes, type Ref } from "react";
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
  onValueChange?: (collapsed: boolean) => void;
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
  onValueChange,
  className,
  children,
  ref,
  ...rest
}: SidebarProps) {
  // Precedencia desde beta.22: aria-label (rest) > default ES.
  // La prop `ariaLabel` separada se eliminó en beta.22 por consistencia
  // con el resto del DS (Pagination, Spinner, Stepper, TabsList, Rating
  // ya usaban aria-label estándar desde beta.4). Migration: rename
  // ariaLabel → aria-label en el JSX consumidor.
  const { "aria-label": ariaLabelOverride, id: idOverride, ...asideRest } =
    rest;
  const resolvedAriaLabel = ariaLabelOverride ?? "Navegación lateral";
  // H-10 (gate review): id estable para que SidebarToggle pueda
  // referenciar el panel via aria-controls. Respetamos el id del
  // consumer si lo pasó por rest; si no, generamos uno con useId.
  const generatedId = useId();
  const asideId = idOverride ?? generatedId;
  // Capa 1.2 debt doc: warn dev si dos <aside aria-label="..."> con
  // mismo label viven simultáneamente (ej. galería con varios sidebars
  // sin labels únicos).
  useLandmarkRegistry("complementary", resolvedAriaLabel);
  const { value: collapsed, setValue: setCollapsed } = useControllableState<boolean>({
    value: collapsedProp,
    defaultValue: defaultCollapsed,
    onChange: onValueChange,
  });

  const ctxValue = useMemo(
    () => ({ collapsed, setCollapsed, asideId }),
    [collapsed, setCollapsed, asideId],
  );

  return (
    <SidebarContext.Provider value={ctxValue}>
      <aside
        {...asideRest}
        ref={ref}
        id={asideId}
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
