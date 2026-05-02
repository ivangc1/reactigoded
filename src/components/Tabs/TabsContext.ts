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
  /**
   * Registra un Tab al montarse. Devuelve un cleanup que lo desregistra.
   * Si el Tabs no recibió `value`/`defaultValue`, usa el primer Tab
   * registrado como selección inicial. Permite que el consumer omita
   * `defaultValue` sin dejar el tablist sin tab stop accesible.
   */
  register: (value: string) => () => void;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

/**
 * Hook que expone el contexto de un `<Tabs>` (selected, setSelected,
 * orientation, baseId, register). Lo usan internamente `Tab`, `TabList` y
 * `TabPanel`. Útil también si construyes tu propio sub-componente que
 * vive dentro del árbol de un `<Tabs>` y necesita reaccionar al tab
 * seleccionado.
 *
 * @example
 * // Indicador "tab actual" custom:
 * function CurrentTabBadge() {
 *   const { selected } = useTabs();
 *   return <Badge variant="brand">{selected || "ninguno"}</Badge>;
 * }
 *
 * function App() {
 *   return (
 *     <Tabs defaultValue="perfil">
 *       <TabList ariaLabel="Cuenta">
 *         <Tab value="perfil">Perfil</Tab>
 *         <Tab value="seguridad">Seguridad</Tab>
 *       </TabList>
 *       <CurrentTabBadge />
 *       <TabPanel value="perfil">…</TabPanel>
 *       <TabPanel value="seguridad">…</TabPanel>
 *     </Tabs>
 *   );
 * }
 *
 * @throws Error si se usa fuera de `<Tabs>`.
 */
export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(
      "Componentes Tab/TabPanel/TabList deben usarse dentro de <Tabs>",
    );
  }
  return ctx;
}
