export { Dialog } from "./Dialog";
export type { DialogProps, DialogSize, DialogBackdrop } from "./Dialog";
export { DialogHeader } from "./DialogHeader";
export type { DialogHeaderProps } from "./DialogHeader";
export { DialogBody } from "./DialogBody";
export type { DialogBodyProps } from "./DialogBody";
export { DialogFooter } from "./DialogFooter";
export type { DialogFooterProps } from "./DialogFooter";
export { DialogClose } from "./DialogClose";
export type { DialogCloseProps } from "./DialogClose";
// DialogContext + DialogContextValue son detalles internos: el contexto
// solo lo consumen los subcomponentes (Header/Body/Footer/Close) para
// auto-registrar `headerId` en el dialog. No se exponen al consumer
// para no comprometernos a un API público que sólo aporta ergonomía
// interna.
