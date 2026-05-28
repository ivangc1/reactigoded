import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface DialogBodyProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined;
}

/** DialogBody — cuerpo scrollable del modal.  *
 * @server-safe
 */
export function DialogBody({
  className,
  children,
  ref,
  ...rest
}: DialogBodyProps) {
  return (
    <div ref={ref} className={cn("ig-dialog-body", className)} {...rest}>
      {children}
    </div>
  );
}
