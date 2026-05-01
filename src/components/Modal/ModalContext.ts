import { createContext, useContext } from "react";

export interface ModalContextValue {
  /** ID del ModalHeader registrado, para `aria-labelledby` del dialog. */
  headerId: string | null;
  /** Registra/limpia el id del header. Lo invoca ModalHeader al montar. */
  setHeaderId: (id: string | null) => void;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

/**
 * Hook interno usado por subcomponentes del Modal. Devuelve `null` cuando se
 * usa fuera de Modal (los subcomponentes son tolerantes, no obligan a Modal).
 */
export function useModalContextOptional(): ModalContextValue | null {
  return useContext(ModalContext);
}
