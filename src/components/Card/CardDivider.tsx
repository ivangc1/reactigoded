import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface CardDividerProps extends HTMLAttributes<HTMLHRElement> {
  ref?: Ref<HTMLHRElement>;
}

/** CardDivider — separador horizontal entre secciones de una `Card`. */
export function CardDivider({ className, ref, ...rest }: CardDividerProps) {
  return (
    <hr ref={ref} className={cn("ig-card-divider", className)} {...rest} />
  );
}
