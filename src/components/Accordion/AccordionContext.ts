"use client";

import { createContext, useContext } from "react";

export interface AccordionContextValue {
  /** Devuelve si el item con ese `value` está abierto. */
  isOpen: (value: string) => boolean;
  /** Alterna el item con ese `value` respetando el modo (single/multiple). */
  toggle: (value: string) => void;
  /** Prefijo único para generar `id` de header/content por item. */
  baseId: string;
}

export const AccordionContext = createContext<AccordionContextValue | null>(
  null,
);

/**
 * Hook que expone el contexto de un `<Accordion>` (isOpen, toggle, baseId).
 * Lo usan internamente `AccordionItem`, `AccordionHeader` y
 * `AccordionContent`. También útil para consumers que quieran inspeccionar
 * el estado del accordion (por ejemplo, mostrar "X de Y items abiertos").
 *
 * @example
 * function OpenCounter({ values }: { values: string[] }) {
 *   const { isOpen } = useAccordion();
 *   const openCount = values.filter(isOpen).length;
 *   return <span>{openCount}/{values.length} abiertos</span>;
 * }
 *
 * @throws Error si se usa fuera de `<Accordion>`.
 */
export function useAccordion(): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error(
      "Componentes AccordionItem/Header/Content deben usarse dentro de <Accordion>",
    );
  }
  return ctx;
}

export interface AccordionItemContextValue {
  /** Identificador único del item (para `aria-controls`/`aria-labelledby`). */
  value: string;
  /** Si el item está abierto. */
  open: boolean;
  /** Alterna el item. */
  toggle: () => void;
  /** ID del header. */
  headerId: string;
  /** ID del panel de contenido. */
  contentId: string;
}

export const AccordionItemContext =
  createContext<AccordionItemContextValue | null>(null);

/**
 * Hook que expone el contexto de un `<AccordionItem>` (value, open, toggle,
 * headerId, contentId). Lo usan internamente `AccordionHeader` y
 * `AccordionContent`. También útil si construyes tu propio Header custom
 * que necesita el estado open + el toggle.
 *
 * @example
 * function CustomHeader({ children }: { children: ReactNode }) {
 *   const { open, toggle, headerId, contentId } = useAccordionItem();
 *   return (
 *     <h3>
 *       <button id={headerId} aria-expanded={open} aria-controls={contentId} onClick={toggle}>
 *         {children} {open ? "▾" : "▸"}
 *       </button>
 *     </h3>
 *   );
 * }
 *
 * @throws Error si se usa fuera de `<AccordionItem>`.
 */
export function useAccordionItem(): AccordionItemContextValue {
  const ctx = useContext(AccordionItemContext);
  if (!ctx) {
    throw new Error(
      "AccordionHeader/AccordionContent deben usarse dentro de <AccordionItem>",
    );
  }
  return ctx;
}
