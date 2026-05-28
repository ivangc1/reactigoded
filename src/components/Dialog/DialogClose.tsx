"use client";

import type { ButtonHTMLAttributes, MouseEvent, Ref } from "react";
import { cn } from "@/utils/cn";
import { Slot } from "@/components/Slot";
import { useDialogContextOptional } from "./DialogContext";

export interface DialogCloseProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  /**
   * Slot pattern (D14): si `true`, clona el child del consumer y le aplica
   * close semantics (`onClick` que cierra el dialog + `aria-label`
   * default "Cerrar") sin renderizar un `<button>` propio ni aplicar
   * `ig-dialog-close` (consumer trae su propio styling).
   *
   * Cubre el caso de CTAs del footer del Dialog: en lugar del antiguo
   * `<DialogAction>` (eliminado en beta.27, D14), el patrón canónico
   * ahora es `<DialogClose asChild><Button>...</Button></DialogClose>`.
   * Esto cierra la asimetría léxica DialogClose styled / DialogAction
   * unstyled / AlertDialogClose clónico que era deuda heredada pre-D14.
   *
   * Sin `asChild`, DialogClose renderiza el icon-button "×" tradicional
   * con clase `ig-dialog-close` — comportamiento backwards-compat para
   * uso como × del header.
   *
   * @example
   * // Header X icon (default, backwards-compat):
   * <DialogHeader>
   *   <h2>Confirmar</h2>
   *   <DialogClose />
   * </DialogHeader>
   *
   * @example
   * // Footer CTA (Slot pattern, reemplaza el viejo DialogAction):
   * <DialogFooter>
   *   <DialogClose asChild>
   *     <Button variant="brand">Aceptar</Button>
   *   </DialogClose>
   * </DialogFooter>
   */
  asChild?: boolean;
}

/**
 * DialogClose — botón que cierra el modal. Dos modos:
 *
 * - **Default** (`asChild=false`): renderiza el icon-button "×" tradicional
 *   con clase `ig-dialog-close` (fuerza dimensiones 2rem × 2rem, sin
 *   padding). Para la × del header.
 *
 * - **Slot pattern** (`asChild=true`, D14): clona el child del consumer
 *   y le aplica el close handler + aria-label. **No aplica
 *   `ig-dialog-close`** — el consumer trae su propio styling. Reemplaza
 *   el antiguo `<DialogAction>` para CTAs del footer.
 *
 * **D6 (beta.24)**: si vive dentro de `<Dialog>` consume el contexto y
 * llama a `setOpen(false)` automáticamente — el consumer no necesita
 * conectar `onClick` para cerrar. Si pasa un `onClick` propio, se
 * chainea (consumer primero; si hace `preventDefault`, no cerramos).
 *
 * Tolerante a uso fuera de `<Dialog>`: si no hay contexto, el componente
 * sigue siendo un botón pero el click NO cierra nada (responsabilidad
 * del consumer via `onClick`).
 *
 * Es client-component (`"use client"`) porque consume el `DialogContext`
 * via hook — NO marcado server-safe.
 */
export function DialogClose({
  asChild = false,
  className,
  children,
  type = "button",
  // NO default aquí — necesitamos distinguir "consumer no pasó aria-label"
  // de "consumer pasó aria-label='Cerrar'". El default i18n (D12, "Cerrar")
  // se aplica solo en el path default (icon X). En asChild, el child del
  // consumer trae su propio accessible name (text content del Button).
  "aria-label": consumerAriaLabel,
  onClick: consumerOnClick,
  ref,
  ...rest
}: DialogCloseProps) {
  const ctx = useDialogContextOptional();

  const handleClose = (e: MouseEvent<HTMLElement>) => {
    // Chain consumer handler primero (D14 §"Event chain order"). Si el
    // consumer hace preventDefault, abortamos el cierre. Si no hay
    // context (Dialog provider ausente), nos limitamos a llamar al
    // consumer y dejar que él decida qué hacer.
    consumerOnClick?.(e as MouseEvent<HTMLButtonElement>);
    if (e.defaultPrevented) return;
    ctx?.setOpen(false);
  };

  if (asChild) {
    // Slot path: el child del consumer recibe close semantics. NO aplicamos
    // `ig-dialog-close` (asChild = consumer brings own styling). El
    // `className` que el consumer pasó a DialogClose se mergea en el Slot
    // con el className del child (cn(slot, child) per D14).
    //
    // CRÍTICO: aria-label SOLO se pasa al Slot si el consumer la setteó
    // explícito en DialogClose. Si no, el child trae su propio accessible
    // name (text content de `<Button>Aceptar</Button>`). Forzar el default
    // "Cerrar" sobrescribiría el accessible name legítimo del consumer.
    //
    // `type` forwardado (codex P2 round 1 sobre #111): un consumer en form
    // que escribe `<DialogClose asChild type="submit">` espera que el
    // submit se aplique; sin forwarding se perdía silencioso. El wrapper
    // default "button" cubre native children sin type para evitar submit
    // accidental (Slot rule: child wins on collision, así que el child
    // con type explícito siempre gana).
    return (
      <Slot
        {...rest}
        ref={ref}
        type={type}
        className={className}
        {...(consumerAriaLabel !== undefined
          ? { "aria-label": consumerAriaLabel }
          : {})}
        onClick={handleClose}
      >
        {children}
      </Slot>
    );
  }

  // Default render: icon-button "×" styled. Aquí SÍ aplicamos el default
  // i18n "Cerrar" porque el `×` glyph no tiene accessible name natural.
  const effectiveAriaLabel = consumerAriaLabel ?? "Cerrar";
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-label={effectiveAriaLabel}
      className={cn("ig-dialog-close", className)}
      onClick={handleClose}
    >
      {children ?? "×"}
    </button>
  );
}
