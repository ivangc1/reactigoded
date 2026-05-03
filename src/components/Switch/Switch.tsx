import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type Ref,
} from "react";
import { cn } from "@/utils/cn";

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
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState<boolean>(defaultChecked === true);
  const isOn = isControlled ? checked : internal;

  const internalRef = useRef<HTMLInputElement>(null);
  const setRefs = (el: HTMLInputElement | null) => {
    internalRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  useEffect(() => {
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
    if (!isControlled) setInternal(e.target.checked);
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
