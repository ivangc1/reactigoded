"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SUPPRESS_NO_HANDLER_WARN,
  useControllableState,
  type SetValueOptions,
} from "@/hooks/useControllableState";
import { DialogContext, type DialogContextValue } from "./DialogContext";

export interface DialogProps {
  /**
   * Estado abierto/cerrado en **modo controlled**. Tu app gestiona el
   * estado y debe actualizarlo en respuesta a `onOpenChange`.
   *
   * **D6 (beta.24)**: `open` ahora es opcional. Patrón controlled/
   * uncontrolled DS-wide:
   *
   *   - Pasas `open` → controlled.
   *   - Omites `open` (y opcionalmente pasas `defaultOpen`) → uncontrolled.
   *     El Dialog gestiona su estado interno; `DialogTrigger` y `DialogClose`
   *     llaman al setter del provider sin necesidad de useState externo.
   */
  open?: boolean | undefined;
  /**
   * Valor inicial en **modo uncontrolled** (cuando `open` es undefined).
   * Por defecto `false` (cerrado). Ignorado en modo controlled.
   */
  defaultOpen?: boolean | undefined;
  /**
   * Callback cuando el estado cambia. Dispara en ambos modos:
   * - Controlled: único mecanismo para que el consumer actualice `open`.
   * - Uncontrolled: actúa como observer.
   */
  onOpenChange?: ((open: boolean) => void) | undefined;
  /**
   * @deprecated B-02: usa `onOpenChange`. Eliminado en 2.0. Solo dispara
   * con `open=false` (cierres). Para apertura programática usa el state
   * del Dialog (`<DialogTrigger>` en uncontrolled, o `open` prop en
   * controlled).
   */
  onClose?: (() => void) | undefined;
  children: ReactNode;
}

/**
 * Dialog — Provider para el patrón compound canónico (D6 beta.24).
 *
 * Renderiza solo un contexto; no produce DOM por sí mismo. El modal real
 * vive en `<DialogContent>` (el `<dialog>` HTML nativo) y opcionalmente
 * un `<DialogTrigger>` para abrir desde la UI.
 *
 * Pre-D6 `Dialog` era el `<dialog>` mismo. Migración mecánica: envolver
 * los children actuales en `<DialogContent>`:
 *
 * ```diff
 * - <Dialog open={x} onOpenChange={fn}>
 * -   <DialogHeader />
 * -   <DialogBody>...</DialogBody>
 * - </Dialog>
 * + <Dialog open={x} onOpenChange={fn}>
 * +   <DialogContent>
 * +     <DialogHeader />
 * +     <DialogBody>...</DialogBody>
 * +   </DialogContent>
 * + </Dialog>
 * ```
 *
 * @example
 * // Uncontrolled (nuevo en D6):
 * <Dialog defaultOpen={false}>
 *   <DialogTrigger>Abrir</DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>Confirmar <DialogClose /></DialogHeader>
 *     <DialogBody>¿Seguro?</DialogBody>
 *     <DialogFooter><Button>Aceptar</Button></DialogFooter>
 *   </DialogContent>
 * </Dialog>
 *
 * @example
 * // Controlled (backward-compat con la API pre-D6 + DialogContent):
 * const [open, setOpen] = useState(false);
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <DialogContent>
 *     <DialogHeader>Confirmar <DialogClose /></DialogHeader>
 *     ...
 *   </DialogContent>
 * </Dialog>
 */
export function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Dialog acepta el alias deprecated por backwards compat (warn dev al consumer abajo).
  onClose,
  children,
}: DialogProps) {
  const isControlled = open !== undefined;
  // En controlled SIN callback el Dialog queda "presentational" para
  // setOpen (el state no puede cambiar a través de Trigger/Close
  // porque setValue solo dispararía onOpenChange que no existe → UI
  // bloqueada). Suprimimos el warn de useControllableState porque
  // es legítimo: el consumer puede tener un Dialog estático
  // (siempre abierto, p.ej. demo). Patrón D5 Stepper.
  const isPresentationalControlled =
    isControlled && onOpenChange === undefined && onClose === undefined;
  const { value: openValue, setValue: setOpenValue } =
    useControllableState<boolean>({
      value: open,
      defaultValue: defaultOpen ?? false,
      onChange: onOpenChange,
      [SUPPRESS_NO_HANDLER_WARN]: isPresentationalControlled,
    });

  // B-02 (RC1): dev-warn cuando se usa el alias deprecated `onClose`.
  // Eliminar en 2.0. Una vez por instancia.
  const warnedOnCloseRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (warnedOnCloseRef.current) return;
    if (onClose !== undefined && onOpenChange === undefined) {
      warnedOnCloseRef.current = true;
      console.warn(
        "[reactigoded] <Dialog onClose>: prop deprecated. " +
          "Usa onOpenChange={(open) => ...} para alinear con el resto " +
          "del DS (B-02). onClose seguirá funcionando en 1.x; eliminado " +
          "en 2.0.",
      );
    }
  }, [onClose, onOpenChange]);

  // Wrapper que también dispara el callback deprecated `onClose` en
  // cierres. Backward-compat para consumers que aún no migraron a
  // onOpenChange. Honra el flag silent del hook para sync prop-driven.
  const setOpen = useCallback(
    (next: boolean, options?: SetValueOptions) => {
      setOpenValue(next, options);
      if (!options?.silent && !next) {
        onClose?.();
      }
    },
    [setOpenValue, onClose],
  );

  const contentId = useId();
  const [headerId, setHeaderId] = useState<string | null>(null);
  const setHeaderIdStable = useCallback((id: string | null) => {
    setHeaderId(id);
  }, []);

  const ctx = useMemo<DialogContextValue>(
    () => ({
      open: openValue,
      setOpen,
      contentId,
      headerId,
      setHeaderId: setHeaderIdStable,
    }),
    [openValue, setOpen, contentId, headerId, setHeaderIdStable],
  );

  return <DialogContext.Provider value={ctx}>{children}</DialogContext.Provider>;
}
