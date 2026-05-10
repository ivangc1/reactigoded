import { createContext, useContext, type RefObject } from "react";

export interface OptionsMenuContextValue {
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

export const OptionsMenuContext = createContext<OptionsMenuContextValue | null>(null);

/**
 * Hook que expone el contexto de un `<OptionsMenu>` (open, setOpen, ids para
 * `aria-controls`/`aria-labelledby`, refs al trigger/menu, closeOnSelect).
 * Lo usan internamente `OptionsMenuTrigger`, `OptionsMenuContent` y `OptionsMenuItem`.
 * También útil si construyes tu propio item custom o quieres cerrar el
 * dropdown desde código en respuesta a algún evento externo.
 *
 * @example
 * function CustomItem() {
 *   const { setOpen } = useOptionsMenu();
 *   const router = useRouter();
 *   return (
 *     <OptionsMenuItem onClick={() => { router.push("/perfil"); setOpen(false); }}>
 *       Ir a perfil
 *     </OptionsMenuItem>
 *   );
 * }
 *
 * @throws Error si se usa fuera de `<OptionsMenu>`.
 */
export function useOptionsMenu(): OptionsMenuContextValue {
  const ctx = useContext(OptionsMenuContext);
  if (!ctx) {
    throw new Error(
      "Componentes OptionsMenuTrigger/OptionsMenuContent/OptionsMenuItem deben usarse dentro de <OptionsMenu>",
    );
  }
  return ctx;
}
