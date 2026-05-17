"use client";

import {
  useEffect,
  useRef,
  type DialogHTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { useDialogContextRequired } from "./DialogContext";

export type DialogContentSize = "sm" | "md" | "lg" | "xl" | "full";
export type DialogContentBackdrop =
  | "default"
  | "blur"
  | "dark"
  | "light"
  | "none";

export interface DialogContentProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open" | "id"> {
  /** Tamaño del modal. Por defecto `"md"`. */
  size?: DialogContentSize;
  /** Estilo del backdrop. Por defecto `"default"`. */
  backdrop?: DialogContentBackdrop;
  /** Cerrar al hacer click fuera del contenido. Por defecto `true`. */
  closeOnBackdrop?: boolean;
  /** Permitir cerrar con la tecla ESC. Por defecto `true`. */
  closeOnEsc?: boolean;
  /** Estado de carga (aplica `ig-dialog-loading`). */
  loading?: boolean;
  ref?: Ref<HTMLDialogElement>;
}

/**
 * DialogContent — el `<dialog>` HTML nativo gestionado por el Provider
 * `Dialog`. Sale en top-layer (sobre cualquier z-index/overflow ancestro),
 * aplica `role="dialog"` + `aria-modal` automáticos del browser, y reusa
 * el focus trap + restauración nativos.
 *
 * Debe usarse dentro de `<Dialog>`. Si necesitas componer header / body /
 * footer, mete `<DialogHeader>` / `<DialogBody>` / `<DialogFooter>` como
 * children de este componente.
 *
 * @example
 * <Dialog defaultOpen>
 *   <DialogTrigger>Abrir</DialogTrigger>
 *   <DialogContent size="md">
 *     <DialogHeader>Título <DialogClose /></DialogHeader>
 *     <DialogBody>Contenido</DialogBody>
 *   </DialogContent>
 * </Dialog>
 */
export function DialogContent({
  size = "md",
  backdrop = "default",
  closeOnBackdrop = true,
  closeOnEsc = true,
  loading = false,
  className,
  children,
  ref,
  // Codex P2 sobre PR #72: extraer handlers que el consumer pueda
  // pasar para chainearlos en lugar de shadowear silenciosamente.
  onPointerDown: consumerOnPointerDown,
  onClick: consumerOnClick,
  ...rest
}: DialogContentProps) {
  const { open, setOpen, contentId, headerId } = useDialogContextRequired();
  const innerRef = useRef<HTMLDialogElement>(null);

  // H-02 (RC1 gate review): drag-out parity tracking. Sin este ref,
  // un mousedown dentro del contenido + mouseup sobre el backdrop
  // disparaba un `click` event con `target === currentTarget` (el
  // <dialog>) — el handler de backdrop lo interpretaba como click
  // legítimo en backdrop y cerraba el modal, abandonando la selección
  // del usuario. Fix: registrar el target del pointerdown; solo
  // considerar backdrop click si AMBOS pointerdown y click tienen
  // target=dialog (no si pointerdown empezó en contenido).
  const pointerdownTargetRef = useRef<EventTarget | null>(null);

  // Flag para distinguir cierres programáticos (state cambió a false
  // externamente) de cierres user-driven (ESC, click fuera, .close()
  // manual). Sin esto, dialog.close() en el effect dispara el evento
  // `close` del <dialog> y eso llamaba a setOpen otra vez aunque ya
  // estuviera en false. Patrón D5 silent: usamos setOpen(false,
  // { silent: true }) cuando viene del evento close del <dialog>
  // por sincronización con la prop — pero ESC/backdrop click sí
  // deben disparar onOpenChange (son user interaction).
  const closingFromSyncRef = useRef(false);

  // Sincroniza estado del Provider con el estado nativo del <dialog>.
  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      // Marca antes de close() para que el handler `onClose` del <dialog>
      // sepa que el cierre ya viene "consumido" por el state.
      closingFromSyncRef.current = true;
      dialog.close();
    }
    return () => {
      closingFromSyncRef.current = false;
    };
  }, [open]);

  // Bloquear ESC si closeOnEsc=false (el evento `cancel` precede al cierre).
  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog || closeOnEsc) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
    };
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
    // `<dialog>` es interactivo nativo; el onClick detecta clicks en el
    // backdrop (target === currentTarget). jsx-a11y no lo entiende.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions
    <dialog
      {...rest}
      ref={handleRef}
      id={contentId}
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
        // Si el cierre viene de sincronización con state externo, no
        // dispares setOpen otra vez — el state ya está en false.
        if (closingFromSyncRef.current) {
          closingFromSyncRef.current = false;
          return;
        }
        // Cierre user-driven (ESC, backdrop, .close() manual): notifica
        // al provider para que actualice el state interno o dispare
        // onOpenChange en controlled.
        setOpen(false);
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
        // (target=dialog) o nunca se registró (click programático).
        if (
          e.target === e.currentTarget &&
          (pointerdownTarget === null ||
            pointerdownTarget === e.currentTarget)
        ) {
          setOpen(false);
        }
      }}
    >
      {children}
    </dialog>
  );
}
