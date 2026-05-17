// D8 (beta.24): AlertDialog family. Hereda la infraestructura compound
// de Dialog (D6 beta.24): Provider + Trigger + Header/Body/Footer/Close
// son aliases directos (re-exports renombrados); el único componente
// con comportamiento propio es `AlertDialogContent`, que aplica
// `role="alertdialog"` + `closeOnBackdrop={false}` por defecto.
//
// Razón de aliases (no wrappers): cero overhead, mismo componente bajo
// el capó significa zero divergence con Dialog. Las primitivas (Trigger,
// Header, Body, Footer, Close) son agnósticas del role del Content,
// no necesitan saber si están en Dialog o AlertDialog. La distinción
// semántica vive en el Content (role) y el patrón de footer (no-cancel
// silencioso, dos botones explícitos).

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

export { DialogClose as AlertDialogClose } from "@/components/Dialog";
export type { DialogCloseProps as AlertDialogCloseProps } from "@/components/Dialog";
