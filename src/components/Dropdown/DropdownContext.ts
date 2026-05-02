import { createContext, useContext, type RefObject } from "react";

export interface DropdownContextValue {
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

export const DropdownContext = createContext<DropdownContextValue | null>(null);

/**
 * Hook que expone el contexto de un `<Dropdown>` (open, setOpen, ids para
 * `aria-controls`/`aria-labelledby`, refs al trigger/menu, closeOnSelect).
 * Lo usan internamente `DropdownTrigger`, `DropdownMenu` y `DropdownItem`.
 * También útil si construyes tu propio item custom o quieres cerrar el
 * dropdown desde código en respuesta a algún evento externo.
 *
 * @example
 * function CustomItem() {
 *   const { setOpen } = useDropdown();
 *   const router = useRouter();
 *   return (
 *     <DropdownItem onClick={() => { router.push("/perfil"); setOpen(false); }}>
 *       Ir a perfil
 *     </DropdownItem>
 *   );
 * }
 *
 * @throws Error si se usa fuera de `<Dropdown>`.
 */
export function useDropdown(): DropdownContextValue {
  const ctx = useContext(DropdownContext);
  if (!ctx) {
    throw new Error(
      "Componentes DropdownTrigger/DropdownMenu/DropdownItem deben usarse dentro de <Dropdown>",
    );
  }
  return ctx;
}
