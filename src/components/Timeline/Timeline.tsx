import { type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";

export interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  /** Etiqueta accesible para la lista. */
  ariaLabel?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Timeline — lista vertical de eventos cronológicos.
 *
 * Compón con `TimelineItem`. Renderiza un contenedor con `role="list"` para
 * que los lectores de pantalla anuncien la cantidad de elementos.
 *
 * @example
 * <Timeline ariaLabel="Historial">
 *   <TimelineItem date="15 Nov 2024" title="Lanzamiento" />
 *   <TimelineItem date="20 Dic 2024" title="Update" dotVariant="success" />
 * </Timeline>
 */
export function Timeline({
  className,
  children,
  ariaLabel,
  ref,
  ...rest
}: TimelineProps) {
  return (
    <div
      {...rest}
      ref={ref}
      role="list"
      aria-label={ariaLabel}
      className={cn("ig-timeline", className)}
    >
      {children}
    </div>
  );
}
