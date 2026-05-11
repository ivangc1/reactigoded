import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface DialogCloseProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * DialogClose — botón "×" para cerrar el modal. Renderiza un `×` por defecto
 * y aplica `aria-label="Cerrar"` automáticamente; ambos pueden sobrescribirse.
 */
export function DialogClose({
  className,
  children,
  type = "button",
  "aria-label": ariaLabel = "Cerrar",
  ref,
  ...rest
}: DialogCloseProps) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      className={cn("ig-dialog-close", className)}
    >
      {children ?? "×"}
    </button>
  );
}
