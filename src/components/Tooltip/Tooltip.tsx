import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
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
  /** Elemento envuelto (típicamente un `<button>` o `<a>`). */
  children: ReactNode;
  /** Delay en ms antes de mostrar al hover. Por defecto `0`. */
  openDelay?: number;
  /** Delay en ms antes de ocultar al desactivar. Por defecto `0`. */
  closeDelay?: number;
  ref?: Ref<HTMLSpanElement>;
}

interface DescribableProps {
  "aria-describedby"?: string;
  ref?: Ref<unknown>;
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

  // Inyectar refs/handlers de Floating UI + aria-describedby PERSISTENTE
  // (apunta al sr-only span de abajo, no al portal). Orden importa:
  // primero `getReferenceProps()` para no perder ningún handler que
  // necesite Floating UI, luego nuestro aria-describedby al final
  // para que NO sea sobreescrito.
  let child: ReactNode = children;
  if (isValidElement(children)) {
    const typed = children as ReactElement<DescribableProps>;
    const existing = typed.props["aria-describedby"];
    const combined = existing ? `${existing} ${tooltipId}` : tooltipId;
    /* eslint-disable react-hooks/refs -- refs.setReference es un callback ref de Floating UI que React invoca en commit. La regla experimental marca el paso de refs a cloneElement como "passing a ref to a function may read during render", pero el setReference NO lee `.current` — es un setter. Mismo patrón aceptado por el comentario disable en Stepper.tsx post-beta.22 y en el FloatingPortal de abajo. */
    child = cloneElement(typed, {
      ...getReferenceProps(),
      ref: refs.setReference,
      "aria-describedby": combined,
    } as Partial<DescribableProps>);
    /* eslint-enable react-hooks/refs */
  } else if (
    import.meta.env.DEV &&
    children !== null &&
    children !== undefined
  ) {
    console.warn(
      "[reactigoded] <Tooltip> requiere un único elemento React como child para inyectar aria-describedby + refs de Floating UI. Recibió un node no-elemento; el tooltip se renderizará pero el control no quedará asociado para SR.",
    );
  }

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
        <FloatingPortal>
          <span
            // eslint-disable-next-line react-hooks/refs -- refs.setFloating es un callback ref de @floating-ui/react. La regla experimental marca el acceso a `refs.X` durante render como riesgo de stale capture, pero aquí es un setter (no lectura de `.current`) y Floating UI lo gestiona internamente. Mismo patrón aceptado en Stepper post-beta.22.
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
