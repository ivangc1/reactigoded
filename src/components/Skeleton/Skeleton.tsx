import type { HTMLAttributes, ReactNode, Ref } from "react";
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
 * Skeleton — placeholder animado **decorativo** mientras se carga
 * contenido. NO anuncia carga al lector de pantalla por sí solo:
 * `role="presentation"` + `aria-hidden="true"`.
 *
 * Para anunciar el estado de carga al SR, envuelve un grupo de
 * `Skeleton` en `<SkeletonContainer label="...">`. El container
 * dispara UN solo aviso al SR (no uno por cada `Skeleton`, que era
 * el bug del patrón anterior con `role="status"` por instancia).
 *
 * Cualquier tamaño extra puede pasarse por `style` (`width`, `height`).
 *
 * @example
 * <SkeletonContainer label="Cargando perfil">
 *   <Skeleton variant="avatar" />
 *   <Skeleton variant="title" />
 *   <Skeleton variant="text" />
 * </SkeletonContainer>
 *
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
      role="presentation"
      aria-hidden="true"
      className={cn("ig-skeleton", `ig-skeleton-${variant}`, className)}
    />
  );
}

export interface SkeletonContainerProps
  extends HTMLAttributes<HTMLDivElement> {
  /**
   * Etiqueta para SR. Por defecto `"Cargando contenido…"` (ES).
   * Pasa una string específica del contexto para mejor UX SR.
   */
  label?: string;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

/**
 * SkeletonContainer — wrapper accesible para grupos de `Skeleton`.
 * Anuncia estado de carga UNA vez al lector de pantalla
 * (`role="status"` + `aria-busy="true"` + `aria-live="polite"` +
 * `aria-label`). El layout es neutro (`display: contents`): NO
 * añade caja al flujo, los hijos se posicionan como si el container
 * no existiese.
 *
 * @example
 * <SkeletonContainer label="Cargando lista de pedidos">
 *   <Skeleton variant="text" />
 *   <Skeleton variant="text" />
 *   <Skeleton variant="text" />
 * </SkeletonContainer>
 */
export function SkeletonContainer({
  label = "Cargando contenido…",
  children,
  className,
  ref,
  ...rest
}: SkeletonContainerProps) {
  const { "aria-label": ariaLabelOverride, ...divRest } = rest;
  return (
    <div
      {...divRest}
      ref={ref}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={ariaLabelOverride ?? label}
      className={cn("ig-skeleton-container", className)}
    >
      {children}
    </div>
  );
}
