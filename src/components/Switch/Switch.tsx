import {
  useEffect,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";
import { isDev } from "@/utils/env";
import { useIsoLayoutEffect } from "@/utils/useIsoLayoutEffect";
import { useControllableState } from "@/hooks/useControllableState";

export type SwitchVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Color del switch cuando está activo. */
  variant?: SwitchVariant;
  /** Etiqueta visible junto al switch. */
  children?: React.ReactNode;
  /**
   * Activa el tercer estado visual del switch (thumb centrado en el
   * track, color de variante de fondo). Se aplica vía
   * `el.indeterminate = true` en el `<input>` nativo y reemplaza
   * `aria-checked` por `"mixed"` para lectores de pantalla. Útil en
   * toggles maestros que controlan un grupo donde unos hijos están
   * on y otros off (desde 1.0.0-beta.8).
   */
  indeterminate?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Switch — toggle accesible. Internamente es un `<input type="checkbox">`
 * con `role="switch"` + `aria-checked` para que los lectores de pantalla lo
 * anuncien como toggle (no como checkbox). Va envuelto en `<label>` con una
 * pista visual decorativa.
 *
 * **Estructura DOM**:
 * ```
 * <label class="ig-switch ig-switch-{variant}">
 *   <input type="checkbox" role="switch" />
 *   <span class="ig-switch-track" aria-hidden="true" />
 *   {children}  ← label de texto opcional
 * </label>
 * ```
 *
 * La clase `ig-switch` vive en el `<label>` wrapper, NO en el `<input>`.
 * En tests, `screen.getByRole("switch")` devuelve el input — para
 * asserts sobre la clase wrapper desde el input usar
 * `input.closest("label")`.
 *
 * @example
 * <Switch defaultChecked>Recibir notificaciones</Switch>
 * <Switch indeterminate>Notificaciones por categoría</Switch>
 * <Switch checked={on} onChange={(e) => setOn(e.target.checked)}>
 *   Modo experimental
 * </Switch>
 */
export function Switch({
  variant = "brand",
  className,
  children,
  ref,
  disabled,
  checked,
  defaultChecked,
  indeterminate,
  onChange,
  ...rest
}: SwitchProps) {
  const { value: isOn, setValue: setIsOn, isControlled } = useControllableState<boolean>({
    value: checked,
    defaultValue: defaultChecked === true,
  });

  // Dev-only warning: controlled sin handler. El consumer pasa `checked`
  // pero olvida `onChange` → el switch parece roto. En useEffect (no
  // durante render) por el lint react-hooks/refs.
  const warnedControlledRef = useRef(false);
  useEffect(() => {
    if (
      isDev() &&
      !warnedControlledRef.current &&
      isControlled &&
      !onChange &&
      !disabled
    ) {
      warnedControlledRef.current = true;
      console.warn(
        "[reactigoded] <Switch checked={...}> sin onChange — el switch no responderá al click. Pasa onChange o usa defaultChecked para uncontrolled.",
      );
    }
  }, [isControlled, onChange, disabled]);

  const internalRef = useRef<HTMLInputElement>(null);
  const setRefs = (el: HTMLInputElement | null) => {
    internalRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  // useIsoLayoutEffect (layout en cliente, effect en server): el
  // atributo `indeterminate` es DOM-only y no se refleja en el HTML
  // inicial. Aplicarlo en un useEffect post-paint produce flicker
  // (primer paint thumb desplazado, segundo thumb centrado).
  useIsoLayoutEffect(() => {
    if (internalRef.current) {
      internalRef.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Click en un input checkbox con .indeterminate=true hace que el
    // navegador limpie automáticamente .indeterminate. Si el consumer
    // mantiene la prop indeterminate=true, lo re-aplicamos — solo el
    // parent decide cuándo salir del estado mixto.
    if (indeterminate && internalRef.current) {
      internalRef.current.indeterminate = true;
    }
    setIsOn(e.target.checked);
    onChange?.(e);
  };

  return (
    <label
      className={cn("ig-switch", `ig-switch-${variant}`, className)}
      data-disabled={disabled ? "true" : undefined}
    >
      <input
        {...rest}
        ref={setRefs}
        type="checkbox"
        role="switch"
        aria-checked={indeterminate ? "mixed" : isOn}
        disabled={disabled}
        onChange={handleChange}
        {...(isControlled ? { checked } : { defaultChecked })}
      />
      <span className="ig-switch-track" aria-hidden="true" />
      {children !== undefined && <span>{children}</span>}
    </label>
  );
}
