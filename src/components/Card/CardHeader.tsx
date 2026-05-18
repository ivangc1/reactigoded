import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** CardHeader — cabecera de una `Card`. Suele contener título + acciones.  *
 * @server-safe
 */
export function CardHeader({
  className,
  children,
  ref,
  ...rest
}: CardHeaderProps) {
  return (
    <div ref={ref} className={cn("ig-card-header", className)} {...rest}>
      {children}
    </div>
  );
}
