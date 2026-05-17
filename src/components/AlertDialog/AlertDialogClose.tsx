"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { useDialogContextOptional } from "@/components/Dialog/DialogContext";

export interface AlertDialogCloseProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * AlertDialogClose — botón "action" que cierra el AlertDialog via
 * contexto. **Unstyled** por design (D8 codex P1 sobre PR #87):
 *
 * - `DialogClose` (Dialog family) siempre aplica `ig-dialog-close` que
 *   estiliza el botón como icono X compacto (2rem, sin fondo, color
 *   muted). Ideal para la "×" del header.
 * - `AlertDialogClose` (esta familia) NO aplica ninguna clase base.
 *   Está pensado para botones de acción en el footer (Cancelar,
 *   Confirmar) donde el consumer pasa `className="ig-btn ig-btn-danger"`
 *   u otra clase de Button del DS y espera que ESA sea la única que
 *   aplique. Aliasarlo a `DialogClose` mergeaba clases en conflicto
 *   (renderizaba CTA como mini icon-close).
 *
 * Si necesitas el X del header dentro de un AlertDialog, usa
 * `<DialogClose />` directamente — es el mismo Provider, mismo
 * contexto, sigue funcionando.
 *
 * Como `<DialogTrigger>`, este componente es un `<button>` plano para
 * preservar HTML válido. Para estilarlo como Button del DS, pasa la
 * clase via `className`.
 *
 * Tolerante a uso fuera de `<AlertDialog>` / `<Dialog>`: si no hay
 * contexto, el componente sigue siendo un botón pero el click NO cierra
 * nada (responsabilidad del consumer via `onClick`).
 *
 * @example
 * <AlertDialogFooter>
 *   <AlertDialogClose className="ig-btn ig-btn-secondary">
 *     Cancelar
 *   </AlertDialogClose>
 *   <AlertDialogClose className="ig-btn ig-btn-danger">
 *     Sí, borrar
 *   </AlertDialogClose>
 * </AlertDialogFooter>
 */
export function AlertDialogClose({
  type = "button",
  onClick: consumerOnClick,
  children,
  ref,
  ...rest
}: AlertDialogCloseProps) {
  const ctx = useDialogContextOptional();
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      onClick={(e) => {
        // Chain consumer handler primero. Si el consumer hace
        // preventDefault, abortamos el cierre. Si no hay context
        // (Provider ausente), nos limitamos a llamar al consumer.
        consumerOnClick?.(e);
        if (e.defaultPrevented) return;
        ctx?.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
