export { Modal } from "./Modal";
export type { ModalProps, ModalSize, ModalBackdrop } from "./Modal";
export { ModalHeader } from "./ModalHeader";
export type { ModalHeaderProps } from "./ModalHeader";
export { ModalBody } from "./ModalBody";
export type { ModalBodyProps } from "./ModalBody";
export { ModalFooter } from "./ModalFooter";
export type { ModalFooterProps } from "./ModalFooter";
export { ModalClose } from "./ModalClose";
export type { ModalCloseProps } from "./ModalClose";
// ModalContext + ModalContextValue son detalles internos: el contexto
// solo lo consumen los subcomponentes (Header/Body/Footer/Close) para
// auto-registrar `headerId` en el dialog. No se exponen al consumer
// para no comprometernos a un API público que sólo aporta ergonomía
// interna.
