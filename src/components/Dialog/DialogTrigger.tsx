"use client";

import type { ButtonHTMLAttributes, MouseEvent, Ref } from "react";
import { Slot } from "@/components/Slot";
import { useDialogContextRequired } from "./DialogContext";

export interface DialogTriggerProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement> | undefined;
  /**
   * Slot pattern (D14): si `true`, clona el child del consumer y le aplica
   * trigger semantics (`aria-haspopup="dialog"`, `aria-expanded`,
   * `aria-controls={contentId}` + `onClick` que abre el dialog) sin
   * renderizar un `<button>` propio. Permite usar cualquier element como
   * trigger (`<Button>`, `<a>`, custom component) preservando su tipo,
   * styling y eventos.
   *
   * Sin `asChild`, DialogTrigger renderiza un `<button>` plano que envuelve
   * los children — comportamiento backwards-compat con 1.0.0-beta.26.
   *
   * @example
   * // Slot pattern (recomendado para Buttons del DS):
   * <DialogTrigger asChild>
   *   <Button variant="brand">Abrir modal</Button>
   * </DialogTrigger>
   *
   * @example
   * // Default (backwards-compat):
   * <DialogTrigger>Abrir</DialogTrigger>
   */
  asChild?: boolean | undefined;
}

/**
 * DialogTrigger — botón que abre el `DialogContent` asociado. Anuncia la
 * relación al SR via `aria-haspopup="dialog"` + `aria-controls={contentId}` +
 * `aria-expanded={open}` (estándar APG para disclosure de dialog).
 *
 * Dos modos de render:
 *
 * - **Default** (`asChild=false`): renderiza un `<button>` plano que envuelve
 *   los children. Comportamiento idéntico al de 1.0.0-beta.26.
 *
 * - **Slot pattern** (`asChild=true`, D14): clona el child del consumer y
 *   le aplica los aria props + onClick handler. El child es renderizado
 *   directamente (no wrapper). Patrón canónico Radix/shadcn.
 *
 * Debe usarse dentro de `<Dialog>`. Es client-component (`"use client"`)
 * porque consume el `DialogContext` via hook — NO marcado server-safe.
 */
export function DialogTrigger({
  asChild = false,
  type = "button",
  onClick: consumerOnClick,
  children,
  ref,
  ...rest
}: DialogTriggerProps) {
  const { open, setOpen, contentId } = useDialogContextRequired();

  const handleOpen = (e: MouseEvent<HTMLElement>) => {
    // Chain consumer handler primero (D14 §"Event chain order"). Si
    // hace preventDefault, abortamos la apertura.
    consumerOnClick?.(e as MouseEvent<HTMLButtonElement>);
    if (e.defaultPrevented) return;
    setOpen(true);
  };

  if (asChild) {
    // Slot path: el child del consumer recibe los aria + onClick via
    // composición. Forwardamos `type` al Slot (codex P2 round 1 sobre
    // #111) para que la safety semantics se preserve: si el child es
    // un native `<button>` sin type en un <form>, defaultearía a
    // `type="submit"` y podría disparar submit accidental al abrir el
    // dialog. El wrapper default `type="button"` viaja al Slot y se
    // aplica solo si el child no tiene type propio (Slot merge: child
    // wins on collision). Consumer puede override con
    // `<DialogTrigger asChild type="submit">` o poniendo `type="submit"`
    // en el child directamente.
    return (
      <Slot
        {...rest}
        ref={ref}
        type={type}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={handleOpen}
      >
        {children}
      </Slot>
    );
  }

  // Default render (backwards-compat).
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={contentId}
      onClick={handleOpen}
    >
      {children}
    </button>
  );
}
