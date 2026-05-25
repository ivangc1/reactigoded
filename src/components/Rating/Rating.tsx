"use client";

import type { HTMLAttributes, Ref, KeyboardEvent } from "react";
import { useState } from "react";
import { cn } from "@/utils/cn";
import { mergeDescribedBy } from "@/utils/mergeDescribedBy";
import {
  SUPPRESS_NO_HANDLER_WARN,
  useControllableState,
} from "@/hooks/useControllableState";

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
  /**
   * Ids extra para `aria-describedby` del radiogroup. Pasar string para
   * un único id o array para varios. Se concatenan con cualquier
   * `aria-describedby` que el consumer pase por rest. Patrón canónico
   * del DS para enlazar `Helper` / `ErrorText` / live-regions con
   * tecnologías asistivas.
   */
  describedBy?: string | string[];
  /**
   * Override del `aria-label` por estrella individual. Recibe el valor
   * 1..max y devuelve la cadena. Default ES: `"1 estrella"` / `"N estrellas"`.
   * Cierra el hueco i18n del componente — el grupo ya era overrideable
   * vía `aria-label`, los hijos no lo eran (ver `docs/decisions/D12-es-defaults-i18n.md`).
   *
   * @example
   * <Rating max={5} getStarLabel={(n) => `${n} of 5 stars`} />
   */
  getStarLabel?: (value: number) => string;
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
 *   - `ArrowRight` / `ArrowDown` → siguiente estrella + selecciona (clamp en `max`).
 *   - `ArrowLeft`  / `ArrowUp`   → anterior estrella + selecciona (clamp en 1).
 *   - `Home` → primera estrella (valor 1).
 *   - `End`  → última estrella (valor `max`).
 *   - `Space` / `Enter` → selecciona la estrella focuseada.
 *
 * Soporta controlled (`value`+`onValueChange`) y uncontrolled (`defaultValue`).
 *
 * **Robustez frente a inputs inválidos** (desde `1.0.0-beta.4`):
 * - `value` o `defaultValue` fuera de `[0, max]` se clampa silenciosamente.
 * - `max` no entero se redondea hacia abajo, mínimo 1.
 * - Las flechas no envuelven (clamp, no wrap) — patrón estándar APG.
 *
 * @example
 * <Rating defaultValue={3} max={5} />
 * <Rating value={r} onValueChange={setR} aria-label="Puntuación del producto" />
 * <Rating value={4} readOnly />
 */
export function Rating({
  value: valueProp,
  defaultValue = 0,
  max = 5,
  readOnly = false,
  size = "md",
  onValueChange,
  describedBy,
  getStarLabel,
  className,
  ref,
  ...rest
}: RatingProps) {
  // 1.0.0-beta.4: aria-label del rest (HTML std) en vez de prop ariaLabel.
  const {
    "aria-label": ariaLabelOverride,
    "aria-describedby": ariaDescribedByNative,
    ...divRest
  } = rest;
  const describedByValue = mergeDescribedBy(
    ariaDescribedByNative,
    describedBy,
  );
  // `defaultValue` viene del consumer y puede ser cualquier número. Lo
  // clampamos a [0, max] al inicializar (0 = "ninguna estrella seleccionada").
  const safeMax = Math.max(1, Math.floor(max));
  const clampedDefault = Math.min(Math.max(defaultValue, 0), safeMax);
  const { value: rawValue, setValue: setInternal } = useControllableState<number>({
    value: valueProp,
    defaultValue: clampedDefault,
    onChange: onValueChange,
    // Suprime el warn dev del hook cuando Rating está en modo display-only
    // legítimo (`readOnly`). El consumer pasa value=N intencionalmente
    // sin handler — no es UI bloqueada, es una representación visual.
    // C-07: Symbol-keyed (era `__suppressNoHandlerWarn` string-keyed).
    [SUPPRESS_NO_HANDLER_WARN]: readOnly,
  });
  // Si el consumer pasa value=10 con max=5, en vez de romper la a11y
  // (focusableValue=10 → ningún radio matchea → tablist sin tab stop) lo
  // clampamos al rango válido. Lo mismo si value < 0.
  const value = Math.min(Math.max(rawValue, 0), safeMax);
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  // Roving tabindex: el "tab stop" del grupo es la estrella checked, o la
  // primera si no hay nada checked. Resto = -1.
  const focusableValue = value > 0 ? value : 1;

  const setValueAndFocus = (v: number, target: HTMLElement | null) => {
    if (readOnly) return;
    const clamped = Math.min(Math.max(v, 1), safeMax);
    // setInternal dispara onValueChange vía el hook (onChange).
    setInternal(clamped);
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
        const next = Math.min(v + 1, safeMax);
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
        setValueAndFocus(safeMax, buttons[safeMax - 1] ?? null);
        break;
      }
      case " ":
      case "Enter": {
        event.preventDefault();
        // setInternal dispara onValueChange vía el hook (onChange).
        setInternal(v);
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
      {...divRest}
      ref={ref}
      role="radiogroup"
      // i18n: ES default deliberado (D12). Override: aria-label (HTML std).
      aria-label={ariaLabelOverride ?? "Puntuación"}
      aria-describedby={describedByValue}
      aria-readonly={readOnly || undefined}
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
      {Array.from({ length: safeMax }, (_, i) => {
        const v = i + 1;
        const filled = v <= display;
        const isFocusable = v === focusableValue;
        // Button sin children: el glifo (★ filled / ☆ empty) lo aporta CSS
        // via `.ig-star::before { content }` controlado por la clase de
        // estado. Decisión arquitectónica del canal de forma (issue #102,
        // WCAG 1.4.1 nivel A): glifo decorativo en pseudoelemento +
        // aria-label semántico = el rating viaja por dos canales (forma +
        // color) y la verdad para AT viaja solo por ARIA.
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === value}
            // i18n: ES default deliberado (D12). Override: getStarLabel.
            aria-label={
              getStarLabel?.(v) ??
              `${String(v)} ${v === 1 ? "estrella" : "estrellas"}`
            }
            // En modo readOnly NO usamos `disabled` (rompe el patrón APG
            // del radiogroup: SR no anuncia el valor seleccionado de un
            // radio disabled; aria-readonly del contenedor es la forma
            // estándar). Los handlers internos guard-ean con readOnly,
            // así que tabIndex sigue el roving normal y la estrella
            // queda focuseable para inspección por teclado.
            tabIndex={isFocusable ? 0 : -1}
            className={cn("ig-star", filled && "ig-star-filled")}
            onClick={() => {
              if (readOnly) return;
              // setInternal dispara onValueChange vía el hook (onChange).
              setInternal(v);
            }}
            onKeyDown={(e) => {
              handleKeyDown(e, v);
            }}
            onMouseEnter={() => {
              if (!readOnly) setHover(v);
            }}
          />
        );
      })}
    </div>
  );
}
