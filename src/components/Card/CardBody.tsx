import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/** CardBody — cuerpo principal de una `Card`. */
export function CardBody({
  className,
  children,
  ref,
  ...rest
}: CardBodyProps) {
  return (
    <div ref={ref} className={cn("ig-card-body", className)} {...rest}>
      {children}
    </div>
  );
}
