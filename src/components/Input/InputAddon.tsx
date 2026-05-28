import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface InputAddonProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement> | undefined;
}

/** InputAddon — prefijo/sufijo decorativo dentro de un `InputGroup`.  *
 * @server-safe
 */
export function InputAddon({
  className,
  children,
  ref,
  ...rest
}: InputAddonProps) {
  return (
    <span ref={ref} className={cn("ig-input-addon", className)} {...rest}>
      {children}
    </span>
  );
}
