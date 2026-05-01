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

export function useAccordionItem(): AccordionItemContextValue {
  const ctx = useContext(AccordionItemContext);
  if (!ctx) {
    throw new Error(
      "AccordionHeader/AccordionContent deben usarse dentro de <AccordionItem>",
    );
  }
  return ctx;
}
