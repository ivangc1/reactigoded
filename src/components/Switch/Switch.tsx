import { useState, type ChangeEvent, type InputHTMLAttributes, type Ref } from "react";
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
  onChange,
  ...rest
}: SwitchProps) {
  const isControlled = checked !== undefined;
  const [internal, setInternal] = useState<boolean>(defaultChecked === true);
  const isOn = isControlled ? checked : internal;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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
        ref={ref}
        type="checkbox"
        role="switch"
        aria-checked={isOn}
        disabled={disabled}
        onChange={handleChange}
        {...(isControlled ? { checked } : { defaultChecked })}
      />
      <span className="ig-switch-track" aria-hidden="true" />
      {children !== undefined && <span>{children}</span>}
    </label>
  );
}
