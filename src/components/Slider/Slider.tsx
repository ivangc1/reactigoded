"use client";

import type { InputHTMLAttributes, Ref } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/utils/cn";
import { mergeDescribedBy } from "@/utils/mergeDescribedBy";
import { useControllableState } from "@/hooks/useControllableState";

export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  /** Mostrar el valor actual junto al slider. */
  showValue?: boolean | undefined;
  /** Formateador opcional para el valor visible y para `aria-valuetext`. */
  formatValue?: ((value: number) => string) | undefined;
  /**
   * Callback con el valor numérico decodificado.
   *
   * B-02 / H-17 (RC1): pre-RC1 Slider exponía `onChange` (ChangeEvent
   * nativo) Y `onValueChange` (number). Ambos en paralelo confundían al
   * consumer (¿cuál uso?). RC1 estandariza con el resto del DS: queda
   * solo `onValueChange<number>`. Si necesitas el ChangeEvent nativo
   * por algún motivo (analytics del DOM event, e.g.), añade un wrapper
   * `<input type="range" onChange={...}>` manual.
   */
  onValueChange?: ((value: number) => void) | undefined;
  /**
   * Ids extra para `aria-describedby`. Pasar string para un único id o
   * array para varios. Se concatenan con cualquier `aria-describedby`
   * que el consumer pase por rest. Patrón canónico del DS para enlazar
   * `Helper` / `ErrorText` / live-regions con tecnologías asistivas.
   */
  describedBy?: string | string[] | undefined;
  ref?: Ref<HTMLInputElement> | undefined;
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
  onValueChange,
  describedBy,
  ref,
  ...rest
}: SliderProps) {
  const { "aria-describedby": ariaDescribedByNative, ...inputRest } = rest;
  const describedByValue = mergeDescribedBy(
    ariaDescribedByNative,
    describedBy,
  );
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
  // Solo entra en controlled si es number/string parseable; el array
  // (no soportado por type="range") cae a uncontrolled y se warn-ea
  // abajo.
  const controlledNum =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.length > 0
        ? Number(value)
        : undefined;

  // H-16 (gate review): value no-finite (NaN, parsing fallido) ANTES
  // hacía passControlled=undefined → componente caía a uncontrolled
  // SILENCIOSAMENTE pese a que el consumer pasaba `value`. Bug de
  // contrato: el consumer espera que el slider siga su state, no que
  // se quede pegado en su último valor uncontrolled.
  //
  // Patrón Pagination del propio DS: clamp + warn + permanecer
  // funcional (controlled). Si value es no-finite, clampamos a
  // `safeMin` y MANTENEMOS controlled — el consumer ve el slider
  // pegado en min y el dev-warn explica por qué. Nunca cambia de
  // modo silenciosamente.
  const passControlled =
    controlledNum === undefined
      ? undefined
      : Number.isFinite(controlledNum)
        ? controlledNum
        : safeMin;
  const { value: internal, setValue: setInternal, isControlled } =
    useControllableState<number>({
      value: passControlled,
      defaultValue: initial,
      onChange: onValueChange,
    });

  // Dev-only warnings: capturan errores típicos del consumer que la
  // plataforma ignora silenciosamente. En useEffect (no durante render)
  // por el lint react-hooks/refs.
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (warnedRef.current) return;
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
    } else if (
      // H-16: value controlado no-finito. ANTES dejaba el componente
      // en uncontrolled silencioso; AHORA clampa a safeMin y mantiene
      // controlled (patrón Pagination). El warn explica el clamp.
      value !== undefined &&
      controlledNum !== undefined &&
      !Number.isFinite(controlledNum)
    ) {
      warnedRef.current = true;
      console.warn(
        `[reactigoded] <Slider value=${JSON.stringify(value)}> no es un número finito; clampando a min=${String(safeMin)} y manteniendo el modo controlled. Pasa un number válido para que el slider siga tu state correctamente.`,
      );
    }
  }, [defaultValue, parsedDefault, safeMin, value, controlledNum]);

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
  //
  // H-16: si controlled con value no-finite, el browser HTML5 clampa
  // automáticamente al middle del range (50% por defecto), descartando
  // nuestro clamp a safeMin. Forzamos el DOM a `current` (internal
  // clamped) para que el slider visual respete el contrato del DS, no
  // el comportamiento del browser.
  const isPlain = (v: unknown): v is number | string =>
    typeof v === "number" || typeof v === "string";
  const domValueProp =
    isControlled && isPlain(value) && Number.isFinite(controlledNum)
      ? { value }
      : isControlled
        ? { value: String(current) }
        : isPlain(defaultValue)
          ? { defaultValue }
          : { defaultValue: String(initial) };

  const slider = (
    <input
      {...inputRest}
      ref={ref}
      type="range"
      className={cn("ig-slider", className)}
      min={min}
      max={max}
      step={step}
      aria-valuetext={formatValue ? display : undefined}
      aria-describedby={describedByValue}
      {...domValueProp}
      onChange={(e) => {
        const next = Number(e.target.value);
        // setInternal dispara onValueChange vía el hook.
        // B-02/H-17 (RC1): onChange pass-through eliminado.
        setInternal(next);
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
