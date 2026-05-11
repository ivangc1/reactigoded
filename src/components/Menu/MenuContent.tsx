import {
  FloatingFocusManager,
  FloatingNode,
  useMergeRefs,
} from "@floating-ui/react";
import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { useMenu } from "./MenuContext";

export interface MenuContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * MenuContent — contenedor con `role="menu"` para los items.
 *
 * **C-03 (RC1)**: visibilidad sigue siendo CSS-driven (`.ig-menu.
 * ig-menu-open` controla `display`/visibility). El render queda inline
 * en el árbol DOM original (NO se usa `FloatingPortal`) para preservar
 * layout observable de los tests existentes y el flow CSS del DS.
 *
 * `<FloatingFocusManager>` envuelve el contenido cuando `open` para:
 * - Trap inicial: el primer item recibe foco al abrir por teclado.
 * - Return: al cerrar (Escape / outside click / Tab fuera), el foco
 *   vuelve al trigger automáticamente. Reemplaza el manual
 *   `triggerRef.current?.focus()` de la versión hand-rolled.
 *
 * ARIA inyectada por `useRole({ role: "menu" })`:
 * - `role="menu"`
 * - `aria-labelledby={triggerId}` (vinculado al MenuTrigger)
 */
export function MenuContent({
  className,
  children,
  ref,
  ...rest
}: MenuContentProps) {
  const {
    menuId,
    triggerId,
    open,
    setFloating,
    getFloatingProps,
    context,
    nodeId,
  } = useMenu();

  const refMerged = useMergeRefs([setFloating, ref ?? null]);

  // Render condicional: solo dentro de FloatingFocusManager cuando
  // open, para que el focus trap solo aplique mientras el menu está
  // visible. Cuando cerrado, renderizamos el div sin manager (el CSS
  // del DS `.ig-menu-content` lo oculta vía `.ig-menu.ig-menu-open`).
  const inner = open ? (
    <FloatingFocusManager
      context={context}
      modal={false}
      initialFocus={-1}
      returnFocus
    >
      <div
        {...getFloatingProps(rest)}
        ref={refMerged}
        id={menuId}
        role="menu"
        aria-labelledby={triggerId}
        className={cn("ig-menu-content", className)}
      >
        {children}
      </div>
    </FloatingFocusManager>
  ) : (
    <div
      {...rest}
      ref={refMerged}
      id={menuId}
      role="menu"
      aria-labelledby={triggerId}
      className={cn("ig-menu-content", className)}
    >
      {children}
    </div>
  );

  // <FloatingNode> registra este menu en el FloatingTree para que
  // descendants (Tooltip dentro de un MenuItem, etc.) puedan
  // propagar dismiss en cascada al Menu padre. Si no hay tree
  // ancestor (nodeId undefined), no envolver.
  return nodeId === undefined ? (
    inner
  ) : (
    <FloatingNode id={nodeId}>{inner}</FloatingNode>
  );
}
