import { type HTMLAttributes, type Ref } from "react";
import { cn } from "@/utils/cn";

export interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * Timeline — lista vertical de eventos cronológicos.
 *
 * Compón con `TimelineItem`. Renderiza un contenedor con `role="list"` para
 * que los lectores de pantalla anuncien la cantidad de elementos. Pasa
 * `aria-label` para etiquetar la lista (i18n vía atributo HTML estándar).
 *
 * @example
 * <Timeline aria-label="Historial">
 *   <TimelineItem date="15 Nov 2024" title="Lanzamiento" />
 *   <TimelineItem date="20 Dic 2024" title="Update" dotVariant="success" />
 * </Timeline>
 */
export function Timeline({
  className,
  children,
  ref,
  ...rest
}: TimelineProps) {
  // 1.0.0-beta.4: aria-label del rest (HTML std). Antes prop ariaLabel.
  return (
    <div
      {...rest}
      ref={ref}
      role="list"
      className={cn("ig-timeline", className)}
    >
      {children}
    </div>
  );
}
