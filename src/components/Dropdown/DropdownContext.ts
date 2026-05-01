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

export function useDropdown(): DropdownContextValue {
  const ctx = useContext(DropdownContext);
  if (!ctx) {
    throw new Error(
      "Componentes DropdownTrigger/DropdownMenu/DropdownItem deben usarse dentro de <Dropdown>",
    );
  }
  return ctx;
}
