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
// `DialogAction` ELIMINADO en beta.27 (D14 Bloque B). Migration:
//   <DialogFooter>
//     <DialogClose asChild>
//       <Button variant="brand">Aceptar</Button>
//     </DialogClose>
//   </DialogFooter>
// El Slot pattern de `DialogClose` cubre el mismo caso de uso (CTA del
// footer que cierra el dialog) sin la asimetría léxica DialogClose
// styled / DialogAction unstyled. Ver CHANGELOG 1.0.0-beta.27.
// DialogContext + DialogContextValue son detalles internos: el contexto
// solo lo consumen los subcomponentes (Header/Body/Footer/Close/Content/
// Trigger) para auto-registrar `headerId` y wire del open state.
// No se exponen al consumer para no comprometernos a un API público que
// solo aporta ergonomía interna.
