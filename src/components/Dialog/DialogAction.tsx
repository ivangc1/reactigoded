"use client";

import type { ButtonHTMLAttributes, Ref } from "react";
import { useDialogContextOptional } from "./DialogContext";

export interface DialogActionProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * DialogAction — botón de acción para el `DialogFooter` (Cancelar,
 * Aceptar, Entendido, etc.) que cierra el Dialog via contexto.
 * **Unstyled** por design — mismo razonamiento que `AlertDialogClose`:
 *
 * - `DialogClose` (esta misma familia) siempre aplica `ig-dialog-close`,
 *   que estiliza el botón como icono X compacto (2rem, sin fondo). Ideal
 *   para la "×" del header.
 * - `DialogAction` NO aplica ninguna clase base. Está pensado para
 *   botones de acción del footer (Cancelar, Aceptar, Entendido, etc.)
 *   donde el consumer pasa `className="ig-btn ig-btn-brand"` u otra
 *   clase de Button del DS y espera que ESA sea la única que aplique.
 *   Mezclar `ig-dialog-close` + `ig-btn-*` rompe el sizing (2rem×2rem
 *   forzados vs padding/altura natural del Button) y descuadra el
 *   footer cuando hay 2+ acciones.
 *
 * Si necesitas el X del header, sigue usando `<DialogClose />` (con o
 * sin children).
 *
 * Como `<DialogTrigger>`, este componente es un `<button>` plano para
 * preservar HTML válido. Para estilarlo como Button del DS, pasa la
 * clase via `className`.
 *
 * Tolerante a uso fuera de `<Dialog>`: si no hay contexto, el componente
 * sigue siendo un botón pero el click NO cierra nada (responsabilidad
 * del consumer via `onClick`).
 *
 * @example
 * <DialogFooter>
 *   <DialogAction className="ig-btn ig-btn-secondary">Cancelar</DialogAction>
 *   <DialogAction className="ig-btn ig-btn-brand">Aceptar</DialogAction>
 * </DialogFooter>
 */
export function DialogAction({
  type = "button",
  onClick: consumerOnClick,
  children,
  ref,
  ...rest
}: DialogActionProps) {
  const ctx = useDialogContextOptional();
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      onClick={(e) => {
        // Chain consumer handler primero. Si hace preventDefault,
        // abortamos el cierre. Si no hay context (Dialog provider
        // ausente), nos limitamos a llamar al consumer.
        consumerOnClick?.(e);
        if (e.defaultPrevented) return;
        ctx?.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
