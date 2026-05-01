import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/utils/cn";

export type DividerVariant =
  | "default"
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface DividerProps extends HTMLAttributes<HTMLElement> {
  /** Orientación. Vertical renderiza un `<span>` inline-block; horizontal un `<hr>`. */
  vertical?: boolean;
  /** Borde discontinuo. */
  dashed?: boolean;
  /** Color del separador. `default` usa el color neutro de borde. */
  variant?: DividerVariant;
  /** Si se pasan, renderiza un divider con texto centrado en lugar de la línea. */
  children?: ReactNode;
  ref?: Ref<HTMLElement>;
}

/**
 * Divider — línea separadora horizontal o vertical, con o sin texto.
 *
 * - Sin `children` y horizontal → `<hr class="ig-divider">`.
 * - Sin `children` y vertical → `<span class="ig-divider-vertical">`.
 * - Con `children` → `<div class="ig-divider-with-text">` con texto centrado.
 *
 * Como el elemento renderizado depende de las props, `ref` se tipa como
 * `Ref<HTMLElement>` (común a los 3). Si necesitas un ref más concreto en tu
 * código, narrow con `as RefObject<HTMLHRElement>` cuando uses la variante
 * por defecto.
 *
 * @example
 * <Divider />
 * <Divider variant="brand" dashed />
 * <Divider>o</Divider>
 * <Divider vertical aria-orientation="vertical" />
 */
export function Divider({
  vertical = false,
  dashed = false,
  variant = "default",
  children,
  className,
  ref,
  ...rest
}: DividerProps) {
  const variantClass = variant !== "default" ? `ig-divider-${variant}` : null;

  if (children !== undefined) {
    return (
      <div
        {...rest}
        ref={ref as Ref<HTMLDivElement>}
        className={cn(
          "ig-divider-with-text",
          variantClass,
          dashed && "ig-divider-dashed",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  if (vertical) {
    return (
      <span
        {...rest}
        ref={ref}
        role="separator"
        aria-orientation="vertical"
        className={cn(
          "ig-divider-vertical",
          variantClass,
          dashed && "ig-divider-dashed",
          className,
        )}
      />
    );
  }

  return (
    <hr
      {...rest}
      ref={ref as Ref<HTMLHRElement>}
      className={cn(
        "ig-divider",
        variantClass,
        dashed && "ig-divider-dashed",
        className,
      )}
    />
  );
}
