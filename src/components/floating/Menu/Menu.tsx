"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type Ref,
} from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
  useTypeahead,
  type Placement,
} from "@floating-ui/react";
import { cn } from "@/utils/cn";
import { useControllableState } from "@/hooks/useControllableState";
import { useFloatingNode } from "@/components/floating/primitives/useFloatingNode";
import { MenuContext } from "./MenuContext";

export type MenuAlign = "left" | "right";
export type MenuDirection = "down" | "up";

export interface MenuProps extends HTMLAttributes<HTMLDivElement> {
  /** Estado abierto (modo controlado). Si se omite, el componente gestiona su propio estado. */
  open?: boolean;
  /** Estado inicial (modo no controlado). Por defecto `false`. */
  defaultOpen?: boolean;
  /** Callback al abrir/cerrar. Disparado en ambos modos. */
  onOpenChange?: (open: boolean) => void;
  /** Alineación horizontal del menu. Por defecto `"left"`. */
  placement?: MenuAlign;
  /** Hacia dónde abre verticalmente. Por defecto `"down"`. */
  direction?: MenuDirection;
  /** Si los `MenuItem` cierran el menu al activarse. Por defecto `true`. */
  closeOnSelect?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Menu — menú desplegable accesible.
 *
 * Compón con `MenuTrigger`, `MenuContent`, `MenuItem`,
 * `MenuSeparator`, `MenuLabel`. Cierra con ESC y al hacer click fuera;
 * soporta navegación con ↑/↓/Home/End/Enter/Espacio + typeahead (foco
 * por primera letra) siguiendo el patrón WAI-ARIA APG menu-button.
 *
 * **C-03 (RC1)**: migración a `@floating-ui/react` sobre la capa
 * `floating/primitives/` (compartida con Tooltip + futuros Popover/
 * HoverCard). Reemplaza ~600 LOC hand-rolled de outside-click/escape/
 * arrow-keys por hooks composables FUI con APG menu pattern completo:
 *
 * - `useListNavigation`: flechas + Home/End + loop.
 * - `useTypeahead`: focus por primera letra (APG menu).
 * - `useDismiss({ bubbles.escapeKey: true })`: cascade dismiss vía
 *   `<FloatingTreeRoot>` opt-in (cierra ancestros registrados).
 * - `useFloatingNode`: registro en el tree para anidación.
 * - `<FloatingFocusManager>`: focus trap + return al trigger al cerrar.
 *
 * **Positioning**: FUI completo desde D2/beta.24. `MenuContent` se monta
 * en `<FloatingPortal>` y aplica `floatingStyles` inline con
 * `flip`/`shift`/`offset`; además expone `data-side`/`data-align` para
 * hooks CSS de animación o edge styling. El wrapper `.ig-menu` conserva
 * solo el trigger/contexto, no posiciona ni muestra el content.
 *
 * Modo controlado: pasa `open` + `onOpenChange`. Modo no controlado: omite `open`.
 *
 * @example
 * <Menu>
 *   <MenuTrigger>Acciones ▼</MenuTrigger>
 *   <MenuContent>
 *     <MenuItem onClick={editar}>Editar</MenuItem>
 *     <MenuSeparator />
 *     <MenuItem danger onClick={borrar}>Eliminar</MenuItem>
 *   </MenuContent>
 * </Menu>
 *
 * @example // cascade dismiss con FloatingTreeRoot (Menu dentro de Dialog)
 * <FloatingTreeRoot>
 *   <Dialog open>
 *     <Menu>
 *       <MenuTrigger>...</MenuTrigger>
 *       <MenuContent>...</MenuContent>
 *     </Menu>
 *   </Dialog>
 * </FloatingTreeRoot>
 */
export function Menu({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  placement = "left",
  direction = "down",
  closeOnSelect = true,
  className,
  children,
  ref,
  ...rest
}: MenuProps) {
  const reactId = useId();
  const triggerId = `${reactId}-trigger`;
  const menuId = `${reactId}-menu`;

  const { value: open, setValue: setOpen } = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const { nodeId } = useFloatingNode();

  // Mapeo placement DS → FUI placement string. El DS expone props
  // separadas (placement: align horizontal + direction: dirección
  // vertical) por compat con la API antigua; FUI usa un único string.
  const fuiPlacement: Placement =
    direction === "up"
      ? placement === "right"
        ? "top-end"
        : "top-start"
      : placement === "right"
        ? "bottom-end"
        : "bottom-start";

  const { refs, context, floatingStyles } = useFloating({
    ...(nodeId !== undefined ? { nodeId } : {}),
    open,
    // setOpen viene de useControllableState con firma
    // `(next, options?)` (options es SetValueOptions interno del DS).
    // FUI espera `(open, event?, reason?)`. Adapter: solo propagamos
    // el boolean (el Event/reason de FUI no aplica a SetValueOptions).
    onOpenChange: (next: boolean) => {
      setOpen(next);
    },
    placement: fuiPlacement,
    middleware: [offset(4), flip(), shift({ padding: 4 })],
    whileElementsMounted: autoUpdate,
  });

  // Refs de items para useListNavigation/useTypeahead. listRef registra
  // los HTMLElement de cada MenuItem (en orden de aparición); labelsRef
  // registra el texto plano para typeahead matching.
  const listRef = useRef<Array<HTMLElement | null>>([]);
  const labelsRef = useRef<Array<string | null>>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // useClick: trigger toggle con click + Space/Enter (button nativo).
  const click = useClick(context);

  // useDismiss: outside click + Escape. bubbles.escapeKey: true para
  // cascade vía FloatingTreeRoot (mismo patrón que Tooltip H-01).
  const dismiss = useDismiss(context, {
    bubbles: { escapeKey: true },
  });

  // useRole: aplica aria-haspopup="menu" al reference, role="menu" al
  // floating, role="menuitem" a items (via getItemProps).
  const role = useRole(context, { role: "menu" });

  // useListNavigation: flechas ↑/↓ entre items, Home/End, wrap.
  // focusItemOnOpen="auto": al abrir por teclado, foca primer/último
  // según la tecla; al abrir por click, NO foca ningún item.
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
    focusItemOnOpen: "auto",
  });

  // useTypeahead: focus por primera letra (APG menu). Solo aplica
  // cuando el menu está open (guard inline para evitar onMatch
  // disparar fuera del estado abierto). exactOptionalPropertyTypes
  // prohíbe `onMatch: undefined`, así que pasamos siempre un callback
  // que internamente comprueba `open`.
  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    activeIndex,
    onMatch: (idx: number) => {
      if (open) setActiveIndex(idx);
    },
  });

  const { getReferenceProps, getFloatingProps, getItemProps } =
    useInteractions([click, dismiss, role, listNavigation, typeahead]);

  const ctxValue = useMemo(
    () => ({
      open,
      setOpen,
      triggerId,
      menuId,
      closeOnSelect,
      getReferenceProps,
      getFloatingProps,
      getItemProps,
      listRef,
      labelsRef,
      activeIndex,
      setActiveIndex,
      setReference: refs.setReference,
      setFloating: refs.setFloating,
      context,
      floatingStyles,
      nodeId,
    }),
    [
      open,
      setOpen,
      triggerId,
      menuId,
      closeOnSelect,
      getReferenceProps,
      getFloatingProps,
      getItemProps,
      activeIndex,
      refs.setReference,
      refs.setFloating,
      context,
      floatingStyles,
      nodeId,
    ],
  );

  // D2 (RC1 gate review beta.24): modifier classes `.ig-menu-up`,
  // `.ig-menu-right`, `.ig-menu-open` ELIMINADAS. Pre-D2 controlaban
  // positioning + visibility CSS-driven (overflow:hidden ancestor
  // clipaba el menu, sin flip/shift aplicado). Post-D2:
  //   - positioning via `floatingStyles` inline aplicado en MenuContent.
  //   - data-side/data-align attributes en MenuContent para CSS hooks.
  //   - visibility via unmount-on-close en MenuContent (no CSS hide).
  // El wrapper `.ig-menu` sigue siendo container del trigger (positioning
  // base) pero NO maneja content positioning ni visibility.
  return (
    <MenuContext.Provider value={ctxValue}>
      <div ref={ref} className={cn("ig-menu", className)} {...rest}>
        {children}
      </div>
    </MenuContext.Provider>
  );
}
