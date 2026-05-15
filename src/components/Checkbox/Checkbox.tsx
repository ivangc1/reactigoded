"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { mergeDescribedBy } from "@/utils/mergeDescribedBy";
import { useIsoLayoutEffect } from "@/utils/useIsoLayoutEffect";

export type CheckboxVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Color del check cuando está activo. */
  variant?: CheckboxVariant;
  /** Etiqueta visible junto al checkbox. */
  children?: React.ReactNode;
  /**
   * Activa el tercer estado visual del checkbox (línea horizontal en
   * lugar del tick). Se aplica vía `el.indeterminate = true` en el
   * `<input>` nativo (la única forma soportada por la plataforma) y
   * añade `aria-checked="mixed"` para lectores de pantalla.
   *
   * Nota: `indeterminate` es estado del DOM, no del modelo de datos.
   * El `value` del checkbox sigue siendo `checked`/`unchecked`. Mantén
   * tú la sincronización con los hijos cuyo estado lo justifique.
   */
  indeterminate?: boolean;
  /**
   * Ids extra para `aria-describedby`. Pasar string para un único id o
   * array para varios. Se concatenan con cualquier `aria-describedby`
   * que el consumer pase por rest. Patrón canónico del DS para enlazar
   * `Helper` / `ErrorText` / live-regions con tecnologías asistivas.
   *
   * @example
   * const helperId = useId();
   * <Checkbox describedBy={helperId}>Acepto</Checkbox>
   * <Helper id={helperId}>Solo email; no spam.</Helper>
   */
  describedBy?: string | string[];
  ref?: Ref<HTMLInputElement>;
}

/**
 * Checkbox — `<input type="checkbox">` con marca visual personalizada.
 * Wrappeado en `<label>` para que click en el texto active el input.
 *
 * Soporta tri-state vía `indeterminate` prop (desde 1.0.0-beta.8) o via
 * `ref` manual (`ref.current.indeterminate = true`).
 *
 * @example
 * <Checkbox defaultChecked>Acepto los términos</Checkbox>
 * <Checkbox indeterminate>Selección parcial</Checkbox>
 * <Checkbox checked={on} onChange={(e) => setOn(e.target.checked)}>
 *   Recibir newsletter
 * </Checkbox>
 */
export function Checkbox({
  variant = "brand",
  className,
  children,
  ref,
  disabled,
  indeterminate,
  describedBy,
  onChange,
  ...rest
}: CheckboxProps) {
  const { "aria-describedby": ariaDescribedByNative, ...inputRest } = rest;
  const describedByValue = mergeDescribedBy(
    ariaDescribedByNative,
    describedBy,
  );
  const internalRef = useRef<HTMLInputElement>(null);

  // setRefs estabilizado con useCallback — alineado con el patrón
  // canónico del DS (Stepper). Sin `useCallback` la identidad cambia
  // por render y React invocaría cleanup+rewrite del ref en cada
  // commit. Con `useCallback` solo se invoca en mount/unmount o si
  // el `ref` consumer cambia.
  const setRefs = useCallback(
    (el: HTMLInputElement | null) => {
      internalRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  // Dev-only warning: controlled sin handler. Consumer pasa `checked`
  // pero olvida `onChange` → el checkbox parece roto. En useEffect (no
  // durante render) por el lint react-hooks/refs.
  const warnedControlledRef = useRef(false);
  const isControlled = (rest as { checked?: boolean }).checked !== undefined;
  useEffect(() => {
    if (
      import.meta.env.DEV &&
      !warnedControlledRef.current &&
      isControlled &&
      !onChange &&
      !disabled
    ) {
      warnedControlledRef.current = true;
      console.warn(
        "[reactigoded] <Checkbox checked={...}> sin onChange — el checkbox no responderá al click. Pasa onChange o usa defaultChecked para uncontrolled.",
      );
    }
  }, [isControlled, onChange, disabled]);

  // useIsoLayoutEffect (layout en cliente, effect en server): el
  // atributo `indeterminate` es DOM-only y no se refleja en el HTML
  // inicial. Aplicarlo en un useEffect post-paint produce flicker
  // (primer paint con tick, segundo con la línea horizontal).
  useIsoLayoutEffect(() => {
    if (internalRef.current) {
      internalRef.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Click en un checkbox con .indeterminate=true hace que el navegador
    // limpie automáticamente .indeterminate (toggle a checked/unchecked).
    // Si el consumer mantiene la prop indeterminate=true, lo re-aplicamos
    // para que el estado sea sticky — solo el parent decide cuándo salir.
    if (indeterminate && internalRef.current) {
      internalRef.current.indeterminate = true;
    }
    onChange?.(e);
  };

  return (
    <label
      className={cn("ig-checkbox", `ig-checkbox-${variant}`, className)}
      data-disabled={disabled ? "true" : undefined}
    >
      <input
        {...inputRest}
        ref={setRefs}
        type="checkbox"
        disabled={disabled}
        aria-checked={indeterminate ? "mixed" : undefined}
        aria-describedby={describedByValue}
        onChange={handleChange}
      />
      <span className="ig-checkbox-mark" aria-hidden="true" />
      {children !== undefined && <span>{children}</span>}
    </label>
  );
}
