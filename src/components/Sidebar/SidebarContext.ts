import { createContext, useContext } from "react";

export interface SidebarContextValue {
  /** Si la sidebar está colapsada (modo "rail" sólo iconos). */
  collapsed: boolean;
  /** Cambia el estado y dispara `onCollapsedChange`. */
  setCollapsed: (next: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

/**
 * Hook que expone el contexto de un `<Sidebar>` (collapsed, setCollapsed).
 * Lo usan internamente `SidebarToggle`, `SidebarItem` (para auto-derivar
 * `aria-label` cuando el texto se oculta en estado colapsado), etc. Útil
 * también para sincronizar el estado de la sidebar con tu router o
 * persistir la preferencia del usuario en localStorage.
 *
 * @example
 * function PersistSidebar() {
 *   const { collapsed, setCollapsed } = useSidebar();
 *   useEffect(() => {
 *     const saved = localStorage.getItem("sidebar-collapsed");
 *     if (saved !== null) setCollapsed(saved === "true");
 *   }, [setCollapsed]);
 *   useEffect(() => {
 *     localStorage.setItem("sidebar-collapsed", String(collapsed));
 *   }, [collapsed]);
 *   return null;
 * }
 *
 * @throws Error si se usa fuera de `<Sidebar>`.
 */
export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error(
      "Componentes SidebarToggle/Item/etc. deben usarse dentro de <Sidebar>",
    );
  }
  return ctx;
}
