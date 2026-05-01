import { createContext, useContext } from "react";

export interface TabsContextValue {
  /** Id del tab seleccionado. */
  selected: string;
  /** Cambia el tab seleccionado. */
  setSelected: (value: string) => void;
  /** Prefijo único para generar IDs de tab/panel relacionados. */
  baseId: string;
  /** Orientación: condiciona el keyboard nav (←→ vs ↑↓). */
  orientation: "horizontal" | "vertical";
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(
      "Componentes Tab/TabPanel/TabList deben usarse dentro de <Tabs>",
    );
  }
  return ctx;
}
