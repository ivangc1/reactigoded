import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export type RadioVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Color del punto cuando está seleccionado. */
  variant?: RadioVariant;
  /** Etiqueta visible junto al radio. */
  children?: React.ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Radio — `<input type="radio">` con punto visual personalizado.
 * Recuerda agrupar varios con el mismo `name`.
 *
 * @example
 * <Radio name="plan" value="free" defaultChecked>Free</Radio>
 * <Radio name="plan" value="pro" variant="success">Pro</Radio>
 * <Radio name="plan" value="enterprise" disabled>Enterprise</Radio>
 */
export function Radio({
  variant = "brand",
  className,
  children,
  ref,
  disabled,
  ...rest
}: RadioProps) {
  return (
    <label
      className={cn("ig-radio", `ig-radio-${variant}`, className)}
      data-disabled={disabled ? "true" : undefined}
    >
      <input ref={ref} type="radio" disabled={disabled} {...rest} />
      <span className="ig-radio-mark" aria-hidden="true" />
      {children !== undefined && <span>{children}</span>}
    </label>
  );
}
