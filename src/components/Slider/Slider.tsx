import type { InputHTMLAttributes, Ref } from "react";
import { useRef } from "react";
import { cn } from "@/utils/cn";
import { isDev } from "@/utils/env";
import { useControllableState } from "@/hooks/useControllableState";

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
  // `defaultValue` puede llegar como string ("60") o readonly array (que el
  // <input> nativo no soporta para type="range"). Normalizamos a número
  // finito; si no se puede, caemos a `min`. Antes de 1.0.0-beta.3 un
  // defaultValue="60" dejaba `internal=0` mientras el DOM mostraba 60.
  const minNum = Number(min);
  const safeMin = Number.isFinite(minNum) ? minNum : 0;
  const parsedDefault =
    typeof defaultValue === "number"
      ? defaultValue
      : typeof defaultValue === "string" && defaultValue.length > 0
        ? Number(defaultValue)
        : NaN;
  const initial = Number.isFinite(parsedDefault) ? parsedDefault : safeMin;
  // `value` puede ser number|string|readonly number[] del tipo HTMLInput.
  // Solo entra en controlled si es number/string finito; el array
  // (no soportado por type="range") cae a uncontrolled y se warn-ea
  // abajo.
  const controlledNum =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.length > 0
        ? Number(value)
        : undefined;
  const passControlled =
    controlledNum !== undefined && Number.isFinite(controlledNum)
      ? controlledNum
      : undefined;
  const { value: internal, setValue: setInternal, isControlled } =
    useControllableState<number>({
      value: passControlled,
      defaultValue: initial,
    });

  // Dev-only warnings: capturan errores típicos del consumer que la
  // plataforma ignora silenciosamente. Avisa una vez por instancia.
  const warnedRef = useRef(false);
  if (isDev() && !warnedRef.current) {
    if (Array.isArray(defaultValue)) {
      warnedRef.current = true;
      const allFinite = defaultValue.every((v) =>
        Number.isFinite(typeof v === "number" ? v : Number(v)),
      );
      console.warn(
        allFinite
          ? "[reactigoded] <Slider> recibe defaultValue como array; <input type=\"range\"> es single-value y solo se usará el primero. Pasa un number o string."
          : "[reactigoded] <Slider> defaultValue array contiene valores no-finitos; el slider arrancará en min.",
      );
    } else if (
      defaultValue !== undefined &&
      !Number.isFinite(parsedDefault)
    ) {
      warnedRef.current = true;
      console.warn(
        `[reactigoded] <Slider defaultValue=${JSON.stringify(defaultValue)}> no es un número finito; arrancando en min=${String(safeMin)}.`,
      );
    }
  }

  const rawCurrent = internal;
  // Si `value="abc"` o `internal` quedó NaN por algún edge, no queremos
  // pintar 'NaN' ni propagar NaN al aria-valuetext. Caemos a safeMin
  // como hace el inicializador del defaultValue.
  const current = Number.isFinite(rawCurrent) ? rawCurrent : safeMin;
  const display = formatValue ? formatValue(current) : String(current);

  // Normaliza prop pasada al DOM: <input type="range"> NO acepta arrays
  // (el tipo InputHTMLAttributes lo permite por la unión genérica). Antes
  // de 1.0.0-beta.4, un defaultValue/value array se reenviaba al DOM y
  // generaba "[object Array]" como string. Ahora filtramos: solo number o
  // string, ignoramos array.
  const isPlain = (v: unknown): v is number | string =>
    typeof v === "number" || typeof v === "string";
  const domValueProp =
    isControlled && isPlain(value)
      ? { value }
      : !isControlled && isPlain(defaultValue)
        ? { defaultValue }
        : !isControlled
          ? { defaultValue: String(initial) }
          : { value: String(current) };

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
      {...domValueProp}
      onChange={(e) => {
        const next = Number(e.target.value);
        setInternal(next);
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
