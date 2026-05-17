"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { useDialogContextOptional } from "./DialogContext";

export interface DialogCloseProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * DialogClose — botón "×" para cerrar el modal. Renderiza un `×` por defecto
 * y aplica `aria-label="Cerrar"` automáticamente; ambos pueden sobrescribirse.
 *
 * **D6 (beta.24)**: si vive dentro de `<Dialog>` consume el contexto y
 * llama a `setOpen(false)` automáticamente — el consumer no necesita
 * conectar `onClick` para cerrar. Si pasa un `onClick` propio, se
 * chainea (consumer primero; si hace `preventDefault`, no cerramos).
 *
 * Tolerante a uso fuera de `<Dialog>`: si no hay contexto, el componente
 * sigue siendo un botón pero el click NO cierra nada (responsabilidad
 * del consumer via `onClick`).
 */
export function DialogClose({
  className,
  children,
  type = "button",
  "aria-label": ariaLabel = "Cerrar",
  onClick: consumerOnClick,
  ref,
  ...rest
}: DialogCloseProps) {
  const ctx = useDialogContextOptional();
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      className={cn("ig-dialog-close", className)}
      onClick={(e) => {
        // Chain consumer handler primero. Si el consumer hace
        // preventDefault, abortamos el cierre. Si no hay context
        // (Dialog provider ausente), nos limitamos a llamar al
        // consumer y dejar que él decida qué hacer.
        consumerOnClick?.(e);
        if (e.defaultPrevented) return;
        ctx?.setOpen(false);
      }}
    >
      {children ?? "×"}
    </button>
  );
}
