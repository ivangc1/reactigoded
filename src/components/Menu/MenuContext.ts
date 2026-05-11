import { createContext, useContext, type RefObject } from "react";
import type {
  FloatingContext,
  useFloating,
  useInteractions,
} from "@floating-ui/react";

export interface MenuContextValue {
  /** Si el menú está visible. */
  open: boolean;
  /** Cambia visibilidad y dispara `onOpenChange`. */
  setOpen: (next: boolean) => void;
  /** ID del trigger (para `aria-labelledby` del menu). */
  triggerId: string;
  /** ID del menu (para `aria-controls` del trigger). */
  menuId: string;
  /** Si los items deben cerrar el menu al activarse. */
  closeOnSelect: boolean;
  /**
   * Helpers de @floating-ui/react para inyectar handlers/refs/aria.
   * `MenuTrigger`, `MenuContent` y `MenuItem` los consumen para
   * mergear listeners del consumer con los de FUI sin pisarlos.
   *
   * C-03 (RC1): migración a Floating UI internals sobre la capa
   * `floating/primitives/`. La API pública del Menu no cambia; este
   * shape de context sí es nuevo y se considera **interno** (no se
   * exporta desde el barrel del DS — B-04 confirmó).
   */
  getReferenceProps: ReturnType<typeof useInteractions>["getReferenceProps"];
  getFloatingProps: ReturnType<typeof useInteractions>["getFloatingProps"];
  getItemProps: ReturnType<typeof useInteractions>["getItemProps"];
  /** Refs de los items visibles, registrados por orden por `MenuItem`. */
  listRef: RefObject<Array<HTMLElement | null>>;
  /** Labels (texto plano) de los items para `useTypeahead`. */
  labelsRef: RefObject<Array<string | null>>;
  /** Index del item con focus virtual (roving). */
  activeIndex: number | null;
  /** Setter del index activo. */
  setActiveIndex: (index: number | null) => void;
  /** `setReference` para que `MenuTrigger` registre su elemento. */
  setReference: ReturnType<typeof useFloating>["refs"]["setReference"];
  /** `setFloating` para que `MenuContent` registre su elemento. */
  setFloating: ReturnType<typeof useFloating>["refs"]["setFloating"];
  /** Context FUI para `<FloatingFocusManager>` en MenuContent. */
  context: FloatingContext;
  /** nodeId para envolver el content en `<FloatingNode>` (cascade dismiss). */
  nodeId: string | undefined;
}

export const MenuContext = createContext<MenuContextValue | null>(null);

/**
 * Hook que expone el contexto de un `<Menu>` (open, setOpen, ids para
 * `aria-controls`/`aria-labelledby`, closeOnSelect, y los `getReferenceProps`/
 * `getFloatingProps`/`getItemProps` de Floating UI). Lo usan internamente
 * `MenuTrigger`, `MenuContent` y `MenuItem`.
 *
 * También útil si construyes tu propio item custom o quieres cerrar el
 * menu desde código en respuesta a algún evento externo.
 *
 * @example
 * function CustomItem() {
 *   const { setOpen } = useMenu();
 *   const router = useRouter();
 *   return (
 *     <MenuItem onClick={() => { router.push("/perfil"); setOpen(false); }}>
 *       Ir a perfil
 *     </MenuItem>
 *   );
 * }
 *
 * @throws Error si se usa fuera de `<Menu>`.
 */
export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error(
      "Componentes MenuTrigger/MenuContent/MenuItem deben usarse dentro de <Menu>",
    );
  }
  return ctx;
}
