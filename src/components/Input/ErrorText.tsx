import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface ErrorTextProps extends HTMLAttributes<HTMLParagraphElement> {
  ref?: Ref<HTMLParagraphElement> | undefined;
}

/**
 * ErrorText — mensaje de error bajo un input. Usa `role="alert"` y
 * `aria-live="polite"` para anunciar el error a tecnologías asistivas.
 *
 * (Nombrado `ErrorText` en lugar de `Error` para evitar shadow del global.)
  *
 * @server-safe
 */
export function ErrorText({
  className,
  children,
  ref,
  ...rest
}: ErrorTextProps) {
  return (
    <p
      {...rest}
      ref={ref}
      role="alert"
      aria-live="polite"
      className={cn("ig-error", className)}
    >
      {children}
    </p>
  );
}
