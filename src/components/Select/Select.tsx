import type { SelectHTMLAttributes, Ref } from "react";
import { cn } from "@/utils/cn";

export type SelectState = "default" | "error" | "success";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Estado de validación visual. */
  state?: SelectState;
  /**
   * IDs de elementos descriptivos (`Helper`/`ErrorText`) combinados en
   * `aria-describedby`. Acepta un id o lista de ids.
   */
  describedBy?: string | string[];
  ref?: Ref<HTMLSelectElement>;
}

/**
 * Select — `<select>` nativo estilizado. Pasa `<option>` como children.
 *
 * @example
 * <Select value={country} onChange={(e) => setCountry(e.target.value)}>
 *   <option value="es">España</option>
 *   <option value="mx">México</option>
 *   <option value="ar">Argentina</option>
 * </Select>
 * <Select state="error" describedBy={errorId}>
 *   <option value="">Selecciona…</option>
 * </Select>
 */
export function Select({
  state = "default",
  describedBy,
  className,
  children,
  ref,
  ...rest
}: SelectProps) {
  const describedByValue = Array.isArray(describedBy)
    ? describedBy.filter(Boolean).join(" ") || undefined
    : describedBy;
  return (
    <select
      {...rest}
      ref={ref}
      className={cn(
        "ig-select",
        state === "error" && "ig-input-error",
        state === "success" && "ig-input-success",
        className,
      )}
      aria-invalid={state === "error" ? true : undefined}
      aria-describedby={describedByValue}
    >
      {children}
    </select>
  );
}
