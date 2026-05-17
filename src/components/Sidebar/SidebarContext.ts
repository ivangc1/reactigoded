"use client";

import { createContext, useContext } from "react";

export interface SidebarContextValue {
  /** Si la sidebar está colapsada (modo "rail" sólo iconos). */
  collapsed: boolean;
  /** Cambia el estado y dispara `onCollapsedChange`. */
  setCollapsed: (next: boolean) => void;
  /**
   * Id del `<aside>` (útil para que `<SidebarToggle>` referencie su
   * panel via `aria-controls`). Si el consumer pasó `id` al
   * `<Sidebar>`, ese id se respeta; si no, viene de `useId()`.
   */
  asideId: string;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

/**
 * Hook **interno** consumido por sub-componentes del DS (`SidebarToggle`,
 * `SidebarItem` para auto-derivar `aria-label` cuando text se oculta en
 * estado colapsado). NO está re-exportado en el barrel público de Sidebar
 * — el bundle del DS no lo expone (`B-04 RC1` retiro confirmado, D4 RC1
 * gate review).
 *
 * Si necesitas persist state en localStorage o sincronizar con router,
 * usa **controlled mode external** desde tu app — pasa `collapsed` +
 * `onCollapsedChange` a `<Sidebar>` desde un `useState` que tú manejes.
 * Ver README sección "Persisting Sidebar state" para el patrón completo
 * con guard SSR-safe en el initializer del useState (necesario porque
 * `localStorage` no existe en server-render).
 *
 * @throws Error si se usa fuera de `<Sidebar>` desde un sub-componente.
 *   Esto es regla DS-wide D11.4: hooks que requieren ancestor lanzan
 *   (consistent con `useMenu`, `useTabs`, `useAccordion`, `useDialog`).
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
