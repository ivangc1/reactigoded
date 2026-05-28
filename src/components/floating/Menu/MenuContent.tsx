"use client";

import {
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  useMergeRefs,
} from "@floating-ui/react";
import type { HTMLAttributes, Ref, RefObject } from "react";
import { cn } from "@/utils/cn";
import { useMenu } from "./MenuContext";

export interface MenuContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement> | undefined;
  /**
   * **D2 + H-04 paralelo (RC1 gate review beta.24)**: target HTMLElement
   * para el `<FloatingPortal>`. Default `document.body`.
   *
   * **Caso típico — Menu dentro de Dialog**: `<Dialog>` usa
   * `<dialog>.showModal()` que crea un top-layer del browser. Si el
   * portal del Menu queda en `document.body`, aparece *detrás* del
   * backdrop del dialog (invisible al usuario). Pasar el ref del
   * dialog como container ancla el portal al top-layer del dialog y
   * el menu se renderiza visible sobre el backdrop. Patrón canónico
   * idéntico al de Tooltip (gate review H-04, decision C-02).
   *
   * Acepta `HTMLElement` directo o un `RefObject` (Floating UI resuelve
   * ambos).
   */
  container?: HTMLElement | RefObject<HTMLElement | null> | null | undefined;
}

/**
 * Parse FUI placement string ("top-start", "bottom-end", "left", etc.)
 * into separate side + align values for `data-*` attributes. Patrón
 * Radix `data-side`/`data-align` split sobre composite `data-placement`
 * porque consumers reaccionan a side OR align independientemente
 * (animation origin keys on side, edge styling keys on align).
 */
function parseSide(placement: string): "top" | "bottom" | "left" | "right" {
  const side = placement.split("-")[0];
  if (side === "top" || side === "bottom" || side === "left" || side === "right") {
    return side;
  }
  return "bottom"; // fallback defensivo, FUI siempre devuelve uno de los 4
}

function parseAlign(placement: string): "start" | "end" | "center" {
  const parts = placement.split("-");
  const align = parts[1];
  if (align === "start" || align === "end") {
    return align;
  }
  return "center"; // placements sin sufijo ("top", "bottom") son center
}

/**
 * MenuContent — contenedor `role="menu"` para los items, renderizado
 * en `<FloatingPortal>` con positioning automático via FUI flip+shift+offset.
 *
 * **D2 (RC1 gate review beta.24)**: full FUI portal real. Pre-D2 (C-03):
 * MenuContent renderizaba inline en árbol Menu padre + CSS-driven
 * positioning via `.ig-menu-up`/`.ig-menu-right` modifier classes. flip
 * middleware corría pero su output (placement resuelto) se descartaba.
 * Resultado: overflow:hidden ancestor clipaba el menu + sin re-flip
 * cuando estaba cerca del viewport edge.
 *
 * Post-D2:
 * - `<FloatingPortal>` mueve MenuContent a `document.body` → escapa
 *   ancestor overflow:hidden.
 * - `floatingStyles` inline (top/left/position) aplicados → flip/shift
 *   real visible.
 * - `data-side="top|bottom|left|right"` + `data-align="start|end|center"`
 *   atributos expuestos para CSS hooks (animation origin, edge styles,
 *   etc.) — split Radix-style, no composite `data-placement`.
 * - `data-state="open"` para CSS transitions / animation-in.
 * - Unmount-on-close (return null cuando !open) — pre-D2 mantenía DOM
 *   con visibility:hidden + `:focus-within` JS-less fallback. Patrón
 *   eliminado: Menu pasa a JS-required (alineado con Tooltip/Dialog/
 *   Accordion). No mas CSS-only fallback.
 *
 * `<FloatingFocusManager modal={false} initialFocus={-1} returnFocus>`:
 * - Trap inicial: `useListNavigation focusItemOnOpen:"auto"` foca primer/
 *   último item según tecla que abrió.
 * - Return: al cerrar (Escape / outside click / Tab fuera), foco vuelve
 *   al trigger automáticamente.
 *
 * `<FloatingNode id={nodeId}>` wraps OUTSIDE portal (en el React tree)
 * para que descendants registrados en FloatingTree propaguen cascade
 * dismiss correctamente — el portal mueve DOM, no tree React.
 *
 * ARIA inyectada por `useRole({ role: "menu" })`:
 * - `role="menu"`
 * - `aria-labelledby={triggerId}` (vinculado al MenuTrigger)
 */
export function MenuContent({
  className,
  children,
  ref,
  container,
  style: consumerStyle,
  ...rest
}: MenuContentProps) {
  const {
    menuId,
    triggerId,
    open,
    setFloating,
    getFloatingProps,
    context,
    floatingStyles,
    nodeId,
  } = useMenu();

  const refMerged = useMergeRefs([setFloating, ref ?? null]);

  // D2: unmount-on-close. Pre-D2 renderizaba div siempre + CSS hide
  // cuando !open. Post-D2 no DOM cuando !open. Más limpio + matches
  // Radix pattern + cleaner focus/scroll-lock lifecycle.
  if (!open) {
    return null;
  }

  const side = parseSide(context.placement);
  const align = parseAlign(context.placement);

  // Codex P2 post-D2: merge consumer style con floatingStyles. Pre-fix
  // `style={floatingStyles}` sobreescribía silenciosamente el style del
  // consumer (width/maxHeight/CSS vars custom). Pattern Radix: consumer
  // base + FUI positioning gana (top/left/position autoritativos para
  // collision detection correcta).
  const mergedStyle = { ...consumerStyle, ...floatingStyles };

  const inner = (
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
        data-side={side}
        data-align={align}
        data-state="open"
        style={mergedStyle}
        className={cn("ig-menu-content", className)}
      >
        {children}
      </div>
    </FloatingFocusManager>
  );

  // <FloatingPortal> escapa ancestor overflow:hidden (problema pre-D2).
  // Codex P1 post-D2: `container` prop permite anclar el portal a otro
  // root distinto de document.body — caso crítico es Menu-dentro-de-Dialog
  // (showModal top-layer): portal a body queda detrás del backdrop,
  // unusable. Spread condicional (NO `root={container ?? null}`):
  // exactOptionalPropertyTypes prohíbe `undefined` explícito en JSX
  // prop. Patrón idéntico al H-04 fix de Tooltip.
  //
  // <FloatingNode> wraps por fuera del Portal (React tree, no DOM tree)
  // para que cascade dismiss del FloatingTree registre este menu como
  // child del ancestor — el portal mueve DOM placement, no jerarquía
  // de tree React.
  const portaled = (
    <FloatingPortal {...(container ? { root: container } : {})}>
      {inner}
    </FloatingPortal>
  );

  return nodeId === undefined ? (
    portaled
  ) : (
    <FloatingNode id={nodeId}>{portaled}</FloatingNode>
  );
}
