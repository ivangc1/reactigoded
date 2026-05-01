import type { HTMLAttributes, Ref } from "react";
import { useState } from "react";
import { cn } from "@/utils/cn";

export type RatingSize = "sm" | "md" | "lg" | "xl";

export interface RatingProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Valor actual (modo controlado, 0..max). */
  value?: number;
  /** Valor inicial (modo no controlado). Por defecto 0. */
  defaultValue?: number;
  /** Máximo de estrellas. Por defecto 5. */
  max?: number;
  /** Sólo lectura: no responde a interacción. */
  readOnly?: boolean;
  /** Tamaño visual. */
  size?: RatingSize;
  /** Callback al elegir un valor. */
  onValueChange?: (value: number) => void;
  /** Etiqueta accesible para el grupo (`aria-label` del radiogroup). */
  ariaLabel?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Rating — N estrellas clicables con preview por hover.
 *
 * Cada estrella es un `<button>` accesible con `aria-label="N estrellas"`.
 * El contenedor expone `role="radiogroup"` para tecnologías asistivas.
 *
 * Soporta controlled (`value`+`onValueChange`) y uncontrolled (`defaultValue`).
 *
 * @example
 * <Rating defaultValue={3} max={5} />
 * <Rating value={r} onValueChange={setR} ariaLabel="Puntuación del producto" />
 * <Rating value={4} readOnly />
 */
export function Rating({
  value: valueProp,
  defaultValue = 0,
  max = 5,
  readOnly = false,
  size = "md",
  onValueChange,
  ariaLabel = "Puntuación",
  className,
  ref,
  ...rest
}: RatingProps) {
  const isControlled = valueProp !== undefined;
  const [internal, setInternal] = useState<number>(defaultValue);
  const value = isControlled ? valueProp : internal;
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    // El radiogroup delega focus a sus radios hijos (cada estrella es
    // <button role="radio" tabIndex>), patrón estándar de WAI-ARIA.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      {...rest}
      ref={ref}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "ig-rating",
        readOnly && "ig-rating-readonly",
        size !== "md" && `ig-rating-${size}`,
        className,
      )}
      onMouseLeave={() => {
        if (!readOnly) setHover(null);
      }}
    >
      {Array.from({ length: max }, (_, i) => {
        const v = i + 1;
        const filled = v <= display;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === value}
            aria-label={`${String(v)} ${v === 1 ? "estrella" : "estrellas"}`}
            disabled={readOnly}
            className={cn("ig-star", filled && "ig-star-filled")}
            onClick={() => {
              if (readOnly) return;
              if (!isControlled) setInternal(v);
              onValueChange?.(v);
            }}
            onMouseEnter={() => {
              if (!readOnly) setHover(v);
            }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
