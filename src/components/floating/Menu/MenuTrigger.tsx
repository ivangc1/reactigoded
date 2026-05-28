"use client";

import { useMergeRefs } from "@floating-ui/react";
import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { Slot } from "@/components/Slot";
import { useMenu } from "./MenuContext";

export interface MenuTriggerProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement> | undefined;
  /**
   * Slot pattern (D14 Bloque D beta.27): si `true`, clona el child del
   * consumer y le aplica trigger semantics (id, aria-haspopup, aria-expanded
   * via `useRole`, aria-controls, click + keyboard handlers de FUI) sin
   * renderizar un `<button>` propio ni aplicar `ig-menu-trigger`.
   *
   * Permite usar cualquier elemento como trigger (`<Button>` del DS,
   * `<a>`, custom component) preservando su tipo, styling y eventos.
   *
   * Sin `asChild`, MenuTrigger renderiza un `<button>` plano con clase
   * `ig-menu-trigger` (comportamiento backwards-compat con 1.0.0-beta.26).
   *
   * @example
   * // Slot pattern (recomendado con Button del DS):
   * <MenuTrigger asChild>
   *   <Button variant="brand">Abrir menú</Button>
   * </MenuTrigger>
   *
   * @example
   * // Default (backwards-compat):
   * <MenuTrigger>Opciones</MenuTrigger>
   */
  asChild?: boolean | undefined;
}

/**
 * MenuTrigger — botón que abre/cierra el menú. Dos modos de render:
 *
 * - **Default** (`asChild=false`): renderiza un `<button class="ig-menu-trigger">`
 *   plano. Comportamiento idéntico al de 1.0.0-beta.26.
 *
 * - **Slot pattern** (`asChild=true`, D14 Bloque D): clona el child del
 *   consumer y le aplica id + ARIA + handlers FUI. El child es
 *   renderizado directamente (no wrapper). Patrón canónico Radix/shadcn.
 *
 * **C-03 (RC1)**: internals via `@floating-ui/react`. `useClick` ya
 * cubre toggle por click + Space/Enter (estándar `<button>`).
 * `useListNavigation` con `focusItemOnOpen: "auto"` foca primer/último
 * item según la tecla que abrió el menú.
 *
 * ARIA inyectada por `useRole({ role: "menu" })`:
 * - `aria-haspopup="menu"`
 * - `aria-expanded={open}`
 *
 * `aria-controls={menuId}` se inyecta explícitamente para enlace al
 * MenuContent (no lo cubre useRole por defecto).
 *
 * Es client-component (`"use client"`) porque consume `MenuContext` via
 * hook — NO marcado server-safe.
 */
export function MenuTrigger({
  asChild = false,
  className,
  children,
  type = "button",
  ref,
  ...rest
}: MenuTriggerProps) {
  const { triggerId, menuId, setReference, getReferenceProps } = useMenu();

  // Merge del ref del consumer con setReference de FUI.
  const refMerged = useMergeRefs([setReference, ref ?? null]);

  if (asChild) {
    // Slot path: el child del consumer recibe trigger semantics. NO
    // aplicamos `ig-menu-trigger` (consumer trae su propio styling).
    //
    // `getReferenceProps(rest)` mergea FUI's reference handlers
    // (click + keyboard) con cualquier event handler que el consumer
    // haya pasado en rest (outer Slot wrapper o directo a MenuTrigger).
    // El Slot posterior aplica child-first chain con los handlers del
    // child final del consumer → la cadena completa es:
    //   child.handler → (FUI's merged with rest handlers).
    //
    // `type` forwardeado para safety (mismo patrón que DialogTrigger):
    // wrapper default "button" cubre native children sin type contra
    // submit accidental en form; child con type explícito gana via
    // Slot merge child-wins.
    //
    // `id` forzado al child via pre-clone (codex P2 round 1 sobre #113).
    // Problema: MenuContent referencia `triggerId` via `aria-labelledby`.
    // Si el consumer pasa un `id` propio en su child, Slot's default
    // child-wins rule lo dejaría ganar sobre `triggerId`, rompiendo el
    // accessible label del menú.
    //
    // Solución: pre-clonar el child con `id: triggerId` ANTES de
    // pasarlo a Slot. cloneElement merge: new props (triggerId) win
    // sobre props existentes (consumer's id). Cuando Slot procese este
    // child, `child.props.id === triggerId` — incluso si pasáramos
    // `id` al Slot, child-wins gana correctamente.
    //
    // El comportamiento es consistente con el path default
    // (`<button id={triggerId}>` también overwriteaba child id en
    // pre-D14). Si el consumer necesita un id distinto, MenuTrigger
    // asChild no es el lugar — el contract de MenuTrigger es ser el
    // anchor del aria-labelledby.
    const mergedProps = getReferenceProps(rest);
    const childWithTriggerId = isValidElement(children)
      ? cloneElement(children as ReactElement<{ id?: string }>, {
          id: triggerId,
        })
      : children;
    return (
      <Slot
        {...mergedProps}
        ref={refMerged}
        type={type}
        aria-controls={menuId}
        className={className}
      >
        {childWithTriggerId}
      </Slot>
    );
  }

  // Default render (backwards-compat con beta.26).
  return (
    <button
      {...getReferenceProps(rest)}
      ref={refMerged}
      id={triggerId}
      type={type}
      aria-controls={menuId}
      className={cn("ig-menu-trigger", className)}
    >
      {children}
    </button>
  );
}
