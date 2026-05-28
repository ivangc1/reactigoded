import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface InputGroupProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined;
}

/**
 * InputGroup — agrupa un input con `InputAddon`s (prefijo/sufijo).
 *
 * @example
 * <InputGroup>
 *   <InputAddon>$</InputAddon>
 *   <Input type="number" />
 *   <InputAddon>USD</InputAddon>
 * </InputGroup>
  *
 * @server-safe
 */
export function InputGroup({
  className,
  children,
  ref,
  ...rest
}: InputGroupProps) {
  return (
    <div ref={ref} className={cn("ig-input-group", className)} {...rest}>
      {children}
    </div>
  );
}
