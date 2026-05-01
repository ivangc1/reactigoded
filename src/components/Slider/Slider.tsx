import type { InputHTMLAttributes, Ref } from "react";
import { useState } from "react";
import { cn } from "@/utils/cn";

export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Mostrar el valor actual junto al slider. */
  showValue?: boolean;
  /** Formateador opcional para el valor visible y para `aria-valuetext`. */
  formatValue?: (value: number) => string;
  /**
   * Callback con el valor numérico decodificado (alternativa al `onChange`
   * nativo que recibe el `ChangeEvent`). Útil cuando solo necesitas el número.
   */
  onValueChange?: (value: number) => void;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Slider — `<input type="range">` estilizado. Con `showValue` muestra el
 * valor actual al lado (controlado o no). Soporta `formatValue` para
 * formatear (ej. `(v) => `${v}%``).
 *
 * `formatValue` también se aplica a `aria-valuetext` para que los lectores
 * de pantalla anuncien el formato (`50%` en vez de `50`).
 *
 * @example
 * <Slider
 *   aria-label="Volumen"
 *   value={vol}
 *   onValueChange={setVol}
 *   showValue
 *   formatValue={(v) => `${v}%`}
 * />
 */
export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  showValue = false,
  formatValue,
  className,
  onChange,
  onValueChange,
  ref,
  ...rest
}: SliderProps) {
  const isControlled = value !== undefined;
  const initial =
    typeof defaultValue === "number" ? defaultValue : Number(min) || 0;
  const [internal, setInternal] = useState<number>(initial);

  const current = isControlled ? Number(value) : internal;
  const display = formatValue ? formatValue(current) : String(current);

  const slider = (
    <input
      {...rest}
      ref={ref}
      type="range"
      className={cn("ig-slider", className)}
      min={min}
      max={max}
      step={step}
      aria-valuetext={formatValue ? display : undefined}
      {...(isControlled ? { value } : { defaultValue })}
      onChange={(e) => {
        const next = Number(e.target.value);
        if (!isControlled) setInternal(next);
        onChange?.(e);
        onValueChange?.(next);
      }}
    />
  );

  if (showValue) {
    return (
      <div className="ig-slider-group">
        {slider}
        <span className="ig-slider-value" aria-hidden="true">
          {display}
        </span>
      </div>
    );
  }

  return slider;
}
