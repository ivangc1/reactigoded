import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface ModalCloseProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * ModalClose — botón "×" para cerrar el modal. Renderiza un `×` por defecto
 * y aplica `aria-label="Cerrar"` automáticamente; ambos pueden sobrescribirse.
 */
export function ModalClose({
  className,
  children,
  type = "button",
  "aria-label": ariaLabel = "Cerrar",
  ref,
  ...rest
}: ModalCloseProps) {
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
