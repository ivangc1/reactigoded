import { useMergeRefs } from "@floating-ui/react";
import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { useMenu } from "./MenuContext";

export interface MenuTriggerProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * MenuTrigger — botón que abre/cierra el menú.
 *
 * **C-03 (RC1)**: internals via `@floating-ui/react`. `useClick` ya
 * cubre toggle por click + Space/Enter (estándar `<button>`).
 * `useListNavigation` con `focusItemOnOpen: "auto"` ya foca primer/
 * último item según la tecla que abrió el menú (↓ → primero, ↑ →
 * último), reemplazando el `requestAnimationFrame` + `focusItem`
 * manual de la versión hand-rolled.
 *
 * ARIA inyectada por `useRole({ role: "menu" })`:
 * - `aria-haspopup="menu"`
 * - `aria-expanded={open}`
 *
 * `aria-controls={menuId}` se inyecta explícitamente para enlace al
 * MenuContent (no lo cubre useRole por defecto).
 */
export function MenuTrigger({
  className,
  children,
  type = "button",
  ref,
  ...rest
}: MenuTriggerProps) {
  const { triggerId, menuId, setReference, getReferenceProps } = useMenu();

  // Merge del ref del consumer con setReference de FUI.
  const refMerged = useMergeRefs([setReference, ref ?? null]);

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
