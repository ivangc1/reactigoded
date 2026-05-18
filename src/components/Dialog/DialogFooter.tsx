import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** DialogFooter — pie del modal con acciones alineadas a la derecha.  *
 * @server-safe
 */
export function DialogFooter({
  className,
  children,
  ref,
  ...rest
}: DialogFooterProps) {
  return (
    <div ref={ref} className={cn("ig-dialog-footer", className)} {...rest}>
      {children}
    </div>
  );
}
