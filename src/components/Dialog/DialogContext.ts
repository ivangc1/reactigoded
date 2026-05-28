"use client";

import { createContext, useContext } from "react";
import type { SetValueOptions } from "@/hooks/useControllableState";

/**
 * Valor del Dialog context. Compartido entre `Dialog` (provider) y todos
 * los subcomponentes (`DialogContent`, `DialogTrigger`, `DialogHeader`,
 * `DialogClose`, `AlertDialogClose`).
 *
 * **NO exportado al consumer**: el barrel `Dialog/index.ts` y el root
 * `src/index.ts` lo omiten deliberadamente. El context es detalle de
 * implementación — el consumer no necesita acoplarse a la forma exacta
 * del valor para usar `<Dialog>` y sus subcomponentes.
 *
 * @internal Beta.27 (#162): marcado `@internal` junto con el resto del
 *   módulo para que `stripInternal: true` borre el `.d.ts` publicado
 *   completo y el consumer no pueda hacer deep-import de tipos vía
 *   `node_modules/reactigoded/dist/components/Dialog/DialogContext.d.ts`.
 *   El `.js` runtime sigue intacto porque `stripInternal` solo afecta
 *   al `.d.ts` emitido.
 */
export interface DialogContextValue {
  /** Estado abierto/cerrado del Dialog. */
  open: boolean;
  /**
   * Actualiza el estado de apertura. En modo uncontrolled actualiza el
   * state interno; en controlled dispara `onOpenChange`. Acepta `options.silent`
   * para sincronizaciones prop-driven que no son interacción del usuario
   * (D5 pattern, ver Stepper.tsx).
   */
  setOpen: (open: boolean, options?: SetValueOptions) => void;
  /**
   * ID del `<dialog>` (DialogContent), usado por `DialogTrigger` como
   * `aria-controls` y por `aria-haspopup="dialog"` para anunciar la
   * relación al SR. Estable durante la vida del Dialog provider.
   */
  contentId: string;
  /** ID del DialogHeader registrado, para `aria-labelledby` del dialog. */
  headerId: string | null;
  /** Registra/limpia el id del header. Lo invoca DialogHeader al montar. */
  setHeaderId: (id: string | null) => void;
}

/**
 * React Context que comparte `DialogContextValue` entre `Dialog` y sus
 * subcomponentes. Detalle de implementación, no API pública.
 *
 * @internal Ver `DialogContextValue` para la justificación del marker.
 */
export const DialogContext = createContext<DialogContextValue | null>(null);

/**
 * Hook interno usado por subcomponentes del Dialog. Devuelve `null` cuando se
 * usa fuera de Dialog (los subcomponentes son tolerantes, no obligan a Dialog).
 *
 * @internal Ver `DialogContextValue` para la justificación del marker.
 */
export function useDialogContextOptional(): DialogContextValue | null {
  return useContext(DialogContext);
}

/**
 * Hook que requiere el Provider — usado por DialogContent y DialogTrigger
 * que no tienen sentido fuera de `<Dialog>`. Lanza error si se usa fuera.
 *
 * @internal
 */
export function useDialogContextRequired(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error(
      "DialogContent / DialogTrigger deben usarse dentro de <Dialog>",
    );
  }
  return ctx;
}
