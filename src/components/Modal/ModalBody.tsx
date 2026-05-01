import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** ModalBody — cuerpo scrollable del modal. */
export function ModalBody({
  className,
  children,
  ref,
  ...rest
}: ModalBodyProps) {
  return (
    <div ref={ref} className={cn("ig-dialog-body", className)} {...rest}>
      {children}
    </div>
  );
}
