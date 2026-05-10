export { Accordion } from "./Accordion";
export type { AccordionProps } from "./Accordion";
export { AccordionItem } from "./AccordionItem";
export type { AccordionItemProps } from "./AccordionItem";
export { AccordionHeader } from "./AccordionHeader";
export type { AccordionHeaderProps } from "./AccordionHeader";
export { AccordionContent } from "./AccordionContent";
export type { AccordionContentProps } from "./AccordionContent";
// B-04 (RC1): useAccordion, useAccordionItem y sus ContextValues
// retirados del API público. Su shape está acoplada a internals del
// compound; exponerlos firmaría una API que bloquearía refactor.
// Acceso interno solo desde sub-componentes vía import directo:
//   `import { useAccordion } from "./AccordionContext"`
