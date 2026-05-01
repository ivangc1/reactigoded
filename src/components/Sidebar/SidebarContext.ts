import { createContext, useContext } from "react";

export interface SidebarContextValue {
  /** Si la sidebar está colapsada (modo "rail" sólo iconos). */
  collapsed: boolean;
  /** Cambia el estado y dispara `onCollapsedChange`. */
  setCollapsed: (next: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error(
      "Componentes SidebarToggle/Item/etc. deben usarse dentro de <Sidebar>",
    );
  }
  return ctx;
}
