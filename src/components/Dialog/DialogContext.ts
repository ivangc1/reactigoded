import { createContext, useContext } from "react";

export interface DialogContextValue {
  /** ID del DialogHeader registrado, para `aria-labelledby` del dialog. */
  headerId: string | null;
  /** Registra/limpia el id del header. Lo invoca DialogHeader al montar. */
  setHeaderId: (id: string | null) => void;
}

export const DialogContext = createContext<DialogContextValue | null>(null);

/**
 * Hook interno usado por subcomponentes del Dialog. Devuelve `null` cuando se
 * usa fuera de Dialog (los subcomponentes son tolerantes, no obligan a Dialog).
 */
export function useDialogContextOptional(): DialogContextValue | null {
  return useContext(DialogContext);
}
