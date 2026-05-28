import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined;
}

/** CardFooter — pie de una `Card`. Típicamente acciones o metadata.  *
 * @server-safe
 */
export function CardFooter({
  className,
  children,
  ref,
  ...rest
}: CardFooterProps) {
  return (
    <div ref={ref} className={cn("ig-card-footer", className)} {...rest}>
      {children}
    </div>
  );
}
