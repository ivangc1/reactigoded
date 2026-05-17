// D8 (beta.24): AlertDialog family. Hereda la infraestructura compound
// de Dialog (D6 beta.24): Provider + Trigger + Header/Body/Footer son
// aliases directos (re-exports renombrados). Dos componentes tienen
// comportamiento propio:
//
// 1. `AlertDialogContent`: aplica `role="alertdialog"` +
//    `closeOnBackdrop={false}` por defecto.
// 2. `AlertDialogClose`: codex P1 sobre PR #87 — NO es alias de
//    `DialogClose` porque éste aplica `ig-dialog-close` (icono X
//    compacto). Para footers de AlertDialog (Cancelar/Confirmar) el
//    consumer pasa `className="ig-btn ig-btn-*"` y necesita que la
//    base esté limpia. AlertDialogClose es un `<button>` unstyled
//    que cierra via contexto.
//
// Si el consumer necesita el X del header dentro de un AlertDialog,
// usa `<DialogClose />` directamente — mismo Provider, mismo context,
// sigue funcionando.

export { Dialog as AlertDialog } from "@/components/Dialog";
export type { DialogProps as AlertDialogProps } from "@/components/Dialog";

export { AlertDialogContent } from "./AlertDialogContent";
export type { AlertDialogContentProps } from "./AlertDialogContent";

export { DialogTrigger as AlertDialogTrigger } from "@/components/Dialog";
export type { DialogTriggerProps as AlertDialogTriggerProps } from "@/components/Dialog";

export { DialogHeader as AlertDialogHeader } from "@/components/Dialog";
export type { DialogHeaderProps as AlertDialogHeaderProps } from "@/components/Dialog";

export { DialogBody as AlertDialogBody } from "@/components/Dialog";
export type { DialogBodyProps as AlertDialogBodyProps } from "@/components/Dialog";

export { DialogFooter as AlertDialogFooter } from "@/components/Dialog";
export type { DialogFooterProps as AlertDialogFooterProps } from "@/components/Dialog";

export { AlertDialogClose } from "./AlertDialogClose";
export type { AlertDialogCloseProps } from "./AlertDialogClose";
