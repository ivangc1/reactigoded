import type { LabelHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Marca el label como obligatorio (añade asterisco). */
  required?: boolean;
  ref?: Ref<HTMLLabelElement>;
}

/**
 * Label — etiqueta para campos de formulario. Asocia con un input via `htmlFor`.
 */
export function Label({
  required = false,
  className,
  children,
  ref,
  ...rest
}: LabelProps) {
  return (
    <label
      ref={ref}
      className={cn("ig-label", required && "ig-label-required", className)}
      {...rest}
    >
      {children}
      {required && (
        // M-05 (beta.24): asterisco con clase CSS en lugar de inline
        // style (CSP-friendly). El margen vive en `.ig-label-required-mark`.
        <span aria-hidden="true" className="ig-label-required-mark">
          *
        </span>
      )}
    </label>
  );
}
