import { type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/utils/cn";

export type TimelineDotVariant =
  | "default"
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface TimelineItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Fecha o etiqueta temporal del evento. */
  date?: ReactNode | undefined;
  /** Título del evento. */
  title?: ReactNode | undefined;
  /** Descripción del evento. */
  description?: ReactNode | undefined;
  /** Variante de color del punto del timeline. */
  dotVariant?: TimelineDotVariant | undefined;
  /**
   * Contenido custom del punto (icono, número, etc.).
   * Si se proporciona reemplaza el punto por defecto.
   */
  dotContent?: ReactNode | undefined;
  /**
   * Si se proporciona, sustituye el contenido renderizado por defecto
   * (date/title/description). Útil para layouts ricos.
   */
  children?: ReactNode | undefined;
  ref?: Ref<HTMLDivElement> | undefined;
}

/**
 * TimelineItem — un evento dentro de un Timeline.
 *
 * Por defecto renderiza el patrón `date` + `title` + `description`. Si se
 * pasan children, se usan en lugar del contenido por defecto.
  *
 * @server-safe
 */
export function TimelineItem({
  className,
  date,
  title,
  description,
  dotVariant = "default",
  dotContent,
  children,
  ref,
  ...rest
}: TimelineItemProps) {
  return (
    <div
      {...rest}
      ref={ref}
      role="listitem"
      className={cn("ig-timeline-item", className)}
    >
      <span
        className={cn(
          "ig-timeline-dot",
          dotVariant !== "default" && `ig-timeline-dot-${dotVariant}`,
        )}
        aria-hidden="true"
      >
        {dotContent}
      </span>
      <div className="ig-timeline-content">
        {children ?? (
          <>
            {date != null && <div className="ig-timeline-date">{date}</div>}
            {title != null && <div className="ig-timeline-title">{title}</div>}
            {description != null && (
              <div className="ig-timeline-description">{description}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
