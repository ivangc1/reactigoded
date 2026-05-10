import {
  cloneElement,
  useId,
  useState,
  type HTMLAttributes,
  type HTMLProps,
  type ReactElement,
  type Ref,
} from "react";
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
} from "@floating-ui/react";
import { cn } from "@/utils/cn";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export type TooltipVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Texto del tooltip. */
  text: string;
  /** Posición preferida relativa al child. Por defecto `"top"`. */
  placement?: TooltipPlacement;
  /** Color del tooltip. */
  variant?: TooltipVariant;
  /**
   * Elemento envuelto (típicamente un `<button>` o `<a>`). Debe ser
   * un único `ReactElement` HTML — no string, fragment, array ni
   * `ReactNode` arbitrario. El componente inyecta refs / handlers /
   * `aria-describedby` vía `cloneElement`, lo que requiere un nodo
   * elemento concreto.
   *
   * H-18 (gate review): el tipo previo `ReactNode` permitía
   * `<Tooltip text="x">texto</Tooltip>` o arrays/fragments en
   * tiempo de tipos, pero el control no quedaba asociado al SR.
   * `ReactElement<HTMLProps<HTMLElement>>` rechaza ese caso en
   * compile-time.
   */
  children: ReactElement<HTMLProps<HTMLElement>>;
  /** Delay en ms antes de mostrar al hover. Por defecto `0`. */
  openDelay?: number;
  /** Delay en ms antes de ocultar al desactivar. Por defecto `0`. */
  closeDelay?: number;
  /**
   * Contenedor donde se monta el portal del tooltip. Por defecto
   * `document.body`. Útil cuando el tooltip vive dentro de un
   * `<Modal>` con `<dialog>.showModal()` (top-layer): pasar el
   * elemento del dialog para que el tooltip aparezca por encima del
   * backdrop. También aplica para CSS containment / shadow roots / etc.
   *
   * Acepta `HTMLElement` directo o un `RefObject` (Floating UI
   * resuelve ambos).
   */
  container?: HTMLElement | React.RefObject<HTMLElement | null> | null;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Tooltip — wrapper que muestra un texto contextual al hacer hover/focus
 * sobre el child. Usa **Floating UI** (`@floating-ui/react`) para
 * positioning robusto:
 *
 * - **Portal-out**: el tooltip vive en un `<FloatingPortal>` al final
 *   de `<body>`, escapando overflow:hidden de cualquier ancestor.
 * - **`flip` + `shift`**: si no cabe en el placement preferido, salta
 *   al opuesto o se desplaza para mantenerse visible en el viewport.
 * - **`offset(8px)`**: separación entre el child y el tooltip.
 * - **`autoUpdate`**: reposicionamiento al scroll/resize/transform.
 *
 * **A11y**:
 * - El child recibe `aria-describedby` apuntando al span sr-only que
 *   contiene el `text`. Los lectores de pantalla siempre tienen
 *   acceso al texto (incluso cuando el portal no está montado).
 * - El portal flotante usa `role="tooltip"` (gestionado por `useRole`).
 * - `useDismiss` cierra con Escape o click fuera (estándar APG).
 *
 * **Migración desde CSS-only (pre-1.0.0-rc.1)**: la API pública
 * (props text/placement/variant) NO cambia. Las clases
 * `ig-tooltip-place-*` y `ig-tooltip-color-*` ahora se aplican al
 * elemento del portal en lugar del wrapper. Si tenías reglas CSS
 * dirigidas al wrapper `.ig-tooltip` para layout, revisa el cambio.
 *
 * @example
 * <Tooltip text="Eliminar" placement="top">
 *   <Button icon aria-label="Eliminar">×</Button>
 * </Tooltip>
 *
 * @example // overflow:hidden ya NO recorta el tooltip (portal-out)
 * <div style={{ overflow: "hidden", width: 100 }}>
 *   <Tooltip text="Texto largo que escapa">
 *     <Button>Hover</Button>
 *   </Tooltip>
 * </div>
 */
export function Tooltip({
  text,
  placement = "top",
  variant,
  children,
  className,
  openDelay = 0,
  closeDelay = 0,
  container,
  ref,
  ...rest
}: TooltipProps) {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    move: false,
    delay: { open: openDelay, close: closeDelay },
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  // No usamos `useRole` porque añade un `aria-describedby` dinámico al
  // referencia (apuntando al floating element) que se sobreescribiría
  // con el nuestro al `cloneElement`. Nuestra estrategia a11y es:
  // mantener un `<span role="tooltip">` SR-only PERMANENTE como el
  // referente estable de aria-describedby. El portal flotante es
  // decoración visual.
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
  ]);

  // Preservar el `ref` del child (consumer puede tener uno para foco
  // programático, mediciones, analytics, etc.) mergeándolo con
  // `refs.setReference` de Floating UI vía `useMergeRefs`. Si el
  // child no tiene ref, el merge funciona igual (Floating UI tolera
  // null en el array).
  //
  // H-18 (gate review): `children` ahora es `ReactElement<HTMLProps<
  // HTMLElement>>` por contrato de tipos, así que el cast a-mano y el
  // guard runtime `isValidElement` desaparecen — TS los garantiza
  // en compile-time. Consumer JS sin TS verá un crash inmediato si
  // pasa string/array/fragment al cloneElement, lo cual es señal
  // clara mejor que el warn silencioso anterior.
  const childRef = children.props.ref ?? null;
  const referenceRef = useMergeRefs([refs.setReference, childRef]);

  // Inyectar handlers/refs de Floating UI MERGEADOS con los del child:
  // - `getReferenceProps(children.props)` pasa los props existentes,
  //   así Floating UI fusiona `onMouseEnter`/`onFocus`/`onBlur`/etc.
  //   del consumer con sus propios listeners en lugar de pisarlos.
  // - `referenceRef` (mergeado arriba) preserva cualquier ref del
  //   consumer en lugar de sobreescribirlo.
  // - `aria-describedby` al final para que NO sea pisado (apunta al
  //   sr-only span persistente, no al portal).
  const existing = children.props["aria-describedby"];
  const combined = existing ? `${existing} ${tooltipId}` : tooltipId;
  const referenceProps = getReferenceProps(children.props);
  const child = cloneElement(children, {
    ...referenceProps,
    ref: referenceRef,
    "aria-describedby": combined,
  });

  return (
    <span
      ref={ref}
      className={cn("ig-tooltip-wrapper", className)}
      {...rest}
    >
      {child}
      {/* SR-only: siempre presente, con id estable para aria-describedby
          incluso cuando el portal no está montado. Garantiza que SR
          tienen acceso al texto sin depender del estado de hover. */}
      <span id={tooltipId} role="tooltip" className="ig-sr-only">
        {text}
      </span>
      {isOpen && (
        // H-04 (gate review): `root` permite anclar el portal a otro
        // contenedor que no sea `document.body`. Caso típico: Tooltip
        // dentro de un Modal (<dialog>.showModal() crea top-layer); sin
        // root, el portal va a body y queda detrás del backdrop. Con
        // root={dialogElement}, el tooltip vive dentro del dialog y
        // hereda el top-layer.
        //
        // Spread condicional (NO `root={container ?? null}`):
        //   - exactOptionalPropertyTypes prohíbe `undefined` explícito.
        //   - `root={null}` Floating UI lo trata internamente como
        //     "no montar el portal" (verificado: 15 tests rotos en
        //     verify-cold con esa firma). Solo OMITIR la prop activa
        //     el default (body).
        <FloatingPortal {...(container ? { root: container } : {})}>
          <span
            ref={refs.setFloating}
            style={floatingStyles}
            className={cn(
              "ig-tooltip",
              `ig-tooltip-place-${placement}`,
              variant && `ig-tooltip-color-${variant}`,
            )}
            data-tooltip-content={text}
            {...getFloatingProps()}
          >
            {text}
          </span>
        </FloatingPortal>
      )}
    </span>
  );
}
