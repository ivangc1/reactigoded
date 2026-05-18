import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface HelperProps extends HTMLAttributes<HTMLParagraphElement> {
  ref?: Ref<HTMLParagraphElement>;
}

/**
 * Helper — texto de ayuda discreto bajo un input. Usa `id` y `aria-describedby`
 * en el input para que los lectores de pantalla lo asocien.
  *
 * @server-safe
 */
export function Helper({ className, children, ref, ...rest }: HelperProps) {
  return (
    <p ref={ref} className={cn("ig-helper", className)} {...rest}>
      {children}
    </p>
  );
}
