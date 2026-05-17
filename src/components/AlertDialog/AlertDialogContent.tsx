"use client";

import type { Ref } from "react";
import { DialogContent, type DialogContentProps } from "@/components/Dialog";

export interface AlertDialogContentProps extends DialogContentProps {
  ref?: Ref<HTMLDialogElement>;
}

/**
 * AlertDialogContent — el `<dialog>` HTML nativo con `role="alertdialog"`.
 *
 * Diferencias DS-wide respecto a `<DialogContent>`:
 *
 * 1. **`role="alertdialog"`** (vs `role="dialog"` automático del `<dialog>`).
 *    WAI-ARIA APG: `alertdialog` indica que el modal demanda atención
 *    del usuario y NO debe cerrarse sin decisión consciente. Browsers
 *    aplican `role="dialog"` por defecto al `<dialog>`; lo
 *    sobreescribimos explícitamente.
 *
 * 2. **`closeOnBackdrop={false}` por defecto** (vs `true` en
 *    `DialogContent`). Un AlertDialog típico ("¿Borrar permanentemente?")
 *    requiere un click consciente en Cancel/Confirm. Permitir cerrar por
 *    click outside ablanda la intención del role. El consumer puede
 *    sobreescribir pasando `closeOnBackdrop={true}` si su caso es más
 *    suave (ej. notice no destructivo).
 *
 * `closeOnEsc` sigue `true` por defecto — ESC es ergonómico universal
 * y los SR lo anuncian como cancel implícito; no contraviene el
 * carácter consciente del role.
 *
 * Composición: igual que DialogContent — `<AlertDialogHeader>`,
 * `<AlertDialogBody>`, `<AlertDialogFooter>` (todos aliases de los
 * componentes equivalentes de Dialog) más `<AlertDialogClose>`.
 *
 * Debe usarse dentro de `<AlertDialog>` (que es alias del Provider
 * `<Dialog>`).
 *
 * @example
 * <AlertDialog defaultOpen={false}>
 *   <AlertDialogTrigger className="ig-btn ig-btn-danger">
 *     Borrar permanentemente
 *   </AlertDialogTrigger>
 *   <AlertDialogContent>
 *     <AlertDialogHeader>
 *       <h2>Confirmar borrado</h2>
 *     </AlertDialogHeader>
 *     <AlertDialogBody>
 *       Esta acción es irreversible. ¿Continuar?
 *     </AlertDialogBody>
 *     <AlertDialogFooter>
 *       <AlertDialogClose className="ig-btn ig-btn-secondary">
 *         Cancelar
 *       </AlertDialogClose>
 *       <AlertDialogClose className="ig-btn ig-btn-danger">
 *         Sí, borrar
 *       </AlertDialogClose>
 *     </AlertDialogFooter>
 *   </AlertDialogContent>
 * </AlertDialog>
 */
export function AlertDialogContent({
  closeOnBackdrop = false,
  role = "alertdialog",
  ref,
  ...rest
}: AlertDialogContentProps) {
  // `exactOptionalPropertyTypes`: spreadeamos `ref` solo si está
  // definido para no pasar `undefined` a una prop que el target tipa
  // como `Ref<HTMLDialogElement>` (sin `| undefined`).
  return (
    <DialogContent
      {...rest}
      closeOnBackdrop={closeOnBackdrop}
      role={role}
      {...(ref ? { ref } : {})}
    />
  );
}
