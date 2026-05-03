import {
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { isDev } from "@/utils/env";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export type TooltipVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Texto del tooltip. Se inyecta vía `data-tooltip` (CSS-only `::before`). */
  text: string;
  /** Posición relativa al child. Por defecto `"top"`. */
  placement?: TooltipPlacement;
  /** Color del tooltip. */
  variant?: TooltipVariant;
  /** Elemento envuelto (típicamente un `<button>` o `<a>`). */
  children: ReactNode;
  ref?: Ref<HTMLSpanElement>;
}

interface DescribableProps {
  "aria-describedby"?: string;
}

/**
 * Tooltip — wrapper que muestra un texto contextual al hacer hover/focus
 * sobre el child. CSS-only para sighted users (`::before` con
 * `attr(data-tooltip)`); para screen readers expone un `<span role="tooltip">`
 * sr-only enlazado al child con `aria-describedby`.
 *
 * @example
 * <Tooltip text="Eliminar" placement="top">
 *   <Button icon aria-label="Eliminar">×</Button>
 * </Tooltip>
 */
export function Tooltip({
  text,
  placement = "top",
  variant,
  children,
  className,
  ref,
  ...rest
}: TooltipProps) {
  const tooltipId = useId();

  let child: ReactNode = children;
  if (isValidElement(children)) {
    const typed = children as ReactElement<DescribableProps>;
    const existing = typed.props["aria-describedby"];
    const combined = existing
      ? `${existing} ${tooltipId}`
      : tooltipId;
    child = cloneElement(typed, { "aria-describedby": combined });
  } else if (isDev() && children !== null && children !== undefined) {
    // Sin un elemento React válido NO podemos inyectar
    // aria-describedby; el SR no asociará el tooltip al control.
    // Avisamos en dev — si el consumer pasa texto plano o un Fragment,
    // el patrón correcto es envolverlo en un <span> o el control
    // interactivo correspondiente.
    console.warn(
      "[reactigoded] <Tooltip> requiere un único elemento React como child para inyectar aria-describedby. Recibió un node no-elemento; el tooltip se renderizará pero el control no quedará asociado para SR.",
    );
  }

  return (
    <span
      ref={ref}
      data-tooltip={text}
      className={cn(
        "ig-tooltip",
        `ig-tooltip-${placement}`,
        variant && `ig-tooltip-${variant}`,
        className,
      )}
      {...rest}
    >
      {child}
      <span id={tooltipId} role="tooltip" className="ig-sr-only">
        {text}
      </span>
    </span>
  );
}
