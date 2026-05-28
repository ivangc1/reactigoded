import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";
import { mergeDescribedBy } from "@/utils/mergeDescribedBy";

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
  variant?: RadioVariant | undefined;
  /** Etiqueta visible junto al radio. */
  children?: React.ReactNode | undefined;
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
 * Radio — `<input type="radio">` con punto visual personalizado.
 * Recuerda agrupar varios con el mismo `name`.
 *
 * @example
 * <Radio name="plan" value="free" defaultChecked>Free</Radio>
 * <Radio name="plan" value="pro" variant="success">Pro</Radio>
 * <Radio name="plan" value="enterprise" disabled>Enterprise</Radio>
  *
 * @server-safe
 */
export function Radio({
  variant = "brand",
  className,
  children,
  ref,
  disabled,
  describedBy,
  ...rest
}: RadioProps) {
  const { "aria-describedby": ariaDescribedByNative, ...inputRest } = rest;
  const describedByValue = mergeDescribedBy(
    ariaDescribedByNative,
    describedBy,
  );
  return (
    <label
      className={cn("ig-radio", `ig-radio-${variant}`, className)}
      data-disabled={disabled ? "true" : undefined}
    >
      <input
        {...inputRest}
        ref={ref}
        type="radio"
        disabled={disabled}
        aria-describedby={describedByValue}
      />
      <span className="ig-radio-mark" aria-hidden="true" />
      {children !== undefined && <span>{children}</span>}
    </label>
  );
}
