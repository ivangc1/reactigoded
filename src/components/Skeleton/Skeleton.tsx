import type { HTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export type SkeletonVariant =
  | "text"
  | "title"
  | "avatar"
  | "avatar-lg"
  | "card"
  | "image"
  | "button";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Forma del placeholder. `text` (default) es una línea de texto, `title` una
   * más alta, `avatar`/`avatar-lg` círculos, `card`/`image` rectángulos
   * grandes y `button` un placeholder de botón.
   */
  variant?: SkeletonVariant;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Skeleton — placeholder animado mientras se carga contenido. Cualquier
 * tamaño extra puede pasarse por `style` (`width`, `height`).
 *
 * @example
 * <Skeleton variant="title" />
 * <Skeleton variant="text" style={{ width: "80%" }} />
 * <Skeleton variant="avatar" />
 * <Skeleton variant="card" style={{ height: 200 }} />
 */
export function Skeleton({
  variant = "text",
  className,
  ref,
  ...rest
}: SkeletonProps) {
  return (
    <div
      {...rest}
      ref={ref}
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn("ig-skeleton", `ig-skeleton-${variant}`, className)}
    />
  );
}
