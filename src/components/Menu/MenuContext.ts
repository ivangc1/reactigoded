import { createContext, useContext, type RefObject } from "react";

export interface MenuContextValue {
  /** Si el menú está visible. */
  open: boolean;
  /** Cambia visibilidad y dispara `onOpenChange`. */
  setOpen: (next: boolean) => void;
  /** ID del trigger (para `aria-labelledby` del menu). */
  triggerId: string;
  /** ID del menu (para `aria-controls` del trigger). */
  menuId: string;
  /** Ref al elemento trigger — usado para devolverle foco al cerrar. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** Ref al contenedor del menu — usado para foco inicial al abrir con teclado. */
  menuRef: RefObject<HTMLDivElement | null>;
  /** Si los items deben cerrar el menu al activarse. */
  closeOnSelect: boolean;
}

export const MenuContext = createContext<MenuContextValue | null>(null);

/**
 * Hook que expone el contexto de un `<Menu>` (open, setOpen, ids para
 * `aria-controls`/`aria-labelledby`, refs al trigger/menu, closeOnSelect).
 * Lo usan internamente `MenuTrigger`, `MenuContent` y `MenuItem`.
 * También útil si construyes tu propio item custom o quieres cerrar el
 * dropdown desde código en respuesta a algún evento externo.
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
