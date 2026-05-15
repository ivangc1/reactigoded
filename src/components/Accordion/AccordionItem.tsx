"use client";

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";
import {
  AccordionItemContext,
  useAccordion,
} from "./AccordionContext";

export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Identificador único del item dentro del Accordion. */
  value: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * AccordionItem — sección colapsable. Provee context con `value`/`open` y
 * los IDs de header/content a los componentes anidados.
 */
export function AccordionItem({
  value,
  className,
  children,
  ref,
  ...rest
}: AccordionItemProps) {
  const { isOpen, toggle, baseId } = useAccordion();
  const open = isOpen(value);

  const ctx = useMemo(
    () => ({
      value,
      open,
      toggle: () => { toggle(value); },
      headerId: `${baseId}-${value}-header`,
      contentId: `${baseId}-${value}-content`,
    }),
    [value, open, toggle, baseId],
  );

  return (
    <AccordionItemContext.Provider value={ctx}>
      <div
        ref={ref}
        className={cn(
          "ig-accordion-item",
          open && "ig-accordion-item-open",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}
