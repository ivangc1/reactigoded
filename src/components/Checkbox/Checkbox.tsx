import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

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
  ref?: Ref<HTMLInputElement>;
}

/**
 * Checkbox — `<input type="checkbox">` con marca visual personalizada.
 * Wrappeado en `<label>` para que click en el texto active el input.
 *
 * Para soporte tri-state (`indeterminate`), gestiónalo via ref:
 * `useEffect(() => { ref.current.indeterminate = true; })`.
 *
 * @example
 * <Checkbox defaultChecked>Acepto los términos</Checkbox>
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
  ...rest
}: CheckboxProps) {
  return (
    <label
      className={cn("ig-checkbox", `ig-checkbox-${variant}`, className)}
      data-disabled={disabled ? "true" : undefined}
    >
      <input ref={ref} type="checkbox" disabled={disabled} {...rest} />
      <span className="ig-checkbox-mark" aria-hidden="true" />
      {children !== undefined && <span>{children}</span>}
    </label>
  );
}
