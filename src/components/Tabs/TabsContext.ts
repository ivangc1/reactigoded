"use client";

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
   * Registra un TabsTrigger al montarse. Devuelve un cleanup que lo desregistra.
   * Si el Tabs no recibió `value`/`defaultValue`, usa el primer TabsTrigger
   * registrado como selección inicial. Permite que el consumer omita
   * `defaultValue` sin dejar el tablist sin tab stop accesible.
   */
  register: (value: string) => () => void;
  /**
   * H-26: `true` si `selected` matchea el `value` de algún TabsTrigger montado.
   * En modo controlled con `value` inválido, este flag es `false` y
   * el primer TabsTrigger registrado entra en modo "fallback tabindex" para
   * NO dejar el tablist sin tab stop accesible.
   */
  selectedExists: boolean;
  /**
   * H-26: `value` del primer TabsTrigger registrado. Sirve como fallback de
   * tab stop cuando `selectedExists === false`.
   */
  firstRegistered: string | undefined;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

/**
 * Hook que expone el contexto de un `<Tabs>` (selected, setSelected,
 * orientation, baseId, register). Lo usan internamente `TabsTrigger`, `TabsList` y
 * `TabsContent`. Útil también si construyes tu propio sub-componente que
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
 *       <TabsList aria-label="Cuenta">
 *         <TabsTrigger value="perfil">Perfil</TabsTrigger>
 *         <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
 *       </TabsList>
 *       <CurrentTabBadge />
 *       <TabsContent value="perfil">…</TabsContent>
 *       <TabsContent value="seguridad">…</TabsContent>
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
      "Componentes TabsTrigger/TabsContent/TabsList deben usarse dentro de <Tabs>",
    );
  }
  return ctx;
}
