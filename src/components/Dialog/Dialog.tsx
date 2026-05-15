"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DialogHTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { DialogContext, type DialogContextValue } from "./DialogContext";

export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";
export type DialogBackdrop = "default" | "blur" | "dark" | "light" | "none";

export interface DialogProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open"> {
  /** Estado controlado: si está abierto. */
  open: boolean;
  /**
   * Callback cuando el modal cambia de estado (cierra o abre). Recibe el
   * nuevo valor de `open` como argumento. Patrón canónico estandarizado
   * en B-02 con el resto del DS.
   *
   * En 1.0.0-rc.1 solo dispara con `open=false` (eventos `cancel`/`close`
   * del `<dialog>`). El consumer es quien controla `open=true` desde
   * fuera. Si en el futuro Dialog añade triggers internos para abrirse,
   * `onOpenChange` también disparará con `true` (additive sin breaking).
   */
  onOpenChange?: (open: boolean) => void;
  /** @deprecated B-02: usa `onOpenChange`. Eliminado en 2.0. */
  onClose?: () => void;
  /** Tamaño del modal. Por defecto `"md"`. */
  size?: DialogSize;
  /** Estilo del backdrop. Por defecto `"default"`. */
  backdrop?: DialogBackdrop;
  /** Cerrar al hacer click fuera del contenido. Por defecto `true`. */
  closeOnBackdrop?: boolean;
  /** Permitir cerrar con la tecla ESC. Por defecto `true`. */
  closeOnEsc?: boolean;
  /** Estado de carga (aplica `ig-dialog-loading`). */
  loading?: boolean;
  ref?: Ref<HTMLDialogElement>;
}

/**
 * Dialog — diálogo modal sobre `<dialog>` HTML nativo.
 *
 * Aprovecha la accesibilidad nativa: focus trap, restauración de foco al
 * cerrar, top-layer (sale por encima de cualquier z-index/overflow ancestro),
 * `role="dialog"` + `aria-modal` automáticos.
 *
 * Compón con `DialogHeader`, `DialogBody`, `DialogFooter`, `DialogClose`.
 *
 * @example
 * <Dialog open={open} onClose={() => setOpen(false)} size="md">
 *   <DialogHeader>Confirmar <DialogClose onClick={() => setOpen(false)} /></DialogHeader>
 *   <DialogBody>¿Seguro?</DialogBody>
 *   <DialogFooter>
 *     <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
 *     <Button>Aceptar</Button>
 *   </DialogFooter>
 * </Dialog>
 */
export function Dialog({
  open,
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Dialog acepta el alias deprecated por backwards compat (warn dev al consumer abajo).
  onClose,
  onOpenChange,
  size = "md",
  backdrop = "default",
  closeOnBackdrop = true,
  closeOnEsc = true,
  loading = false,
  className,
  children,
  ref,
  // Codex P2 sobre PR #72: extraer handlers que el consumer pueda
  // pasar via DialogHTMLAttributes para chainearlos en nuestros
  // wrappers en lugar de shadowear silenciosamente.
  onPointerDown: consumerOnPointerDown,
  onClick: consumerOnClick,
  ...rest
}: DialogProps) {
  const innerRef = useRef<HTMLDialogElement>(null);
  const [headerId, setHeaderId] = useState<string | null>(null);

  // H-02 (RC1 gate review): drag-out parity tracking. Sin este ref,
  // un mousedown dentro del contenido + mouseup sobre el backdrop
  // disparaba un `click` event con `target === currentTarget` (el
  // <dialog>) — el handler de backdrop lo interpretaba como click
  // legítimo en backdrop y cerraba el modal, abandonando la selección
  // del usuario. Fix: registrar el target del pointerdown; solo
  // considerar backdrop click si AMBOS pointerdown y click tienen
  // target=dialog (no si pointerdown empezó en contenido).
  //
  // Edge case conocido (no cubierto): si el usuario empieza un drag
  // dentro del contenido y suelta COMPLETAMENTE fuera del <dialog>
  // (pointerup en document.body o similar), el handler nunca recibe
  // el pointerup — eventos no propagan de padre a hijo. El ref queda
  // stale hasta el siguiente pointerdown sobre el dialog. En navegador
  // real esto no causa bug visible porque ningún `click` posterior
  // se disparará sin un nuevo pointerdown que reescribe el ref. Sí
  // afecta a tests que llaman `fireEvent.click(dialog)` sin pointerdown
  // previo — para ese caso, el fallback null abajo evita falso bloqueo.
  const pointerdownTargetRef = useRef<EventTarget | null>(null);

  // B-02 (RC1): dev-warn cuando se usa el alias deprecated `onClose`.
  // Eliminar en 2.0. Una vez por instancia.
  const warnedOnCloseRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (warnedOnCloseRef.current) return;
    if (onClose !== undefined && onOpenChange === undefined) {
      warnedOnCloseRef.current = true;
      console.warn(
        "[reactigoded] <Dialog onClose>: prop deprecated en 1.0.0-rc.1. " +
          "Usa onOpenChange={(open) => ...} para alinear con el resto " +
          "del DS (B-02). onClose seguirá funcionando en 1.x; eliminado " +
          "en 2.0.",
      );
    }
  }, [onClose, onOpenChange]);

  // Trigger ambos callbacks en el cierre. onClose si está; onOpenChange
  // siempre que esté. Consumer típicamente migra usando solo el nuevo.
  const fireClose = useCallback(() => {
    onClose?.();
    onOpenChange?.(false);
  }, [onClose, onOpenChange]);
  // Flag para distinguir cierres programáticos (consumer cambió `open` a
  // false) de cierres user-driven (ESC, click fuera, .close() manual).
  // Sin esto, dialog.close() en el effect dispara el evento `close` del
  // <dialog> y eso llamaba a onClose otra vez aunque el consumer ya hubiera
  // sincronizado el estado. Desde 1.0.0-beta.3 evitamos el doble disparo.
  const closingFromSyncRef = useRef(false);

  const setHeaderIdStable = useCallback((id: string | null) => {
    setHeaderId(id);
  }, []);

  const ctx = useMemo<DialogContextValue>(
    () => ({ headerId, setHeaderId: setHeaderIdStable }),
    [headerId, setHeaderIdStable],
  );

  // Sincroniza prop `open` con el estado nativo del <dialog>.
  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      // Marca antes de close() para que el handler `onClose` del <dialog>
      // sepa que el cierre ya viene "consumido" por la prop.
      closingFromSyncRef.current = true;
      dialog.close();
    }
    // Cleanup: corre en CADA cambio de `open` (deps) Y al desmontar.
    // Reseteamos el flag para que la siguiente apertura/cierre arranque
    // limpia. Caso típico: open=false→true→false rápido — el primer
    // cierre marcó closingFromSyncRef y el segundo open no debe
    // heredarlo. Bonus: cubre también unmount mid-animación.
    return () => {
      closingFromSyncRef.current = false;
    };
  }, [open]);

  // Bloquear ESC si closeOnEsc=false (el evento `cancel` precede al cierre).
  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog || closeOnEsc) return;
    const onCancel = (e: Event) => { e.preventDefault(); };
    dialog.addEventListener("cancel", onCancel);
    return () => { dialog.removeEventListener("cancel", onCancel); };
  }, [closeOnEsc]);

  const handleRef = (node: HTMLDialogElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLDialogElement | null }).current = node;
  };

  const backdropClass =
    backdrop === "default"
      ? undefined
      : backdrop === "none"
        ? "ig-dialog-no-backdrop"
        : `ig-dialog-backdrop-${backdrop}`;

  const ariaLabelledByFromConsumer = rest["aria-labelledby"];

  return (
    <DialogContext.Provider value={ctx}>
      {/* `<dialog>` es interactivo nativo; el onClick detecta clicks en el
          backdrop (target === currentTarget). jsx-a11y no lo entiende. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        {...rest}
        ref={handleRef}
        className={cn(
          "ig-dialog",
          size !== "md" && `ig-dialog-${size}`,
          backdropClass,
          loading && "ig-dialog-loading",
          className,
        )}
        aria-labelledby={ariaLabelledByFromConsumer ?? headerId ?? undefined}
        aria-busy={loading || undefined}
        onClose={() => {
          // Si el cierre viene de sincronización con `open=false`, no
          // dispares onClose otra vez — el consumer ya sabe.
          if (closingFromSyncRef.current) {
            closingFromSyncRef.current = false;
            return;
          }
          fireClose();
        }}
        onPointerDown={(e) => {
          // Codex P2 sobre PR #72: chain consumer handler primero —
          // permite que el consumer haga preventDefault si quiere
          // bloquear el tracking de drag (raro, pero respeta su API).
          consumerOnPointerDown?.(e);
          pointerdownTargetRef.current = e.target;
        }}
        onClick={(e) => {
          // Chain consumer handler primero (mismo motivo que pointerdown).
          consumerOnClick?.(e);
          const pointerdownTarget = pointerdownTargetRef.current;
          // Reset para el siguiente interacción independientemente
          // de si cerramos o no.
          pointerdownTargetRef.current = null;
          // Si el consumer canceló el evento, no cerramos.
          if (e.defaultPrevented) return;
          if (!closeOnBackdrop) return;
          // H-02: cerrar SOLO si el pointerdown empezó en el backdrop
          // (target=dialog) o nunca se registró (click programático
          // del consumer, p.ej. test que dispara fireEvent.click sin
          // pointerdown previo). Distingue:
          //   - Click legítimo en backdrop: pointerdown=dialog, click=dialog → cierra.
          //   - Drag-out (selección): pointerdown=contenido, click=dialog → NO cierra.
          //   - Click programático: pointerdownTarget=null, click=dialog → cierra
          //     (preserva el behavior anterior; el consumer sabe lo que hace).
          if (
            e.target === e.currentTarget &&
            (pointerdownTarget === null ||
              pointerdownTarget === e.currentTarget)
          ) {
            fireClose();
          }
        }}
      >
        {children}
      </dialog>
    </DialogContext.Provider>
  );
}
