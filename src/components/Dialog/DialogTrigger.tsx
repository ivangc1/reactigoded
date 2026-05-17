"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { useDialogContextRequired } from "./DialogContext";

export interface DialogTriggerProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * DialogTrigger — botón que abre el `DialogContent` asociado. Anuncia la
 * relación al SR via `aria-haspopup="dialog"` + `aria-controls={contentId}` +
 * `aria-expanded={open}` (estándar APG para disclosure de dialog).
 *
 * No tiene apariencia propia — es un `<button>` plano para que el consumer
 * componga con `<Button>` o cualquier otro disparador. Si necesitas un
 * disparador con estilos del DS, envuelve un `<Button>` o usa `asChild`-style
 * en futuras iteraciones (no en 1.0).
 *
 * Debe usarse dentro de `<Dialog>`.
 *
 * @example
 * <Dialog defaultOpen={false}>
 *   <DialogTrigger>
 *     <Button>Abrir modal</Button>
 *   </DialogTrigger>
 *   <DialogContent>...</DialogContent>
 * </Dialog>
 */
export function DialogTrigger({
  type = "button",
  onClick: consumerOnClick,
  children,
  ref,
  ...rest
}: DialogTriggerProps) {
  const { open, setOpen, contentId } = useDialogContextRequired();
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={contentId}
      onClick={(e) => {
        // Codex P2 pattern (chain consumer handler primero): si el
        // consumer hace preventDefault, no abrimos el dialog.
        consumerOnClick?.(e);
        if (e.defaultPrevented) return;
        setOpen(true);
      }}
    >
      {children}
    </button>
  );
}
