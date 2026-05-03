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
import { ModalContext, type ModalContextValue } from "./ModalContext";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
export type ModalBackdrop = "default" | "blur" | "dark" | "light" | "none";

export interface ModalProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open"> {
  /** Estado controlado: si está abierto. */
  open: boolean;
  /** Se dispara cuando el dialog se cierra (ESC, backdrop, .close()). */
  onClose?: () => void;
  /** Tamaño del modal. Por defecto `"md"`. */
  size?: ModalSize;
  /** Estilo del backdrop. Por defecto `"default"`. */
  backdrop?: ModalBackdrop;
  /** Cerrar al hacer click fuera del contenido. Por defecto `true`. */
  closeOnBackdrop?: boolean;
  /** Permitir cerrar con la tecla ESC. Por defecto `true`. */
  closeOnEsc?: boolean;
  /** Estado de carga (aplica `ig-dialog-loading`). */
  loading?: boolean;
  ref?: Ref<HTMLDialogElement>;
}

/**
 * Modal — diálogo modal sobre `<dialog>` HTML nativo.
 *
 * Aprovecha la accesibilidad nativa: focus trap, restauración de foco al
 * cerrar, top-layer (sale por encima de cualquier z-index/overflow ancestro),
 * `role="dialog"` + `aria-modal` automáticos.
 *
 * Compón con `ModalHeader`, `ModalBody`, `ModalFooter`, `ModalClose`.
 *
 * @example
 * <Modal open={open} onClose={() => setOpen(false)} size="md">
 *   <ModalHeader>Confirmar <ModalClose onClick={() => setOpen(false)} /></ModalHeader>
 *   <ModalBody>¿Seguro?</ModalBody>
 *   <ModalFooter>
 *     <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
 *     <Button>Aceptar</Button>
 *   </ModalFooter>
 * </Modal>
 */
export function Modal({
  open,
  onClose,
  size = "md",
  backdrop = "default",
  closeOnBackdrop = true,
  closeOnEsc = true,
  loading = false,
  className,
  children,
  ref,
  ...rest
}: ModalProps) {
  const innerRef = useRef<HTMLDialogElement>(null);
  const [headerId, setHeaderId] = useState<string | null>(null);
  // Flag para distinguir cierres programáticos (consumer cambió `open` a
  // false) de cierres user-driven (ESC, click fuera, .close() manual).
  // Sin esto, dialog.close() en el effect dispara el evento `close` del
  // <dialog> y eso llamaba a onClose otra vez aunque el consumer ya hubiera
  // sincronizado el estado. Desde 1.0.0-beta.3 evitamos el doble disparo.
  const closingFromSyncRef = useRef(false);

  const setHeaderIdStable = useCallback((id: string | null) => {
    setHeaderId(id);
  }, []);

  const ctx = useMemo<ModalContextValue>(
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
    <ModalContext.Provider value={ctx}>
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
          onClose?.();
        }}
        onClick={(e) => {
          if (!closeOnBackdrop) return;
          // El click en el backdrop tiene como target el propio <dialog>,
          // no sus hijos (el contenido).
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        {children}
      </dialog>
    </ModalContext.Provider>
  );
}
