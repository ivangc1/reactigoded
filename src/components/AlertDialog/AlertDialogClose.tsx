"use client";

import type { ButtonHTMLAttributes, MouseEvent, Ref } from "react";
import { cn } from "@/utils/cn";
import { Slot } from "@/components/Slot";
// Deep import a `DialogContext` (no expuesto en el barrel de Dialog).
// Intencional: AlertDialog es una family que se construye sobre la
// infraestructura de Dialog (D6) y consume su contexto como
// "cross-component infrastructure" del DS — mismo patrón que las
// floating primitives en `floating/Menu/` y `floating/Tooltip/`
// importan `useFloatingNode` via path directo (no via barrel root).
import { useDialogContextOptional } from "@/components/Dialog/DialogContext";

export interface AlertDialogCloseProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement> | undefined;
  /**
   * Slot pattern (D14): si `true`, clona el child del consumer y le aplica
   * close semantics sin renderizar un `<button>` propio ni aplicar
   * `ig-dialog-close`. Patrón canónico para CTAs del footer del
   * AlertDialog (Cancelar, Confirmar, etc.):
   * `<AlertDialogClose asChild><Button variant="danger">Borrar</Button></AlertDialogClose>`.
   *
   * Sin `asChild`, `AlertDialogClose` renderiza un icon-button "×" idéntico
   * a `DialogClose` (cierre asimetría léxica heredada — D14 Bloque B
   * BREAKING vs beta.26 donde AlertDialogClose era unstyled).
   */
  asChild?: boolean | undefined;
}

/**
 * AlertDialogClose — botón que cierra el AlertDialog via contexto. Dos modos:
 *
 * - **Default** (`asChild=false`): renderiza el icon-button "×" tradicional
 *   con clase `ig-dialog-close` (forzado 2rem × 2rem). Coherente con
 *   `DialogClose` (D14 Bloque B cerró la asimetría léxica heredada).
 *   **BREAKING vs beta.26**: antes era unstyled `<button>` para usar como
 *   CTA con `className="ig-btn ig-btn-*"`. Migración: usa `asChild` para
 *   ese caso.
 *
 * - **Slot pattern** (`asChild=true`, D14): clona el child del consumer y
 *   le aplica el close handler + aria-label. No aplica `ig-dialog-close`.
 *   Reemplaza el viejo uso unstyled. Permite CTAs ricos:
 *   `<AlertDialogClose asChild><Button variant="danger">Sí, borrar</Button></AlertDialogClose>`.
 *
 * Si necesitas el X del header dentro de un AlertDialog, usar
 * `<AlertDialogClose>` sin children (o `<DialogClose>` directamente — es
 * el mismo Provider, mismo contexto, sigue funcionando).
 *
 * Tolerante a uso fuera de `<AlertDialog>` / `<Dialog>`: si no hay
 * contexto, el componente sigue siendo un botón pero el click NO cierra
 * nada (responsabilidad del consumer via `onClick`).
 *
 * @example
 * // Header X icon (default tras D14):
 * <AlertDialogContent>
 *   <DialogHeader>
 *     <h2>Confirmar borrado</h2>
 *     <AlertDialogClose />
 *   </DialogHeader>
 *   ...
 * </AlertDialogContent>
 *
 * @example
 * // Footer CTAs (Slot pattern, reemplaza el viejo uso unstyled):
 * <AlertDialogFooter>
 *   <AlertDialogClose asChild>
 *     <Button variant="secondary">Cancelar</Button>
 *   </AlertDialogClose>
 *   <AlertDialogClose asChild>
 *     <Button variant="danger">Sí, borrar</Button>
 *   </AlertDialogClose>
 * </AlertDialogFooter>
 *
 * Es client-component (`"use client"`) porque consume el `DialogContext`
 * via hook — NO marcado server-safe.
 */
export function AlertDialogClose({
  asChild = false,
  className,
  children,
  type = "button",
  // NO default aquí — necesitamos distinguir "consumer no pasó aria-label"
  // de "consumer pasó aria-label='Cerrar'". Misma justificación que
  // DialogClose: el child consumer en asChild trae su propio accessible
  // name (text content del Button); forzar "Cerrar" lo borraría.
  "aria-label": consumerAriaLabel,
  onClick: consumerOnClick,
  ref,
  ...rest
}: AlertDialogCloseProps) {
  const ctx = useDialogContextOptional();

  const handleClose = (e: MouseEvent<HTMLElement>) => {
    // Chain consumer handler primero (D14 §"Event chain order"). Si el
    // consumer hace preventDefault, abortamos el cierre. Si no hay
    // context (Provider ausente), nos limitamos a llamar al consumer.
    consumerOnClick?.(e as MouseEvent<HTMLButtonElement>);
    if (e.defaultPrevented) return;
    ctx?.setOpen(false);
  };

  if (asChild) {
    // Slot path: el child del consumer recibe close semantics. NO aplicamos
    // `ig-dialog-close` — asChild = consumer brings own styling. aria-label
    // solo se pasa si el consumer la setteó explícito.
    //
    // `type` forwardado (codex P2 round 1 sobre #111): mismo razonamiento
    // que DialogClose — el wrapper default "button" cubre native children
    // sin type (evita submit accidental en form), child con type explícito
    // gana via Slot merge.
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

  // Default render: icon-button "×" styled (BREAKING vs beta.26). i18n
  // default "Cerrar" aplicado solo aquí (× glyph sin accessible name natural).
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
