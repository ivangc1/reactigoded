"use client";

import { type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";
import { useAccordionItem } from "./AccordionContext";

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Si `true`, mantiene el panel montado en el DOM aunque esté cerrado
   * (útil para preservar estado o accesibilidad asistida).
   * Por defecto el panel se desmonta cuando está cerrado.
   */
  forceMount?: boolean | undefined;
  ref?: Ref<HTMLDivElement> | undefined;
}

/**
 * AccordionContent — panel desplegable asociado a un AccordionItem.
 * Tiene `role="region"` y `aria-labelledby` apuntando al header.
 */
export function AccordionContent({
  className,
  children,
  forceMount = false,
  hidden,
  ref,
  ...rest
}: AccordionContentProps) {
  const { open, headerId, contentId } = useAccordionItem();

  if (!open && !forceMount) return null;

  return (
    <div
      {...rest}
      ref={ref}
      id={contentId}
      role="region"
      aria-labelledby={headerId}
      className={cn("ig-accordion-content", className)}
      hidden={hidden ?? (!open && forceMount)}
    >
      {children}
    </div>
  );
}
