export { Dialog } from "./Dialog";
export type { DialogProps } from "./Dialog";
export { DialogContent } from "./DialogContent";
export type {
  DialogContentProps,
  DialogContentSize,
  DialogContentBackdrop,
} from "./DialogContent";
// D6 (beta.24): `DialogSize` y `DialogBackdrop` reexportados como alias
// de los nuevos `DialogContentSize` / `DialogContentBackdrop` para
// migración suave de consumers que tipaban los tamaños/backdrops del
// pre-refactor. Los alias quedan en 1.x; eliminados en 2.0.
export type { DialogContentSize as DialogSize } from "./DialogContent";
export type { DialogContentBackdrop as DialogBackdrop } from "./DialogContent";
export { DialogTrigger } from "./DialogTrigger";
export type { DialogTriggerProps } from "./DialogTrigger";
export { DialogHeader } from "./DialogHeader";
export type { DialogHeaderProps } from "./DialogHeader";
export { DialogBody } from "./DialogBody";
export type { DialogBodyProps } from "./DialogBody";
export { DialogFooter } from "./DialogFooter";
export type { DialogFooterProps } from "./DialogFooter";
export { DialogClose } from "./DialogClose";
export type { DialogCloseProps } from "./DialogClose";
// DialogContext + DialogContextValue son detalles internos: el contexto
// solo lo consumen los subcomponentes (Header/Body/Footer/Close/Content/
// Trigger) para auto-registrar `headerId` y wire del open state.
// No se exponen al consumer para no comprometernos a un API público que
// solo aporta ergonomía interna.
