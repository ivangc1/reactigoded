import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * AvatarGroup — agrupa varios `Avatar` solapados (típico para listar miembros).
 *
 * Coloca avatares directamente como children; el CSS los solapa via offset
 * negativo.
  *
 * @server-safe
 */
export function AvatarGroup({
  className,
  children,
  ref,
  ...rest
}: AvatarGroupProps) {
  return (
    <div ref={ref} className={cn("ig-avatar-group", className)} {...rest}>
      {children}
    </div>
  );
}
