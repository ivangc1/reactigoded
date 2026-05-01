import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** ModalFooter — pie del modal con acciones alineadas a la derecha. */
export function ModalFooter({
  className,
  children,
  ref,
  ...rest
}: ModalFooterProps) {
  return (
    <div ref={ref} className={cn("ig-dialog-footer", className)} {...rest}>
      {children}
    </div>
  );
}
