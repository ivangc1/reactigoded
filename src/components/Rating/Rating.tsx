import type { HTMLAttributes, Ref, KeyboardEvent } from "react";
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
 * Rating — N estrellas clicables con preview por hover y navegación
 * completa por teclado siguiendo el patrón WAI-ARIA APG de radiogroup:
 *
 * - El contenedor es `role="radiogroup"`.
 * - Cada estrella es `<button role="radio">` con `aria-checked`.
 * - **Roving tabindex**: solo la estrella seleccionada (o la primera si
 *   no hay selección) tiene `tabIndex=0`; el resto `tabIndex=-1`.
 * - **Keyboard**:
 *   - `ArrowRight` / `ArrowDown` → siguiente estrella + selecciona.
 *   - `ArrowLeft`  / `ArrowUp`   → anterior estrella + selecciona.
 *   - `Home` → primera estrella (valor 1).
 *   - `End`  → última estrella (valor `max`).
 *   - `Space` / `Enter` → selecciona la estrella focuseada.
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

  // Roving tabindex: el "tab stop" del grupo es la estrella checked, o la
  // primera si no hay nada checked. Resto = -1.
  const focusableValue = value > 0 ? value : 1;

  const setValueAndFocus = (v: number, target: HTMLElement | null) => {
    if (readOnly) return;
    const clamped = Math.min(Math.max(v, 1), max);
    if (!isControlled) setInternal(clamped);
    onValueChange?.(clamped);
    // Mover foco al nuevo radio
    target?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, v: number) => {
    if (readOnly) return;
    const container = event.currentTarget.parentElement;
    if (!container) return;
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[role="radio"]'),
    );

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown": {
        event.preventDefault();
        const next = Math.min(v + 1, max);
        setValueAndFocus(next, buttons[next - 1] ?? null);
        break;
      }
      case "ArrowLeft":
      case "ArrowUp": {
        event.preventDefault();
        const prev = Math.max(v - 1, 1);
        setValueAndFocus(prev, buttons[prev - 1] ?? null);
        break;
      }
      case "Home": {
        event.preventDefault();
        setValueAndFocus(1, buttons[0] ?? null);
        break;
      }
      case "End": {
        event.preventDefault();
        setValueAndFocus(max, buttons[max - 1] ?? null);
        break;
      }
      case " ":
      case "Enter": {
        event.preventDefault();
        if (!isControlled) setInternal(v);
        onValueChange?.(v);
        break;
      }
      default:
        break;
    }
  };

  return (
    // El radiogroup delega focus a sus radios hijos (cada estrella es
    // <button role="radio" tabIndex>), patrón estándar de WAI-ARIA APG.
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
        const isFocusable = v === focusableValue;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === value}
            aria-label={`${String(v)} ${v === 1 ? "estrella" : "estrellas"}`}
            disabled={readOnly}
            tabIndex={readOnly ? -1 : isFocusable ? 0 : -1}
            className={cn("ig-star", filled && "ig-star-filled")}
            onClick={() => {
              if (readOnly) return;
              if (!isControlled) setInternal(v);
              onValueChange?.(v);
            }}
            onKeyDown={(e) => {
              handleKeyDown(e, v);
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
